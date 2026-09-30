import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';

const ingredientRouter = Router();

ingredientRouter.get('/', IngredientController.getIngredients);
ingredientRouter.patch('/:id/adjust', IngredientController.adjustStock);

export default ingredientRouter;
