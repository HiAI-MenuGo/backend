import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { resolveTableScope } from '../utils/tableScope';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';


export class BrandingController {
  /**
   * GET /api/branding/:tenantId (hoặc query / token)
   * Lấy cấu hình nhận diện thương hiệu cho Web/Mobile QR Menu & POS
   */
  static async getBranding(req: Request, res: Response) {
    try {
      const paramTenant = req.params.tenantId || (req.query.tenantId as string);
      const userTenant = req.user?.tenantId;

      // Auth staff: chỉ được xem branding quán mình (trừ PLATFORM_ADMIN)
      if (userTenant && req.user?.role !== 'PLATFORM_ADMIN') {
        if (paramTenant && paramTenant !== userTenant) {
          return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy quán ăn', 404);
        }
      }

      const tenantId = paramTenant || userTenant;

      if (!tenantId) {
        return ApiResponse.error(res, 'MISSING_TENANT', 'Thiếu mã định danh quán', 400);
      }

      let branding = await prisma.tenantBranding.findUnique({
        where: { tenantId },
        select: {
          tenantId: true,
          logoUrl: true,
          bannerUrl: true,
          bankCode: true,
          bankAccountNo: true,
          bankAccountName: true,
          wifiSsid: true,
          footerText: true,
          enablePaymentCall: true,
          enableStaffCall: true,
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

      // Lấy địa chỉ và thông tin chi nhánh đang kích hoạt
      const branchQueryId = (req.query.branchId as string) || (req.params.branchId as string);
      let branch = null;
      if (branchQueryId && branchQueryId !== 'default-branch') {
        branch = await prisma.branch.findFirst({
          where: { tenantId, id: branchQueryId, isActive: true },
        });
      }
      if (!branch) {
        branch = await prisma.branch.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      const responsePayload = {
        ...branding,
        restaurantName: branding.tenant?.name || 'MenuGO',
        branchName: branch?.name || null,
        branchCode: branch?.code || null,
        branchId: branch?.id || null,
        address: branch?.address || '170 Bàu Cát, Phường 14, Tân Bình, Hồ Chí Minh',
        phone: branch?.phone || null,
      };

      return ApiResponse.success(res, responsePayload, 'Thông tin thương hiệu quán');
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
      // Nếu caller đã đăng nhập (staff): khóa theo tenant của token, chặn dò branch tenant khác
      // qua branchId/code đoán được. QR khách không có token -> đi nhánh tableId/query bên dưới.
      let authTenant: string | null = null;
      try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded?.tenantId) authTenant = String(decoded.tenantId);
        }
      } catch {
        authTenant = null;
      }

      // Ưu tiên tableId (QR quét bàn): lookup bàn -> tenant/branch chính xác, không đoán được
      const tableId = (req.query.tableId as string) || '';
      let branch: any = null;
      let resolvedTenantId = authTenant || '';
      let resolvedTableName: string | null = null;
      let resolvedTableCode: string | null = null;
      let qTenant = (req.query.tenantId as string) || '';
      if (qTenant === 'default-tenant') qTenant = '';
      // Staff đã login: ép tenant theo token, bỏ qua tenantId query lạ
      if (authTenant) qTenant = authTenant;
      const branchIdParam = (req.query.branchId as string) || '';

      if (tableId) {
        const scope = await resolveTableScope(tableId, {
          tenantId: qTenant || undefined,
          branchId: branchIdParam && branchIdParam !== 'default-branch' && branchIdParam !== 'ALL' ? branchIdParam : undefined,
        });
        if (!scope) {
          return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Bàn không tồn tại', 404);
        }
        // Bàn QR phải thuộc tenant của staff đã login (nếu có) — chặn dùng QR quán A
        // với token staff quán B để dò branding
        if (authTenant && scope.tenantId !== authTenant) {
          return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Bàn không tồn tại', 404);
        }
        resolvedTenantId = scope.tenantId;
        resolvedTableName = scope.tableName || null;
        resolvedTableCode = scope.tableCode || null;
        branch = await prisma.branch.findFirst({
          where: { id: scope.branchId, tenantId: scope.tenantId, isActive: true },
        });
      } else {

        if (branchIdParam && branchIdParam !== 'default-branch') {
          // QR ẩn danh chỉ gửi branch code mà không rõ tenant -> từ chối
          // (branch code đoán được, trước đây trả branding bừa -> leak cross-tenant)
          if (!qTenant) {
            return ApiResponse.error(res, 'MISSING_TENANT', 'Thiếu định danh quán (tableId hoặc tenantId)', 400);
          }
          branch = await prisma.branch.findFirst({
            where: {
              OR: [{ id: branchIdParam }, { code: branchIdParam }],
              tenantId: qTenant,
              isActive: true,
            },
          });
          if (!branch) {
            return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
          }
        } else if (qTenant) {
          branch = await prisma.branch.findFirst({
            where: { tenantId: qTenant, isActive: true },
            orderBy: { createdAt: 'asc' },
          });
        }

        resolvedTenantId = qTenant || branch?.tenantId || '';
      }

      // Không fallback tenant đầu tiên nữa (từng leak cross-tenant): bắt buộc định danh rõ
      const effectiveTenantId = resolvedTenantId || branch?.tenantId;
      if (!effectiveTenantId) {
        return ApiResponse.error(res, 'MISSING_TENANT', 'Thiếu định danh quán (tableId hoặc tenantId)', 400);
      }

      const branding = await prisma.tenantBranding.findUnique({
        where: { tenantId: effectiveTenantId },
        select: {
          tenantId: true,
          logoUrl: true,
          bannerUrl: true,
          bankCode: true,
          bankAccountNo: true,
          bankAccountName: true,
          wifiSsid: true,
          footerText: true,
          enablePaymentCall: true,
          enableStaffCall: true,
          tenant: { select: { name: true, code: true, slug: true, status: true } },
        },
      });

      if (!branding) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy cấu hình thương hiệu', 404);
      }

      const responsePayload = {
        ...branding,
        restaurantName: branding.tenant?.name || 'MenuGO',
        branchName: branch?.name || null,
        branchCode: branch?.code || null,
        branchId: branch?.id || null,
        tableName: resolvedTableName,
        tableCode: resolvedTableCode,
        address: branch?.address || '170 Bàu Cát, Phường 14, Tân Bình, Hồ Chí Minh',
        phone: branch?.phone || null,
      };

      return ApiResponse.success(res, responsePayload, 'Thông tin thương hiệu quán');
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
        restaurantName,
        logoUrl,
        bannerUrl,
        wifiSsid,
        wifiPassword,
        footerText,
        bankCode,
        bankAccountNo,
        bankAccountName,
        enablePaymentCall,
        enableStaffCall,
      } = req.body;

      if (restaurantName !== undefined && typeof restaurantName === 'string' && restaurantName.trim()) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { name: restaurantName.trim() },
        });
      }

      const finalLogoUrl =
        logoUrl !== undefined ? (logoUrl && String(logoUrl).trim() ? String(logoUrl).trim() : null) : undefined;
      const finalBannerUrl =
        bannerUrl !== undefined ? (bannerUrl && String(bannerUrl).trim() ? String(bannerUrl).trim() : null) : undefined;

      const branding = await prisma.tenantBranding.upsert({
        where: { tenantId },
        update: {
          ...(finalLogoUrl !== undefined && { logoUrl: finalLogoUrl }),
          ...(finalBannerUrl !== undefined && { bannerUrl: finalBannerUrl }),
          ...(wifiSsid !== undefined && { wifiSsid }),
          ...(wifiPassword !== undefined && { wifiPassword }),
          ...(footerText !== undefined && { footerText }),
          ...(bankCode !== undefined && { bankCode }),
          ...(bankAccountNo !== undefined && { bankAccountNo }),
          ...(bankAccountName !== undefined && { bankAccountName }),
          ...(enablePaymentCall !== undefined && { enablePaymentCall: Boolean(enablePaymentCall) }),
          ...(enableStaffCall !== undefined && { enableStaffCall: Boolean(enableStaffCall) }),
        },
        create: {
          tenantId,
          logoUrl: finalLogoUrl !== undefined ? finalLogoUrl : null,
          bannerUrl: finalBannerUrl !== undefined ? finalBannerUrl : null,
          wifiSsid,
          wifiPassword,
          footerText,
          bankCode,
          bankAccountNo,
          bankAccountName,
          enablePaymentCall: enablePaymentCall !== undefined ? Boolean(enablePaymentCall) : true,
          enableStaffCall: enableStaffCall !== undefined ? Boolean(enableStaffCall) : true,
        },
        include: {
          tenant: { select: { name: true, code: true, slug: true, status: true } },
        },
      });

      // Phát realtime qua Socket để màn hình Web QR Menu của khách cập nhật ngay lập tức
      try {
        const { getIO } = await import('../socket');
        const io = getIO();
        io.to(`tenant:${tenantId}`).emit('branding:updated', branding);
        io.emit('branding:updated', branding);
      } catch (sockErr) {
        logger.warn('Socket emit branding:updated failed', { sockErr });
      }

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
