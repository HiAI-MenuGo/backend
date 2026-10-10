import { Router } from 'express';
import PlatformController from '../controllers/platform.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const router = Router();

// Toàn bộ routes của Platform Admin đều cần quyền PLATFORM_ADMIN
// (PLATFORM_ADMIN được enforceTenantIsolation cho cross-tenant có kiểm soát)
router.use(authMiddleware, enforceTenantIsolation);
router.use(requireRole(['PLATFORM_ADMIN']));

router.get('/tenants', PlatformController.getTenants);
router.post('/tenants', PlatformController.createTenant);
router.patch('/tenants/:id/subscription', PlatformController.updateSubscription);
router.get('/stats', PlatformController.getPlatformStats);

export default router;
