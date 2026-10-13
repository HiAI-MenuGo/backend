import crypto from 'crypto';

/**
 * HiAI-MenuGo — MoMo Sandbox Payment Service
 * Docs: https://developers.momo.vn (test-payment.momo.vn)
 *
 * Sandbox cho phép test full luồng direct + IPN mà chưa cần merchant thật.
 * Bạn tạo tài khoản ở developers.momo.vn để lấy:
 *   MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY
 */

const MOMO_ENDPOINT =
  process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

export interface MoMoCreateParams {
  amount: number;
  orderId: string; // mã duy nhất, ví dụ MG-MOMO-<timestamp>
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData?: string;
  requestType?: string;
}

export interface MoMoCreateResult {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  orderId: string;
  requestId: string;
}

function getCreds() {
  const partnerCode = process.env.MOMO_PARTNER_CODE || '';
  const accessKey = process.env.MOMO_ACCESS_KEY || '';
  const secretKey = process.env.MOMO_SECRET_KEY || '';
  return { partnerCode, accessKey, secretKey };
}

export function isMoMoConfigured(): boolean {
  const { partnerCode, accessKey, secretKey } = getCreds();
  return Boolean(partnerCode && accessKey && secretKey);
}

export async function createMoMoPayment(params: MoMoCreateParams): Promise<MoMoCreateResult> {
  const { partnerCode, accessKey, secretKey } = getCreds();
  if (!partnerCode || !accessKey || !secretKey) {
    const err = new Error('MOMO_NOT_CONFIGURED');
    (err as any).statusCode = 400;
    throw err;
  }

  const requestId = params.orderId;
  const requestType = params.requestType || 'captureWallet';
  const extraData = params.extraData || '';
  const lang = 'vi';
  const autoCapture = true;

  // Chuỗi ký theo đúng thứ tự MoMo yêu cầu
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${params.amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${params.ipnUrl}` +
    `&orderId=${params.orderId}` +
    `&orderInfo=${params.orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${params.redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  const body = {
    partnerCode,
    partnerName: 'HiAI-MenuGo',
    storeId: 'MenuGo_QR',
    requestId,
    amount: params.amount,
    orderId: params.orderId,
    orderInfo: params.orderInfo,
    redirectUrl: params.redirectUrl,
    ipnUrl: params.ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    signature,
  };

  const res = await fetch(MOMO_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));

  if (!res.ok || data?.resultCode !== 0) {
    const err = new Error(data?.message || 'MOMO_CREATE_FAILED');
    (err as any).statusCode = 400;
    (err as any).detail = data;
    throw err;
  }

  return {
    payUrl: data.payUrl,
    deeplink: data.deeplink,
    qrCodeUrl: data.qrCodeUrl,
    orderId: params.orderId,
    requestId,
  };
}

/** Verify chữ ký IPN trả về từ MoMo (sandbox lẫn production đều dùng). */
export function verifyMoMoIpn(payload: any): boolean {
  const { secretKey, accessKey, partnerCode } = { ...getCreds() } as any;
  if (!secretKey || !payload?.signature) return false;
  void accessKey;
  void partnerCode;
  try {
    const raw =
      `accessKey=${payload.accessKey}` +
      `&amount=${payload.amount}` +
      `&extraData=${payload.extraData ?? ''}` +
      `&message=${payload.message ?? ''}` +
      `&orderId=${payload.orderId}` +
      `&orderInfo=${payload.orderInfo ?? ''}` +
      `&orderType=${payload.orderType ?? ''}` +
      `&partnerCode=${payload.partnerCode}` +
      `&payType=${payload.payType ?? ''}` +
      `&requestId=${payload.requestId}` +
      `&responseTime=${payload.responseTime}` +
      `&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`;
    const expect = crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
    return expect === payload.signature;
  } catch {
    return false;
  }
}
