import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { renameCategoryInMemory } from './menu.controller';

export class CategoryController {
  static async getCategories(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const categories = await prisma.menuCategory.findMany({
        where: { tenantId, isActive: true },
        orderBy: { displayOrder: 'asc' },
      });

      return ApiResponse.success(res, categories, 'Lấy danh sách danh mục thành công');
    } catch (error: any) {
      logger.error('Category getCategories error:', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_CATEGORIES_ERROR', 'Không thể lấy danh sách danh mục', 500);
    }
  }

  static async createCategory(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông info tenant', 401);
      }

      const { name, slug, icon, isDrink, displayOrder } = req.body;
      if (!name || !slug) {
        return ApiResponse.error(res, 'INVALID_PARAMS', 'Thiếu tên hoặc slug danh mục', 400);
      }

      const category = await prisma.menuCategory.create({
        data: {
          tenantId,
          name,
          slug,
          icon: icon || null,
          isDrink: isDrink ?? true,
          displayOrder: displayOrder ?? 0,
        },
      });

      return ApiResponse.success(res, category, 'Tạo danh mục thành công', 201);
    } catch (error: any) {
      logger.error('Category createCategory error:', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'CREATE_CATEGORY_ERROR', 'Không thể tạo danh mục', 500);
    }
  }

  static async updateCategory(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const { name, slug, icon, isDrink, displayOrder, isActive } = req.body;

      const category = await prisma.menuCategory.updateMany({
        where: { id, tenantId },
        data: {
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(icon !== undefined && { icon }),
          ...(isDrink !== undefined && { isDrink }),
          ...(displayOrder !== undefined && { displayOrder }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      if (category.count === 0) {
        return ApiResponse.error(res, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục', 404);
      }

      const updated = await prisma.menuCategory.findFirst({ where: { id, tenantId } });
      return ApiResponse.success(res, updated, 'Cập nhật danh mục thành công');
    } catch (error: any) {
      logger.error('Category updateCategory error:', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'UPDATE_CATEGORY_ERROR', 'Không thể cập nhật danh mục', 500);
    }
  }

  static async renameCategoryByName(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const { oldName, newName } = req.body;
      if (!oldName || !newName) {
        return ApiResponse.error(res, 'INVALID_PARAMS', 'Thiếu tên cũ hoặc tên mới của danh mục', 400);
      }

      try {
        await prisma.menuCategory.updateMany({
          where: { tenantId, name: oldName },
          data: { name: newName },
        });
      } catch (dbErr) {
        logger.warn('Prisma renameCategory error (best-effort):', dbErr);
      }

      renameCategoryInMemory(oldName, newName);

      return ApiResponse.success(res, { oldName, newName }, 'Đổi tên danh mục thành công');
    } catch (error: any) {
      logger.error('Category renameCategoryByName error:', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'RENAME_CATEGORY_ERROR', 'Không thể đổi tên danh mục', 500);
    }
  }

  static async deleteCategory(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const category = await prisma.menuCategory.updateMany({
        where: { id, tenantId },
        data: { isActive: false },
      });

      if (category.count === 0) {
        return ApiResponse.error(res, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục', 404);
      }

      return ApiResponse.success(res, { deleted: true }, 'Xóa danh mục thành công');
    } catch (error: any) {
      logger.error('Category deleteCategory error:', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'DELETE_CATEGORY_ERROR', 'Không thể xóa danh mục', 500);
    }
  }
}

export default CategoryController;
