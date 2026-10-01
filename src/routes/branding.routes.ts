import { Router } from 'express';
import BrandingController from '../controllers/branding.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public endpoint để client xem branding của quán (QR Menu, POS)
router.get('/:tenantId', BrandingController.getBranding);

// Admin endpoints
router.get('/', authMiddleware, BrandingController.getBranding);
router.put('/', authMiddleware, requireRole(['ADMIN']), BrandingController.updateBranding);

export default router;
