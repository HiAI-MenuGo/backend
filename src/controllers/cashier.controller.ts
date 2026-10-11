import { Request, Response } from 'express';
import {
  PaymentStatus,
  PaymentMethod,
  SessionStatus,
  TableStatus,
  OrderStatus,
} from '@prisma/client';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import { VietQRService } from '../services/payment/vietqr.service';
import { emitToBranch, emitToTenant, emitToTable, SOCKET_EVENTS } from '../socket';
import logger from '../utils/logger';

export interface PendingSessionItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  status?: string;
}

export interface PendingSession {
  sessionId: string;
  tableId: string;
  tableName: string;
  total: number;
  customerName?: string;
  items: PendingSessionItem[];
  createdAt: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
}

// Bộ nhớ đệm tạm thời cho giao dịch QR (đối soát nhanh)
const activeQRTransactions = new Map<
  string,
  { sessionId: string; amount: number; branchId: string; transactionId?: string }
>();

export class CashierController {
  /**
   * GET /api/cashier/pending hoặc /api/sessions/pending-payment
   * Lấy danh sách các bàn/phiên đang chờ thanh toán THẬT từ Database
   */
  static async getPendingPayments(req: Request, res: Response) {
    try {
      // Scope bắt buộc theo tenantContext đã validate (chặn staff branch A xem sessions branch B)
      const ctx = req.tenantContext;
      if (!ctx) {
        return ApiResponse.error(res, 'TENANT_CONTEXT_REQUIRED', 'Không xác định được chi nhánh/quán', 400);
      }
      const { tenantId, branchId, role } = ctx;

      const whereClause: any = {
        status: { in: [SessionStatus.OPEN, SessionStatus.BILLING] },
        tenantId,
      };

      // ADMIN xem all-branch trong tenant; role khác chỉ branch mình
      if (role !== 'ADMIN' && role !== 'PLATFORM_ADMIN') {
        whereClause.branchId = branchId;
      } else if (branchId && branchId !== 'default-branch' && branchId !== 'ALL') {
        whereClause.branchId = branchId;
      }

      const activeSessions = await prisma.orderSession.findMany({
        where: whereClause,
        include: {
          table: true,
          customer: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          orders: {
            where: { status: { not: OrderStatus.CANCELLED } },
            include: {
              items: true,
            },
          },
        },
        orderBy: { openedAt: 'desc' },
      });

      const formatted: PendingSession[] = activeSessions.map((s) => {
        const items: PendingSessionItem[] = (s.orders || []).flatMap((o) =>
          (o.items || []).map((it) => ({
            id: it.id,
            name: it.itemName,
            quantity: it.quantity,
            price: it.unitPrice,
            note: it.note || undefined,
          }))
        );

        const ordersTotal = (s.orders || []).reduce(
          (sum, o) => sum + (o.totalAmount || 0),
          0
        );
        const total = s.finalAmount > 0 ? s.finalAmount : ordersTotal;

        return {
          sessionId: s.id,
          tableId: s.tableId || '',
          tableName: s.table?.name || `Bàn ${s.sessionCode}`,
          total,
          customerName: s.customer?.name || 'Khách tại bàn',
          items,
          createdAt: (s.openedAt || new Date()).toISOString(),
          branchId: s.branchId,
          branchName: s.branch?.name || undefined,
          branchCode: s.branch?.code || undefined,
        };
      });

      return ApiResponse.success(
        res,
        formatted,
        'Lấy danh sách bàn chờ thanh toán thành công'
      );
    } catch (err: any) {
      logger.error('getPendingPayments error', { stack: err?.stack });
      return ApiResponse.error(
        res,
        'FETCH_PENDING_PAYMENT_ERROR',
        err.message,
        500
      );
    }
  }

  /**
   * GET /api/sessions/:tableId/active
   * Lấy phiên bàn đang hoạt động theo tableId (dành cho màn hình khách thanh toán / xem trạng thái)
   */
  static async getActiveSessionByTable(req: Request, res: Response) {
    try {
      const { tableId } = req.params;
      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu tableId', 400);
      }

      // Public QR: chỉ trả phiên của đúng bàn được hỏi (tableId UUID không đoán được).
      // Kiểm tra bàn tồn tại + active để không lộ session của bàn đã xóa.
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: { id: true, isActive: true },
      });
      if (!table || !table.isActive) {
        return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Bàn không tồn tại', 404);
      }

      const session = await prisma.orderSession.findFirst({
        where: {
          tableId,
          status: { in: [SessionStatus.OPEN, SessionStatus.BILLING] },
        },
        include: {
          table: true,
          customer: true,
          orders: {
            where: { status: { not: OrderStatus.CANCELLED } },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { openedAt: 'desc' },
      });

      if (!session) {
        return ApiResponse.error(
          res,
          'NO_ACTIVE_SESSION',
          'Không tìm thấy đơn hàng đang mở tại bàn này',
          404
        );
      }

      const items: PendingSessionItem[] = (session.orders || []).flatMap((o) =>
        (o.items || []).map((it) => ({
          id: it.id,
          name: it.itemName,
          quantity: it.quantity,
          price: it.unitPrice,
          note: it.note || undefined,
          status: it.status,
        }))
      );

      const ordersTotal = (session.orders || []).reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0
      );
      const total = session.finalAmount > 0 ? session.finalAmount : ordersTotal;

      return ApiResponse.success(
        res,
        {
          sessionId: session.id,
          sessionCode: session.sessionCode,
          tableId: session.tableId,
          tableName: session.table?.name || 'Bàn phục vụ',
          status: session.status,
          subTotal: session.subTotal || ordersTotal,
          discountAmount: session.discountAmount || 0,
          total,
          items,
          orders: (session.orders || []).map((o) => ({
            id: o.id,
            orderCode: o.orderCode,
            status: o.status,
            totalAmount: o.totalAmount,
            createdAt: o.createdAt.toISOString(),
            items: (o.items || []).map((it) => ({
              id: it.id,
              name: it.itemName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              note: it.note,
              status: it.status,
            })),
          })),
          openedAt: session.openedAt.toISOString(),
        },
        'Lấy thông tin phiên bàn thành công'
      );
    } catch (err: any) {
      logger.error('getActiveSessionByTable error', { stack: err?.stack });
      return ApiResponse.error(
        res,
        'FETCH_ACTIVE_SESSION_ERROR',
        err.message,
        500
      );
    }
  }

  /**
   * GET /api/cashier/summary
   * Tổng hợp số liệu vận hành thu ngân & bếp
   */
  static async getActiveSummary(req: Request, res: Response) {
    try {
      const ctx = req.tenantContext;
      if (!ctx) {
        return ApiResponse.error(res, 'TENANT_CONTEXT_REQUIRED', 'Không xác định được chi nhánh/quán', 400);
      }
      const { tenantId, branchId, role } = ctx;

      const scopeBranch = role !== 'ADMIN' && role !== 'PLATFORM_ADMIN';
      const whereOrder: any = {
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
        tenantId,
        ...(scopeBranch ? { branchId } : {}),
      };
      const whereSession: any = {
        status: { in: [SessionStatus.OPEN, SessionStatus.BILLING] },
        tenantId,
        ...(scopeBranch ? { branchId } : {}),
      };

      const [pendingOrders, pendingPayment, soldOutCount, menuItemCount] =
        await Promise.all([
          prisma.order.count({ where: whereOrder }).catch(() => 0),
          prisma.orderSession.count({ where: whereSession }).catch(() => 0),
          prisma.menuItem.count({ where: { isSoldOut: true, tenantId } }).catch(() => 0),
          prisma.menuItem.count({ where: { isActive: true, tenantId } }).catch(() => 0),
        ]);

      const summary = {
        pendingOrders,
        pendingPayment,
        soldOutCount,
        menuItemCount,
      };

      return ApiResponse.success(res, summary, 'Lấy tổng hợp số liệu vận hành thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_SUMMARY_ERROR', err.message, 500);
    }
  }

  /**
   * POST /api/cashier/pay
   * Thanh toán TIỀN MẶT hoặc chốt đơn tại quầy — ghi nhận thẳng vào Database (PaymentTransaction)
   */
  static async payCash(req: Request, res: Response) {
    try {
      const {
        sessionId,
        cashReceived,
        paymentMethod = 'CASH',
        discountAmount: reqDiscount,
        voucherCode,
      } = req.body;

      if (!sessionId) {
        return ApiResponse.error(res, 'MISSING_SESSION_ID', 'Thiếu sessionId để thanh toán', 400);
      }

      const dbSession = await prisma.orderSession.findUnique({
        where: { id: sessionId },
        include: {
          table: true,
          orders: {
            where: { status: { not: OrderStatus.CANCELLED } },
          },
        },
      });

      if (!dbSession) {
        return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
      }

      // Chặn staff tenant/branch A thanh toán session của tenant/branch B (trả 404 để không lộ tồn tại)
      const payCtx = req.tenantContext;
      if (payCtx && payCtx.role !== 'PLATFORM_ADMIN') {
        if (dbSession.tenantId !== payCtx.tenantId) {
          return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
        }
        if (payCtx.role !== 'ADMIN' && dbSession.branchId !== payCtx.branchId) {
          return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
        }
      }

      if (dbSession.status === SessionStatus.CLOSED) {
        return ApiResponse.error(res, 'SESSION_ALREADY_CLOSED', 'Phiên bàn này đã được thanh toán trước đó', 400);
      }

      const ordersTotal = (dbSession.orders || []).reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0
      );
      const subTotalAmount = dbSession.subTotal > 0 ? dbSession.subTotal : ordersTotal;
      const discountAmount = reqDiscount !== undefined
        ? Math.max(0, Number(reqDiscount) || 0)
        : (dbSession.discountAmount || 0);
      const calculatedFinal = Math.max(0, subTotalAmount - discountAmount);
      const totalAmount = dbSession.finalAmount > 0 && reqDiscount === undefined
        ? dbSession.finalAmount
        : calculatedFinal;

      const received = Number(cashReceived) || totalAmount;
      if (received < totalAmount) {
        return ApiResponse.error(
          res,
          'INSUFFICIENT_CASH',
          `Số tiền khách đưa (${received.toLocaleString('vi-VN')}đ) không đủ (${totalAmount.toLocaleString('vi-VN')}đ)`,
          400
        );
      }

      const change = received - totalAmount;
      const pointsEarned = Math.floor(totalAmount / 10000);
      const branchId = dbSession.branchId;

      // Thực thi Prisma Transaction nguyên khối
      const result = await prisma.$transaction(async (tx) => {
        // 1. Tạo bản ghi giao dịch thanh toán thật trong CSDL
        const transaction = await tx.paymentTransaction.create({
          data: {
            sessionId: dbSession.id,
            amount: totalAmount,
            method: paymentMethod === 'VIETQR' ? PaymentMethod.VIETQR : PaymentMethod.CASH,
            status: PaymentStatus.PAID,
            paymentGateway: paymentMethod === 'VIETQR' ? 'VIETQR' : 'CASH',
            receivedAmount: received,
            changeAmount: change,
            paidAt: new Date(),
          },
        });

        // 2. Đóng phiên gọi món & lưu vết chiết khấu
        await tx.orderSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.CLOSED,
            closedAt: new Date(),
            subTotal: subTotalAmount,
            discountAmount: discountAmount,
            finalAmount: totalAmount,
            ...(voucherCode ? { voucherCode } : {}),
          },
        });

        // 3. Chuyển trạng thái các đơn hàng sang DONE
        await tx.order.updateMany({
          where: {
            sessionId,
            status: { not: OrderStatus.CANCELLED },
          },
          data: { status: OrderStatus.DONE },
        });

        // 4. Giải phóng bàn về EMPTY
        if (dbSession.tableId) {
          await tx.table.update({
            where: { id: dbSession.tableId },
            data: { status: TableStatus.EMPTY },
          });
        }

        // 5. Cộng điểm tích lũy thành viên nếu có
        if (dbSession.customerId && pointsEarned > 0) {
          await tx.customer.update({
            where: { id: dbSession.customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          }).catch(() => {});
        }

        return transaction;
      });

      // Phát sự kiện Realtime qua Socket.IO tới Branch và Tenant
      const paymentCompletedPayload = {
        sessionId: dbSession.id,
        tableId: dbSession.tableId,
        tableName: dbSession.table?.name || `Bàn ${dbSession.sessionCode}`,
        amount: totalAmount,
        method: paymentMethod || 'CASH',
        transactionId: result.id,
        completedAt: new Date().toISOString(),
      };
      emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, paymentCompletedPayload);
      emitToTenant(dbSession.tenantId, SOCKET_EVENTS.PAYMENT_COMPLETED, paymentCompletedPayload);

      const tableStatusPayload = {
        tableId: dbSession.tableId,
        tableName: dbSession.table?.name || '',
        status: TableStatus.EMPTY,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tableStatusPayload);
      emitToTenant(dbSession.tenantId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tableStatusPayload);

      const sessionUpdatedPayload = {
        sessionId: dbSession.id,
        status: SessionStatus.CLOSED,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.SESSION_UPDATED, sessionUpdatedPayload);
      emitToTenant(dbSession.tenantId, SOCKET_EVENTS.SESSION_UPDATED, sessionUpdatedPayload);

      // QR guest của đúng bàn cũng nhận thanh toán hoàn tất
      if (dbSession.tableId) {
        emitToTable(dbSession.tableId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
          sessionId: dbSession.id,
          tableId: dbSession.tableId,
          amount: totalAmount,
          method: paymentMethod || 'CASH',
          transactionId: result.id,
          completedAt: new Date().toISOString(),
        });
        emitToTable(dbSession.tableId, SOCKET_EVENTS.SESSION_UPDATED, {
          sessionId: dbSession.id,
          status: SessionStatus.CLOSED,
          branchId,
        });
      }

      return ApiResponse.success(
        res,
        {
          success: true,
          total: totalAmount,
          cashReceived: received,
          change,
          pointsEarned,
          receiptId: result.id,
          paymentTransactionId: result.id,
        },
        'Thanh toán tiền mặt thành công'
      );
    } catch (err: any) {
      logger.error('payCash error', { stack: err?.stack });
      return ApiResponse.error(res, 'PAY_CASH_ERROR', err.message, 500);
    }
  }

  /**
   * POST /api/cashier/create-qr
   * Tạo mã VietQR động và lưu bản ghi PaymentTransaction PENDING vào Database
   */
  static async createVietQR(req: Request, res: Response) {
    try {
      const { sessionId, amount } = req.body;
      if (!sessionId) {
        return ApiResponse.error(res, 'MISSING_SESSION_ID', 'Thiếu sessionId để sinh mã QR', 400);
      }

      const dbSession = await prisma.orderSession.findUnique({
        where: { id: sessionId },
        include: {
          table: true,
          orders: {
            where: { status: { not: OrderStatus.CANCELLED } },
          },
        },
      });

      if (!dbSession) {
        return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
      }

      // Chặn staff tenant/branch A sinh QR cho session của tenant/branch B
      const qrCtx = req.tenantContext;
      if (qrCtx && qrCtx.role !== 'PLATFORM_ADMIN') {
        if (dbSession.tenantId !== qrCtx.tenantId) {
          return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
        }
        if (qrCtx.role !== 'ADMIN' && dbSession.branchId !== qrCtx.branchId) {
          return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại', 404);
        }
      }

      if (dbSession.status === SessionStatus.CLOSED) {
        return ApiResponse.error(res, 'SESSION_ALREADY_CLOSED', 'Phiên bàn này đã được thanh toán', 400);
      }

      const ordersTotal = (dbSession.orders || []).reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0
      );
      const sessionTotal = dbSession.finalAmount > 0 ? dbSession.finalAmount : ordersTotal;
      const payAmount = Number(amount) || sessionTotal || 10000;

      const tenantId = dbSession.tenantId;
      const branchId = dbSession.branchId;

      // Sinh mã VietQR động từ dịch vụ Napas
      const qrResult = await VietQRService.generateDynamicQR({
        sessionId: dbSession.id,
        amount: payAmount,
        tenantId,
      });

      // Tạo giao dịch PENDING trong Database
      const paymentTx = await prisma.paymentTransaction.create({
        data: {
          sessionId: dbSession.id,
          amount: payAmount,
          method: PaymentMethod.VIETQR,
          status: PaymentStatus.PENDING,
          referenceNo: qrResult.transactionRef,
          qrContent: qrResult.qrCode,
          paymentGateway: 'VIETQR',
        },
      });

      // Lưu bộ nhớ đệm phục vụ đối soát nhanh Webhook
      activeQRTransactions.set(qrResult.transactionRef, {
        sessionId: dbSession.id,
        amount: payAmount,
        branchId,
        transactionId: paymentTx.id,
      });

      return ApiResponse.success(
        res,
        {
          ...qrResult,
          transactionId: paymentTx.id,
        },
        'Sinh mã VietQR thành công'
      );
    } catch (err: any) {
      if (err.message === 'BANK_NOT_CONFIGURED') {
        return ApiResponse.error(
          res,
          'BANK_NOT_CONFIGURED',
          'Tài khoản ngân hàng chưa được cấu hình cho nhà hàng',
          400
        );
      }
      logger.error('createVietQR error', { stack: err?.stack });
      return ApiResponse.error(res, 'CREATE_QR_ERROR', err.message, 500);
    }
  }

  /**
   * POST /api/cashier/webhook
   * Tiếp nhận Webhook từ ngân hàng / SePay đối soát tự động & cập nhật trạng thái trong CSDL
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const verification = VietQRService.verifyWebhook(req.body);

      if (!verification.isValid || !verification.transactionRef) {
        return ApiResponse.success(res, { ignored: true }, 'Webhook không khớp giao dịch MenuGo');
      }

      // 1. Tìm giao dịch PaymentTransaction trong Database
      let paymentTx = await prisma.paymentTransaction.findFirst({
        where: {
          referenceNo: verification.transactionRef,
          status: PaymentStatus.PENDING,
        },
        include: {
          session: {
            include: { table: true, orders: true },
          },
        },
      });

      const cachedTx = activeQRTransactions.get(verification.transactionRef);

      // Nếu không tìm thấy bằng referenceNo trong DB nhưng có trong cache
      if (!paymentTx && cachedTx) {
        paymentTx = await prisma.paymentTransaction.findFirst({
          where: {
            sessionId: cachedTx.sessionId,
            status: PaymentStatus.PENDING,
          },
          include: {
            session: {
              include: { table: true, orders: true },
            },
          },
        });
      }

      if (!paymentTx || !paymentTx.session) {
        return ApiResponse.success(res, { ignored: true }, 'Không tìm thấy giao dịch chờ trong CSDL');
      }

      const session = paymentTx.session;
      const branchId = session.branchId;

      // 2. Chốt thanh toán nguyên khối trong Database
      await prisma.$transaction(async (tx) => {
        // Cập nhật giao dịch -> PAID
        await tx.paymentTransaction.update({
          where: { id: paymentTx!.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            receivedAmount: verification.amount || paymentTx!.amount,
            metadata: JSON.stringify(req.body),
          },
        });

        // Đóng phiên bàn
        await tx.orderSession.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.CLOSED,
            closedAt: new Date(),
          },
        });

        // Hoàn tất các đơn hàng
        await tx.order.updateMany({
          where: {
            sessionId: session.id,
            status: { not: OrderStatus.CANCELLED },
          },
          data: { status: OrderStatus.DONE },
        });

        // Giải phóng bàn
        if (session.tableId) {
          await tx.table.update({
            where: { id: session.tableId },
            data: { status: TableStatus.EMPTY },
          });
        }
      });

      // Xoá cache
      activeQRTransactions.delete(verification.transactionRef);

      // Phát sự kiện Realtime qua Socket.IO tới Branch và Tenant
      const webhookPaymentPayload = {
        sessionId: session.id,
        tableId: session.tableId,
        tableName: session.table?.name || `Bàn ${session.sessionCode}`,
        amount: verification.amount || paymentTx.amount,
        method: PaymentMethod.VIETQR,
        transactionRef: verification.transactionRef,
        transactionId: paymentTx.id,
        completedAt: new Date().toISOString(),
      };
      emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, webhookPaymentPayload);
      emitToTenant(session.tenantId, SOCKET_EVENTS.PAYMENT_COMPLETED, webhookPaymentPayload);

      const webhookTablePayload = {
        tableId: session.tableId,
        tableName: session.table?.name || '',
        status: TableStatus.EMPTY,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, webhookTablePayload);
      emitToTenant(session.tenantId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, webhookTablePayload);

      const webhookSessionPayload = {
        sessionId: session.id,
        status: SessionStatus.CLOSED,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.SESSION_UPDATED, webhookSessionPayload);
      emitToTenant(session.tenantId, SOCKET_EVENTS.SESSION_UPDATED, webhookSessionPayload);

      // QR guest của đúng bàn cũng nhận thanh toán hoàn tất
      if (session.tableId) {
        emitToTable(session.tableId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
          sessionId: session.id,
          tableId: session.tableId,
          amount: verification.amount || paymentTx.amount,
          method: PaymentMethod.VIETQR,
          transactionRef: verification.transactionRef,
          transactionId: paymentTx.id,
          completedAt: new Date().toISOString(),
        });
        emitToTable(session.tableId, SOCKET_EVENTS.SESSION_UPDATED, {
          sessionId: session.id,
          status: SessionStatus.CLOSED,
          branchId,
        });
      }

      return ApiResponse.success(res, { processed: true }, 'Xử lý webhook thanh toán thành công');
    } catch (err: any) {
      logger.error('handleWebhook error', { stack: err?.stack });
      return ApiResponse.error(res, 'WEBHOOK_ERROR', err.message, 500);
    }
  }

  /**
   * POST /api/sessions/:tableId/demo-pay
   * Khách bấm mô phỏng thanh toán thành công (demo) trên trang QR bàn
   */
  static async simulateTablePayment(req: Request, res: Response) {
    try {
      const tableId = (req as any).tableContext?.tableId || req.params.tableId;
      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu mã định danh bàn', 400);
      }

      const activeSession = await prisma.orderSession.findFirst({
        where: {
          tableId,
          status: { in: [SessionStatus.OPEN, SessionStatus.BILLING] },
        },
        include: {
          table: true,
          orders: {
            where: { status: { not: OrderStatus.CANCELLED } },
          },
        },
      });

      if (!activeSession) {
        return ApiResponse.success(res, { alreadySettled: true }, 'Phiên bàn đã được thanh toán hoặc không tồn tại');
      }

      const ordersTotal = (activeSession.orders || []).reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0
      );
      const subTotalAmount = activeSession.subTotal > 0 ? activeSession.subTotal : ordersTotal;
      const discountAmount = activeSession.discountAmount || 0;
      const totalAmount = activeSession.finalAmount > 0 ? activeSession.finalAmount : Math.max(0, subTotalAmount - discountAmount);
      const branchId = activeSession.branchId;

      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.paymentTransaction.create({
          data: {
            sessionId: activeSession.id,
            amount: totalAmount,
            method: PaymentMethod.VIETQR,
            status: PaymentStatus.PAID,
            paymentGateway: 'VIETQR_DEMO',
            receivedAmount: totalAmount,
            changeAmount: 0,
            paidAt: new Date(),
          },
        });

        await tx.orderSession.update({
          where: { id: activeSession.id },
          data: {
            status: SessionStatus.CLOSED,
            closedAt: new Date(),
            finalAmount: totalAmount,
          },
        });

        await tx.order.updateMany({
          where: {
            sessionId: activeSession.id,
            status: { not: OrderStatus.CANCELLED },
          },
          data: { status: OrderStatus.DONE },
        });

        if (activeSession.tableId) {
          await tx.table.update({
            where: { id: activeSession.tableId },
            data: { status: TableStatus.EMPTY },
          });
        }

        return transaction;
      });

      const paymentPayload = {
        sessionId: activeSession.id,
        tableId: activeSession.tableId,
        tableName: activeSession.table?.name || `Bàn ${activeSession.sessionCode}`,
        amount: totalAmount,
        method: 'VIETQR',
        transactionId: result.id,
        completedAt: new Date().toISOString(),
      };
      emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, paymentPayload);
      emitToTenant(activeSession.tenantId, SOCKET_EVENTS.PAYMENT_COMPLETED, paymentPayload);

      const tableStatusPayload = {
        tableId: activeSession.tableId,
        tableName: activeSession.table?.name || '',
        status: TableStatus.EMPTY,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tableStatusPayload);
      emitToTenant(activeSession.tenantId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tableStatusPayload);

      const sessionUpdatedPayload = {
        sessionId: activeSession.id,
        status: SessionStatus.CLOSED,
        branchId,
      };
      emitToBranch(branchId, SOCKET_EVENTS.SESSION_UPDATED, sessionUpdatedPayload);
      emitToTenant(activeSession.tenantId, SOCKET_EVENTS.SESSION_UPDATED, sessionUpdatedPayload);

      if (activeSession.tableId) {
        emitToTable(activeSession.tableId, SOCKET_EVENTS.PAYMENT_COMPLETED, paymentPayload);
        emitToTable(activeSession.tableId, SOCKET_EVENTS.SESSION_UPDATED, sessionUpdatedPayload);
      }

      return ApiResponse.success(res, { success: true, total: totalAmount }, 'Mô phỏng thanh toán thành công');
    } catch (err: any) {
      logger.error('simulateTablePayment error', { stack: err?.stack });
      return ApiResponse.error(res, 'SIMULATE_PAYMENT_ERROR', err.message, 500);
    }
  }
}
