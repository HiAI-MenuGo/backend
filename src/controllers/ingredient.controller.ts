import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { InventoryService } from '../services/inventory.service';

export class IngredientController {
  static getIngredients(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      const list = InventoryService.getIngredients(branchId);
      return ApiResponse.success(res, list, 'Lấy danh sách nguyên vật liệu thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_INGREDIENTS_ERROR', err.message, 500);
    }
  }

  static adjustStock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { adjustment, type = 'SET', reason = 'Kiểm kê định kỳ' } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      if (adjustment === undefined) {
        return ApiResponse.error(res, 'INVALID_ADJUSTMENT', 'Vui lòng nhập số lượng điều chỉnh', 400);
      }

      const item = InventoryService.adjustStock(id, Number(adjustment), type, reason, branchId);
      return ApiResponse.success(res, item, 'Điều chỉnh kho thành công');
    } catch (err: any) {
      if (err.message === 'INGREDIENT_NOT_FOUND') {
        return ApiResponse.error(res, 'INGREDIENT_NOT_FOUND', 'Không tìm thấy nguyên liệu', 404);
      }
      return ApiResponse.error(res, 'ADJUST_STOCK_ERROR', err.message, 500);
    }
  }

  static createIngredient(req: Request, res: Response) {
    try {
      const { name, quantity, unit, lowStockThreshold, category } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      if (!name || quantity === undefined || !unit) {
        return ApiResponse.error(res, 'MISSING_FIELDS', 'Vui lòng cung cấp đầy đủ tên, số lượng và đơn vị', 400);
      }

      const item = InventoryService.addIngredient(
        { name, quantity: Number(quantity), unit, lowStockThreshold: Number(lowStockThreshold) || 5, category },
        branchId
      );
      return ApiResponse.success(res, item, 'Thêm nguyên liệu mới thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_INGREDIENT_ERROR', err.message, 500);
    }
  }

  static deleteIngredient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branchId = (req.query.branchId as string) || 'default-branch';

      const success = InventoryService.deleteIngredient(id, branchId);
      if (!success) {
        return ApiResponse.error(res, 'INGREDIENT_NOT_FOUND', 'Không tìm thấy nguyên liệu cần xóa', 404);
      }
      return ApiResponse.success(res, { id }, 'Xóa nguyên liệu thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'DELETE_INGREDIENT_ERROR', err.message, 500);
    }
  }
}
