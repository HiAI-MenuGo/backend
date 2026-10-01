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

import platformRouter from './platform.routes';
import userRouter from './user.routes';
import zreportRouter from './zreport.routes';
import voucherRouter from './voucher.routes';
import brandingRouter from './branding.routes';

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

// Member C Modules
rootRouter.use('/platform-admin', platformRouter);
rootRouter.use('/admin/users', userRouter);
rootRouter.use('/z-report', zreportRouter);
rootRouter.use('/vouchers', voucherRouter);
rootRouter.use('/branding', brandingRouter);

export default rootRouter;
