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
loyaltyCustomerRouter.use(authMiddleware, enforceTenantIsolation, requireRole(['CASHIER', 'MANAGER', 'ADMIN']));
loyaltyCustomerRouter.get('/', validate(getCustomerQuerySchema), LoyaltyController.getCustomerByPhone);
loyaltyCustomerRouter.post('/points', validate(adjustPointsSchema), LoyaltyController.adjustPoints);

export default {
  tierRouter,
  loyaltyCustomerRouter,
};
