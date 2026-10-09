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
  static getPendingPayments(req: Request, res: Response) {
    try {
      return ApiResponse.success(res, pendingSessions, 'Lấy danh sách bàn chờ thanh toán thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_PENDING_PAYMENT_ERROR', err.message, 500);
    }
  }

  static getActiveSummary(req: Request, res: Response) {
    try {
      // Số liệu tổng hợp nhanh cho Hub OperationsScreen
      const summary = {
        pendingOrders: 1, // Đang có 1 đơn PENDING
        pendingPayment: pendingSessions.length,
        soldOutCount: 2,
        menuItemCount: 24,
      };
      return ApiResponse.success(res, summary, 'Lấy tổng hợp số liệu vận hành thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_SUMMARY_ERROR', err.message, 500);
    }
  }

  static payCash(req: Request, res: Response) {
    try {
      const { sessionId, cashReceived, voucherCode, customerId } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      const sessionIdx = pendingSessions.findIndex((s) => s.sessionId === sessionId);
      if (sessionIdx === -1) {
        return ApiResponse.error(res, 'SESSION_NOT_FOUND', 'Phiên bàn không tồn tại hoặc đã thanh toán', 404);
      }

      const session = pendingSessions[sessionIdx];
      const received = Number(cashReceived) || session.total;

      if (received < session.total) {
        return ApiResponse.error(res, 'INSUFFICIENT_CASH', 'Số tiền khách đưa không đủ', 400);
      }

      const change = received - session.total;
      const pointsEarned = Math.floor(session.total / 10000); // 10k = 1 điểm

      // Xoá session khỏi hàng chờ
      pendingSessions.splice(sessionIdx, 1);

      // Phát realtime Payment Completed và đổi trạng thái bàn sang EMPTY
      emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
        sessionId: session.sessionId,
        tableId: session.tableId,
        tableName: session.tableName,
        amount: session.total,
        method: 'CASH',
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
