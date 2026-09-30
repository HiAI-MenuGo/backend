import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../services/auth.service';
import ApiResponse from '../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/** Parse Authorization: Bearer <token>, verify JWT, inject req.user. */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu access token', 401);
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded.userId || !decoded.tenantId || !decoded.role) {
      return ApiResponse.error(res, 'INVALID_TOKEN', 'Token không hợp lệ', 401);
    }
    req.user = decoded;
    return next();
  } catch {
    return ApiResponse.error(res, 'TOKEN_EXPIRED', 'Token hết hạn hoặc không hợp lệ', 401);
  }
}

/** Guard phân quyền theo vai trò. */
export function requireRole(allowed: Array<TokenPayload['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.error(res, 'UNAUTHORIZED', 'Chưa xác thực', 401);
    }
    if (!allowed.includes(req.user.role)) {
      return ApiResponse.error(res, 'FORBIDDEN', 'Không đủ quyền truy cập', 403);
    }
    return next();
  };
}
