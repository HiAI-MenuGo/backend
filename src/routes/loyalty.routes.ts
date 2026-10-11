import { Router } from 'express';
import {
  LoyaltyController,
  createTierSchema,
  updateTierSchema,
  getCustomerQuerySchema,
  adjustPointsSchema,
} from '../controllers/loyalty.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import { validate } from '../middlewares/validate';

// Router cho /api/tiers
export const tierRouter = Router();
tierRouter.use(authMiddleware, enforceTenantIsolation);
tierRouter.get('/', LoyaltyController.getTiers);
tierRouter.post('/', requireRole(['ADMIN']), validate(createTierSchema), LoyaltyController.createTier);
tierRouter.put('/:id', requireRole(['ADMIN']), validate(updateTierSchema), LoyaltyController.updateTier);
tierRouter.delete('/:id', requireRole(['ADMIN']), LoyaltyController.deleteTier);

// Router cho /api/customers (CSDL thật thay cho mock)
export const loyaltyCustomerRouter = Router();

// Endpoint public cho khách quét mã QR tại bàn tra cứu & tự động tích điểm theo SĐT
loyaltyCustomerRouter.get('/public', LoyaltyController.getPublicCustomerByPhone);

loyaltyCustomerRouter.use(authMiddleware, enforceTenantIsolation, requireRole(['CASHIER', 'MANAGER', 'ADMIN']));
loyaltyCustomerRouter.get('/', validate(getCustomerQuerySchema), LoyaltyController.getCustomers);
loyaltyCustomerRouter.post('/', LoyaltyController.createCustomer);
loyaltyCustomerRouter.post('/points', validate(adjustPointsSchema), LoyaltyController.adjustPoints);
loyaltyCustomerRouter.delete('/:id', LoyaltyController.deleteCustomer);

export default {
  tierRouter,
  loyaltyCustomerRouter,
};
