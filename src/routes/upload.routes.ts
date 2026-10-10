import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';

const uploadRouter = Router();

// Configure Multer with memory storage and 10MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'));
    }
  },
});

// Middleware to accept either 'file' or 'image' field name in multipart form
const handleMultipart = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          message: 'Dung lượng ảnh vượt quá giới hạn 10MB',
        });
      }
      return res.status(400).json({
        success: false,
        errorCode: 'MULTER_ERROR',
        message: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_FILE',
        message: err.message,
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      req.file = files['file']?.[0] || files['image']?.[0];
    }
    next();
  });
};

import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

// Upload ảnh món ăn — staff only (chặn khách QR upload tùy ý)
uploadRouter.use(authMiddleware, enforceTenantIsolation);

// POST /api/upload/image
uploadRouter.post('/image', handleMultipart, UploadController.uploadImage);

// POST /api/upload (alias)
uploadRouter.post('/', handleMultipart, UploadController.uploadImage);

// GET /api/upload/status
uploadRouter.get('/status', UploadController.getStatus);

export default uploadRouter;
