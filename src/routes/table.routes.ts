import { Router } from 'express';
import { TableController } from '../controllers/table.controller';
import TableQrController from '../controllers/table-qr.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const tableRouter = Router();

// QR mã hóa JWT (public resolve cho khách quét, ký token cho ADMIN/MANAGER)
tableRouter.get('/resolve', TableQrController.resolveQrToken);
tableRouter.get(
  '/:id/qr-token',
  authMiddleware,
  requireRole(['ADMIN', 'MANAGER']),
  TableQrController.signQrToken
);

tableRouter.get('/', TableController.getTables);
tableRouter.post('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), TableController.createTable);
tableRouter.patch('/:id/status', TableController.updateStatus);

export default tableRouter;
