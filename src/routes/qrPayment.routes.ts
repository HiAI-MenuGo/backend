import { Router } from 'express';
import { QrPaymentController } from '../controllers/qrPayment.controller';
import { qrMenuRateLimit } from '../middlewares/qrRateLimit';

const qrPaymentRouter = Router();

// QR khách: public + rate-limit nhẹ (không yêu cầu JWT staff)
qrPaymentRouter.post('/momo/create', qrMenuRateLimit, QrPaymentController.createMoMo);
qrPaymentRouter.post('/vnpay/create', qrMenuRateLimit, QrPaymentController.createVNPay);
qrPaymentRouter.get('/status/:referenceNo', qrMenuRateLimit, QrPaymentController.getStatus);

// IPN từ cổng ví (public, tự verify chữ ký trong controller)
qrPaymentRouter.post('/momo/ipn', QrPaymentController.momoIpn);
qrPaymentRouter.get('/vnpay/ipn', QrPaymentController.vnpayIpn);
qrPaymentRouter.post('/vnpay/ipn', QrPaymentController.vnpayIpn);

export default qrPaymentRouter;
