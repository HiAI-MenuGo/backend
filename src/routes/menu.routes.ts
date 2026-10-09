import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';

const menuRouter = Router();

menuRouter.get('/items', MenuController.getItems);
menuRouter.post('/items', MenuController.createItem);
menuRouter.patch('/items/:id/sold-out', MenuController.toggleSoldOut);

export default menuRouter;
