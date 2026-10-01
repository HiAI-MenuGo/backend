import { Router } from 'express';
import PlatformController from '../controllers/platform.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Toàn bộ routes của Platform Admin đều cần quyền PLATFORM_ADMIN
router.use(authMiddleware);
router.use(requireRole(['PLATFORM_ADMIN']));

router.get('/tenants', PlatformController.getTenants);
router.post('/tenants', PlatformController.createTenant);
router.patch('/tenants/:id/subscription', PlatformController.updateSubscription);
router.get('/stats', PlatformController.getPlatformStats);

export default router;
