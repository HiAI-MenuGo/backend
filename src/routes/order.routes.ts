import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const orderRouter = Router();

orderRouter.get('/active', OrderController.getActiveOrders);
orderRouter.get('/history', OrderController.getHistory);
orderRouter.patch('/:id/status', OrderController.updateStatus);
orderRouter.patch('/items/:id/status', OrderController.updateItemStatus);
orderRouter.post('/:id/void', OrderController.voidOrder);

export default orderRouter;
