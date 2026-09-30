/**
 * HiAI-MenuGo — VietQR Dynamic Payment Engine (Napas 247 / SePay integration)
 */

export interface VietQRRequest {
  sessionId: string;
  amount: number;
  orderInfo?: string;
  bankBin?: string;
  accountNo?: string;
  accountName?: string;
}

export interface VietQRResponse {
  qrCodeUrl: string;
  qrCode: string;
  transactionRef: string;
  amount: number;
  expiresAt: string;
}

export class VietQRService {
  // Cấu hình tài khoản nhận tiền mặc định (có thể override từ Tenant Settings)
  private static defaultBankBin = '970422'; // MB Bank
  private static defaultAccountNo = '0334888999';
  private static defaultAccountName = 'HIAI MENUGO RESTAURANT';

  /**
   * Sinh mã VietQR động theo định dạng QuickLink chuẩn Napas 247
   */
  static generateDynamicQR(req: VietQRRequest): VietQRResponse {
    const transactionRef = `MG${Date.now().toString().slice(-6)}`;
    const bankBin = req.bankBin || this.defaultBankBin;
    const accountNo = req.accountNo || this.defaultAccountNo;
    const accountName = encodeURIComponent(req.accountName || this.defaultAccountName);
    const description = encodeURIComponent(`Thanh toan don ${transactionRef}`);

    // QuickLink VietQR chuẩn: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
    const qrCodeUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${req.amount}&addInfo=${description}&accountName=${accountName}`;

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
