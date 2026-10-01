import { Router } from 'express';
import {
  LoyaltyController,
  updateTierSchema,
  getCustomerQuerySchema,
  adjustPointsSchema,
} from '../controllers/loyalty.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';

// Router cho /api/tiers
export const tierRouter = Router();
tierRouter.use(authMiddleware);
tierRouter.get('/', LoyaltyController.getTiers);
tierRouter.put('/:id', requireRole(['ADMIN']), validate(updateTierSchema), LoyaltyController.updateTier);

// Router cho /api/customers (CSDL thật thay cho mock)
export const loyaltyCustomerRouter = Router();
loyaltyCustomerRouter.use(authMiddleware, requireRole(['CASHIER', 'MANAGER', 'ADMIN']));
loyaltyCustomerRouter.get('/', validate(getCustomerQuerySchema), LoyaltyController.getCustomerByPhone);
loyaltyCustomerRouter.post('/points', validate(adjustPointsSchema), LoyaltyController.adjustPoints);

export default {
  tierRouter,
  loyaltyCustomerRouter,
};
