import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const authRouter = Router();

authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/me', authMiddleware, AuthController.me);
authRouter.patch('/profile', authMiddleware, AuthController.updateProfile);
authRouter.put('/profile', authMiddleware, AuthController.updateProfile);
authRouter.post('/change-password', authMiddleware, AuthController.changePassword);

export default authRouter;
