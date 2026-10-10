import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { emitToBranch, emitToTable, SOCKET_EVENTS, SocketEventType } from '../socket';

/** Mirror order-level update tới table room để QR guest của đúng bàn nhận được. */
function emitOrderToTable(liveOrder: LiveOrder, event: SocketEventType, extra?: Record<string, unknown>) {
  if (!liveOrder.tableId) return;
  try {
    emitToTable(liveOrder.tableId, event, {
      orderId: liveOrder.id,
      status: liveOrder.status,
      updatedAt: new Date().toISOString(),
      branchId: liveOrder.branchId,
      ...extra,
    });
  } catch (socketErr: any) {
    logger.warn(`[OrderService] Table socket emission error: ${socketErr.message}`);
  }
}

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
  branchName?: string;
  branchCode?: string;
  countdownSeconds?: number;
  createdAt: string;
}

/**
 * Helper phân giải branchId query thành record Branch trong DB.
 * Chặn IDOR: lấy tenantId từ Branch làm source of truth.
 * Hỗ trợ alias 'default-branch' để tương thích KDS/dev mode.
 */
async function resolveBranch(branchId: string, userTenantId?: string) {
  if (branchId === 'ALL') {
    // ALL chỉ hợp lệ khi đã biết tenant (ADMIN xem toàn công ty). Fail-closed nếu thiếu.
    if (!userTenantId) {
      const err = new Error('BRANCH_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'BRANCH_NOT_FOUND';
      throw err;
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: userTenantId },
    });
    if (!tenant) {
      const err = new Error('BRANCH_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'BRANCH_NOT_FOUND';
      throw err;
    }
    const tenantId = tenant.id;
    return {
      id: 'ALL',
      tenantId: tenantId,
      name: 'Tổng chi nhánh (Toàn công ty)',
      code: 'ALL',
      address: 'Toàn hệ thống',
      phone: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  let branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch && (branchId === 'default-branch' || !branchId)) {
    // Alias legacy: chỉ resolve khi đã biết tenant (fail-closed, chặn rò sang tenant khác)
    if (!userTenantId) {
      const err = new Error('BRANCH_NOT_FOUND');
      (err as any).statusCode = 404;
      (err as any).errorCode = 'BRANCH_NOT_FOUND';
      throw err;
    }
    branch = await prisma.branch.findFirst({
      where: {
        isActive: true,
        tenantId: userTenantId,
        orders: { some: {} },
      },
    });
    if (!branch) {
      branch = await prisma.branch.findFirst({
        where: {
          isActive: true,
          tenantId: userTenantId,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  if (!branch) {
    const err = new Error('BRANCH_NOT_FOUND');
    (err as any).statusCode = 404;
    (err as any).errorCode = 'BRANCH_NOT_FOUND';
    throw err;
  }

  // Defense in depth: branch resolve được phải thuộc tenant yêu cầu (chặn IDOR)
  if (userTenantId && branch.tenantId !== userTenantId && branch.id !== 'ALL') {
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
      imageUrl: item.menuItem?.imageUrl || undefined,
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
    branchName: order.branch?.name || undefined,
    branchCode: order.branch?.code || undefined,
    countdownSeconds,
    createdAt: createdAtDate.toISOString(),
  };
}

export class OrderService {
  /**
   * Lấy danh sách đơn hàng active của chi nhánh từ Prisma.
   * Lọc bỏ các đơn đã DONE hoặc CANCELLED (chuyển sang history).
   */
  static async getActiveOrders(branchId: string = 'default-branch', _view?: string, userTenantId?: string): Promise<LiveOrder[]> {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const orders = await prisma.order.findMany({
      where: {
        tenantId: branch.tenantId,
        ...branchFilter,
        status: {
          notIn: ['DONE', 'CANCELLED'],
        },
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            modifiers: true,
            menuItem: {
              select: {
                imageUrl: true,
              },
            },
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
  static async getOrderById(orderId: string, branchId: string = 'default-branch', userTenantId?: string): Promise<LiveOrder | undefined> {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...branchFilter,
        tenantId: branch.tenantId,
      },
      include: {
        items: {
          include: {
            modifiers: true,
            menuItem: {
              select: {
                imageUrl: true,
              },
            },
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
    branchId: string = 'default-branch',
    userTenantId?: string
  ): Promise<LiveOrder> {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...branchFilter,
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
            menuItem: {
              select: {
                imageUrl: true,
              },
            },
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
    emitOrderToTable(liveOrder, SOCKET_EVENTS.ORDER_UPDATED);

    return liveOrder;
  }

  /**
   * Cập nhật trạng thái từng món ăn (item-level) xuống Prisma và bắn socket ORDER_ITEM_STATUS.
   */
  static async updateItemStatus(
    orderId: string,
    itemId: string,
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'DONE' | 'CANCELLED',
    branchId: string = 'default-branch',
    userTenantId?: string
  ): Promise<OrderItemDetail> {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...branchFilter,
        tenantId: branch.tenantId,
      },
      include: {
        items: true,
        session: {
          select: { tableId: true, table: { select: { id: true } } },
        },
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
        menuItem: {
          select: {
            imageUrl: true,
          },
        },
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
    // QR guest của đúng bàn cũng nhận trạng thái món
    try {
      const tableId = order.session?.table?.id || (order.session as any)?.tableId;
      if (tableId) {
        emitToTable(tableId, SOCKET_EVENTS.ORDER_ITEM_STATUS, {
          orderId,
          itemId,
          status,
          branchId: branch.id,
        });
      }
    } catch (socketErr: any) {
      logger.warn(`[OrderService] Table socket emission error: ${socketErr.message}`);
    }

    // Cascade: Auto-DONE order khi mon xong het (>= 1 DONE, tat ca thuoc DONE hoac CANCELLED)
    if (order.status !== 'DONE' && order.status !== 'CANCELLED') {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: { status: true },
      });

      const allFinished =
        orderItems.length > 0 &&
        orderItems.every((it) => it.status === 'DONE' || it.status === 'CANCELLED');
      const hasDone = orderItems.some((it) => it.status === 'DONE');

      if (allFinished && hasDone) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'DONE' },
        });

        try {
          emitToBranch(branch.id, SOCKET_EVENTS.ORDER_UPDATED, {
            orderId: order.id,
            status: 'DONE',
            updatedAt: new Date().toISOString(),
            branchId: branch.id,
          });
        } catch (socketErr: any) {
          logger.warn(`[OrderService] Socket emission error: ${socketErr.message}`);
        }
        try {
          const tableId = (order.session as any)?.table?.id || (order.session as any)?.tableId;
          if (tableId) {
            emitToTable(tableId, SOCKET_EVENTS.ORDER_UPDATED, {
              orderId: order.id,
              status: 'DONE',
              updatedAt: new Date().toISOString(),
              branchId: branch.id,
            });
          }
        } catch (socketErr: any) {
          logger.warn(`[OrderService] Table socket emission error: ${socketErr.message}`);
        }
      }
    }

    return {
      id: updatedItem.id,
      name: updatedItem.itemName,
      quantity: updatedItem.quantity,
      price: updatedItem.unitPrice,
      note: updatedItem.note || undefined,
      imageUrl: (updatedItem as any).menuItem?.imageUrl || undefined,
      status: updatedItem.status as any,
    };
  }

  /**
   * Hủy đơn hàng: đổi status thành CANCELLED (không xóa dòng trong DB) và bắn socket ORDER_VOIDED.
   */
  static async voidOrder(
    orderId: string,
    reason: string,
    branchId: string = 'default-branch',
    userTenantId?: string
  ): Promise<LiveOrder> {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const existing = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...branchFilter,
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
            menuItem: {
              select: {
                imageUrl: true,
              },
            },
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
    emitOrderToTable(liveOrder, SOCKET_EVENTS.ORDER_UPDATED, {
      voided: true,
      reason,
    });

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
    endDate?: string,
    userTenantId?: string
  ) {
    const branch = await resolveBranch(branchId, userTenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const where: any = {
      tenantId: branch.tenantId,
      ...branchFilter,
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        {
          orderCode: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          session: {
            table: {
              code: {
                contains: q,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
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
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          items: {
            include: {
              modifiers: true,
              menuItem: {
                select: {
                  imageUrl: true,
                },
              },
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
   * Xuất danh sách lịch sử đơn hàng ra file Excel (.xlsx) theo khoảng ngày và bộ lọc.
   */
  static async exportOrderHistoryExcel(params: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
    tenantId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const branch = await resolveBranch(params.branchId || 'default-branch', params.tenantId);
    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const where: any = {
      tenantId: branch.tenantId,
      ...branchFilter,
    };

    if (params.status && params.status !== 'ALL') {
      if (params.status === 'COMPLETED') {
        where.status = { not: 'CANCELLED' };
      } else if (params.status === 'VOIDED' || params.status === 'CANCELLED') {
        where.status = 'CANCELLED';
      } else {
        where.status = params.status;
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderCode: { contains: q, mode: 'insensitive' } },
        { session: { table: { name: { contains: q, mode: 'insensitive' } } } },
        { session: { customer: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    let startD: Date | undefined;
    let endD: Date | undefined;

    if (params.startDate) {
      const [sy, sm, sd] = params.startDate.split('-').map(Number);
      startD = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    }
    if (params.endDate) {
      const [ey, em, ed] = params.endDate.split('-').map(Number);
      endD = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    }

    if (startD || endD) {
      where.createdAt = {};
      if (startD) where.createdAt.gte = startD;
      if (endD) where.createdAt.lte = endD;
    }

    const [orders, tenant] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          items: {
            include: {
              modifiers: true,
              menuItem: {
                select: {
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
          session: {
            include: {
              table: true,
              customer: true,
              transactions: { where: { status: 'PAID' } },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.tenant.findUnique({
        where: { id: branch.tenantId },
        select: { name: true },
      }),
    ]);

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HiAI MenuGo';
    wb.created = new Date();

    const emeraldFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00A389' },
    };
    const headerFont: any = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const totalFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F7F4' },
    };
    const totalFont: any = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FF007A65' },
    };

    // Sheet 1: Danh Sách Đơn Hàng
    const ws1 = wb.addWorksheet('Danh Sách Đơn Hàng');
    ws1.views = [{ showGridLines: true }];

    const restaurantName = tenant?.name || 'HiAI-MenuGo Restaurant';
    const startDateStr = params.startDate || (orders.length > 0 ? orders[orders.length - 1].createdAt.toISOString().slice(0, 10) : 'Tất cả');
    const endDateStr = params.endDate || (orders.length > 0 ? orders[0].createdAt.toISOString().slice(0, 10) : 'Hiện tại');

    ws1.mergeCells('A1:K1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'BÁO CÁO DANH SÁCH ĐƠN HÀNG';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF00A389' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 30;

    ws1.mergeCells('A2:K2');
    const infoCell1 = ws1.getCell('A2');
    infoCell1.value = `Nhà hàng: ${restaurantName} | Chi nhánh: ${branch.name} (${branch.code})`;
    infoCell1.font = { name: 'Arial', size: 11, italic: true };
    infoCell1.alignment = { horizontal: 'center' };

    ws1.mergeCells('A3:K3');
    const infoCell2 = ws1.getCell('A3');
    infoCell2.value = `Khoảng ngày: Từ ${startDateStr} đến ${endDateStr}`;
    infoCell2.font = { name: 'Arial', size: 11, bold: true };
    infoCell2.alignment = { horizontal: 'center' };

    ws1.mergeCells('A4:K4');
    const infoCell3 = ws1.getCell('A4');
    infoCell3.value = `Thời điểm xuất file: ${new Date().toLocaleString('vi-VN')}`;
    infoCell3.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
    infoCell3.alignment = { horizontal: 'center' };

    ws1.addRow([]);

    const headers = [
      'STT',
      'Chi Nhánh',
      'Mã Đơn',
      'Bàn / Khách',
      'Thời Gian',
      'Số Lượng Món',
      'Chi Tiết Món Gọi',
      'Ghi Chú',
      'Hình Thức TT',
      'Trạng Thái',
      'Tổng Tiền (đ)',
    ];

    const headerRow = ws1.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = emeraldFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let stt = 1;
    let sumTotal = 0;
    let sumItems = 0;

    for (const ord of orders) {
      const itemsCount = ord.items.reduce((acc, i) => acc + i.quantity, 0);
      const itemsSummary = ord.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ');
      const paidTx = ord.session?.transactions?.[0];
      const methodStr = paidTx?.method === 'VIETQR' ? 'VietQR' : 'Tiền mặt';
      const statusStr = ord.status === 'DONE' ? 'Hoàn thành' : ord.status === 'CANCELLED' ? 'Đã hủy' : ord.status;
      const branchDisplay = ord.branch?.name || branch.name;

      if (ord.status !== 'CANCELLED') {
        sumTotal += ord.totalAmount;
      }
      sumItems += itemsCount;

      const row = ws1.addRow([
        stt++,
        branchDisplay,
        ord.orderCode,
        ord.session?.table?.name || ord.session?.customer?.name || 'Mang về',
        new Date(ord.createdAt).toLocaleString('vi-VN'),
        itemsCount,
        itemsSummary,
        ord.note || '',
        methodStr,
        statusStr,
        ord.totalAmount,
      ]);

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'left' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'left' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).numFmt = '#,##0';
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'left' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).numFmt = '#,##0';
      row.getCell(10).alignment = { horizontal: 'right' };
    }

    const totalRow = ws1.addRow([
      '',
      'TỔNG CỘNG',
      `${orders.length} đơn`,
      '',
      sumItems,
      '',
      '',
      '',
      '',
      sumTotal,
    ]);
    totalRow.height = 24;
    totalRow.eachCell((cell) => {
      cell.fill = totalFill;
      cell.font = totalFont;
    });
    totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(5).numFmt = '#,##0';
    totalRow.getCell(10).numFmt = '#,##0';
    totalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

    // Sheet 2: Chi Tiết Món Đã Bán
    const ws2 = wb.addWorksheet('Chi Tiết Món Đã Bán');
    ws2.views = [{ showGridLines: true }];

    const headers2 = ['STT', 'Mã Đơn', 'Bàn', 'Tên Món', 'Danh Mục', 'Số Lượng', 'Đơn Giá (đ)', 'Thành Tiền (đ)', 'Ghi Chú'];
    const headerRow2 = ws2.addRow(headers2);
    headerRow2.height = 24;
    headerRow2.eachCell((cell) => {
      cell.fill = emeraldFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let itIdx = 1;
    for (const ord of orders) {
      for (const it of ord.items) {
        const row = ws2.addRow([
          itIdx++,
          ord.orderCode,
          ord.session?.table?.name || 'Mang về',
          it.itemName,
          it.menuItem?.category?.name || 'Khác',
          it.quantity,
          it.unitPrice,
          it.totalPrice,
          it.note || '',
        ]);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(6).numFmt = '#,##0';
        row.getCell(7).numFmt = '#,##0';
        row.getCell(8).numFmt = '#,##0';
      }
    }

    // Auto-fit widths
    [ws1, ws2].forEach((ws) => {
      ws.columns.forEach((col: any) => {
        let maxLen = 12;
        col.eachCell?.({ includeEmpty: false }, (cell: any) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = Math.min(val.length + 3, 50);
        });
        col.width = maxLen;
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const filename = `Lich-su-don-hang-${startDateStr}_den_${endDateStr}.xlsx`;
    return {
      buffer: Buffer.from(buf),
      filename,
    };
  }
}
