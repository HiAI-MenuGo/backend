import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';

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

      // Nếu chưa có, tạo profile mặc định
      if (!branding) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy quán ăn', 404);
        }
        branding = await prisma.tenantBranding.create({
          data: {
            tenantId,
            primaryColor: '#f59e0b',
            secondaryColor: '#d97706',
            accentColor: '#fbbf24',
          },
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
      }

      return ApiResponse.success(res, branding, 'Thông tin thương hiệu quán');
    } catch (error: any) {
      return ApiResponse.error(res, 'DB_ERROR', error.message || 'Lỗi truy vấn thương hiệu', 500);
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
      return ApiResponse.error(res, 'UPDATE_ERROR', error.message || 'Lỗi cập nhật thương hiệu', 500);
    }
  }
}

export default BrandingController;
