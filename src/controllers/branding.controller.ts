import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class BrandingController {
  /**
   * GET /api/branding/:tenantId (hoặc query / token)
   * Lấy cấu hình nhận diện thương hiệu cho Web/Mobile QR Menu & POS
   */
  static async getBranding(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId || req.user?.tenantId || (req.query.tenantId as string);

      if (!tenantId) {
        return ApiResponse.error(res, 'MISSING_TENANT', 'Thiếu mã định danh quán', 400);
      }

      let branding = await prisma.tenantBranding.findUnique({
        where: { tenantId },
        include: {
          tenant: {
            select: {
              name: true,
              code: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      // Public QR Menu: không tự tạo branding để tránh che lỗi typo tenantId.
      if (!branding) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy quán ăn', 404);
      }

      return ApiResponse.success(res, branding, 'Thông tin thương hiệu quán');
    } catch (error: any) {
      logger.error('getBranding failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DB_ERROR', 'Lỗi truy vấn thương hiệu', 500);
    }
  }

  /**
   * GET /api/branding/public?branchId=&tenantId=
   * Endpoint public cho QR Menu và màn hình thanh toán tại bàn (không cần auth)
   */
  static async getPublicBranding(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      let branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch && branchId === 'default-branch') {
        branch = await prisma.branch.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      const tenantId = (req.query.tenantId as string) || branch?.tenantId;

      if (!tenantId) {
        const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' } });
        if (!tenant) {
          return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy quán ăn', 404);
        }
        const branding = await prisma.tenantBranding.findUnique({
          where: { tenantId: tenant.id },
          include: { tenant: { select: { name: true, code: true, slug: true, status: true } } },
        });
        return ApiResponse.success(res, branding, 'Thông tin thương hiệu quán');
      }

      const branding = await prisma.tenantBranding.findUnique({
        where: { tenantId },
        include: { tenant: { select: { name: true, code: true, slug: true, status: true } } },
      });

      if (!branding) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy cấu hình thương hiệu', 404);
      }

      return ApiResponse.success(res, branding, 'Thông tin thương hiệu quán');
    } catch (error: any) {
      logger.error('getPublicBranding failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DB_ERROR', 'Lỗi truy vấn thương hiệu', 500);
    }
  }

  /**
   * PUT /api/branding
   * Cập nhật thông tin nhận diện thương hiệu (ADMIN)
   */
  static async updateBranding(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const {
        logoUrl,
        bannerUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        wifiSsid,
        wifiPassword,
        footerText,
        bankCode,
        bankAccountNo,
        bankAccountName,
      } = req.body;

      for (const [key, val] of Object.entries({ primaryColor, secondaryColor, accentColor })) {
        if (val && !HEX_COLOR.test(String(val))) {
          return ApiResponse.error(res, 'INVALID_COLOR', `Màu ${key} không đúng định dạng hex (#rgb/#rrggbb)`, 400);
        }
      }

      const branding = await prisma.tenantBranding.upsert({
        where: { tenantId },
        update: {
          ...(logoUrl !== undefined && { logoUrl }),
          ...(bannerUrl !== undefined && { bannerUrl }),
          ...(primaryColor && { primaryColor }),
          ...(secondaryColor && { secondaryColor }),
          ...(accentColor && { accentColor }),
          ...(wifiSsid !== undefined && { wifiSsid }),
          ...(wifiPassword !== undefined && { wifiPassword }),
          ...(footerText !== undefined && { footerText }),
          ...(bankCode !== undefined && { bankCode }),
          ...(bankAccountNo !== undefined && { bankAccountNo }),
          ...(bankAccountName !== undefined && { bankAccountName }),
        },
        create: {
          tenantId,
          logoUrl,
          bannerUrl,
          primaryColor: primaryColor || '#f59e0b',
          secondaryColor: secondaryColor || '#d97706',
          accentColor: accentColor || '#fbbf24',
          wifiSsid,
          wifiPassword,
          footerText,
          bankCode,
          bankAccountNo,
          bankAccountName,
        },
      });

      return ApiResponse.success(res, branding, 'Cập nhật nhận diện thương hiệu thành công');
    } catch (error: any) {
      logger.error('updateBranding failed', { stack: error?.stack });
      return ApiResponse.error(res, 'UPDATE_ERROR', 'Lỗi cập nhật thương hiệu', 500);
    }
  }

  /** Alias spec: PATCH /api/branding/:tenantId */
  static async patchBranding(req: Request, res: Response) {
    return BrandingController.updateBranding(req, res);
  }
}

export default BrandingController;
