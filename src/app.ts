import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import rootRouter from './routes';
import ApiResponse from './utils/response';
import logger from './utils/logger';

import http from 'http';
import { initSocketServer } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Initialize Realtime Socket.IO Server
initSocketServer(httpServer);

// Rate limiter: 2000 requests per 15 minutes as specified in TECHS.md
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    errorCode: 'TOO_MANY_REQUESTS',
    message: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 15 phút',
  },
});

import path from 'path';

// Security & Parsing Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(limiter);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads (fallback when Cloudinary is not used)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// API Routes
app.use('/api', rootRouter);

app.get('/', (req: Request, res: Response) => {
  return ApiResponse.success(res, {
    message: 'Welcome to HiAI-MenuGo Backend API',
    docs: '/api/health',
  }, 'Service ready');
});

// 404 Handler
app.use((req: Request, res: Response) => {
  return ApiResponse.error(res, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} không tồn tại`, 404);
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Server Error:', { error: err.message, stack: err.stack, path: req.originalUrl });
  return ApiResponse.error(res, 'INTERNAL_SERVER_ERROR', 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau', 500);
});

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server & Socket.IO running on http://localhost:${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
