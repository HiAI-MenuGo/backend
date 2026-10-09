import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

/**
 * QR bàn mã hóa JWT (C-023): tableId thật không lộ trên standee in,
 * khách quét mã cũng không đoán được id bàn khác.
 */
export class TableQrController {
  /**
   * GET /api/tables/:id/qr-token (ADMIN/MANAGER)
   * Ký token chứa tableId + tenantId + branchId cho 1 bàn.
   */
  static async signQrToken(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin quán', 401);
      }
      const { id } = req.params;
      const where: any = { id, tenantId };
      if (req.user?.role === 'MANAGER') {
        if (!req.user?.branchId) {
          return ApiResponse.error(res, 'FORBIDDEN', 'Tài khoản quản lý chưa được gán chi nhánh', 403);
        }
        where.branchId = req.user.branchId;
      }
      const table = await prisma.table.findFirst({ where });
      if (!table) {
        // Fallback: id từ module Tables của team B (mock/in-memory, chưa đồng bộ
        // Prisma) — vẫn ký token gắn tenant/branch từ JWT để chống đoán id.
        // Khi B migrate Tables sang Prisma, nhánh này tự hết tác dụng.
        logger.warn('signQrToken: table ngoài Prisma, ký fallback theo token', { id, tenantId });
        const fallbackBranch = req.user?.branchId || null;
        const token = jwt.sign(
          { tableId: id, tenantId, branchId: fallbackBranch },
          JWT_SECRET
        );
        return ApiResponse.success(
          res,
          { token, urlPath: `/table/${token}`, tableId: id, fallback: true },
          'Ký mã QR bàn thành công'
        );
      }
      const token = jwt.sign(
        { tableId: table.id, tenantId: table.tenantId, branchId: table.branchId },
        JWT_SECRET
      );
      return ApiResponse.success(
        res,
        { token, urlPath: `/table/${token}`, tableId: table.id },
        'Ký mã QR bàn thành công'
      );
    } catch (error: any) {
      logger.error('signQrToken failed', { stack: error?.stack });
      return ApiResponse.error(res, 'SIGN_ERROR', 'Lỗi ký mã QR bàn', 500);
    }
  }

  /**
   * GET /api/tables/resolve?token= (public)
   * Giải mã token từ QR standee → định danh bàn (không lộ dữ liệu nhạy cảm).
   */
  static async resolveQrToken(req: Request, res: Response) {
    try {
      const token = String(req.query.token || '');
      if (!token) {
        return ApiResponse.error(res, 'MISSING_TOKEN', 'Thiếu mã QR bàn', 400);
      }
      let payload: any;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch {
        return ApiResponse.error(res, 'INVALID_QR', 'Mã QR bàn không hợp lệ', 400);
      }
      if (!payload?.tableId || !payload?.tenantId) {
        return ApiResponse.error(res, 'INVALID_QR', 'Mã QR bàn không hợp lệ', 400);
      }
      return ApiResponse.success(
        res,
        { tableId: payload.tableId, tenantId: payload.tenantId, branchId: payload.branchId || null },
        'Định danh bàn thành công'
      );
    } catch (error: any) {
      logger.error('resolveQrToken failed', { stack: error?.stack });
      return ApiResponse.error(res, 'RESOLVE_ERROR', 'Lỗi đọc mã QR bàn', 500);
    }
  }
}

export default TableQrController;
