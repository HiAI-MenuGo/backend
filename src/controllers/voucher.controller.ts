import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { VoucherType } from '@prisma/client';

export class VoucherController {
  /**
   * GET /api/vouchers
   * Danh sách vouchers của quán
   */
  static async getVouchers(req: Request, res: Response) {
    try {
      // Khóa multi-tenant: chỉ lấy tenantId từ token, không fallback query để tránh IDOR.
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'MISSING_TENANT', 'Thiếu mã định danh quán', 400);
      }

      const { activeOnly } = req.query;
      const where: any = { tenantId };

      if (activeOnly === 'true') {
        const now = new Date();
        where.isActive = true;
        where.startDate = { lte: now };
        where.endDate = { gte: now };
      }

      const vouchers = await prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, vouchers, 'Danh sách mã giảm giá');
    } catch (error: any) {
      logger.error('getVouchers failed', { stack: error?.stack, tenantId: req.user?.tenantId });
      return ApiResponse.error(res, 'DB_ERROR', 'Lỗi truy vấn voucher', 500);
    }
  }

  /**
   * POST /api/vouchers
   * Tạo voucher mới (ADMIN)
   */
  static async createVoucher(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin quán', 401);
      }

      const {
        code,
        description,
        type = 'PERCENT',
        value,
        maxDiscount,
        minOrderVal = 0,
        usageLimit,
        startDate = new Date(),
        endDate,
      } = req.body;

      if (!code || value === undefined || !endDate) {
        return ApiResponse.error(
          res,
          'MISSING_FIELDS',
          'Vui lòng cung cấp mã code, giá trị giảm và ngày hết hạn',
          400
        );
      }

      const formattedCode = String(code).trim().toUpperCase();

      const existing = await prisma.voucher.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: formattedCode,
          },
        },
      });

      if (existing) {
        return ApiResponse.error(res, 'DUPLICATE_CODE', 'Mã voucher này đã tồn tại trong quán', 400);
      }

      const voucher = await prisma.voucher.create({
        data: {
          tenantId,
          code: formattedCode,
          description,
          type: type as VoucherType,
          value: Number(value),
          maxDiscount: maxDiscount ? Number(maxDiscount) : null,
          minOrderVal: Number(minOrderVal),
          usageLimit: usageLimit ? Number(usageLimit) : null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: true,
        },
      });

      return ApiResponse.success(res, voucher, 'Tạo voucher thành công', 201);
    } catch (error: any) {
      logger.error('createVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'CREATE_ERROR', 'Lỗi tạo voucher', 500);
    }
  }

  /**
   * POST /api/vouchers/apply (legacy) + POST /api/vouchers/validate (spec C-017)
   * Động cơ kiểm tra & tính toán số tiền giảm giá của voucher
   * Cho phép gọi từ cả QR Menu khách hàng và POS Thu ngân
   */
  static async applyVoucher(req: Request, res: Response) {
    try {
      // QR/POS có thể chưa đăng nhập: ưu tiên tenant từ token, fallback body nhưng vẫn validate voucher thuộc tenant đó.
      const tenantId = req.user?.tenantId || req.body.tenantId;
      const { code, subTotal = 0 } = req.body;

      if (!tenantId || !code) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp mã quán và mã giảm giá', 400);
      }

      const formattedCode = String(code).trim().toUpperCase();
      const now = new Date();

      const voucher = await prisma.voucher.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: formattedCode,
          },
        },
      });

      if (!voucher) {
        return ApiResponse.error(res, 'INVALID_VOUCHER', 'Mã giảm giá không tồn tại', 404);
      }

      if (!voucher.isActive) {
        return ApiResponse.error(res, 'VOUCHER_INACTIVE', 'Mã giảm giá hiện đang bị tạm khóa', 400);
      }

      if (now < voucher.startDate) {
        return ApiResponse.error(res, 'VOUCHER_NOT_STARTED', 'Mã giảm giá chưa đến ngày áp dụng', 400);
      }

      if (now > voucher.endDate) {
        return ApiResponse.error(res, 'VOUCHER_EXPIRED', 'Mã giảm giá đã hết hạn sử dụng', 400);
      }

      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        return ApiResponse.error(res, 'VOUCHER_EXHAUSTED', 'Mã giảm giá đã hết lượt sử dụng', 400);
      }

      const numSubTotal = Number(subTotal);
      if (numSubTotal < voucher.minOrderVal) {
        return ApiResponse.error(
          res,
          'MIN_ORDER_NOT_MET',
          `Đơn hàng cần đạt tối thiểu ${voucher.minOrderVal.toLocaleString('vi-VN')}đ để sử dụng mã này`,
          400
        );
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (voucher.type === 'PERCENT') {
        discountAmount = (numSubTotal * voucher.value) / 100;
        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
          discountAmount = voucher.maxDiscount;
        }
      } else {
        discountAmount = voucher.value;
      }

      // Discount cannot exceed subTotal
      if (discountAmount > numSubTotal) {
        discountAmount = numSubTotal;
      }

      const finalAmount = Math.max(0, numSubTotal - discountAmount);

      return ApiResponse.success(
        res,
        {
          code: voucher.code,
          type: voucher.type,
          value: voucher.value,
          discountAmount,
          finalAmount,
          voucherId: voucher.id,
        },
        'Áp dụng mã giảm giá thành công'
      );
    } catch (error: any) {
      logger.error('applyVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'APPLY_ERROR', 'Lỗi tính toán giảm giá', 500);
    }
  }

  /** Alias spec: POST /api/vouchers/validate */
  static async validateVoucher(req: Request, res: Response) {
    return VoucherController.applyVoucher(req, res);
  }

  /**
   * POST /api/vouchers/:id/redeem
   * Chốt dùng voucher sau thanh toán: tăng usedCount + ghi VoucherUsage.
   */
  static async redeemVoucher(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin quán', 401);
      }
      const { id } = req.params;
      const { sessionId, orderId, customerId, discountAmount = 0, discount = 0 } = req.body;
      const usageSessionId = sessionId || orderId;
      if (!usageSessionId) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp sessionId của đơn áp voucher', 400);
      }
      const voucher = await prisma.voucher.findFirst({ where: { id, tenantId } });
      if (!voucher) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy voucher', 404);
      }
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        return ApiResponse.error(res, 'VOUCHER_EXHAUSTED', 'Mã giảm giá đã hết lượt sử dụng', 400);
      }
      const updated = await prisma.voucher.update({
        where: { id },
        data: { usedCount: { increment: 1 } },
      });
      // Ghi lịch sử dùng voucher (không chặn luồng chính nếu thiếu session).
      try {
        await prisma.voucherUsage.create({
          data: {
            voucherId: id,
            sessionId: usageSessionId,
            customerId: customerId || null,
            discount: Number(discountAmount || discount) || 0,
          },
        });
      } catch (usageErr: any) {
        logger.error('redeemVoucher usage log failed', { stack: usageErr?.stack, voucherId: id });
      }
      return ApiResponse.success(res, updated, 'Đã chốt lượt dùng voucher');
    } catch (error: any) {
      logger.error('redeemVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'REDEEM_ERROR', 'Lỗi chốt lượt dùng voucher', 500);
    }
  }

  /**
   * PATCH /api/vouchers/:id
   * Bật/tắt hoặc chỉnh sửa voucher
   */
  static async updateVoucher(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { isActive, description, endDate, usageLimit } = req.body;

      const voucher = await prisma.voucher.findFirst({
        where: { id, tenantId },
      });

      if (!voucher) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy voucher', 404);
      }

      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (description !== undefined) updateData.description = description;
      if (endDate) updateData.endDate = new Date(endDate);
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit;

      const updated = await prisma.voucher.update({
        where: { id },
        data: updateData,
      });

      return ApiResponse.success(res, updated, 'Cập nhật voucher thành công');
    } catch (error: any) {
      logger.error('updateVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'UPDATE_ERROR', 'Lỗi cập nhật voucher', 500);
    }
  }

  /**
   * DELETE /api/vouchers/:id (soft-disable: isActive=false)
   */
  static async deleteVoucher(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin quán', 401);
      }
      const { id } = req.params;
      const voucher = await prisma.voucher.findFirst({ where: { id, tenantId } });
      if (!voucher) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy voucher', 404);
      }
      const updated = await prisma.voucher.update({
        where: { id },
        data: { isActive: false },
      });
      return ApiResponse.success(res, { id: updated.id, isActive: false }, 'Đã vô hiệu hóa voucher');
    } catch (error: any) {
      logger.error('deleteVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DELETE_ERROR', 'Lỗi vô hiệu hóa voucher', 500);
    }
  }
}

export default VoucherController;
