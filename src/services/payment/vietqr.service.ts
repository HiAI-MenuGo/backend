/**
 * HiAI-MenuGo — VietQR Dynamic Payment Engine (Napas 247 / SePay integration)
 */

import prisma from '../../utils/prisma';

export interface VietQRRequest {
  sessionId: string;
  amount: number;
  orderInfo?: string;
  bankBin?: string;
  accountNo?: string;
  accountName?: string;
  tenantId?: string;
}

export interface VietQRResponse {
  qrCodeUrl: string;
  qrCode: string;
  transactionRef: string;
  amount: number;
  expiresAt: string;
}

export class VietQRService {
  /**
   * Sinh mã VietQR động theo định dạng QuickLink chuẩn Napas 247 từ TenantBranding
   */
  static async generateDynamicQR(req: VietQRRequest): Promise<VietQRResponse> {
    let bankBin = req.bankBin;
    let accountNo = req.accountNo;
    let accountName = req.accountName;

    // Nếu chưa có đủ 3 trường bank, truy vấn từ cấu hình TenantBranding
    if (!bankBin || !accountNo || !accountName) {
      if (!req.tenantId) {
        const err = new Error('BANK_NOT_CONFIGURED');
        (err as any).statusCode = 400;
        throw err;
      }

      const branding = await prisma.tenantBranding.findUnique({
        where: { tenantId: req.tenantId },
      });

      if (!branding || !branding.bankCode || !branding.bankAccountNo || !branding.bankAccountName) {
        const err = new Error('BANK_NOT_CONFIGURED');
        (err as any).statusCode = 400;
        throw err;
      }

      bankBin = branding.bankCode;
      accountNo = branding.bankAccountNo;
      accountName = branding.bankAccountName;
    }

    const transactionRef = `MG${Date.now().toString().slice(-6)}`;
    const encAccountName = encodeURIComponent(accountName);
    const description = encodeURIComponent(`Thanh toan don ${transactionRef}`);

    // QuickLink VietQR chuẩn: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
    const qrCodeUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${req.amount}&addInfo=${description}&accountName=${encAccountName}`;

    // Thời gian hết hạn sau 60 giây theo nghiệp vụ Task B-010
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

    return {
      qrCodeUrl,
      qrCode: qrCodeUrl,
      transactionRef,
      amount: req.amount,
      expiresAt,
    };
  }

  /**
   * Đối soát Webhook từ cổng thanh toán / ngân hàng SePay
   */
  static verifyWebhook(payload: any): { isValid: boolean; transactionRef?: string; amount?: number } {
    if (!payload) return { isValid: false };

    // Format SePay: { id, gateway, transactionDate, accountNumber, transferType, transferAmount, content, referenceCode }
    const content = payload.content || payload.description || '';
    const transferAmount = Number(payload.transferAmount || payload.amount || 0);

    // Tìm mã giao dịch MGxxxxxx trong nội dung chuyển khoản
    const match = content.match(/MG\d{6}/i);
    const transactionRef = match ? match[0].toUpperCase() : undefined;

    return {
      isValid: Boolean(transactionRef && transferAmount > 0),
      transactionRef,
      amount: transferAmount,
    };
  }
}
