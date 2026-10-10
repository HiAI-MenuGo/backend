import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenantIsolation';

const ingredientRouter = Router();

// Kho nguyên liệu — staff only, tenant isolation bắt buộc
ingredientRouter.use(authMiddleware, enforceTenantIsolation);

ingredientRouter.get('/', IngredientController.getIngredients);
ingredientRouter.post('/', IngredientController.createIngredient);
ingredientRouter.patch('/:id/adjust', IngredientController.adjustStock);
ingredientRouter.delete('/:id', IngredientController.deleteIngredient);

export default ingredientRouter;
