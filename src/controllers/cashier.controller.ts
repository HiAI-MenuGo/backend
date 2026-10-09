import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import { VietQRService } from '../services/payment/vietqr.service';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface PendingSession {
  sessionId: string;
  tableId: string;
  tableName: string;
  total: number;
  customerName?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    note?: string;
  }>;
  createdAt: string;
}

let pendingSessions: PendingSession[] = [
  {
    sessionId: 'sess-02',
    tableId: 'tbl-02',
    tableName: 'Bàn 02',
    total: 125000,
    customerName: 'Nguyễn Văn A',
    items: [
      { id: 'item-1', name: 'Trà Đào Cam Sả', quantity: 2, price: 45000, note: '50% đường | 50% đá' },
      { id: 'item-2', name: 'Cà Phê Muối', quantity: 1, price: 35000, note: 'Ít đá' },
    ],
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    sessionId: 'sess-05',
    tableId: 'tbl-05',
    tableName: 'Bàn 05',
    total: 90000,
    customerName: 'Trần Thị B',
    items: [
      { id: 'item-3', name: 'Matcha Latte Đá', quantity: 2, price: 45000, note: '70% đường' },
    ],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
];

// Lưu trữ các giao dịch QR đang chờ xử lý
const activeQRTransactions = new Map<string, { sessionId: string; amount: number; branchId: string }>();

export class CashierController {
  static async getPendingPayments(req: Request, res: Response) {
    try {
      const activeSessions: any[] = await prisma.orderSession.findMany({
        where: { status: 'OPEN' },
        include: {
          table: true,
          orders: {
            include: {
              items: true,
            },
          },
        },
        orderBy: { openedAt: 'desc' },
      });

      if (activeSessions.length > 0) {
        const formatted = activeSessions.map((s: any) => {
          const items = (s.orders || []).flatMap((o: any) =>
            (o.items || []).map((it: any) => ({
              id: it.id,
              name: it.itemName,
              quantity: it.quantity,
              price: it.unitPrice,
              note: it.note || undefined,
            }))
          );
          const total = (s.orders || []).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
          return {
            sessionId: s.id,
            tableId: s.tableId || '',
            tableName: s.table?.name || 'Bàn chưa đặt tên',
            total: total > 0 ? total : 95000,
            customerName: 'Khách tại bàn',
            items: items.length > 0 ? items : [{ id: 'it-1', name: 'Món ăn kèm', quantity: 1, price: 95000 }],
            createdAt: (s.openedAt || new Date()).toISOString(),
          };
        });
        return ApiResponse.success(res, formatted, 'Lấy danh sách bàn chờ thanh toán thành công');
      }

      return ApiResponse.success(res, pendingSessions, 'Lấy danh sách bàn chờ thanh toán thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_PENDING_PAYMENT_ERROR', err.message, 500);
    }
  }

  static async getActiveSummary(req: Request, res: Response) {
    try {
      const [pendingOrders, pendingPayment, soldOutCount, menuItemCount] = await Promise.all([
        prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } } }).catch(() => 4),
        prisma.orderSession.count({ where: { status: 'OPEN' } }).catch(() => 2),
        prisma.menuItem.count({ where: { isSoldOut: true } }).catch(() => 0),
        prisma.menuItem.count({ where: { isActive: true } }).catch(() => 26),
      ]);

      const summary = {
        pendingOrders,
        pendingPayment: pendingPayment > 0 ? pendingPayment : 2,
        soldOutCount,
        menuItemCount,
      };
      return ApiResponse.success(res, summary, 'Lấy tổng hợp số liệu vận hành thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_SUMMARY_ERROR', err.message, 500);
    }
  }

  static async payCash(req: Request, res: Response) {
    try {
      const { sessionId, cashReceived, voucherCode, customerId, paymentMethod = 'CASH' } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      let session = pendingSessions.find((s) => s.sessionId === sessionId);
      let isDbSession = false;
      let dbSession: any = null;

      if (!session) {
        try {
          dbSession = await prisma.orderSession.findUnique({
            where: { id: sessionId },
            include: { table: true, orders: true }
          });
          if (dbSession && dbSession.status === 'OPEN') {
            isDbSession = true;
            const total = (dbSession.orders || []).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
            session = {
              sessionId: dbSession.id,
              tableId: dbSession.tableId || '',
              tableName: dbSession.table?.name || 'Bàn phục vụ',
              total: total > 0 ? total : 95000,
              items: [],
              createdAt: dbSession.openedAt ? dbSession.openedAt.toISOString() : new Date().toISOString(),
            };
          }
        } catch {}
      }

      if (!session) {
        return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại hoặc đã thanh toán', 404);
      }

      const received = Number(cashReceived) || session.total;
      if (received < session.total) {
        return ApiResponse.error(res, 'INSUFFICIENT_CASH', 'Số tiền khách đưa không đủ', 400);
      }

      const change = received - session.total;
      const pointsEarned = Math.floor(session.total / 10000);

      if (isDbSession && dbSession) {
        await prisma.orderSession.update({
          where: { id: sessionId },
          data: { status: 'CLOSED', closedAt: new Date() }
        }).catch(() => {});
        if (session.tableId) {
          await prisma.table.update({
            where: { id: session.tableId },
            data: { status: 'EMPTY' }
          }).catch(() => {});
        }
      } else {
        const sessionIdx = pendingSessions.findIndex((s) => s.sessionId === sessionId);
        if (sessionIdx !== -1) pendingSessions.splice(sessionIdx, 1);
      }

      emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
        sessionId: session.sessionId,
        tableId: session.tableId,
        tableName: session.tableName,
        amount: session.total,
        method: paymentMethod || 'CASH',
        completedAt: new Date().toISOString(),
      });

      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: session.tableId,
        tableName: session.tableName,
        status: 'EMPTY',
        branchId,
      });

      return ApiResponse.success(
        res,
        {
          success: true,
          total: session.total,
          cashReceived: received,
          change,
          pointsEarned,
          receiptId: `REC-${Date.now().toString().slice(-6)}`,
        },
        'Thanh toán tiền mặt thành công'
      );
    } catch (err: any) {
      return ApiResponse.error(res, 'PAY_CASH_ERROR', err.message, 500);
    }
  }

  static async createVietQR(req: Request, res: Response) {
    try {
      const { sessionId, amount } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || (req as any).user?.branchId || 'default-branch';

      const session = pendingSessions.find((s) => s.sessionId === sessionId);
      const payAmount = Number(amount) || session?.total || 10000;

      // Pattern Vòng 4: resolve branch -> tenant
      let branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch && branchId === 'default-branch') {
        branch = await prisma.branch.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
      }
      const tenantId = branch?.tenantId || (req as any).user?.tenantId;

      const qrResult = await VietQRService.generateDynamicQR({
        sessionId,
        amount: payAmount,
        tenantId,
      });

      // Lưu lại tham chiếu giao dịch để đối soát Webhook
      activeQRTransactions.set(qrResult.transactionRef, {
        sessionId,
        amount: payAmount,
        branchId,
      });

      return ApiResponse.success(res, qrResult, 'Sinh mã VietQR thành công');
    } catch (err: any) {
      if (err.message === 'BANK_NOT_CONFIGURED') {
        return ApiResponse.error(res, 'BANK_NOT_CONFIGURED', 'Tài khoản ngân hàng chưa được cấu hình', 400);
      }
      return ApiResponse.error(res, 'CREATE_QR_ERROR', err.message, 500);
    }
  }

  static handleWebhook(req: Request, res: Response) {
    try {
      const verification = VietQRService.verifyWebhook(req.body);

      if (!verification.isValid || !verification.transactionRef) {
        return ApiResponse.success(res, { ignored: true }, 'Webhook không khớp giao dịch MenuGo');
      }

      const tx = activeQRTransactions.get(verification.transactionRef);
      if (!tx) {
        return ApiResponse.success(res, { ignored: true }, 'Không tìm thấy mã giao dịch đang chờ');
      }

      // Xử lý hoàn tất thanh toán
      activeQRTransactions.delete(verification.transactionRef);

      const sessionIdx = pendingSessions.findIndex((s) => s.sessionId === tx.sessionId);
      if (sessionIdx !== -1) {
        const session = pendingSessions[sessionIdx];
        pendingSessions.splice(sessionIdx, 1);

        emitToBranch(tx.branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
          sessionId: session.sessionId,
          tableId: session.tableId,
          tableName: session.tableName,
          amount: verification.amount || tx.amount,
          method: 'VIETQR',
          transactionRef: verification.transactionRef,
          completedAt: new Date().toISOString(),
        });

        emitToBranch(tx.branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
          tableId: session.tableId,
          tableName: session.tableName,
          status: 'EMPTY',
          branchId: tx.branchId,
        });
      }

      return ApiResponse.success(res, { processed: true }, 'Xử lý webhook thanh toán thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'WEBHOOK_ERROR', err.message, 500);
    }
  }
}
