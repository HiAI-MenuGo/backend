import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { emitToBranch, SOCKET_EVENTS } from '../socket';
import { VoucherQuoteService } from './voucher-quote.service';

export interface CreateSessionOrderItemInput {
  menuItemId: string;
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
  note?: string | null;
}

export class SessionOrderService {
  /**
   * Tạo đơn hàng thật cho bàn trong một Prisma transaction duy nhất:
   * 1. Validate bàn tồn tại, active; chặn CLEANING (409).
   * 2. Lấy tenantId/branchId từ bàn làm source of truth.
   * 3. Tìm hoặc tạo OrderSession OPEN (code: SES-YYYYMMDD-###, tenantId+branchId).
   * 4. Validate menu items cùng tenant; tính lại giá từ DB; map modifiers.
   * 5. Voucher/discount engine: chỉ áp dụng khi session.discountAmount === 0, không tin client.
   * 6. Tạo Order (DINE_IN, PENDING, code: ORD-YYYYMMDD-###) + OrderItem[].
   * 7. Cộng dồn subTotal/finalAmount của session (discount áp dụng 1 lần duy nhất); bàn -> OCCUPIED.
   * 8. Retry tối đa 3 lần khi xung đột race-condition (P2002) trên sessionCode/orderCode -> 500 ORDER_CODE_CONFLICT.
   * 9. Phát socket events: order:new, table:status-changed, session:updated.
   */
  static async createSessionOrder(input: CreateSessionOrderInput) {
    const { tableId, items, voucherCode, note } = input;
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
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

          // Khóa hàng Table (FOR UPDATE) để tuần tự hóa các request đồng thời trên cùng bàn
          await tx.$executeRaw`SELECT "id" FROM "Table" WHERE "id" = ${tableId} FOR UPDATE`;

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
            // Count sessions today với tenantId + branchId (H1)
            const countSessionsToday = await tx.orderSession.count({
              where: {
                tenantId,
                branchId,
                openedAt: { gte: startOfDay },
              },
            });

            // Tìm sessionCode lớn nhất trong ngày để tránh trùng lặp khi chạy song song
            const latestSession = await tx.orderSession.findFirst({
              where: {
                tenantId,
                branchId,
                sessionCode: { startsWith: `SES-${dateStr}-` },
              },
              orderBy: { sessionCode: 'desc' },
              select: { sessionCode: true },
            });

            let nextSessionSeq = countSessionsToday + 1;
            if (latestSession) {
              const match = latestSession.sessionCode.match(/SES-\d+-(\d+)/);
              if (match) {
                nextSessionSeq = Math.max(nextSessionSeq, parseInt(match[1], 10) + 1);
              }
            }

            const sessionSeq = String(nextSessionSeq + (attempt > 0 ? attempt : 0)).padStart(3, '0');
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
                voucherCode: null,
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

          // 5. H2 - Discount engine & voucher calculation
          let orderDiscount = 0;
          let appliedVoucherCode: string | null = null;

          // Luật session: voucher chỉ áp dụng khi session.discountAmount === 0 (đơn đầu mang voucher)
          if (session.discountAmount === 0 && voucherCode) {
            const quote = await VoucherQuoteService.validateVoucherForOrder(
              tenantId,
              voucherCode,
              orderSubTotal
            );
            if (quote.valid) {
              orderDiscount = quote.discountAmount;
              appliedVoucherCode = quote.code || voucherCode.trim().toUpperCase();
            } else {
              logger.warn(`[SessionOrderService] Voucher invalid/expired: ${quote.errorCode} - ${quote.message}, order will be created without discount`);
            }
          }

          const orderTotalAmount = Math.max(0, orderSubTotal - orderDiscount);

          // 6. Sinh mã đơn hàng ORD-YYYYMMDD-### (tenantId + branchId)
          const countOrdersToday = await tx.order.count({
            where: {
              tenantId,
              branchId,
              createdAt: { gte: startOfDay },
            },
          });

          // Tìm orderCode lớn nhất trong ngày để tính next sequence
          const latestOrder = await tx.order.findFirst({
            where: {
              tenantId,
              branchId,
              orderCode: { startsWith: `ORD-${dateStr}-` },
            },
            orderBy: { orderCode: 'desc' },
            select: { orderCode: true },
          });

          let nextOrderSeq = countOrdersToday + 1;
          if (latestOrder) {
            const match = latestOrder.orderCode.match(/ORD-\d+-(\d+)/);
            if (match) {
              nextOrderSeq = Math.max(nextOrderSeq, parseInt(match[1], 10) + 1);
            }
          }

          const orderSeq = String(nextOrderSeq + (attempt > 0 ? attempt : 0)).padStart(3, '0');
          const orderCode = `ORD-${dateStr}-${orderSeq}`;

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

          // 7. Cập nhật OrderSession: cộng dồn subTotal, discount tính đúng 1 lần
          const newSubTotal = session.subTotal + orderSubTotal;
          const newDiscountAmount = session.discountAmount + orderDiscount;
          const newFinalAmount = Math.max(0, newSubTotal - newDiscountAmount);

          const updatedSession = await tx.orderSession.update({
            where: { id: session.id },
            data: {
              subTotal: newSubTotal,
              discountAmount: newDiscountAmount,
              finalAmount: newFinalAmount,
              ...(appliedVoucherCode && !session.voucherCode ? { voucherCode: appliedVoucherCode } : {}),
            },
          });

          // 8. Chuyển bàn EMPTY/RESERVED sang OCCUPIED
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

        // 9. Bắn Socket Events ngoài transaction
        try {
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

          if (result.tableStatusChanged) {
            emitToBranch(result.branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
              tableId: result.table.id,
              tableName: result.table.name,
              status: 'OCCUPIED',
              branchId: result.branchId,
              currentSessionId: result.session.id,
            });
          }

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
      } catch (err: any) {
        if (err.code === 'P2002') {
          logger.warn(`[SessionOrderService] Unique code collision (P2002), retrying attempt ${attempt + 1}/${MAX_RETRIES}...`);
          attempt++;
          if (attempt >= MAX_RETRIES) {
            const conflictErr = new Error('Xung đột mã đơn hàng do nhiều yêu cầu đồng thời, vui lòng thử lại');
            (conflictErr as any).statusCode = 500;
            (conflictErr as any).errorCode = 'ORDER_CODE_CONFLICT';
            throw conflictErr;
          }
          // Jitter backoff (10ms - 50ms) để giải tỏa đồng thời
          await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 40 + 10)));
          continue;
        }
        throw err;
      }
    }

    const conflictErr = new Error('Xung đột mã đơn hàng do nhiều yêu cầu đồng thời, vui lòng thử lại');
    (conflictErr as any).statusCode = 500;
    (conflictErr as any).errorCode = 'ORDER_CODE_CONFLICT';
    throw conflictErr;
  }
}
