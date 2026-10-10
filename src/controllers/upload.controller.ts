import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
import { uploadBuffer, uploadBase64, isCloudinaryConfigured } from '../utils/cloudinary';

export class UploadController {
  /**
   * POST /api/upload/image
   * Handles multipart/form-data with file field 'file' or 'image',
   * or JSON body with { image: 'data:image/...;base64,...' }
   */
  static async uploadImage(req: Request, res: Response) {
    try {
      // Scope folder upload theo tenant (chặn staff tenant A ghi đè/quấy thư mục tenant B,
      // chặn path traversal qua folder param).
      const tenantId = req.tenantContext?.tenantId || req.user?.tenantId || 'unknown-tenant';
      const rawFolder = String(req.body.folder || 'menu').replace(/[^a-zA-Z0-9/_-]/g, '');
      const safeSub = rawFolder.replace(/\.\./g, '').replace(/^\/+/, '').slice(0, 60) || 'menu';
      const folder = `hiai-menugo/${tenantId}/${safeSub}`;

      // 1. Multipart file upload via Multer
      if (req.file) {
        const file = req.file;

        // Verify mimetype
        if (!file.mimetype.startsWith('image/')) {
          return ApiResponse.error(res, 'INVALID_FILE_TYPE', 'Chỉ chấp nhận tệp định dạng hình ảnh (JPG, PNG, WEBP, GIF, SVG)', 400);
        }

        const result = await uploadBuffer(file.buffer, {
          folder,
          filename: file.originalname,
          mimeType: file.mimetype,
        });

        logger.info('Image uploaded successfully', {
          url: result.url,
          isCloudinary: !result.isLocalFallback,
          size: result.bytes,
        });

        return ApiResponse.success(res, result, 'Tải ảnh lên thành công');
      }

      // 2. Base64 payload in JSON body
      const base64Data = req.body.image || req.body.base64;
      if (base64Data && typeof base64Data === 'string') {
        const result = await uploadBase64(base64Data, { folder });

        logger.info('Base64 image uploaded successfully', {
          url: result.url,
          isCloudinary: !result.isLocalFallback,
          size: result.bytes,
        });

        return ApiResponse.success(res, result, 'Tải ảnh lên thành công');
      }

      return ApiResponse.error(
        res,
        'MISSING_FILE',
        'Vui lòng đính kèm tệp hình ảnh (multipart field "file" hoặc "image") hoặc chuỗi base64',
        400
      );
    } catch (error: any) {
      logger.error('UploadController.uploadImage failed', { error: error?.message, stack: error?.stack });
      return ApiResponse.error(
        res,
        'UPLOAD_FAILED',
        error?.message || 'Tải ảnh lên thất bại, vui lòng thử lại',
        500
      );
    }
  }

  /**
   * GET /api/upload/status
   * Kiểm tra trạng thái cấu hình Cloudinary
   */
  static async getStatus(req: Request, res: Response) {
    const configured = isCloudinaryConfigured();
    return ApiResponse.success(
      res,
      {
        cloudinaryConfigured: configured,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
        storageMode: configured ? 'CLOUDINARY' : 'LOCAL_FALLBACK',
      },
      'Trạng thái dịch vụ upload ảnh'
    );
  }
}
