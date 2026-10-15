import { Router } from 'express';
import { CustomerRequestController } from '../controllers/customerRequest.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const router = Router();

// Public cho khách QR: gửi yêu cầu gọi bàn, gửi đánh giá, gửi góp ý
router.post('/call', CustomerRequestController.createServiceCall);
router.post('/reviews', CustomerRequestController.createReview);
router.post('/feedback', CustomerRequestController.createFeedback);

// Staff only: đọc/cập nhật yêu cầu, xem đánh giá & góp ý (lọc theo tenant qua middleware)
router.get('/calls', authMiddleware, enforceTenantIsolation, CustomerRequestController.getServiceCalls);
router.patch('/calls/:id', authMiddleware, enforceTenantIsolation, CustomerRequestController.updateServiceCallStatus);
router.get('/reviews', authMiddleware, enforceTenantIsolation, CustomerRequestController.getReviews);
router.get('/feedback', authMiddleware, enforceTenantIsolation, CustomerRequestController.getFeedbacks);

export default router;
