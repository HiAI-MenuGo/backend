import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';

const ingredientRouter = Router();

ingredientRouter.get('/', IngredientController.getIngredients);
ingredientRouter.post('/', IngredientController.createIngredient);
ingredientRouter.patch('/:id/adjust', IngredientController.adjustStock);
ingredientRouter.delete('/:id', IngredientController.deleteIngredient);

export default ingredientRouter;
