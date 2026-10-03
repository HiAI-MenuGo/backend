import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface CreateSessionOrderItemInput {
  menuItemId: string;
  name?: string;
  price?: number;
  quantity: number;
  note?: string | null;
  modifiers?: Array<{
    groupId?: string;
    groupName?: string;
    optionId?: string;
    optionName?: string;
    extraPrice?: number;
  }>;
}

export interface CreateSessionOrderInput {
  tableId: string;
  items: CreateSessionOrderItemInput[];
  voucherCode?: string | null;
  discountAmount?: number;
  totalAmount?: number;
  note?: string | null;
}

export class SessionOrderService {
  /**
   * Tạo đơn hàng thật cho bàn trong một Prisma transaction duy nhất:
   * 1. Validate bàn tồn tại, active; chặn CLEANING (409).
   * 2. Lấy tenantId/branchId từ bàn làm source of truth.
   * 3. Tìm hoặc tạo OrderSession OPEN (code: SES-YYYYMMDD-###).
   * 4. Validate menu items cùng tenant; tính lại giá từ DB; map modifiers.
   * 5. Tạo Order (DINE_IN, PENDING, code: ORD-YYYYMMDD-###) + OrderItem[].
   * 6. Cập nhật subTotal/finalAmount của session; chuyển bàn sang OCCUPIED.
   * 7. Phát socket events: order:new, table:status-changed, session:updated.
   */
  static async createSessionOrder(input: CreateSessionOrderInput) {
    const { tableId, items, voucherCode, discountAmount = 0, note } = input;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra bàn tồn tại và hoạt động
      const table = await tx.table.findUnique({
        where: { id: tableId },
      });

      if (!table || !table.isActive) {
        const err = new Error('Bàn không tồn tại hoặc đã ngừng hoạt động');
        (err as any).statusCode = 404;
        (err as any).errorCode = 'TABLE_NOT_FOUND';
        throw err;
      }

      if (table.status === 'CLEANING') {
        const err = new Error('Bàn đang được dọn dẹp, vui lòng chờ nhân viên');
        (err as any).statusCode = 409;
        (err as any).errorCode = 'TABLE_NOT_READY';
        throw err;
      }

      const tenantId = table.tenantId;
      const branchId = table.branchId;

      // 2. Tìm hoặc tạo OrderSession OPEN
      let session = await tx.orderSession.findFirst({
        where: {
          tenantId,
          branchId,
          tableId: table.id,
          status: 'OPEN',
        },
      });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (!session) {
        const countSessionsToday = await tx.orderSession.count({
          where: {
            branchId,
            openedAt: { gte: startOfDay },
          },
        });
        const sessionSeq = String(countSessionsToday + 1).padStart(3, '0');
        const sessionCode = `SES-${dateStr}-${sessionSeq}`;

        session = await tx.orderSession.create({
          data: {
            tenantId,
            branchId,
            tableId: table.id,
            sessionCode,
            status: 'OPEN',
            subTotal: 0,
            discountAmount: 0,
            finalAmount: 0,
            voucherCode: voucherCode || null,
          },
        });
      }

      // 3. Query và validate Menu Items cùng tenant
      const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: menuItemIds },
          tenantId,
          isActive: true,
        },
      });
      const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

      for (const item of items) {
        if (!menuItemMap.has(item.menuItemId)) {
          const err = new Error(`Món ăn không hợp lệ hoặc đã ngừng phục vụ: ${item.menuItemId}`);
          (err as any).statusCode = 400;
          (err as any).errorCode = 'INVALID_MENU_ITEM';
          throw err;
        }
      }

      // 4. Map Modifiers theo modifierOptionId nếu khớp trong DB
      const optionIds = items
        .flatMap((i) => (i.modifiers || []).map((m) => m.optionId))
        .filter((id): id is string => Boolean(id));

      const dbModifierOptions =
        optionIds.length > 0
          ? await tx.modifierOption.findMany({
              where: {
                id: { in: optionIds },
                tenantId,
              },
            })
          : [];
      const optionMap = new Map(dbModifierOptions.map((o) => [o.id, o]));

      let orderSubTotal = 0;
      const orderItemsToCreate: Array<{
        menuItemId: string;
        itemName: string;
        unitPrice: number;
        quantity: number;
        totalPrice: number;
        note: string | null;
        modifiers: Array<{
          modifierOptionId: string;
          modifierName: string;
          extraPrice: number;
        }>;
      }> = [];

      for (const item of items) {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        let itemModifiersExtra = 0;
        const matchedModifiers: Array<{
          modifierOptionId: string;
          modifierName: string;
          extraPrice: number;
        }> = [];

        for (const mod of item.modifiers || []) {
          if (mod.optionId && optionMap.has(mod.optionId)) {
            const dbOption = optionMap.get(mod.optionId)!;
            itemModifiersExtra += dbOption.extraPrice;
            matchedModifiers.push({
              modifierOptionId: dbOption.id,
              modifierName: dbOption.name,
              extraPrice: dbOption.extraPrice,
            });
          } else {
            // Không khớp modifierOption DB: gộp extraPrice vào giá (ghi nợ tài liệu)
            const fallbackExtra =
              typeof mod.extraPrice === 'number' && !isNaN(mod.extraPrice) ? mod.extraPrice : 0;
            itemModifiersExtra += fallbackExtra;
          }
        }

        const calculatedUnitPrice = menuItem.basePrice + itemModifiersExtra;
        const calculatedTotalPrice = calculatedUnitPrice * item.quantity;
        orderSubTotal += calculatedTotalPrice;

        orderItemsToCreate.push({
          menuItemId: menuItem.id,
          itemName: menuItem.name,
          unitPrice: calculatedUnitPrice,
          quantity: item.quantity,
          totalPrice: calculatedTotalPrice,
          note: item.note || null,
          modifiers: matchedModifiers,
        });
      }

      // 5. Sinh mã đơn hàng ORD-YYYYMMDD-### và tạo Order
      const countOrdersToday = await tx.order.count({
        where: {
          branchId,
          createdAt: { gte: startOfDay },
        },
      });
      const orderSeq = String(countOrdersToday + 1).padStart(3, '0');
      const orderCode = `ORD-${dateStr}-${orderSeq}`;

      const safeDiscount = Math.max(0, discountAmount);
      const orderTotalAmount = Math.max(0, orderSubTotal - safeDiscount);

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          branchId,
          sessionId: session.id,
          orderCode,
          orderType: 'DINE_IN',
          status: 'PENDING',
          totalAmount: orderTotalAmount,
          note: note || null,
          items: {
            create: orderItemsToCreate.map((oi) => ({
              menuItemId: oi.menuItemId,
              itemName: oi.itemName,
              unitPrice: oi.unitPrice,
              quantity: oi.quantity,
              totalPrice: oi.totalPrice,
              status: 'PENDING',
              note: oi.note,
              modifiers: {
                create: oi.modifiers.map((m) => ({
                  modifierOptionId: m.modifierOptionId,
                  modifierName: m.modifierName,
                  extraPrice: m.extraPrice,
                })),
              },
            })),
          },
        },
        include: {
          items: {
            include: {
              modifiers: true,
            },
          },
        },
      });

      // 6. Cộng dồn subTotal/finalAmount của session
      const newSubTotal = session.subTotal + orderSubTotal;
      const newDiscountAmount = session.discountAmount + safeDiscount;
      const newFinalAmount = Math.max(0, newSubTotal - newDiscountAmount);

      const updatedSession = await tx.orderSession.update({
        where: { id: session.id },
        data: {
          subTotal: newSubTotal,
          discountAmount: newDiscountAmount,
          finalAmount: newFinalAmount,
          ...(voucherCode && !session.voucherCode ? { voucherCode } : {}),
        },
      });

      // 7. Chuyển bàn EMPTY/RESERVED sang OCCUPIED
      let tableStatusChanged = false;
      if (table.status === 'EMPTY' || table.status === 'RESERVED') {
        await tx.table.update({
          where: { id: table.id },
          data: { status: 'OCCUPIED' },
        });
        tableStatusChanged = true;
      }

      return {
        session: updatedSession,
        order: createdOrder,
        table,
        tableStatusChanged,
        branchId,
      };
    });

    // 8. Bắn Socket Events ngoài transaction
    try {
      // a. order:new (Bắt buộc KDS thấy đơn)
      emitToBranch(result.branchId, SOCKET_EVENTS.ORDER_NEW, {
        id: result.order.id,
        orderId: result.order.id,
        orderCode: result.order.orderCode,
        orderNumber: result.order.orderCode,
        tableId: result.table.id,
        tableName: result.table.name,
        orderType: 'DINE_IN',
        status: 'PENDING',
        totalAmount: result.order.totalAmount,
        itemCount: result.order.items.reduce((acc, i) => acc + i.quantity, 0),
        items: result.order.items.map((i) => ({
          id: i.id,
          name: i.itemName,
          quantity: i.quantity,
          note: i.note || undefined,
          status: 'PENDING',
          modifiers: i.modifiers.map((m) => ({
            optionName: m.modifierName,
            extraPrice: m.extraPrice,
          })),
        })),
        createdAt: result.order.createdAt.toISOString(),
      });

      // b. table:status-changed (TECHS §7, §9)
      if (result.tableStatusChanged) {
        emitToBranch(result.branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
          tableId: result.table.id,
          tableName: result.table.name,
          status: 'OCCUPIED',
          branchId: result.branchId,
          currentSessionId: result.session.id,
        });
      }

      // c. session:updated (Có trong socket/events.ts)
      emitToBranch(result.branchId, SOCKET_EVENTS.SESSION_UPDATED, {
        sessionId: result.session.id,
        tableId: result.table.id,
        subTotal: result.session.subTotal,
        discountAmount: result.session.discountAmount,
        finalAmount: result.session.finalAmount,
      });
    } catch (socketErr: any) {
      logger.warn(`[SessionOrderService] Socket emission error: ${socketErr.message}`);
    }

    return {
      session: result.session,
      order: result.order,
    };
  }
}
