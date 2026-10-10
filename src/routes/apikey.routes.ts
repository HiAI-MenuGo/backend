import { Router } from 'express';
import { ApiKeyController, createApiKeySchema } from '../controllers/apikey.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';
import { validate } from '../middlewares/validate';

const apiKeyRouter = Router();

// Tất cả các endpoints API Key yêu cầu quyền ADMIN + tenant isolation
apiKeyRouter.use(authMiddleware, enforceTenantIsolation, requireRole(['ADMIN']));

apiKeyRouter.get('/', ApiKeyController.getApiKeys);
apiKeyRouter.post('/', validate(createApiKeySchema), ApiKeyController.createApiKey);
apiKeyRouter.delete('/:id', ApiKeyController.revokeApiKey);

export default apiKeyRouter;
