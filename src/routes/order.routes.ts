import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const orderRouter = Router();

// Tất cả order staff API đều yêu cầu auth + tenant isolation
orderRouter.use(authMiddleware, enforceTenantIsolation);

orderRouter.get('/active', OrderController.getActiveOrders);
orderRouter.get('/history', OrderController.getHistory);
orderRouter.get('/history/export', OrderController.exportHistoryExcel);
orderRouter.patch('/:id/status', OrderController.updateStatus);
orderRouter.patch('/items/:id/status', OrderController.updateItemStatus);
orderRouter.post('/:id/void', OrderController.voidOrder);

export default orderRouter;
