import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

export const updateTierSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Thiếu ID hạng thành viên'),
  }),
  body: z.object({
    minPoints: z.number().int().min(0, 'Ngưỡng điểm tối thiểu phải >= 0'),
    discountRate: z.number().min(0).max(100, 'Tỷ lệ chiết khấu từ 0% đến 100%'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Mã màu phải là mã hex 6 ký tự hợp lệ (ví dụ: #94a3b8)'),
  }),
});

export const getCustomerQuerySchema = z.object({
  query: z.object({
    phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
  }),
});

export const adjustPointsSchema = z.object({
  body: z.object({
    phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
    orderId: z.string().optional(),
    pointsDelta: z.number().int('Số điểm phải là số nguyên'),
    // Tên khách khi tạo mới (khách vãng lai tích điểm lần đầu không cần đăng ký — BUSINESS §6).
    // Bỏ trống thì dùng SĐT làm tên tạm để tránh tên giả đánh lừa nghiệp vụ.
    name: z.string().min(1).optional(),
  }),
});

export class LoyaltyController {
  /**
   * GET /api/tiers
   * Lấy danh sách phân hạng thành viên theo tenantId (auth).
   */
  static async getTiers(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const tiers = await prisma.membershipTier.findMany({
        where: { tenantId },
        orderBy: { minPoints: 'asc' },
      });

      return ApiResponse.success(res, tiers, 'Lấy danh sách hạng thành viên thành công');
    } catch (error: any) {
      logger.error('Lỗi khi lấy danh sách hạng thành viên', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_TIERS_ERROR', 'Không thể lấy danh sách hạng thành viên', 500);
    }
  }

  /**
   * PUT /api/tiers/:id
   * Cập nhật cấu hình hạng thành viên (ADMIN).
   */
  static async updateTier(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { minPoints, discountRate, color } = req.body;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const existingTier = await prisma.membershipTier.findFirst({
        where: { id, tenantId },
      });

      if (!existingTier) {
        return ApiResponse.error(res, 'TIER_NOT_FOUND', 'Không tìm thấy hạng thành viên', 404);
      }

      const updated = await prisma.membershipTier.update({
        where: { id },
        data: {
          minPoints,
          discountRate,
          color,
        },
      });

      return ApiResponse.success(res, updated, 'Cập nhật cấu hình hạng thành viên thành công');
    } catch (error: any) {
      logger.error('Lỗi khi cập nhật hạng thành viên', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'UPDATE_TIER_ERROR', 'Không thể cập nhật hạng thành viên', 500);
    }
  }

  /**
   * GET /api/customers?phone=
   * Tra cứu thông tin hội viên theo SĐT (CASHIER/MANAGER/ADMIN).
   * Chỉ trả name/tier/points/discountRate/totalSpent — không lộ thông tin nhạy cảm.
   */
  static async getCustomerByPhone(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const phone = req.query.phone as string;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone,
          },
        },
        include: {
          tier: true,
        },
      });

      if (!customer) {
        return ApiResponse.error(res, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy thông tin khách hàng', 404);
      }

      const safeCustomer = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        points: customer.loyaltyPoints,
        tier: customer.tier
          ? {
              id: customer.tier.id,
              name: customer.tier.name,
              discountRate: customer.tier.discountRate,
              color: customer.tier.color,
              minPoints: customer.tier.minPoints,
            }
          : null,
        discountRate: customer.tier?.discountRate ?? 0,
        totalSpent: customer.totalSpent,
      };

      return ApiResponse.success(res, safeCustomer, 'Tra cứu khách hàng thành công');
    } catch (error: any) {
      logger.error('Lỗi khi tra cứu khách hàng', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_CUSTOMER_ERROR', 'Không thể tra cứu thông tin khách hàng', 500);
    }
  }

  /**
   * POST /api/customers/points
   * Cộng/trừ điểm tích lũy + tự động nâng hạng theo ngưỡng (CASHIER+).
   */
  static async adjustPoints(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { phone, orderId, pointsDelta, name } = req.body;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      // Tìm customer, cho phép tạo mới khách vãng lai (cờ isNewCustomer để UI biết).
      let isNewCustomer = false;
      let customer = await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone,
          },
        },
        include: { tier: true },
      });

      if (!customer) {
        // Khách vãng lai tích điểm lần đầu: cho phép tạo mới đúng nghiệp vụ
        // "không cần đăng ký" (BUSINESS §6), nhưng cờ isNewCustomer để UI biết.
        isNewCustomer = true;
        const defaultTier = await prisma.membershipTier.findFirst({
          where: { tenantId },
          orderBy: { minPoints: 'asc' },
        });

        customer = await prisma.customer.create({
          data: {
            tenantId,
            phone,
            name: name?.trim() || phone,
            loyaltyPoints: 0,
            totalSpent: 0,
            tierId: defaultTier?.id,
          },
          include: { tier: true },
        });
      }
      // isNewCustomer đã set true trong nhánh tạo mới ở trên.

      const newPoints = Math.max(0, customer.loyaltyPoints + pointsDelta);

      // Tìm tất cả các hạng của tenant để tự động nâng hạng theo ngưỡng điểm
      const allTiers = await prisma.membershipTier.findMany({
        where: { tenantId },
        orderBy: { minPoints: 'desc' },
      });

      // Lấy hạng cao nhất mà newPoints >= minPoints
      const matchedTier = allTiers.find((t) => newPoints >= t.minPoints) || allTiers[allTiers.length - 1] || null;

      const updatedCustomer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          loyaltyPoints: newPoints,
          tierId: matchedTier ? matchedTier.id : customer.tierId,
        },
        include: { tier: true },
      });

      // Ghi log biến động điểm thưởng qua Winston logger
      logger.info('Biến động điểm thưởng thành viên (Loyalty point change)', {
        tenantId,
        customerId: customer.id,
        phone,
        orderId: orderId || null,
        pointsDelta,
        previousPoints: customer.loyaltyPoints,
        newPoints,
        newTier: updatedCustomer.tier?.name,
        operatorUserId: req.user?.userId,
      });

      const safeResult = {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        points: updatedCustomer.loyaltyPoints,
        pointsDelta,
        isNewCustomer,
        tier: updatedCustomer.tier
          ? {
              id: updatedCustomer.tier.id,
              name: updatedCustomer.tier.name,
              discountRate: updatedCustomer.tier.discountRate,
              color: updatedCustomer.tier.color,
            }
          : null,
        discountRate: updatedCustomer.tier?.discountRate ?? 0,
      };

      return ApiResponse.success(res, safeResult, 'Cập nhật điểm và phân hạng thành công');
    } catch (error: any) {
      logger.error('Lỗi khi cộng/trừ điểm tích lũy', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'ADJUST_POINTS_ERROR', 'Không thể cập nhật điểm thưởng', 500);
    }
  }
}

export default LoyaltyController;
