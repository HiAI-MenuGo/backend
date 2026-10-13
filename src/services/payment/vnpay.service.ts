import crypto from 'crypto';

/**
 * HiAI-MenuGo — VNPay Sandbox Payment Service
 * Docs: https://sandbox.vnpayment.vn/apis
 *
 * Sandbox cho phép test full luồng redirect + IPN mà chưa cần merchant thật.
 * Bạn tạo tài khoản ở sandbox.vnpayment.vn để lấy:
 *   VNPAY_TMN_CODE / VNPAY_HASH_SECRET
 */

const VNPAY_URL =
  process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

export interface VNPayCreateParams {
  amount: number; // VND, sẽ tự nhân 100 theo chuẩn VNPay
  txnRef: string; // mã duy nhất, ví dụ MG-VNPAY-<timestamp>
  orderInfo: string;
  returnUrl: string;
  ipAddr?: string;
  expireMinutes?: number;
  locale?: string;
}

function getCreds() {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
  };
}

export function isVNPayConfigured(): boolean {
  const { tmnCode, hashSecret } = getCreds();
  return Boolean(tmnCode && hashSecret);
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function sortAndSign(params: Record<string, string>, hashSecret: string): string {
  const sorted = Object.keys(params).sort();
  const signData = sorted.map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHmac('sha512', hashSecret).update(signData, 'utf-8').digest('hex');
}

export function createVNPayUrl(params: VNPayCreateParams): { payUrl: string; txnRef: string } {
  const { tmnCode, hashSecret } = getCreds();
  if (!tmnCode || !hashSecret) {
    const err = new Error('VNPAY_NOT_CONFIGURED');
    (err as any).statusCode = 400;
    throw err;
  }

  const now = new Date();
  const expire = new Date(now.getTime() + (params.expireMinutes ?? 15) * 60 * 1000);

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: params.locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(params.amount) * 100),
    vnp_ReturnUrl: params.returnUrl,
    vnp_IpAddr: params.ipAddr || '127.0.0.1',
    vnp_CreateDate: fmtDate(now),
    vnp_ExpireDate: fmtDate(expire),
  };

  const vnp_SecureHash = sortAndSign(vnpParams, hashSecret);
  const qs = new URLSearchParams({ ...vnpParams, vnp_SecureHash }).toString();
  return { payUrl: `${VNPAY_URL}?${qs}`, txnRef: params.txnRef };
}

/** Verify chữ ký IPN/ReturnUrl từ VNPay (sandbox lẫn production). */
export function verifyVNPayIpn(query: Record<string, any>): boolean {
  const { hashSecret } = getCreds();
  const secureHash = query?.vnp_SecureHash;
  if (!hashSecret || !secureHash) return false;
  try {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') continue;
      if (v === undefined || v === null || v === '') continue;
      params[k] = String(v);
    }
    return sortAndSign(params, hashSecret) === secureHash;
  } catch {
    return false;
  }
}
