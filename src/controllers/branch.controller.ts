import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';

export class BranchController {
  static async getBranches(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const branches = await prisma.branch.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          createdAt: true,
        },
      });

      return ApiResponse.success(res, branches, 'Lấy danh sách chi nhánh thành công');
    } catch (error: any) {
      return ApiResponse.error(res, 'FETCH_BRANCHES_ERROR', 'Không thể lấy danh sách chi nhánh', 500);
    }
  }

  static async createBranch(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const { name, code, address, phone } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return ApiResponse.error(res, 'INVALID_INPUT', 'Tên chi nhánh là bắt buộc', 400);
      }

      const cleanName = name.trim();
      let cleanCode = (code && typeof code === 'string' && code.trim())
        ? code.trim().toUpperCase()
        : `CN-${Date.now().toString(36).toUpperCase()}`;

      // Check duplicate code within same tenant
      const existing = await prisma.branch.findFirst({
        where: { tenantId, code: cleanCode },
      });
      if (existing) {
        return ApiResponse.error(res, 'DUPLICATE_CODE', `Mã chi nhánh "${cleanCode}" đã tồn tại`, 400);
      }

      const newBranch = await prisma.branch.create({
        data: {
          tenantId,
          name: cleanName,
          code: cleanCode,
          address: address ? String(address).trim() : null,
          phone: phone ? String(phone).trim() : null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          createdAt: true,
        },
      });

      return ApiResponse.success(res, newBranch, 'Tạo chi nhánh mới thành công', 201);
    } catch (error: any) {
      return ApiResponse.error(res, 'CREATE_BRANCH_ERROR', error.message || 'Không thể tạo chi nhánh', 500);
    }
  }

  static async updateBranch(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const branch = await prisma.branch.findFirst({
        where: { id, tenantId },
      });
      if (!branch) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy chi nhánh', 404);
      }

      const { name, code, address, phone, isActive } = req.body || {};

      const updateData: any = {};
      if (name !== undefined) {
        if (!name || typeof name !== 'string' || !name.trim()) {
          return ApiResponse.error(res, 'INVALID_INPUT', 'Tên chi nhánh không được để trống', 400);
        }
        updateData.name = name.trim();
      }

      if (code !== undefined && code !== null) {
        const cleanCode = String(code).trim().toUpperCase();
        if (cleanCode && cleanCode !== branch.code) {
          const duplicate = await prisma.branch.findFirst({
            where: { tenantId, code: cleanCode, id: { not: id } },
          });
          if (duplicate) {
            return ApiResponse.error(res, 'DUPLICATE_CODE', `Mã chi nhánh "${cleanCode}" đã tồn tại`, 400);
          }
          updateData.code = cleanCode;
        }
      }

      if (address !== undefined) {
        updateData.address = address ? String(address).trim() : null;
      }

      if (phone !== undefined) {
        updateData.phone = phone ? String(phone).trim() : null;
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updated = await prisma.branch.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ApiResponse.success(res, updated, 'Cập nhật thông tin chi nhánh thành công');
    } catch (error: any) {
      return ApiResponse.error(res, 'UPDATE_BRANCH_ERROR', error.message || 'Không thể cập nhật chi nhánh', 500);
    }
  }

  static async exportBranchData(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const branch = await prisma.branch.findFirst({
        where: { id, tenantId },
        include: {
          areas: {
            include: {
              tables: true,
            },
          },
          tables: true,
          ingredients: true,
          inventoryLogs: {
            take: 200,
            orderBy: { createdAt: 'desc' },
          },
          orders: {
            take: 500,
            orderBy: { createdAt: 'desc' },
            include: {
              items: true,
            },
          },
          sessions: {
            take: 200,
            orderBy: { openedAt: 'desc' },
          },
          reservations: true,
        },
      });

      if (!branch) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy chi nhánh', 404);
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        system: 'HiAI-MenuGo Enterprise',
        tenantId,
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          createdAt: branch.createdAt,
        },
        summary: {
          totalAreas: branch.areas.length,
          totalTables: branch.tables.length,
          totalIngredients: branch.ingredients.length,
          totalInventoryLogs: branch.inventoryLogs.length,
          totalOrders: branch.orders.length,
          totalSessions: branch.sessions.length,
          totalReservations: branch.reservations.length,
        },
        data: {
          areas: branch.areas,
          tables: branch.tables,
          ingredients: branch.ingredients,
          inventoryLogs: branch.inventoryLogs,
          orders: branch.orders,
          sessions: branch.sessions,
          reservations: branch.reservations,
        },
      };

      return ApiResponse.success(res, exportPayload, 'Xuất dữ liệu chi nhánh thành công');
    } catch (error: any) {
      return ApiResponse.error(res, 'EXPORT_BRANCH_ERROR', error.message || 'Không thể xuất dữ liệu chi nhánh', 500);
    }
  }

  static async deleteBranch(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { confirmBranchName } = req.body || {};

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const branch = await prisma.branch.findFirst({
        where: { id, tenantId },
      });

      if (!branch) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy chi nhánh', 404);
      }

      // Check if it is the only branch
      const activeBranchCount = await prisma.branch.count({
        where: { tenantId, isActive: true },
      });

      if (activeBranchCount <= 1) {
        return ApiResponse.error(
          res,
          'CANNOT_DELETE_LAST_BRANCH',
          'Không thể xoá chi nhánh duy nhất còn lại của nhà hàng. Hệ thống cần ít nhất một chi nhánh hoạt động.',
          400
        );
      }

      // Validate confirmation branch name
      if (!confirmBranchName || confirmBranchName.trim().toLowerCase() !== branch.name.trim().toLowerCase()) {
        return ApiResponse.error(
          res,
          'NAME_MISMATCH',
          `Tên chi nhánh xác nhận không khớp. Yêu cầu nhập đúng "${branch.name}".`,
          400
        );
      }

      // Perform clean deletion inside transaction
      await prisma.$transaction(async (tx) => {
        // Unlink users attached to this branch
        await tx.tenantUser.updateMany({
          where: { branchId: id },
          data: { branchId: null },
        });

        // Delete related logs, items, orders, tables, areas
        await tx.inventoryLog.deleteMany({ where: { branchId: id } });
        await tx.ingredient.deleteMany({ where: { branchId: id } });
        await tx.orderItem.deleteMany({ where: { order: { branchId: id } } });
        await tx.order.deleteMany({ where: { branchId: id } });
        await tx.orderSession.deleteMany({ where: { branchId: id } });
        await tx.table.deleteMany({ where: { branchId: id } });
        await tx.area.deleteMany({ where: { branchId: id } });
        await tx.reservation.deleteMany({ where: { branchId: id } });
        await tx.zReport.deleteMany({ where: { branchId: id } });

        // Delete branch
        await tx.branch.delete({ where: { id } });
      });

      return ApiResponse.success(res, { deletedBranchId: id }, 'Đã xoá chi nhánh và toàn bộ dữ liệu thành công');
    } catch (error: any) {
      return ApiResponse.error(res, 'DELETE_BRANCH_ERROR', error.message || 'Không thể xoá chi nhánh', 500);
    }
  }
}

export default BranchController;
