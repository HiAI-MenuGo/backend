import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { SubscriptionPlan, TenantStatus, UserRole } from '@prisma/client';

export class PlatformController {
  /**
   * GET /api/platform-admin/tenants
   * Danh sách các tenant trên toàn nền tảng SaaS
   */
  static async getTenants(req: Request, res: Response) {
    try {
      const { status, plan, search } = req.query;

      const where: any = {};
      if (status) where.status = status as TenantStatus;
      if (plan) where.plan = plan as SubscriptionPlan;
      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { code: { contains: String(search), mode: 'insensitive' } },
          { ownerEmail: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const tenants = await prisma.tenant.findMany({
        where,
        include: {
          branding: {
            select: {
              logoUrl: true,
              primaryColor: true,
            },
          },
          _count: {
            select: {
              branches: true,
              users: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, tenants, 'Lấy danh sách tenant thành công');
    } catch (error: any) {
      logger.error('getTenants failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DB_ERROR', 'Lỗi truy vấn cơ sở dữ liệu', 500);
    }
  }

  /**
   * POST /api/platform-admin/tenants
   * Onboarding tạo mới Tenant quán ăn, kèm chủ quán ADMIN và chi nhánh mặc định
   */
  static async createTenant(req: Request, res: Response) {
    try {
      const {
        code,
        name,
        slug,
        ownerEmail,
        ownerPhone,
        ownerPassword,
        plan = 'STARTER',
        branchName = 'Chi Nhánh Mặc Định',
        primaryColor = '#f59e0b',
      } = req.body;

      if (!code || !name || !ownerEmail || !ownerPassword) {
        return ApiResponse.error(
          res,
          'MISSING_FIELDS',
          'Vui lòng điền đủ code, tên quán, email chủ quán và mật khẩu',
          400
        );
      }

      // Check duplicate code / slug
      const existing = await prisma.tenant.findFirst({
        where: {
          OR: [{ code }, { slug: slug || code.toLowerCase() }],
        },
      });

      if (existing) {
        return ApiResponse.error(res, 'DUPLICATE_TENANT', 'Mã quán hoặc đường dẫn (slug) đã tồn tại', 400);
      }

      const passwordHash = await bcrypt.hash(ownerPassword, 10);
      const computedSlug = slug || code.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Create transaction: Tenant + Branding + Default Branch + Admin User
      const newTenant = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            code,
            name,
            slug: computedSlug,
            ownerEmail,
            ownerPhone,
            plan: plan as SubscriptionPlan,
            status: TenantStatus.ACTIVE,
            branding: {
              create: {
                primaryColor,
                secondaryColor: '#d97706',
              },
            },
          },
        });

        const branch = await tx.branch.create({
          data: {
            tenantId: tenant.id,
            code: 'BR-01',
            name: branchName,
            isActive: true,
          },
        });

        const adminUser = await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            email: ownerEmail,
            name: `Chủ quán (${name})`,
            phone: ownerPhone,
            passwordHash,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });

        return { tenant, branch, adminUser };
      });

      return ApiResponse.success(res, newTenant, 'Khởi tạo tenant và chủ quán thành công', 201);
    } catch (error: any) {
      logger.error('createTenant failed', { stack: error?.stack });
      return ApiResponse.error(res, 'CREATE_TENANT_ERROR', 'Không thể tạo tenant', 500);
    }
  }

  /**
   * PATCH /api/platform-admin/tenants/:id/subscription
   * Nâng cấp / gia hạn gói cước, hoặc tạm ngưng tenant
   */
  static async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { plan, status, durationMonths = 12 } = req.body;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy tenant', 404);
      }

      const updateData: any = {};
      if (plan) {
        updateData.plan = plan as SubscriptionPlan;
        updateData.planExpiresAt = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);
      }
      if (status) {
        updateData.status = status as TenantStatus;
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: updateData,
      });

      return ApiResponse.success(res, updated, 'Cập nhật gói cước thành công');
    } catch (error: any) {
      logger.error('updateSubscription failed', { stack: error?.stack });
      return ApiResponse.error(res, 'UPDATE_ERROR', 'Lỗi cập nhật subscription', 500);
    }
  }

  /**
   * GET /api/platform-admin/stats
   * Thống kê tổng quan nền tảng SaaS
   */
  static async getPlatformStats(req: Request, res: Response) {
    try {
      const totalTenants = await prisma.tenant.count();
      const activeTenants = await prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } });
      const suspendedTenants = await prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } });
      const totalBranches = await prisma.branch.count();
      const totalUsers = await prisma.tenantUser.count();

      return ApiResponse.success(res, {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalBranches,
        totalUsers,
      }, 'Thống kê nền tảng SaaS');
    } catch (error: any) {
      logger.error('getPlatformStats failed', { stack: error?.stack });
      return ApiResponse.error(res, 'STATS_ERROR', 'Lỗi lấy thống kê', 500);
    }
  }
}

export default PlatformController;
