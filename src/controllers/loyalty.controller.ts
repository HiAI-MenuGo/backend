import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

import { resolveTableScope } from '../utils/tableScope';

export function cleanVNPhone(p?: string | null): string {
  if (!p) return '';
  return p.trim().replace(/^\+84\s*/, '0').replace(/^84\s*/, '0').replace(/\s+/g, '');
}

export const createTierSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tên hạng thành viên không được để trống'),
    minPoints: z.number().int().min(0, 'Ngưỡng điểm tối thiểu phải >= 0'),
    discountRate: z.number().min(0).max(100, 'Tỷ lệ chiết khấu từ 0% đến 100%'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Mã màu phải là mã hex 6 ký tự hợp lệ (ví dụ: #94a3b8)'),
  }),
});

export const updateTierSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Thiếu ID hạng thành viên'),
  }),
  body: z.object({
    name: z.string().min(1, 'Tên hạng thành viên không được để trống').optional(),
    minPoints: z.number().int().min(0, 'Ngưỡng điểm tối thiểu phải >= 0'),
    discountRate: z.number().min(0).max(100, 'Tỷ lệ chiết khấu từ 0% đến 100%'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Mã màu phải là mã hex 6 ký tự hợp lệ (ví dụ: #94a3b8)'),
  }),
});

export const getCustomerQuerySchema = z.object({
  query: z.object({
    phone: z.string().min(8, 'Số điện thoại không hợp lệ').optional(),
    search: z.string().optional(),
    tableId: z.string().optional(),
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
   * POST /api/tiers
   * Tạo cấu hình hạng thành viên mới (ADMIN).
   */
  static async createTier(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { name, minPoints, discountRate, color } = req.body;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const existingTier = await prisma.membershipTier.findFirst({
        where: { tenantId, name },
      });

      if (existingTier) {
        return ApiResponse.error(res, 'TIER_EXISTS', 'Hạng thành viên này đã tồn tại', 400);
      }

      const created = await prisma.membershipTier.create({
        data: {
          tenantId,
          name,
          minPoints,
          discountRate,
          color,
        },
      });

      return ApiResponse.success(res, created, 'Tạo cấu hình hạng thành viên thành công', 201);
    } catch (error: any) {
      logger.error('Lỗi khi tạo hạng thành viên', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'CREATE_TIER_ERROR', 'Không thể tạo hạng thành viên', 500);
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
      const { name, minPoints, discountRate, color } = req.body;

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
          ...(name ? { name } : {}),
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
   * DELETE /api/tiers/:id
   * Xoá hạng thành viên (ADMIN).
   */
  static async deleteTier(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const existingTier = await prisma.membershipTier.findFirst({
        where: { id, tenantId },
      });

      if (!existingTier) {
        return ApiResponse.error(res, 'TIER_NOT_FOUND', 'Không tìm thấy hạng thành viên', 404);
      }

      // Gỡ bỏ liên kết tierId trên các khách hàng trước khi xoá
      await prisma.customer.updateMany({
        where: { tenantId, tierId: id },
        data: { tierId: null },
      });

      await prisma.membershipTier.delete({
        where: { id },
      });

      return ApiResponse.success(res, { id }, 'Xoá hạng thành viên thành công');
    } catch (error: any) {
      logger.error('Lỗi khi xoá hạng thành viên', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'DELETE_TIER_ERROR', 'Không thể xoá hạng thành viên', 500);
    }
  }

  /**
   * GET /api/customers/public?phone=&tableId=&name=
   * Endpoint tra cứu hoặc tự động đăng ký hội viên cho khách quét mã QR tại bàn (Public, không yêu cầu auth).
   * Nếu chưa tồn tại trong DB, tạo mới khách hàng với 50 điểm chào mừng.
   */
  static async getPublicCustomerByPhone(req: Request, res: Response) {
    try {
      const rawPhone = (req.query.phone as string)?.trim();
      const phone = cleanVNPhone(rawPhone);
      const tableId = (req.query.tableId as string)?.trim();
      const name = (req.query.name as string)?.trim();

      if (!phone || phone.length < 8) {
        return ApiResponse.error(res, 'INVALID_PHONE', 'Số điện thoại không hợp lệ', 400);
      }

      // Xác định tenantId từ tableId hoặc query hoặc tenant active đầu tiên
      let tenantId: string | null = null;
      if (tableId) {
        const scope = await resolveTableScope(tableId);
        if (scope) tenantId = scope.tenantId;
      }
      if (!tenantId && req.query.tenantId) {
        tenantId = String(req.query.tenantId);
      }
      if (!tenantId) {
        const activeTenant = await prisma.tenant.findFirst({
          where: { status: 'ACTIVE' },
          select: { id: true },
        });
        tenantId = activeTenant?.id || null;
      }

      if (!tenantId) {
        return ApiResponse.error(res, 'TENANT_NOT_FOUND', 'Không xác định được quán ăn', 404);
      }

      let customer = await prisma.customer.findUnique({
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

      // Nếu khách chưa tồn tại, tự động tạo mới vào CSDL với 50 điểm thưởng ban đầu
      let isNew = false;
      if (!customer) {
        isNew = true;
        const defaultTier = await prisma.membershipTier.findFirst({
          where: { tenantId },
          orderBy: { minPoints: 'asc' },
        });

        customer = await prisma.customer.create({
          data: {
            tenantId,
            phone,
            name: name || phone,
            loyaltyPoints: 50,
            totalSpent: 0,
            tierId: defaultTier?.id,
          },
          include: {
            tier: true,
          },
        });
      }

      const safeCustomer = {
        id: customer.id,
        name: customer.name,
        phone: cleanVNPhone(customer.phone),
        points: customer.loyaltyPoints,
        isNew,
        tier: customer.tier
          ? {
              id: customer.tier.id,
              name: customer.tier.name,
              discountRate: customer.tier.discountRate,
              color: customer.tier.color,
              minPoints: customer.tier.minPoints,
            }
          : { id: 'default', name: 'Đồng', discountRate: 0, color: '#B45309', minPoints: 0 },
        discountRate: customer.tier?.discountRate ?? 0,
        totalSpent: customer.totalSpent,
      };

      return ApiResponse.success(res, safeCustomer, isNew ? 'Đăng ký thành viên mới thành công' : 'Tra cứu khách hàng thành công');
    } catch (error: any) {
      logger.error('Lỗi khi tra cứu/đăng ký khách hàng công khai', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'PUBLIC_CUSTOMER_ERROR', 'Không thể tra cứu thông tin hội viên', 500);
    }
  }

  /**
   * GET /api/customers?phone= (Staff)
   * Dual-mode:
   * - Nếu có query phone: tra cứu chi tiết 1 hội viên (cho thu ngân / POS).
   * - Nếu không có query phone: lấy danh sách toàn bộ hội viên (cho Web Admin / CustomersView).
   */
  static async getCustomers(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const phone = req.query.phone as string;
      if (phone) {
        return LoyaltyController.getCustomerByPhone(req, res);
      }

      const search = (req.query.search as string)?.trim().toLowerCase();

      const customers = await prisma.customer.findMany({
        where: {
          tenantId,
          ...(search
            ? {
                OR: [
                  { phone: { contains: search } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          tier: true,
          sessions: {
            select: {
              id: true,
              finalAmount: true,
              openedAt: true,
              status: true,
            },
            orderBy: { openedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = customers.map((c) => {
        const lastSession = c.sessions[0];
        let lastVisitText = 'Mới tham gia';
        if (lastSession) {
          const dt = new Date(lastSession.openedAt);
          lastVisitText = `${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, ${dt.toLocaleDateString('vi-VN')}`;
        }

        return {
          id: c.id,
          name: c.name,
          phone: cleanVNPhone(c.phone),
          email: c.email || undefined,
          tier: c.tier?.name || 'Đồng',
          tierColor: c.tier?.color || '#B45309',
          points: c.loyaltyPoints,
          totalSpend: c.totalSpent,
          ordersCount: c.sessions.length,
          lastVisit: lastVisitText,
        };
      });

      return ApiResponse.success(res, formatted, 'Lấy danh sách khách hàng thành công');
    } catch (error: any) {
      logger.error('Lỗi khi lấy danh sách khách hàng', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_CUSTOMERS_ERROR', 'Không thể lấy danh sách khách hàng', 500);
    }
  }

  /**
   * POST /api/customers (ADMIN / CASHIER)
   * Tạo khách hàng mới thủ công từ Web Admin
   */
  static async createCustomer(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const { phone: rawPhone, name, email, tierId, initialPoints } = req.body;
      const phone = cleanVNPhone(rawPhone);
      if (!phone || phone.length < 8) {
        return ApiResponse.error(res, 'INVALID_PHONE', 'Số điện thoại không hợp lệ', 400);
      }

      const existing = await prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
      });
      if (existing) {
        return ApiResponse.error(res, 'CUSTOMER_EXISTS', 'Số điện thoại này đã được đăng ký thành viên', 400);
      }

      let assignedTierId = tierId;
      if (!assignedTierId) {
        const defaultTier = await prisma.membershipTier.findFirst({
          where: { tenantId },
          orderBy: { minPoints: 'asc' },
        });
        assignedTierId = defaultTier?.id;
      }

      const customer = await prisma.customer.create({
        data: {
          tenantId,
          phone: phone.trim(),
          name: name?.trim() || phone.trim(),
          email: email?.trim() || null,
          tierId: assignedTierId,
          loyaltyPoints: typeof initialPoints === 'number' ? Math.max(0, initialPoints) : 0,
          totalSpent: 0,
        },
        include: { tier: true },
      });

      return ApiResponse.success(res, customer, 'Đăng ký thành viên mới thành công', 201);
    } catch (error: any) {
      logger.error('Lỗi khi tạo thành viên mới', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'CREATE_CUSTOMER_ERROR', 'Không thể tạo thành viên mới', 500);
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
        phone: cleanVNPhone(customer.phone),
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

  /**
   * DELETE /api/customers/:id
   * Xoá khách hàng (CASHIER/MANAGER/ADMIN)
   */
  static async deleteCustomer(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      if (!id) {
        return ApiResponse.error(res, 'MISSING_ID', 'Thiếu định danh khách hàng cần xoá', 400);
      }

      // Hỗ trợ tìm kiếm theo ID hoặc theo số điện thoại
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          tenantId,
          OR: [
            { id },
            { phone: id },
          ],
        },
      });

      if (!existingCustomer) {
        return ApiResponse.error(res, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng cần xoá', 404);
      }

      // Xoá quan hệ liên quan nếu cần, sau đó xoá khách hàng
      await prisma.customer.delete({
        where: { id: existingCustomer.id },
      });

      logger.info('Xoá khách hàng thành công (Customer deleted)', {
        tenantId,
        customerId: existingCustomer.id,
        phone: existingCustomer.phone,
        operatorUserId: req.user?.userId,
      });

      return ApiResponse.success(
        res,
        { id: existingCustomer.id, phone: existingCustomer.phone },
        'Xoá khách hàng thành công'
      );
    } catch (error: any) {
      logger.error('Lỗi khi xoá khách hàng', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'DELETE_CUSTOMER_ERROR', 'Không thể xoá khách hàng', 500);
    }
  }
}

export default LoyaltyController;
