import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

export interface VoucherQuoteResult {
  valid: boolean;
  code?: string;
  type?: 'PERCENT' | 'FIXED';
  value?: number;
  discountAmount: number;
  finalAmount: number;
  voucherId?: string;
  errorCode?: string;
  message?: string;
}

export class VoucherQuoteService {
  /**
   * Tính toán giảm giá thuần từ mã voucher cho một tenant và subTotal.
   * Hàm pure: không phụ thuộc req/res, không ghi DB, không tăng usedCount.
   */
  static async validateVoucherForOrder(
    tenantId: string,
    code: string,
    subTotal: number
  ): Promise<VoucherQuoteResult> {
    const numSubTotal = Math.max(0, Number(subTotal) || 0);

    if (!tenantId || !code) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: numSubTotal,
        errorCode: 'MISSING_FIELDS',
        message: 'Vui lòng cung cấp mã quán và mã giảm giá',
      };
    }

    const formattedCode = String(code).trim().toUpperCase();
    const now = new Date();

    try {
      const voucher = await prisma.voucher.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: formattedCode,
          },
        },
      });

      if (!voucher) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'INVALID_VOUCHER',
          message: 'Mã giảm giá không tồn tại',
        };
      }

      if (!voucher.isActive) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'VOUCHER_INACTIVE',
          message: 'Mã giảm giá hiện đang bị tạm khóa',
        };
      }

      if (now < voucher.startDate) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'VOUCHER_NOT_STARTED',
          message: 'Mã giảm giá chưa đến ngày áp dụng',
        };
      }

      if (now > voucher.endDate) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'VOUCHER_EXPIRED',
          message: 'Mã giảm giá đã hết hạn sử dụng',
        };
      }

      if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'VOUCHER_EXHAUSTED',
          message: 'Mã giảm giá đã hết lượt sử dụng',
        };
      }

      if (numSubTotal < voucher.minOrderVal) {
        return {
          valid: false,
          discountAmount: 0,
          finalAmount: numSubTotal,
          errorCode: 'MIN_ORDER_NOT_MET',
          message: `Đơn hàng cần đạt tối thiểu ${voucher.minOrderVal.toLocaleString('vi-VN')}đ để sử dụng mã này`,
        };
      }

      // Tính số tiền giảm giá theo loại PERCENT hoặc FIXED
      let discountAmount = 0;
      if (voucher.type === 'PERCENT') {
        discountAmount = (numSubTotal * voucher.value) / 100;
        if (voucher.maxDiscount !== null && voucher.maxDiscount !== undefined && discountAmount > voucher.maxDiscount) {
          discountAmount = voucher.maxDiscount;
        }
      } else {
        discountAmount = voucher.value;
      }

      // Giảm giá không vượt quá tổng tiền
      if (discountAmount > numSubTotal) {
        discountAmount = numSubTotal;
      }

      const finalAmount = Math.max(0, numSubTotal - discountAmount);

      return {
        valid: true,
        code: voucher.code,
        type: voucher.type as 'PERCENT' | 'FIXED',
        value: voucher.value,
        discountAmount,
        finalAmount,
        voucherId: voucher.id,
        message: 'Áp dụng mã giảm giá thành công',
      };
    } catch (err: any) {
      logger.error(`[VoucherQuoteService] validateVoucherForOrder error: ${err.message}`, { error: err });
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: numSubTotal,
        errorCode: 'APPLY_ERROR',
        message: 'Lỗi tính toán giảm giá',
      };
    }
  }
}
