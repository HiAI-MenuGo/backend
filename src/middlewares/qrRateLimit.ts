import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { resolveTableScope } from '../utils/tableScope';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

const QR_ORDER_LIMIT = 20;
const QR_ORDER_WINDOW_MS = 60 * 1000;
const QR_MENU_LIMIT = 60;
const QR_MENU_WINDOW_MS = 60 * 1000;

function getKey(req: Request, prefix: string): string {
  const tableId = req.params.tableId || req.body?.tableId || req.query?.tableId;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${prefix}:${tableId || ip}`;
}

function checkLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = store[key];

  if (!entry || now > entry.resetTime) {
    store[key] = { count: 1, resetTime: now + windowMs };
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetTime: entry.resetTime };
}

export function qrOrderRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req, 'qr:order');
  const { allowed, remaining, resetTime } = checkLimit(key, QR_ORDER_LIMIT, QR_ORDER_WINDOW_MS);

  res.setHeader('X-RateLimit-Limit', QR_ORDER_LIMIT);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

  if (!allowed) {
    return res.status(429).json({
      success: false,
      errorCode: 'QR_ORDER_RATE_LIMIT',
      message: 'Quá nhiều lần gọi món từ bàn này, vui lòng chờ 1 phút',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  }
  next();
}

export function qrMenuRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req, 'qr:menu');
  const { allowed, remaining, resetTime } = checkLimit(key, QR_MENU_LIMIT, QR_MENU_WINDOW_MS);

  res.setHeader('X-RateLimit-Limit', QR_MENU_LIMIT);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

  if (!allowed) {
    return res.status(429).json({
      success: false,
      errorCode: 'QR_MENU_RATE_LIMIT',
      message: 'Quá nhiều lần tải thực đơn, vui lòng chờ 1 phút',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  }
  next();
}

export async function validateTableSession(req: Request, res: Response, next: NextFunction) {
  try {
    const rawTableId = req.params.tableId || req.body?.tableId;

    if (!rawTableId) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TABLE_ID',
        message: 'Thiếu mã bàn',
      });
    }

    // Hỗ trợ cả UUID thật và JWT QR standee (verify chữ ký + đối chiếu DB)
    const scope = await resolveTableScope(String(rawTableId));
    if (!scope) {
      return res.status(404).json({
        success: false,
        errorCode: 'TABLE_NOT_FOUND',
        message: 'Bàn không tồn tại hoặc đã ngừng hoạt động',
      });
    }

    const table = await prisma.table.findUnique({
      where: { id: scope.tableId },
      select: { id: true, status: true },
    });

    if (table?.status === 'CLEANING') {
      return res.status(409).json({
        success: false,
        errorCode: 'TABLE_NOT_READY',
        message: 'Bàn đang được dọn dẹp, vui lòng chờ nhân viên',
      });
    }

    (req as any).tableContext = {
      tableId: scope.tableId,
      tenantId: scope.tenantId,
      branchId: scope.branchId,
    };

    next();
  } catch (err) {
    console.error('[validateTableSession] Error:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Lỗi kiểm tra bàn',
    });
  }
}

setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);