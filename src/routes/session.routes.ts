import { Router } from 'express';
import { CashierController } from '../controllers/cashier.controller';
import { SessionOrderController, createSessionOrderSchema } from '../controllers/session-order.controller';
import validate from '../middlewares/validate';

const sessionRouter = Router();

sessionRouter.get('/pending-payment', CashierController.getPendingPayments);
sessionRouter.get('/active-summary', CashierController.getActiveSummary);

// QR Menu Session Order (Real endpoint)
sessionRouter.post('/:tableId/order', validate(createSessionOrderSchema), SessionOrderController.createOrder);

export default sessionRouter;
