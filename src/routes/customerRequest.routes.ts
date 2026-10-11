import { Router } from 'express';
import { CustomerRequestController } from '../controllers/customerRequest.controller';

const router = Router();

// Yêu cầu gọi bàn (Gọi thanh toán & Gọi nhân viên)
router.post('/call', CustomerRequestController.createServiceCall);
router.get('/calls', CustomerRequestController.getServiceCalls);
router.patch('/calls/:id', CustomerRequestController.updateServiceCallStatus);

// Đánh giá & Rating của khách hàng
router.post('/reviews', CustomerRequestController.createReview);
router.get('/reviews', CustomerRequestController.getReviews);

export default router;
