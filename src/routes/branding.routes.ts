import { Router } from 'express';
import { z } from 'zod';
import BrandingController from '../controllers/branding.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import validate from '../middlewares/validate';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const updateBrandingSchema = z.object({
  body: z.object({
    restaurantName: z.string().optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    wifiSsid: z.string().optional(),
    wifiPassword: z.string().optional(),
    footerText: z.string().optional(),
    bankCode: z.string().optional(),
    bankAccountNo: z.string().optional(),
    bankAccountName: z.string().optional(),
  }),
});

const router = Router();

// Public endpoint để client xem branding của quán (QR Menu, POS)
router.get('/public', qrMenuRateLimit, BrandingController.getPublicBranding);
router.get('/:tenantId', qrMenuRateLimit, BrandingController.getBranding);

// Admin / Manager endpoints
router.get('/', authMiddleware, enforceTenantIsolation, BrandingController.getBranding);
router.put('/', authMiddleware, enforceTenantIsolation, requireRole(['ADMIN', 'MANAGER']), validate(updateBrandingSchema), BrandingController.updateBranding);
router.patch('/:tenantId', authMiddleware, enforceTenantIsolation, requireRole(['ADMIN', 'MANAGER']), validate(updateBrandingSchema), BrandingController.patchBranding);

export default router;
