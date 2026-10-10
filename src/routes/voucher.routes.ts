import { Router } from 'express';
import { z } from 'zod';
import VoucherController from '../controllers/voucher.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import validate from '../middlewares/validate';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const createVoucherSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Mã voucher không được để trống'),
    description: z.string().optional(),
    type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
    value: z.coerce.number().positive('Giá trị giảm phải lớn hơn 0'),
    maxDiscount: z.coerce.number().positive().optional(),
    minOrderVal: z.coerce.number().min(0).default(0),
    usageLimit: z.coerce.number().int().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date({ required_error: 'Ngày hết hạn là bắt buộc' }),
  }),
});

const router = Router();

// Endpoint check/apply voucher là public/semi-public (dành cho cả QR Menu và POS)
router.post('/apply', qrMenuRateLimit, VoucherController.applyVoucher);
router.post('/validate', qrMenuRateLimit, VoucherController.validateVoucher);

// Quản trị voucher yêu cầu đăng nhập + tenant isolation
router.use(authMiddleware, enforceTenantIsolation);

router.get('/', VoucherController.getVouchers);
router.post('/', requireRole(['ADMIN']), validate(createVoucherSchema), VoucherController.createVoucher);
router.patch('/:id', requireRole(['ADMIN']), VoucherController.updateVoucher);
router.delete('/:id', requireRole(['ADMIN']), VoucherController.deleteVoucher);
router.post('/:id/redeem', requireRole(['ADMIN', 'MANAGER', 'CASHIER']), VoucherController.redeemVoucher);

export default router;
