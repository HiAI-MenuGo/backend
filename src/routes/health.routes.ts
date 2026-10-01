import { Router, Request, Response } from 'express';

import ApiResponse from '../utils/response';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  return ApiResponse.success(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'HiAI-MenuGo Backend API',
  }, 'Service healthy');
});

export default router;
