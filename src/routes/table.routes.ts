import { Router } from 'express';
import { TableController } from '../controllers/table.controller';
import TableQrController from '../controllers/table-qr.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const tableRouter = Router();

// QR mã hóa JWT (public resolve cho khách quét, ký token cho ADMIN/MANAGER)
tableRouter.get('/resolve', qrMenuRateLimit, TableQrController.resolveQrToken);
tableRouter.get(
  '/:id/qr-token',
  authMiddleware,
  enforceTenantIsolation,
  requireRole(['ADMIN', 'MANAGER']),
  TableQrController.signQrToken
);

tableRouter.get('/', authMiddleware, enforceTenantIsolation, TableController.getTables);
tableRouter.post(
  '/',
  authMiddleware,
  enforceTenantIsolation,
  requireRole(['ADMIN', 'MANAGER']),
  TableController.createTable
);
tableRouter.patch(
  '/:id/status',
  authMiddleware,
  enforceTenantIsolation,
  requireRole(['ADMIN', 'MANAGER', 'CASHIER']),
  TableController.updateStatus
);

export default tableRouter;
