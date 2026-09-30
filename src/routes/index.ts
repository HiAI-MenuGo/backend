import { Router } from 'express';
import healthRoutes from './health.routes';
import authRouter from './auth.routes';
import orderRouter from './order.routes';
import tableRouter from './table.routes';
import cashierRouter from './cashier.routes';
import sessionRouter from './session.routes';
import ingredientRouter from './ingredient.routes';
import customerRouter from './customer.routes';
import menuRouter from './menu.routes';

const rootRouter = Router();

rootRouter.use('/', healthRoutes);
rootRouter.use('/auth', authRouter);
rootRouter.use('/orders', orderRouter);
rootRouter.use('/tables', tableRouter);
rootRouter.use('/cashier', cashierRouter);
rootRouter.use('/sessions', sessionRouter);
rootRouter.use('/ingredients', ingredientRouter);
rootRouter.use('/customers', customerRouter);
rootRouter.use('/menu', menuRouter);

export default rootRouter;
