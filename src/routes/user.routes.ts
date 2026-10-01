import { Router } from 'express';
import { z } from 'zod';
import UserController from '../controllers/user.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Email không hợp lệ'),
    name: z.string().min(1, 'Họ tên không được để trống'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    role: z.enum(['ADMIN', 'MANAGER', 'KITCHEN', 'CASHIER']).default('CASHIER'),
    branchId: z.string().optional(),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'KITCHEN', 'CASHIER']).optional(),
    branchId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
  }),
});

const router = Router();

router.use(authMiddleware);

// Quản lý nhân viên yêu cầu quyền ADMIN hoặc MANAGER
router.get('/roles', requireRole(['ADMIN', 'MANAGER']), UserController.getRoles);
router.get('/', requireRole(['ADMIN', 'MANAGER']), UserController.getUsers);
router.post('/', requireRole(['ADMIN']), validate(createUserSchema), UserController.createUser);
router.patch('/:id', requireRole(['ADMIN']), validate(updateUserSchema), UserController.updateUser);
router.delete('/:id', requireRole(['ADMIN']), UserController.deleteUser);

export default router;
