import { Router } from 'express';
import { z } from 'zod';
import VoucherController from '../controllers/voucher.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import validate from '../middlewares/validate';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const createVoucherSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'Mã voucher không được để trống'),
    description: z.string().optional().nullable(),
    type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
    value: z.coerce.number().positive('Giá trị giảm phải lớn hơn 0'),
    maxDiscount: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().positive('Mức giảm tối đa phải lớn hơn 0').nullable().optional()
    ),
    minOrderVal: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
      z.number().min(0, 'Đơn tối thiểu không được âm').default(0)
    ),
    usageLimit: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().int().positive('Giới hạn lượt dùng phải lớn hơn 0').nullable().optional()
    ),
    startDate: z.preprocess(
      (val) => (val ? new Date(val as any) : undefined),
      z.date().optional()
    ),
    endDate: z.preprocess(
      (val) => (val ? new Date(val as any) : undefined),
      z.date({ required_error: 'Ngày hết hạn là bắt buộc' })
    ),
  }),
});

const router = Router();

// Endpoint check/apply voucher là public/semi-public (dành cho cả QR Menu và POS)
router.post('/apply', qrMenuRateLimit, VoucherController.applyVoucher);
router.post('/validate', qrMenuRateLimit, VoucherController.validateVoucher);

// Quản trị voucher yêu cầu đăng nhập + tenant isolation
router.use(authMiddleware, enforceTenantIsolation);

router.get('/', VoucherController.getVouchers);
router.post('/', requireRole(['ADMIN', 'MANAGER', 'PLATFORM_ADMIN']), validate(createVoucherSchema), VoucherController.createVoucher);
router.patch('/:id', requireRole(['ADMIN', 'MANAGER', 'PLATFORM_ADMIN']), VoucherController.updateVoucher);
router.delete('/:id', requireRole(['ADMIN', 'MANAGER', 'PLATFORM_ADMIN']), VoucherController.deleteVoucher);
router.post('/:id/redeem', requireRole(['ADMIN', 'MANAGER', 'CASHIER']), VoucherController.redeemVoucher);

export default router;
