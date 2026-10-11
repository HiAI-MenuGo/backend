import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { resolveTableScope } from '../utils/tableScope';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { VoucherType } from '@prisma/client';
import { VoucherQuoteService } from '../services/voucher-quote.service';

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
      // Thứ tự ưu tiên tenant: token auth > tableId (QR lookup bàn) > body.tenantId (legacy).
      // Table là source of truth cho QR public để chặn dò voucher cross-tenant.
      let tenantId: string | undefined = req.user?.tenantId;
      const { code, subTotal = 0, tableId } = req.body;

      if (!tenantId && tableId) {
        const scope = await resolveTableScope(String(tableId));
        if (!scope) {
          return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Bàn không tồn tại', 404);
        }
        tenantId = scope.tenantId;
      }
      if (!tenantId) tenantId = req.body.tenantId;

      if (!tenantId || !code) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp mã quán và mã giảm giá', 400);
      }

      const quote = await VoucherQuoteService.validateVoucherForOrder(tenantId, code, subTotal);
      if (!quote.valid) {
        const statusCode = quote.errorCode === 'INVALID_VOUCHER' ? 404 : 400;
        return ApiResponse.error(res, quote.errorCode || 'APPLY_ERROR', quote.message || 'Lỗi mã giảm giá', statusCode);
      }

      return ApiResponse.success(
        res,
        {
          code: quote.code,
          type: quote.type,
          value: quote.value,
          discountAmount: quote.discountAmount,
          finalAmount: quote.finalAmount,
          voucherId: quote.voucherId,
        },
        quote.message || 'Áp dụng mã giảm giá thành công'
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
      const { sessionId, orderId, customerId, discountAmount = 0, discount = 0, subTotal } = req.body;
      const usageSessionId = sessionId || orderId;
      if (!usageSessionId) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp sessionId của đơn áp voucher', 400);
      }
      const voucher = await prisma.voucher.findFirst({ where: { id, tenantId } });
      if (!voucher) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy voucher', 404);
      }

      // Xác định subTotal hiện tại của đơn hàng để kiểm tra lại điều kiện
      let currentSubTotal = Number(subTotal);
      if (isNaN(currentSubTotal) || currentSubTotal <= 0) {
        const session = await prisma.orderSession.findUnique({
          where: { id: usageSessionId },
          include: { orders: { select: { totalAmount: true } } },
        });
        currentSubTotal = session?.orders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || voucher.minOrderVal || 0;
      }

      // Kiểm tra lại toàn diện điều kiện voucher (isActive, date, usageLimit, minOrder) qua VoucherQuoteService
      const quote = await VoucherQuoteService.validateVoucherForOrder(
        tenantId,
        voucher.code,
        currentSubTotal
      );

      if (!quote.valid) {
        return ApiResponse.error(
          res,
          quote.errorCode || 'INVALID_VOUCHER',
          quote.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn',
          400
        );
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
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin quán', 401);
      }
      const { id } = req.params;
      const {
        code,
        description,
        type,
        value,
        maxDiscount,
        minOrderVal,
        usageLimit,
        startDate,
        endDate,
        isActive,
      } = req.body;

      const voucher = await prisma.voucher.findFirst({
        where: { id, tenantId },
      });

      if (!voucher) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy voucher', 404);
      }

      const updateData: any = {};

      if (code !== undefined) {
        const formattedCode = String(code).trim().toUpperCase();
        if (formattedCode !== voucher.code) {
          const duplicate = await prisma.voucher.findFirst({
            where: {
              tenantId,
              code: formattedCode,
              NOT: { id },
            },
          });
          if (duplicate) {
            return ApiResponse.error(res, 'DUPLICATE_CODE', 'Mã voucher này đã tồn tại trong quán', 400);
          }
          updateData.code = formattedCode;
        }
      }

      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type as VoucherType;
      if (value !== undefined) updateData.value = Number(value);
      if (maxDiscount !== undefined) {
        updateData.maxDiscount = maxDiscount === '' || maxDiscount === null ? null : Number(maxDiscount);
      }
      if (minOrderVal !== undefined) updateData.minOrderVal = Number(minOrderVal);
      if (usageLimit !== undefined) {
        updateData.usageLimit = usageLimit === '' || usageLimit === null ? null : Number(usageLimit);
      }
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

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
   * DELETE /api/vouchers/:id
   * Xóa vĩnh viễn nếu chưa từng sử dụng, hoặc vô hiệu hóa nếu đã có lịch sử đơn hàng
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

      const usageCount = await prisma.voucherUsage.count({ where: { voucherId: id } });
      if (usageCount === 0 && voucher.usedCount === 0) {
        await prisma.voucher.delete({ where: { id } });
        return ApiResponse.success(res, { id, deleted: true }, 'Đã xóa mã khuyến mãi vĩnh viễn');
      } else {
        const updated = await prisma.voucher.update({
          where: { id },
          data: { isActive: false },
        });
        return ApiResponse.success(
          res,
          { id: updated.id, isActive: false, softDeleted: true },
          'Mã này đã có lịch sử áp dụng, hệ thống đã chuyển sang tạm dừng/vô hiệu hóa'
        );
      }
    } catch (error: any) {
      logger.error('deleteVoucher failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DELETE_ERROR', 'Lỗi xử lý voucher', 500);
    }
  }
}

export default VoucherController;
