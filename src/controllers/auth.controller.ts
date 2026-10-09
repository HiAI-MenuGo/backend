import { Request, Response } from 'express';
import { z } from 'zod';
import ApiResponse from '../utils/response';
import { AuthService, AuthUserRecord } from '../services/auth.service';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Thiếu mật khẩu cũ'),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
});

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return ApiResponse.error(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ', 400);
      }
      const result = await AuthService.login(parsed.data.email, parsed.data.password);
      setRefreshCookie(res, result.refreshToken);
      return ApiResponse.success(res, result, 'Đăng nhập thành công');
    } catch (err: unknown) {
      if ((err as Error).message === 'INVALID_CREDENTIALS') {
        return ApiResponse.error(res, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401);
      }
      return ApiResponse.error(res, 'LOGIN_ERROR', (err as Error).message, 500);
    }
  }

  static refresh(req: Request, res: Response) {
    try {
      const token: string | undefined =
        (req.body?.refreshToken as string) || (req.cookies?.refreshToken as string);
      if (!token) {
        return ApiResponse.error(res, 'MISSING_REFRESH_TOKEN', 'Thiếu refresh token', 401);
      }
      const result = AuthService.refresh(token);
      setRefreshCookie(res, result.refreshToken);
      return ApiResponse.success(res, result, 'Cấp mới access token thành công');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'REFRESH_REUSED') {
        res.clearCookie('refreshToken', { path: '/api/auth' });
        return ApiResponse.error(res, 'REFRESH_REUSED', 'Phát hiện reuse token — đã thu hồi toàn bộ phiên', 401);
      }
      return ApiResponse.error(res, 'REFRESH_INVALID', 'Refresh token không hợp lệ', 401);
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.user) return ApiResponse.error(res, 'UNAUTHORIZED', 'Chưa xác thực', 401);
      const dbUser = await AuthService.findDbById(req.user.userId);
      if (!dbUser) return ApiResponse.error(res, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản', 404);
      const user: AuthUserRecord = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        passwordHash: dbUser.passwordHash,
        role: dbUser.role as AuthUserRecord['role'],
        tenantId: dbUser.tenantId,
        branchId: dbUser.branchId || '',
        isActive: dbUser.isActive,
      };
      return ApiResponse.success(res, AuthService.toPublic(user), 'Lấy thông tin tài khoản thành công');
    } catch (err: unknown) {
      return ApiResponse.error(res, 'FETCH_ME_ERROR', (err as Error).message, 500);
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) return ApiResponse.error(res, 'UNAUTHORIZED', 'Chưa xác thực', 401);
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return ApiResponse.error(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ', 400);
      }
      await AuthService.changePassword(req.user.userId, parsed.data.oldPassword, parsed.data.newPassword);
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return ApiResponse.success(res, { changed: true }, 'Đổi mật khẩu thành công, vui lòng đăng nhập lại');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'WRONG_OLD_PASSWORD') {
        return ApiResponse.error(res, 'WRONG_OLD_PASSWORD', 'Mật khẩu cũ không đúng', 400);
      }
      if (msg === 'WEAK_PASSWORD') {
        return ApiResponse.error(res, 'WEAK_PASSWORD', 'Mật khẩu mới quá yếu (tối thiểu 6 ký tự)', 400);
      }
      return ApiResponse.error(res, 'CHANGE_PASSWORD_ERROR', msg, 500);
    }
  }

  static logout(req: Request, res: Response) {
    try {
      const token: string | undefined =
        (req.body?.refreshToken as string) || (req.cookies?.refreshToken as string);
      if (token) AuthService.logout(token);
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return ApiResponse.success(res, { loggedOut: true }, 'Đăng xuất thành công');
    } catch (err: unknown) {
      return ApiResponse.error(res, 'LOGOUT_ERROR', (err as Error).message, 500);
    }
  }
}
