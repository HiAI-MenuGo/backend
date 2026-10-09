import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tên API Key không được để trống'),
    permissions: z.array(z.string()).default([]),
    expiresAt: z.string().datetime().optional().nullable(),
  }),
});

export class ApiKeyController {
  /**
   * GET /api/api-keys
   * Lấy danh sách API Keys theo tenantId của ADMIN (không bao giờ lộ raw key hoặc keyHash).
   */
  static async getApiKeys(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const keys = await prisma.apiKey.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          prefix: true,
          permissions: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, keys, 'Lấy danh sách API Key thành công');
    } catch (error: any) {
      logger.error('Lỗi khi lấy danh sách API Key', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'FETCH_API_KEYS_ERROR', 'Không thể lấy danh sách API Key', 500);
    }
  }

  /**
   * POST /api/api-keys
   * Sinh API Key ngẫu nhiên dạng mgk_<random 32>, lưu hash SHA-256 + prefix 8 ký tự,
   * trả về key thô đúng 1 lần duy nhất trong response.
   */
  static async createApiKey(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const { name, permissions, expiresAt } = req.body;

      // Sinh key thô dạng mgk_<32 hex chars>
      const randomPart = crypto.randomBytes(16).toString('hex'); // 32 hex chars
      const rawKey = `mgk_${randomPart}`;
      const prefix = rawKey.substring(0, 8); // e.g. "mgk_1234"
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const apiKey = await prisma.apiKey.create({
        data: {
          tenantId,
          name,
          prefix,
          keyHash,
          permissions: permissions || [],
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          permissions: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
        },
      });

      return ApiResponse.success(
        res,
        {
          ...apiKey,
          key: rawKey, // Chỉ trả key thô đúng 1 lần này
        },
        'Tạo API Key thành công. Hãy lưu lại key thô ngay bây giờ vì hệ thống sẽ không hiển thị lại.',
        201
      );
    } catch (error: any) {
      logger.error('Lỗi khi tạo API Key', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'CREATE_API_KEY_ERROR', 'Không thể tạo API Key', 500);
    }
  }

  /**
   * DELETE /api/api-keys/:id
   * Thu hồi API Key (đánh dấu isActive: false) trong phạm vi tenant.
   */
  static async revokeApiKey(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenantId', 401);
      }

      const existingKey = await prisma.apiKey.findFirst({
        where: { id, tenantId },
      });

      if (!existingKey) {
        return ApiResponse.error(res, 'API_KEY_NOT_FOUND', 'Không tìm thấy API Key hoặc bạn không có quyền', 404);
      }

      const updated = await prisma.apiKey.update({
        where: { id },
        data: { isActive: false },
        select: {
          id: true,
          name: true,
          prefix: true,
          isActive: true,
        },
      });

      return ApiResponse.success(res, updated, 'Thu hồi API Key thành công');
    } catch (error: any) {
      logger.error('Lỗi khi thu hồi API Key', { error: error.message, stack: error.stack });
      return ApiResponse.error(res, 'REVOKE_API_KEY_ERROR', 'Không thể thu hồi API Key', 500);
    }
  }
}

export default ApiKeyController;
