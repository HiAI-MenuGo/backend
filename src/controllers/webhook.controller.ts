import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

export const VALID_WEBHOOK_EVENTS = [
  'order:new',
  'order:updated',
  'order:item:status',
  'order:voided',
  'session:updated',
  'session:closed',
  'table:status-changed',
  'sold_out:updated',
  'payment:pending',
  'payment:completed',
  'inventory:updated',
] as const;

export const createWebhookSchema = z.object({
  body: z.object({
    url: z.string().url('URL không đúng định dạng').regex(/^https?:\/\//i, 'Chỉ chấp nhận URL giao thức http hoặc https'),
    events: z.array(z.enum(VALID_WEBHOOK_EVENTS)).min(1, 'Phải đăng ký ít nhất 1 sự kiện'),
    secret: z.string().min(8, 'Secret tối thiểu 8 ký tự').optional(),
  }),
});

/**
 * Gửi webhook HTTP POST với timeout 5 giây, ký HMAC-SHA256,
 * lưu lịch sử delivery vào DB. Thất bại không chặn response chính.
 */
export async function sendWebhookEvent(
  webhookConfigId: string,
  url: string,
  secret: string,
  event: string,
  payloadData: Record<string, any>
) {
  const payloadStr = JSON.stringify(payloadData);
  const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let isSuccess = false;
  let errorMsg: string | null = null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MenuGo-Event': event,
        'X-MenuGo-Signature': signature,
        'User-Agent': 'HiAI-MenuGo-Webhook-Dispatcher/1.0',
      },
      body: payloadStr,
      signal: controller.signal,
    });

    statusCode = res.status;
    isSuccess = res.ok;
    const text = await res.text();
    responseBody = text.slice(0, 500); // Tóm tắt tối đa 500 ký tự
  } catch (err: any) {
    if (err.name === 'AbortError') {
      errorMsg = 'Request timed out after 5000ms';
    } else {
      errorMsg = err.message || 'Network request failed';
    }
    isSuccess = false;
  } finally {
    clearTimeout(timeoutId);
  }

  // Ghi nhận delivery vào CSDL
  try {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookConfigId,
        event,
        payload: payloadStr.slice(0, 1000),
        statusCode,
        responseBody,
        isSuccess,
        error: errorMsg,
      },
    });
    return delivery;
  } catch (dbError: any) {
    logger.error('Lỗi khi lưu webhook delivery log', { error: dbError.message, stack: dbError.stack });
    return null;
  }
}

export class WebhookController {
  /**
   * GET /api/webhooks
   * Danh sách webhook cấu hình của tenant (ADMIN).
   */
  static async getWebhooks(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const webhooks = await prisma.webhookConfig.findMany({
        where: { tenantId },
        select: {
          id: true,
          url: true,
          events: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Ẩn secret
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, webhooks, 'Lấy danh sách webhook thành công');
    } catch (error: any) {
      logger.error('Lỗi khi lấy danh sách webhook', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_WEBHOOKS_ERROR', 'Không thể lấy danh sách webhook', 500);
    }
  }

  /**
   * POST /api/webhooks
   * Đăng ký endpoint webhook mới.
   */
  static async createWebhook(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const { url, events, secret } = req.body;
      const finalSecret = secret || `whsec_${crypto.randomBytes(16).toString('hex')}`;

      const webhook = await prisma.webhookConfig.create({
        data: {
          tenantId,
          url,
          events,
          secret: finalSecret,
          isActive: true,
        },
        select: {
          id: true,
          url: true,
          events: true,
          secret: true, // Trả 1 lần khi tạo để cấu hình
          isActive: true,
          createdAt: true,
        },
      });

      return ApiResponse.success(res, webhook, 'Đăng ký Webhook thành công', 201);
    } catch (error: any) {
      logger.error('Lỗi khi tạo webhook', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'CREATE_WEBHOOK_ERROR', 'Không thể đăng ký webhook', 500);
    }
  }

  /**
   * DELETE /api/webhooks/:id
   * Xóa endpoint webhook.
   */
  static async deleteWebhook(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const existing = await prisma.webhookConfig.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        return ApiResponse.error(res, 'WEBHOOK_NOT_FOUND', 'Không tìm thấy Webhook cấu hình', 404);
      }

      await prisma.webhookConfig.delete({
        where: { id },
      });

      return ApiResponse.success(res, { id }, 'Xóa Webhook thành công');
    } catch (error: any) {
      logger.error('Lỗi khi xóa webhook', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'DELETE_WEBHOOK_ERROR', 'Không thể xóa webhook', 500);
    }
  }

  /**
   * GET /api/webhooks/:id/deliveries
   * Lấy lịch sử gửi webhook (delivery logs).
   */
  static async getDeliveries(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const config = await prisma.webhookConfig.findFirst({
        where: { id, tenantId },
      });

      if (!config) {
        return ApiResponse.error(res, 'WEBHOOK_NOT_FOUND', 'Không tìm thấy Webhook cấu hình', 404);
      }

      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookConfigId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return ApiResponse.success(res, deliveries, 'Lấy lịch sử gửi webhook thành công');
    } catch (error: any) {
      logger.error('Lỗi khi lấy webhook deliveries', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_DELIVERIES_ERROR', 'Không thể lấy lịch sử gửi webhook', 500);
    }
  }

  /**
   * POST /api/webhooks/:id/test
   * Bắn thử nghiệm 1 test event, ghi nhận delivery log.
   */
  static async testWebhook(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const config = await prisma.webhookConfig.findFirst({
        where: { id, tenantId },
      });

      if (!config) {
        return ApiResponse.error(res, 'WEBHOOK_NOT_FOUND', 'Không tìm thấy Webhook cấu hình', 404);
      }

      const testPayload = {
        event: 'test:ping',
        timestamp: new Date().toISOString(),
        message: 'HiAI-MenuGo Webhook Test Event',
        tenantId,
        data: {
          test: true,
          initiatedBy: req.user?.userId,
        },
      };

      const delivery = await sendWebhookEvent(
        config.id,
        config.url,
        config.secret,
        'test:ping',
        testPayload
      );

      return ApiResponse.success(res, delivery, 'Bắn test event webhook hoàn tất');
    } catch (error: any) {
      logger.error('Lỗi khi bắn test webhook', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'TEST_WEBHOOK_ERROR', 'Không thể bắn test webhook', 500);
    }
  }
}

export default WebhookController;
