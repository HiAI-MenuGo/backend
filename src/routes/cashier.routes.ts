import { Router } from 'express';
import { CashierController } from '../controllers/cashier.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const cashierRouter = Router();

// QR payment page: khách xem phiên của đúng bàn mình (public, scope theo tableId)
cashierRouter.get('/table/:tableId/active', qrMenuRateLimit, CashierController.getActiveSessionByTable);

// Bank webhook: public nhưng xác thực chữ ký trong controller (verifyWebhook)
cashierRouter.post('/webhook', CashierController.handleWebhook);

// Staff thu ngân — yêu cầu auth + tenant isolation
cashierRouter.use(authMiddleware, enforceTenantIsolation);
cashierRouter.get('/pending', CashierController.getPendingPayments);
cashierRouter.get('/summary', CashierController.getActiveSummary);
cashierRouter.post('/pay', CashierController.payCash);
cashierRouter.post('/create-qr', CashierController.createVietQR);

export default cashierRouter;
