import { Router } from 'express';
import { z } from 'zod';
import BrandingController from '../controllers/branding.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate';

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Màu phải dạng hex #rgb/#rrggbb');
const updateBrandingSchema = z.object({
  body: z.object({
    restaurantName: z.string().optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    accentColor: hexColor.optional(),
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
router.get('/public', BrandingController.getPublicBranding);
router.get('/:tenantId', BrandingController.getBranding);

// Admin / Manager endpoints
router.get('/', authMiddleware, BrandingController.getBranding);
router.put('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), validate(updateBrandingSchema), BrandingController.updateBranding);
router.patch('/:tenantId', authMiddleware, requireRole(['ADMIN', 'MANAGER']), validate(updateBrandingSchema), BrandingController.patchBranding);

export default router;
