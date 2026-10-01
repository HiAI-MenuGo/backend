import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Quản lý nhân viên yêu cầu quyền ADMIN hoặc MANAGER
router.get('/', requireRole(['ADMIN', 'MANAGER']), UserController.getUsers);
router.post('/', requireRole(['ADMIN']), UserController.createUser);
router.patch('/:id', requireRole(['ADMIN']), UserController.updateUser);
router.delete('/:id', requireRole(['ADMIN']), UserController.deleteUser);

export default router;
