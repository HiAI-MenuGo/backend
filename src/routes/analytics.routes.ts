import { Router } from 'express';
import { AnalyticsController, overviewQuerySchema, revenueQuerySchema } from '../controllers/analytics.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import validate from '../middlewares/validate';

const analyticsRouter = Router();

// Guard authMiddleware + requireRole
analyticsRouter.use(authMiddleware, enforceTenantIsolation);
analyticsRouter.use(requireRole(['PLATFORM_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER']));

analyticsRouter.get('/overview', validate(overviewQuerySchema), AnalyticsController.getOverview);
analyticsRouter.get('/revenue', validate(revenueQuerySchema), AnalyticsController.getRevenueReport);
analyticsRouter.get('/revenue/export', validate(revenueQuerySchema), AnalyticsController.exportRevenueExcel);

export default analyticsRouter;
