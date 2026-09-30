import { Router } from 'express';
import { CashierController } from '../controllers/cashier.controller';

const sessionRouter = Router();

sessionRouter.get('/pending-payment', CashierController.getPendingPayments);
sessionRouter.get('/active-summary', CashierController.getActiveSummary);

export default sessionRouter;
