import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { sendStaffInviteMail } from '../utils/mailer';
import { UserRole } from '@prisma/client';

export const MANAGEABLE_ROLES: Array<{ role: UserRole; label: string; scope: string }> = [
  { role: 'ADMIN', label: 'Chủ quán', scope: 'tenant' },
  { role: 'MANAGER', label: 'Quản lý chi nhánh', scope: 'branch' },
  { role: 'KITCHEN', label: 'Bếp / pha chế', scope: 'branch' },
  { role: 'CASHIER', label: 'Thu ngân / phục vụ', scope: 'branch' },
];

export class UserController {
  /**
   * GET /api/admin/users
   * Danh sách nhân viên trong cùng tenant (lọc theo branchId, role, search)
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const { branchId, role, search, isActive } = req.query;

      const where: any = { tenantId };
      // MANAGER chỉ thấy nhân viên chi nhánh mình.
      if (req.user?.role === 'MANAGER') {
        if (!req.user?.branchId) {
          return ApiResponse.error(res, 'FORBIDDEN', 'Tài khoản quản lý chưa được gán chi nhánh', 403);
        }
        where.branchId = req.user.branchId;
      } else if (branchId) {
        where.branchId = String(branchId);
      }
      if (role) where.role = role as UserRole;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const users = await prisma.tenantUser.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, users, 'Lấy danh sách nhân sự thành công');
    } catch (error: any) {
      logger.error('getUsers failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DB_ERROR', 'Lỗi truy vấn nhân sự', 500);
    }
  }

  /**
   * GET /api/admin/users/roles
   * Danh sách vai trò RBAC (spec: GET /api/admin/roles).
   */
  static async getRoles(req: Request, res: Response) {
    return ApiResponse.success(res, MANAGEABLE_ROLES, 'Danh sách vai trò và phạm vi quyền');
  }

  /**
   * POST /api/admin/users
   * Tạo tài khoản nhân viên mới cho quán
   */
  static async createUser(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const { email, name, phone, password, role = 'CASHIER', branchId } = req.body;

      if (!email || !name || !password) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp email, họ tên và mật khẩu', 400);
      }

      // Check duplicate email within tenant
      const existing = await prisma.tenantUser.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email,
          },
        },
      });

      if (existing) {
        return ApiResponse.error(res, 'EMAIL_EXISTS', 'Email nhân viên đã tồn tại trong quán này', 400);
      }

      // Check max users limit of tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { _count: { select: { users: true } } },
      });

      if (tenant && tenant._count.users >= tenant.maxUsers) {
        return ApiResponse.error(
          res,
          'LIMIT_EXCEEDED',
          `Quán của bạn đã đạt giới hạn tối đa ${tenant.maxUsers} tài khoản nhân viên của gói cước`,
          403
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await prisma.tenantUser.create({
        data: {
          tenantId,
          branchId: branchId || req.user?.branchId || null,
          email,
          name,
          phone,
          passwordHash,
          role: role as UserRole,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Gửi mail mời nhân viên (best-effort, không chặn response).
      sendStaffInviteMail({
        to: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tenantName: tenant?.name || 'quán của bạn',
      }).catch(() => undefined);

      return ApiResponse.success(res, newUser, 'Tạo tài khoản nhân viên thành công', 201);
    } catch (error: any) {
      logger.error('createUser failed', { stack: error?.stack });
      return ApiResponse.error(res, 'CREATE_USER_ERROR', 'Lỗi tạo nhân viên', 500);
    }
  }

  /**
   * PATCH /api/admin/users/:id
   * Cập nhật thông tin, vai trò, chi nhánh hoặc trạng thái nhân viên
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }
      const { id } = req.params;
      const { name, phone, role, branchId, isActive, password } = req.body;

      const user = await prisma.tenantUser.findFirst({
        where: { id, tenantId },
      });

      if (!user) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy tài khoản nhân viên trong quán', 404);
      }

      // Không cho phép tự đổi role của chính mình nếu là ADMIN duy nhất
      if (req.user?.userId === id && role && role !== user.role) {
        return ApiResponse.error(res, 'FORBIDDEN', 'Bạn không thể tự hạ quyền của chính mình', 403);
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role) updateData.role = role as UserRole;
      if (branchId !== undefined) updateData.branchId = branchId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const updated = await prisma.tenantUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return ApiResponse.success(res, updated, 'Cập nhật nhân viên thành công');
    } catch (error: any) {
      logger.error('updateUser failed', { stack: error?.stack });
      return ApiResponse.error(res, 'UPDATE_USER_ERROR', 'Lỗi cập nhật nhân viên', 500);
    }
  }

  /**
   * DELETE /api/admin/users/:id
   * Khóa hoặc xóa nhân viên
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }
      const { id } = req.params;

      if (req.user?.userId === id) {
        return ApiResponse.error(res, 'FORBIDDEN', 'Bạn không thể tự xóa tài khoản đang đăng nhập', 403);
      }

      const user = await prisma.tenantUser.findFirst({
        where: { id, tenantId },
      });

      if (!user) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy nhân viên', 404);
      }

      // Soft delete: chuyển isActive sang false
      await prisma.tenantUser.update({
        where: { id },
        data: { isActive: false },
      });

      return ApiResponse.success(res, { id, isActive: false }, 'Đã vô hiệu hóa tài khoản nhân viên');
    } catch (error: any) {
      logger.error('deleteUser failed', { stack: error?.stack });
      return ApiResponse.error(res, 'DELETE_USER_ERROR', 'Lỗi xóa nhân viên', 500);
    }
  }
}

export default UserController;
