import { Request, Response } from 'express';
import { OrderStatus, PaymentMethod, PaymentStatus, SessionStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { createMoMoPayment, isMoMoConfigured } from '../services/payment/momo.service';
import { createVNPayUrl, isVNPayConfigured, verifyVNPayIpn } from '../services/payment/vnpay.service';
import { verifyMoMoIpn } from '../services/payment/momo.service';
import { settleQrWalletPayment } from '../services/payment/qrWallet.settle';

function publicBaseUrl(req: Request): string {
  const envUrl = (process.env.PUBLIC_WEBHOOK_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (envUrl) return envUrl;
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

function clientIp(req: Request): string {
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  return fwd.split(',')[0].trim() || req.ip || '127.0.0.1';
}

async function resolvePayableSession(tableId: string) {
  const session = await prisma.orderSession.findFirst({
    where: { tableId, status: { in: [SessionStatus.OPEN, SessionStatus.BILLING] } },
    include: { orders: { where: { status: { not: OrderStatus.CANCELLED } } }, table: true },
  });
  if (!session) return null;
  const ordersTotal = (session.orders || []).reduce((s, o) => s + (o.totalAmount || 0), 0);
  const total = session.finalAmount > 0 ? session.finalAmount : session.subTotal > 0 ? session.subTotal : ordersTotal;
  return { session, total };
}

/**
 * QR khách (public): tạo giao dịch MoMo/VNPay sandbox từ phiên bàn đang mở.
 * Không yêu cầu auth staff — scope theo tableId (UUID khó đoán) + rate-limit.
 */
export class QrPaymentController {
  /** POST /api/qr-pay/momo/create { tableId } */
  static async createMoMo(req: Request, res: Response) {
    try {
      const { tableId } = req.body || {};
      if (!tableId) return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu tableId', 400);
      if (!isMoMoConfigured()) {
        return ApiResponse.error(res, 'MOMO_NOT_CONFIGURED', 'Chưa cấu hình MoMo sandbox (MOMO_PARTNER_CODE/ACCESS_KEY/SECRET_KEY)', 400);
      }
      const found = await resolvePayableSession(String(tableId));
      if (!found || found.total <= 0) {
        return ApiResponse.error(res, 'NO_PAYABLE_SESSION', 'Không có đơn cần thanh toán tại bàn này', 404);
      }
      const { session, total } = found;
      const referenceNo = `MG-MOMO-${Date.now().toString().slice(-8)}`;
      const base = publicBaseUrl(req);

      const momo = await createMoMoPayment({
        amount: Math.round(total),
        orderId: referenceNo,
        orderInfo: `Thanh toan ${session.sessionCode} ${session.table?.name || ''}`.slice(0, 100),
        redirectUrl: `${base}/table/${encodeURIComponent(String(tableId))}?pay=momo&ref=${referenceNo}`,
        ipnUrl: `${base.replace(/:\d+$/, ':5000')}/api/qr-pay/momo/ipn`.replace('http://localhost:3000', 'http://localhost:5000'),
      });

      await prisma.paymentTransaction.create({
        data: {
          sessionId: session.id,
          amount: Math.round(total),
          method: PaymentMethod.MOMO,
          status: PaymentStatus.PENDING,
          referenceNo,
          qrContent: momo.payUrl,
          paymentGateway: 'MOMO',
          metadata: JSON.stringify({ requestId: momo.requestId }).slice(0, 500),
        },
      });

      return ApiResponse.success(res, { referenceNo, amount: Math.round(total), ...momo }, 'Tạo thanh toán MoMo thành công');
    } catch (err: any) {
      if (err?.message === 'MOMO_NOT_CONFIGURED' || err?.statusCode === 400) {
        return ApiResponse.error(res, 'MOMO_CREATE_FAILED', err.message || 'Không tạo được MoMo', 400);
      }
      logger.error('createMoMo error', { stack: err?.stack });
      return ApiResponse.error(res, 'MOMO_CREATE_FAILED', err?.message || 'Lỗi tạo MoMo', 500);
    }
  }

  /** POST /api/qr-pay/vnpay/create { tableId } */
  static async createVNPay(req: Request, res: Response) {
    try {
      const { tableId } = req.body || {};
      if (!tableId) return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu tableId', 400);
      if (!isVNPayConfigured()) {
        return ApiResponse.error(res, 'VNPAY_NOT_CONFIGURED', 'Chưa cấu hình VNPay sandbox (VNPAY_TMN_CODE/HASH_SECRET)', 400);
      }
      const found = await resolvePayableSession(String(tableId));
      if (!found || found.total <= 0) {
        return ApiResponse.error(res, 'NO_PAYABLE_SESSION', 'Không có đơn cần thanh toán tại bàn này', 404);
      }
      const { session, total } = found;
      const referenceNo = `MG-VNPAY-${Date.now().toString().slice(-8)}`;
      const base = publicBaseUrl(req);

      const { payUrl } = createVNPayUrl({
        amount: Math.round(total),
        txnRef: referenceNo,
        orderInfo: `Thanh toan ${session.sessionCode}`.slice(0, 80),
        returnUrl: `${base}/table/${encodeURIComponent(String(tableId))}?pay=vnpay&ref=${referenceNo}`,
        ipAddr: clientIp(req),
      });

      await prisma.paymentTransaction.create({
        data: {
          sessionId: session.id,
          amount: Math.round(total),
          // Prisma enum hiện chưa có VNPAY -> dùng CARD + gateway VNPAY (tránh migrate DB giữa chừng)
          method: PaymentMethod.CARD,
          status: PaymentStatus.PENDING,
          referenceNo,
          qrContent: payUrl,
          paymentGateway: 'VNPAY',
        },
      });

      return ApiResponse.success(res, { referenceNo, amount: Math.round(total), payUrl }, 'Tạo thanh toán VNPay thành công');
    } catch (err: any) {
      if (err?.message === 'VNPAY_NOT_CONFIGURED') {
        return ApiResponse.error(res, 'VNPAY_NOT_CONFIGURED', err.message, 400);
      }
      logger.error('createVNPay error', { stack: err?.stack });
      return ApiResponse.error(res, 'VNPAY_CREATE_FAILED', err?.message || 'Lỗi tạo VNPay', 500);
    }
  }

  /** GET /api/qr-pay/status/:referenceNo — frontend poll 3s/lần */
  static async getStatus(req: Request, res: Response) {
    try {
      const { referenceNo } = req.params;
      const tx = await prisma.paymentTransaction.findFirst({ where: { referenceNo } });
      if (!tx) return ApiResponse.error(res, 'TX_NOT_FOUND', 'Không tìm thấy giao dịch', 404);
      return ApiResponse.success(res, { referenceNo, status: tx.status, amount: tx.amount, paidAt: tx.paidAt }, 'Trạng thái giao dịch');
    } catch (err: any) {
      return ApiResponse.error(res, 'TX_STATUS_ERROR', err?.message, 500);
    }
  }

  /** POST /api/qr-pay/momo/ipn — MoMo gọi server-to-server (public, verify signature) */
  static async momoIpn(req: Request, res: Response) {
    try {
      const body = req.body || {};
      if (!verifyMoMoIpn(body)) {
        return res.status(400).json({ resultCode: 1, message: 'Invalid signature' });
      }
      if (Number(body.resultCode) !== 0) {
        await prisma.paymentTransaction.updateMany({
          where: { referenceNo: String(body.orderId), status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, metadata: JSON.stringify(body).slice(0, 1000) },
        });
        return res.json({ resultCode: 0, message: 'Recorded failed' });
      }
      const settled = await settleQrWalletPayment({
        referenceNo: String(body.orderId),
        gateway: 'MOMO',
        gatewayTxnId: body.transId ? String(body.transId) : undefined,
        paidAmount: Number(body.amount) || undefined,
        rawPayload: body,
      });
      return res.json({ resultCode: 0, message: settled.processed ? 'OK' : 'Ignored' });
    } catch (err: any) {
      logger.error('momoIpn error', { stack: err?.stack });
      return res.status(500).json({ resultCode: 1, message: 'Server error' });
    }
  }

  /** GET|POST /api/qr-pay/vnpay/ipn — VNPay gọi server-to-server (public, verify SecureHash) */
  static async vnpayIpn(req: Request, res: Response) {
    try {
      const query = { ...(req.query as any), ...(req.body as any) };
      if (!verifyVNPayIpn(query)) {
        return res.json({ RspCode: '97', Message: 'Invalid checksum' });
      }
      const ref = String(query.vnp_TxnRef || '');
      if (query.vnp_ResponseCode !== '00') {
        await prisma.paymentTransaction.updateMany({
          where: { referenceNo: ref, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED, metadata: JSON.stringify(query).slice(0, 1000) },
        });
        return res.json({ RspCode: '00', Message: 'Recorded failed' });
      }
      const settled = await settleQrWalletPayment({
        referenceNo: ref,
        gateway: 'VNPAY',
        gatewayTxnId: query.vnp_TransactionNo ? String(query.vnp_TransactionNo) : undefined,
        paidAmount: query.vnp_Amount ? Math.round(Number(query.vnp_Amount) / 100) : undefined,
        rawPayload: query,
      });
      return res.json({ RspCode: '00', Message: settled.processed ? 'OK' : 'Ignored' });
    } catch (err: any) {
      logger.error('vnpayIpn error', { stack: err?.stack });
      return res.json({ RspCode: '99', Message: 'Server error' });
    }
  }
}
