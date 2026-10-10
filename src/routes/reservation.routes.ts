import { Router } from 'express';
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} from '../controllers/reservation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const router = Router();

// Đặt bàn — staff only, tenant isolation bắt buộc (controller scope theo tenantContext)
router.use(authMiddleware, enforceTenantIsolation);

router.get('/', getReservations);
router.post('/', createReservation);
router.put('/:id', updateReservation);
router.delete('/:id', deleteReservation);

export default router;