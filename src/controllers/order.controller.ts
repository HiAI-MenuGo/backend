import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import ApiResponse from '../utils/response';

export class OrderController {
  static getActiveOrders(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      const view = req.query.view as string;
      const orders = OrderService.getActiveOrders(branchId, view);
      return ApiResponse.success(res, orders, 'Lấy danh sách đơn hàng active thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_ORDERS_ERROR', err.message, 500);
    }
  }

  static updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      if (!status || !['PENDING', 'CONFIRMED', 'DONE'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái đơn không hợp lệ', 400);
      }

      const updated = OrderService.updateOrderStatus(id, status, branchId);
      return ApiResponse.success(res, updated, `Cập nhật trạng thái đơn thành ${status}`);
    } catch (err: any) {
      if (err.message === 'ORDER_NOT_FOUND') {
        return ApiResponse.error(res, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      }
      return ApiResponse.error(res, 'UPDATE_STATUS_ERROR', err.message, 500);
    }
  }

  static updateItemStatus(req: Request, res: Response) {
    try {
      const { id: itemId } = req.params;
      const { orderId, status } = req.body;
      const branchId = (req.query.branchId as string) || 'default-branch';

      if (!orderId || !status) {
        return ApiResponse.error(res, 'INVALID_PARAMS', 'Thiếu orderId hoặc status', 400);
      }

      const updatedItem = OrderService.updateItemStatus(orderId, itemId, status, branchId);
      return ApiResponse.success(res, updatedItem, 'Cập nhật trạng thái món thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_ITEM_ERROR', err.message, 400);
    }
  }

  static voidOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'Khách hủy' } = req.body;
      const branchId = (req.query.branchId as string) || 'default-branch';

      const voided = OrderService.voidOrder(id, reason, branchId);
      return ApiResponse.success(res, voided, 'Hủy đơn hàng thành công');
    } catch (err: any) {
      if (err.message === 'ORDER_NOT_FOUND') {
        return ApiResponse.error(res, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      }
      return ApiResponse.error(res, 'VOID_ERROR', err.message, 500);
    }
  }

  static getHistory(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = OrderService.getOrderHistory(branchId, page, limit, search, startDate, endDate);
      return ApiResponse.success(res, result, 'Lấy lịch sử đơn hàng thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_HISTORY_ERROR', err.message, 500);
    }
  }

  static createOrder(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';
      const order = OrderService.createOrder(req.body, branchId);
      return ApiResponse.success(res, order, 'Tạo đơn hàng thành công', 201);
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_ORDER_ERROR', err.message, 400);
    }
  }
}
