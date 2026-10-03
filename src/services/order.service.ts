import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  imageUrl?: string;
  status?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'DONE' | 'CANCELLED';
}

export type LiveOrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DONE' | 'CANCELLED';

export interface LiveOrder {
  id: string;
  code: string;
  time: string;
  orderType: 'TAKEAWAY' | 'DINE_IN';
  status: LiveOrderStatus;
  items: OrderItemDetail[];
  note?: string;
  total: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod?: 'CASH' | 'VIETQR';
  customerName?: string;
  tableId?: string;
  tableName?: string;
  branchId: string;
  tenantId: string;
  countdownSeconds?: number;
  createdAt: string;
}

/**
 * Helper phân giải branchId query thành record Branch trong DB.
 * Chặn IDOR: lấy tenantId từ Branch làm source of truth.
 * Hỗ trợ alias 'default-branch' để tương thích KDS/dev mode.
 */
async function resolveBranch(branchId: string) {
  let branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch && branchId === 'default-branch') {
    branch = await prisma.branch.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!branch) {
    const err = new Error('BRANCH_NOT_FOUND');
    (err as any).statusCode = 404;
    (err as any).errorCode = 'BRANCH_NOT_FOUND';
    throw err;
  }

  return branch;
}

/**
 * Adapter chuyển đổi Prisma Order (kèm items, modifiers, session, table, transactions)
 * sang LiveOrder DTO mà giao diện KDS đang tiêu thụ.
 */
function mapPrismaOrderToLiveOrder(order: any): LiveOrder {
  const createdAtDate = new Date(order.createdAt);
  const timeStr = createdAtDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const session = order.session;
  const table = session?.table;
  const transactions = session?.transactions || [];
  const paidTx = transactions.find((t: any) => t.status === 'PAID');

  let countdownSeconds = 0;
  if (order.status !== 'DONE' && order.status !== 'CANCELLED') {
    const elapsedSeconds = Math.floor((Date.now() - createdAtDate.getTime()) / 1000);
    countdownSeconds = Math.max(0, 600 - elapsedSeconds);
  }

  const items: OrderItemDetail[] = (order.items || []).map((item: any) => {
    const modNames = (item.modifiers || []).map((m: any) => m.modifierName).join(' | ');
    let note = item.note || undefined;
    if (modNames) {
      note = note ? `${note} (${modNames})` : modNames;
    }

    return {
      id: item.id,
      name: item.itemName,
      quantity: item.quantity,
      price: item.unitPrice,
      note,
      imageUrl: undefined, // Ghi nợ: join MenuItem.imageUrl nếu cần
      status: item.status,
    };
  });

  return {
    id: order.id,
    code: order.orderCode,
    time: timeStr,
    orderType: order.orderType,
    status: order.status,
    items,
    note: order.note || undefined,
    total: order.totalAmount,
    paymentStatus: paidTx ? 'PAID' : 'UNPAID',
    paymentMethod: paidTx?.method || undefined,
    customerName: session?.customer?.name || undefined,
    tableId: table?.id || session?.tableId || undefined,
    tableName: table?.name || undefined,
    branchId: order.branchId,
    tenantId: order.tenantId,
    countdownSeconds,
    createdAt: createdAtDate.toISOString(),
  };
}

export class OrderService {
  /**
   * Lấy danh sách đơn hàng active của chi nhánh từ Prisma.
   * Lọc bỏ các đơn đã DONE hoặc CANCELLED (chuyển sang history).
   */
  static async getActiveOrders(branchId: string = 'default-branch', _view?: string): Promise<LiveOrder[]> {
    const branch = await resolveBranch(branchId);

    const orders = await prisma.order.findMany({
      where: {
        branchId: branch.id,
        tenantId: branch.tenantId,
        status: {
          notIn: ['DONE', 'CANCELLED'],
        },
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        session: {
          include: {
            table: true,
            customer: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map(mapPrismaOrderToLiveOrder);
  }

  /**
   * Lấy chi tiết đơn hàng theo ID và branchId.
   */
  static async getOrderById(orderId: string, branchId: string = 'default-branch'): Promise<LiveOrder | undefined> {
    const branch = await resolveBranch(branchId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: branch.id,
        tenantId: branch.tenantId,
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        session: {
          include: {
            table: true,
            customer: true,
            transactions: true,
          },
        },
      },
    });

    return order ? mapPrismaOrderToLiveOrder(order) : undefined;
  }

  /**
   * Cập nhật trạng thái đơn hàng (order-level) xuống Prisma và bắn socket ORDER_UPDATED.
   */
  static async updateOrderStatus(
    orderId: string,
    status: LiveOrderStatus,
    branchId: string = 'default-branch'
  ): Promise<LiveOrder> {
    const branch = await resolveBranch(branchId);

    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: branch.id,
        tenantId: branch.tenantId,
      },
    });

    if (!existing) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        ...(status === 'DONE'
          ? {
              items: {
                updateMany: {
                  where: { status: { not: 'CANCELLED' } },
                  data: { status: 'DONE' },
                },
              },
            }
          : {}),
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        session: {
          include: {
            table: true,
            customer: true,
            transactions: true,
          },
        },
      },
    });

    const liveOrder = mapPrismaOrderToLiveOrder(updated);

    try {
      emitToBranch(branch.id, SOCKET_EVENTS.ORDER_UPDATED, {
        orderId: liveOrder.id,
        status: liveOrder.status,
        updatedAt: new Date().toISOString(),
        branchId: branch.id,
      });
    } catch (socketErr: any) {
      logger.warn(`[OrderService] Socket emission error: ${socketErr.message}`);
    }

    return liveOrder;
  }

  /**
   * Cập nhật trạng thái từng món ăn (item-level) xuống Prisma và bắn socket ORDER_ITEM_STATUS.
   */
  static async updateItemStatus(
    orderId: string,
    itemId: string,
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'DONE' | 'CANCELLED',
    branchId: string = 'default-branch'
  ): Promise<OrderItemDetail> {
    const branch = await resolveBranch(branchId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: branch.id,
        tenantId: branch.tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: status as any,
      },
      include: {
        modifiers: true,
      },
    });

    try {
      emitToBranch(branch.id, SOCKET_EVENTS.ORDER_ITEM_STATUS, {
        orderId,
        itemId,
        status,
        branchId: branch.id,
      });
    } catch (socketErr: any) {
      logger.warn(`[OrderService] Socket emission error: ${socketErr.message}`);
    }

    return {
      id: updatedItem.id,
      name: updatedItem.itemName,
      quantity: updatedItem.quantity,
      price: updatedItem.unitPrice,
      note: updatedItem.note || undefined,
      status: updatedItem.status as any,
    };
  }

  /**
   * Hủy đơn hàng: đổi status thành CANCELLED (không xóa dòng trong DB) và bắn socket ORDER_VOIDED.
   */
  static async voidOrder(
    orderId: string,
    reason: string,
    branchId: string = 'default-branch'
  ): Promise<LiveOrder> {
    const branch = await resolveBranch(branchId);

    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId: branch.id,
        tenantId: branch.tenantId,
      },
    });

    if (!existing) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const voided = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        items: {
          updateMany: {
            where: {},
            data: { status: 'CANCELLED' },
          },
        },
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        session: {
          include: {
            table: true,
            customer: true,
            transactions: true,
          },
        },
      },
    });

    const liveOrder = mapPrismaOrderToLiveOrder(voided);

    try {
      emitToBranch(branch.id, SOCKET_EVENTS.ORDER_VOIDED, {
        orderId: liveOrder.id,
        reason,
        branchId: branch.id,
        voidedAt: new Date().toISOString(),
      });
    } catch (socketErr: any) {
      logger.warn(`[OrderService] Socket emission error: ${socketErr.message}`);
    }

    return liveOrder;
  }

  /**
   * Lấy lịch sử đơn hàng từ Prisma có phân trang và lọc theo khoảng thời gian/mã đơn.
   */
  static async getOrderHistory(
    branchId: string = 'default-branch',
    page: number = 1,
    limit: number = 20,
    search?: string,
    startDate?: string,
    endDate?: string
  ) {
    const branch = await resolveBranch(branchId);

    const where: any = {
      branchId: branch.id,
      tenantId: branch.tenantId,
    };

    if (search && search.trim()) {
      where.orderCode = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              modifiers: true,
            },
          },
          session: {
            include: {
              table: true,
              customer: true,
              transactions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: safeLimit,
      }),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
      orders: orders.map(mapPrismaOrderToLiveOrder),
      total,
      page: safePage,
      totalPages,
    };
  }

  /**
   * Giữ nguyên method createOrder mock không đụng tới (tránh regression).
   */
  static createOrder(
    data: Omit<LiveOrder, 'id' | 'code' | 'time' | 'status' | 'createdAt'>,
    branchId: string = 'default-branch'
  ): LiveOrder {
    const newCode = `#${100 + Date.now() % 1000}`;
    const newOrder: LiveOrder = {
      ...data,
      id: `ord-${Date.now()}`,
      code: newCode,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING',
      branchId: branchId || data.branchId || 'default-branch',
      tenantId: data.tenantId || 'default-tenant',
      createdAt: new Date().toISOString(),
      countdownSeconds: 600,
    };

    try {
      emitToBranch(newOrder.branchId, SOCKET_EVENTS.ORDER_NEW, {
        orderId: newOrder.id,
        orderNumber: newOrder.code,
        tableId: newOrder.tableId,
        tableName: newOrder.tableName,
        totalAmount: newOrder.total,
        itemCount: newOrder.items.reduce((s, i) => s + i.quantity, 0),
        items: newOrder.items,
        createdAt: newOrder.createdAt,
      });
    } catch (e: any) {
      logger.warn(`[OrderService] createOrder mock socket emission error: ${e.message}`);
    }

    return newOrder;
  }
}
