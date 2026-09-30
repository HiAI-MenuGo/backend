import { Router } from 'express';
import { TableController } from '../controllers/table.controller';

const tableRouter = Router();

tableRouter.get('/', TableController.getTables);
tableRouter.patch('/:id/status', TableController.updateStatus);

export default tableRouter;
