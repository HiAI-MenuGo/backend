import { Router } from 'express';
import { z } from 'zod';
import ZReportController from '../controllers/zreport.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate';

const closeShiftSchema = z.object({
  body: z.object({
    branchId: z.string().optional(),
    shiftName: z.string().min(1, 'Tên ca không được để trống'),
    startTime: z.coerce.date(),
    openingCash: z.coerce.number().min(0).default(0),
    actualCash: z.coerce.number().min(0).default(0),
    note: z.string().optional(),
  }),
});

const router = Router();

router.use(authMiddleware);
// Chỉ ADMIN, MANAGER, CASHIER được phép xem/chốt ca
router.use(requireRole(['ADMIN', 'MANAGER', 'CASHIER']));

router.get('/preview', ZReportController.getPreview);
router.get('/shift-summary', ZReportController.getShiftSummary);
router.get('/export', ZReportController.exportReport);
router.post('/', validate(closeShiftSchema), ZReportController.createReport);
router.post('/close-shift', validate(closeShiftSchema), ZReportController.closeShift);
router.get('/history', ZReportController.getHistory);

export default router;
