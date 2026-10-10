import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const categoryRouter = Router();

categoryRouter.use(authMiddleware, enforceTenantIsolation);
categoryRouter.get('/', CategoryController.getCategories);
categoryRouter.post('/', requireRole(['ADMIN', 'MANAGER']), CategoryController.createCategory);
categoryRouter.put('/rename', requireRole(['ADMIN', 'MANAGER']), CategoryController.renameCategoryByName);
categoryRouter.put('/:id', requireRole(['ADMIN', 'MANAGER']), CategoryController.updateCategory);
categoryRouter.delete('/:id', requireRole(['ADMIN', 'MANAGER']), CategoryController.deleteCategory);

export default categoryRouter;
