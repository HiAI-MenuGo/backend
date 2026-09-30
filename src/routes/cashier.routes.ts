import { Router } from 'express';
import { CashierController } from '../controllers/cashier.controller';

const cashierRouter = Router();

cashRouter_endpoints: {
  cashierRouter.post('/pay', CashierController.payCash);
  cashierRouter.post('/create-qr', CashierController.createVietQR);
  cashierRouter.post('/webhook', CashierController.handleWebhook);
}

export default cashierRouter;
