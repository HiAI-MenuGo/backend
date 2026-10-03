import { Request, Response } from 'express';
import { z } from 'zod';
import { SessionOrderService } from '../services/session-order.service';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

export const sessionOrderItemModifierSchema = z.object({
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  optionId: z.string().optional(),
  optionName: z.string().optional(),
  extraPrice: z.number().optional().default(0),
});

export const sessionOrderItemSchema = z.object({
  menuItemId: z.string().min(1, 'menuItemId là bắt buộc'),
  name: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().int().positive('Số lượng món phải lớn hơn 0'),
  note: z.string().optional().nullable(),
  modifiers: z.array(sessionOrderItemModifierSchema).optional().default([]),
});

export const createSessionOrderSchema = z.object({
  params: z
    .object({
      tableId: z.string().min(1, 'tableId là bắt buộc'),
    })
    .optional(),
  body: z.object({
    tableId: z.string().optional(),
    branchId: z.string().optional(),
    tenantId: z.string().optional(),
    items: z.array(sessionOrderItemSchema).min(1, 'Giỏ hàng không được để trống'),
    voucherCode: z.string().optional().nullable(),
    discountAmount: z.number().nonnegative().optional().default(0),
    totalAmount: z.number().optional(),
    note: z.string().optional().nullable(),
  }),
});

export class SessionOrderController {
  static async createOrder(req: Request, res: Response) {
    try {
      const tableId = req.params.tableId || req.body.tableId;
      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu mã định danh bàn', 400);
      }

      const { items, voucherCode, discountAmount, totalAmount, note } = req.body;

      const result = await SessionOrderService.createSessionOrder({
        tableId,
        items,
        voucherCode,
        discountAmount,
        totalAmount,
        note,
      });

      return ApiResponse.success(res, result, 'Đặt món thành công', 201);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      const errorCode = err.errorCode || 'CREATE_SESSION_ORDER_ERROR';
      const message = err.message || 'Lỗi khi tạo đơn hàng cho bàn';

      if (statusCode >= 500) {
        logger.error(`[SessionOrderController] Server error: ${err.message}`, { error: err });
      } else {
        logger.warn(`[SessionOrderController] Client rejected: ${errorCode} - ${message}`);
      }

      return ApiResponse.error(res, errorCode, message, statusCode);
    }
  }
}
