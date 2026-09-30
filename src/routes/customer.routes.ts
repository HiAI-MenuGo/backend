import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';

const customerRouter = Router();

customerRouter.get('/', CustomerController.getCustomerByPhone);
customerRouter.post('/points', CustomerController.addPoints);

export default customerRouter;
