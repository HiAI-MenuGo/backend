import { Router } from 'express';
import { CashierController } from '../controllers/cashier.controller';
import { SessionOrderController, createSessionOrderSchema } from '../controllers/session-order.controller';
import validate from '../middlewares/validate';
import { qrMenuRateLimit, qrOrderRateLimit, validateTableSession } from '../middlewares/qrRateLimit';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const sessionRouter = Router();

// Staff views — yêu cầu auth + tenant isolation
sessionRouter.get(
  '/pending-payment',
  authMiddleware,
  enforceTenantIsolation,
  CashierController.getPendingPayments
);
sessionRouter.get(
  '/active-summary',
  authMiddleware,
  enforceTenantIsolation,
  CashierController.getActiveSummary
);

// QR payment page: khách xem phiên của đúng bàn mình (public, scope theo tableId, không lộ bàn khác)
sessionRouter.get(
  '/:tableId/active',
  qrMenuRateLimit,
  validateTableSession,
  CashierController.getActiveSessionByTable
);

// QR Menu Session Order (Public endpoint - no auth required, but with rate limiting & table validation)
sessionRouter.post(
  '/:tableId/order',
  qrOrderRateLimit,
  validateTableSession,
  validate(createSessionOrderSchema),
  SessionOrderController.createOrder
);

// QR Demo Payment (cho phép trang demo của khách chốt phiên khi khách ấn mô phỏng thanh toán)
sessionRouter.post(
  '/:tableId/demo-pay',
  qrOrderRateLimit,
  validateTableSession,
  CashierController.simulateTablePayment
);

export default sessionRouter;
