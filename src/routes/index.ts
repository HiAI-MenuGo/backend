import { Router } from 'express';
import healthRoutes from './health.routes';

const rootRouter = Router();

rootRouter.use('/', healthRoutes);

export default rootRouter;
