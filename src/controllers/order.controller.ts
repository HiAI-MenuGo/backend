import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import ApiResponse from '../utils/response';
import { getTenantContext } from '../middlewares/tenantIsolation';

export class OrderController {
  static async getActiveOrders(req: Request, res: Response) {
    try {
      const { branchId, tenantId } = getTenantContext(req);
      const view = req.query.view as string;
      const orders = await OrderService.getActiveOrders(branchId, view, tenantId);
      return ApiResponse.success(res, orders, 'Lấy danh sách đơn hàng active thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      return ApiResponse.error(res, 'FETCH_ORDERS_ERROR', err.message, 500);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { branchId, tenantId } = getTenantContext(req);

      const VALID_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DONE', 'CANCELLED'];
      if (!status || !VALID_ORDER_STATUSES.includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái đơn không hợp lệ', 400);
      }

      const updated = await OrderService.updateOrderStatus(id, status, branchId, tenantId);
      return ApiResponse.success(res, updated, `Cập nhật trạng thái đơn thành ${status}`);
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      if (err.message === 'ORDER_NOT_FOUND') {
        return ApiResponse.error(res, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      }
      return ApiResponse.error(res, 'UPDATE_STATUS_ERROR', err.message, 500);
    }
  }

  static async updateItemStatus(req: Request, res: Response) {
    try {
      const { id: itemId } = req.params;
      const { orderId, status } = req.body;
      const { branchId, tenantId } = getTenantContext(req);

      if (!orderId || !status) {
        return ApiResponse.error(res, 'INVALID_PARAMS', 'Thiếu orderId hoặc status', 400);
      }

      const VALID_ITEM_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'DONE', 'CANCELLED'];
      if (!VALID_ITEM_STATUSES.includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái món không hợp lệ', 400);
      }

      const updatedItem = await OrderService.updateItemStatus(orderId, itemId, status, branchId, tenantId);
      return ApiResponse.success(res, updatedItem, 'Cập nhật trạng thái món thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      if (err.message === 'ORDER_NOT_FOUND') {
        return ApiResponse.error(res, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      }
      if (err.message === 'ITEM_NOT_FOUND') {
        return ApiResponse.error(res, 'ITEM_NOT_FOUND', 'Không tìm thấy món ăn', 404);
      }
      return ApiResponse.error(res, 'UPDATE_ITEM_ERROR', err.message, 400);
    }
  }

  static async voidOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'Khách hủy' } = req.body;
      const { branchId, tenantId } = getTenantContext(req);

      const voided = await OrderService.voidOrder(id, reason, branchId, tenantId);
      return ApiResponse.success(res, voided, 'Hủy đơn hàng thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      if (err.message === 'ORDER_NOT_FOUND') {
        return ApiResponse.error(res, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      }
      return ApiResponse.error(res, 'VOID_ERROR', err.message, 500);
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const { branchId, tenantId } = getTenantContext(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = await OrderService.getOrderHistory(branchId, page, limit, search, startDate, endDate, tenantId);
      return ApiResponse.success(res, result, 'Lấy lịch sử đơn hàng thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      return ApiResponse.error(res, 'FETCH_HISTORY_ERROR', err.message, 500);
    }
  }

  static async exportHistoryExcel(req: Request, res: Response) {
    try {
      const { branchId, tenantId } = getTenantContext(req);
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const status = req.query.status as string;

      const { buffer, filename } = await OrderService.exportOrderHistoryExcel({
        branchId,
        startDate,
        endDate,
        search,
        status,
        tenantId,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.status(200).send(buffer);
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      return ApiResponse.error(res, 'EXPORT_HISTORY_ERROR', err.message || 'Lỗi khi xuất file Excel lịch sử đơn', 500);
    }
  }
}
