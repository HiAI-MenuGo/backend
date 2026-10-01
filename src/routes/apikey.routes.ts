import { Router } from 'express';
import { ApiKeyController, createApiKeySchema } from '../controllers/apikey.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';

const apiKeyRouter = Router();

// Tất cả các endpoints API Key yêu cầu quyền ADMIN
apiKeyRouter.use(authMiddleware, requireRole(['ADMIN']));

apiKeyRouter.get('/', ApiKeyController.getApiKeys);
apiKeyRouter.post('/', validate(createApiKeySchema), ApiKeyController.createApiKey);
apiKeyRouter.delete('/:id', ApiKeyController.revokeApiKey);

export default apiKeyRouter;
