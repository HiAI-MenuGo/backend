import { Router } from 'express';
import VoucherController from '../controllers/voucher.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint check/apply voucher là public/semi-public (dành cho cả QR Menu và POS)
router.post('/apply', VoucherController.applyVoucher);

// Quản trị voucher yêu cầu đăng nhập
router.use(authMiddleware);

router.get('/', VoucherController.getVouchers);
router.post('/', requireRole(['ADMIN']), VoucherController.createVoucher);
router.patch('/:id', requireRole(['ADMIN']), VoucherController.updateVoucher);

export default router;
