import { Router } from 'express';
import { AnalyticsController, overviewQuerySchema } from '../controllers/analytics.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate';

const analyticsRouter = Router();

// Guard authMiddleware + requireRole giống zreport.routes.ts:20-22
analyticsRouter.use(authMiddleware);
analyticsRouter.use(requireRole(['ADMIN', 'MANAGER', 'CASHIER']));

analyticsRouter.get('/overview', validate(overviewQuerySchema), AnalyticsController.getOverview);

export default analyticsRouter;
