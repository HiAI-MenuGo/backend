import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const menuRouter = Router();

// Public QR menu hoặc Staff đặt món — tự resolve theo auth token / tableId / branch
menuRouter.get('/items', qrMenuRateLimit, optionalAuthMiddleware, MenuController.getItems);

// Quản trị menu — bắt buộc auth + tenant isolation
menuRouter.post(
  '/items',
  authMiddleware,
  enforceTenantIsolation,
  requireRole(['ADMIN', 'MANAGER']),
  MenuController.createItem
);
menuRouter.patch(
  '/items/:id/sold-out',
  authMiddleware,
  enforceTenantIsolation,
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN']),
  MenuController.toggleSoldOut
);

export default menuRouter;
