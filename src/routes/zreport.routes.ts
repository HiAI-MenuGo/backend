import { Router } from 'express';
import ZReportController from '../controllers/zreport.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
// Chỉ ADMIN, MANAGER, CASHIER được phép xem/chốt ca
router.use(requireRole(['ADMIN', 'MANAGER', 'CASHIER']));

router.get('/preview', ZReportController.getPreview);
router.post('/', ZReportController.createReport);
router.get('/history', ZReportController.getHistory);

export default router;
