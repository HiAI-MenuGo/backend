import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { InventoryService } from '../services/inventory.service';
import { getTenantContext } from '../middlewares/tenantIsolation';

export class IngredientController {
  static async getIngredients(req: Request, res: Response) {
    try {
      const { tenantId, branchId } = getTenantContext(req);
      const list = await InventoryService.getIngredients(tenantId, branchId);
      return ApiResponse.success(res, list, 'Lấy danh sách nguyên vật liệu thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_INGREDIENTS_ERROR', err.message, 500);
    }
  }

  static async adjustStock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { adjustment, type = 'SET', reason = 'Kiểm kê định kỳ' } = req.body;
      const { tenantId, branchId } = getTenantContext(req);
      const userId = (req as any).user?.userId;

      if (adjustment === undefined) {
        return ApiResponse.error(res, 'INVALID_ADJUSTMENT', 'Vui lòng nhập số lượng điều chỉnh', 400);
      }

      const item = await InventoryService.adjustStock(
        tenantId,
        branchId,
        userId,
        id,
        Number(adjustment),
        type,
        reason
      );
      return ApiResponse.success(res, item, 'Điều chỉnh kho thành công');
    } catch (err: any) {
      if (err.message === 'INGREDIENT_NOT_FOUND') {
        return ApiResponse.error(res, 'INGREDIENT_NOT_FOUND', 'Không tìm thấy nguyên liệu', 404);
      }
      return ApiResponse.error(res, 'ADJUST_STOCK_ERROR', err.message, 500);
    }
  }

  static async createIngredient(req: Request, res: Response) {
    try {
      const { name, quantity, unit, lowStockThreshold } = req.body;
      const { tenantId, branchId } = getTenantContext(req);

      if (!name || quantity === undefined || !unit) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp đầy đủ tên, số lượng và đơn vị', 400);
      }

      const item = await InventoryService.addIngredient(
        tenantId,
        branchId,
        { name, quantity: Number(quantity), unit, lowStockThreshold: Number(lowStockThreshold) || 5 }
      );
      return ApiResponse.success(res, item, 'Thêm nguyên liệu mới thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_INGREDIENT_ERROR', err.message, 500);
    }
  }

  static async deleteIngredient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, branchId } = getTenantContext(req);

      const success = await InventoryService.deleteIngredient(tenantId, branchId, id);
      if (!success) {
        return ApiResponse.error(res, 'INGREDIENT_NOT_FOUND', 'Không tìm thấy nguyên liệu cần xóa', 404);
      }
      return ApiResponse.success(res, { id }, 'Xóa nguyên liệu thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'DELETE_INGREDIENT_ERROR', err.message, 500);
    }
  }
}
