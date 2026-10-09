import { Router } from 'express';
import { WebhookController, createWebhookSchema } from '../controllers/webhook.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';

const webhookRouter = Router();

// Tất cả các endpoints Webhook yêu cầu quyền ADMIN
webhookRouter.use(authMiddleware, requireRole(['ADMIN']));

webhookRouter.get('/', WebhookController.getWebhooks);
webhookRouter.post('/', validate(createWebhookSchema), WebhookController.createWebhook);
webhookRouter.delete('/:id', WebhookController.deleteWebhook);
webhookRouter.get('/:id/deliveries', WebhookController.getDeliveries);
webhookRouter.post('/:id/test', WebhookController.testWebhook);

export default webhookRouter;
