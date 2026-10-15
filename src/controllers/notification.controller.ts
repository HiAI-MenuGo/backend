import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import fs from 'fs';
import path from 'path';
import { getIO } from '../socket';
import logger from '../utils/logger';

export interface NotificationRecord {
  id: string;
  tenantId: string;
  branchId: string;
  title: string;
  message: string;
  time: string;
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'TABLE';
  isRead: boolean;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'noti-1',
    tenantId: 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
    branchId: '177a45ad-19ff-4641-a6c4-18de95029803',
    title: 'Yêu cầu phục vụ: BÀN 1',
    message: 'Khách gọi nhân viên: khăngiất',
    time: '15 phút trước',
    type: 'ORDER',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'noti-2',
    tenantId: 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
    branchId: '177a45ad-19ff-4641-a6c4-18de95029803',
    title: 'Đơn hàng mới: #H-002',
    message: 'Bàn 01 • 1 món • 8.5 đ',
    time: '45 phút trước',
    type: 'ORDER',
    isRead: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'noti-3',
    tenantId: 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
    branchId: '177a45ad-19ff-4641-a6c4-18de95029803',
    title: 'Thanh toán thành công: Bàn 01',
    message: 'Đã thu 20 đ • Tiền mặt (Khách hoàn tất hóa đơn)',
    time: '2 giờ trước',
    type: 'PAYMENT',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'noti-4',
    tenantId: 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
    branchId: '177a45ad-19ff-4641-a6c4-18de95029803',
    title: 'Đơn hàng mới: #H-001',
    message: 'Bàn 01 • 1 món • 20 đ',
    time: '3 giờ trước',
    type: 'ORDER',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'noti-5',
    tenantId: 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
    branchId: '177a45ad-19ff-4641-a6c4-18de95029803',
    title: 'Cảnh báo nguyên liệu: Trà Đen Earl Grey',
    message: 'Tồn kho sắp hết ngưỡng tối thiểu. Vui lòng kiểm tra kho.',
    time: '1 ngày trước',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'noti-6',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    title: 'Đơn hàng mới: #ORD-001',
    message: 'Bàn 03 • 2 món • 75.000 đ',
    time: '1 giờ trước',
    type: 'ORDER',
    isRead: false,
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

function readNotifications(): NotificationRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    logger.warn('Error reading notifications file:', err);
  }
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(INITIAL_NOTIFICATIONS, null, 2), 'utf-8');
  return INITIAL_NOTIFICATIONS;
}

function writeNotifications(data: NotificationRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Error writing notifications file:', err);
  }
}

export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const branchId =
        (req.query.branchId as string) ||
        (req.headers['x-branch-id'] as string) ||
        req.user?.branchId;

      let list = readNotifications();

      if (branchId && branchId !== 'ALL') {
        list = list.filter((n) => !n.branchId || n.branchId === branchId || n.branchId === 'ALL');
      }

      const unreadCount = list.filter((n) => !n.isRead).length;

      if (type && type !== 'ALL') {
        list = list.filter((n) => n.type === type);
      }

      // Sắp xếp thông báo mới nhất lên đầu
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return ApiResponse.success(
        res,
        {
          notifications: list,
          unreadCount,
        },
        'Lấy danh sách thông báo thành công'
      );
    } catch (err: any) {
      return ApiResponse.error(res, 'GET_NOTIFICATIONS_ERROR', err?.message, 500);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const list = readNotifications();
      const targetIndex = list.findIndex((n) => n.id === id);

      if (targetIndex === -1) {
        return ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy thông báo', 404);
      }

      list[targetIndex].isRead = true;
      writeNotifications(list);

      return ApiResponse.success(res, list[targetIndex], 'Đã đánh dấu thông báo là đã đọc');
    } catch (err: any) {
      return ApiResponse.error(res, 'MARK_READ_ERROR', err?.message, 500);
    }
  }

  /**
   * POST /api/notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const branchId =
        (req.body?.branchId as string) ||
        (req.query?.branchId as string) ||
        (req.headers['x-branch-id'] as string) ||
        req.user?.branchId;

      const list = readNotifications();
      let updatedCount = 0;

      list.forEach((n) => {
        if (!branchId || branchId === 'ALL' || n.branchId === branchId) {
          if (!n.isRead) {
            n.isRead = true;
            updatedCount++;
          }
        }
      });

      writeNotifications(list);

      return ApiResponse.success(res, { updatedCount }, 'Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err: any) {
      return ApiResponse.error(res, 'MARK_ALL_READ_ERROR', err?.message, 500);
    }
  }

  /**
   * Tạo thông báo mới và push qua Socket.IO (dành cho các controller khác gọi nội bộ)
   */
  static createNotification(data: Omit<NotificationRecord, 'id' | 'createdAt'>) {
    try {
      const list = readNotifications();
      const newNoti: NotificationRecord = {
        ...data,
        id: `noti-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      list.unshift(newNoti);
      writeNotifications(list);

      try {
        const io = getIO();
        if (data.branchId) {
          io.to(`branch:${data.branchId}`).emit('notification:new', newNoti);
        }
        io.emit('notification:new', newNoti);
      } catch {
        // Socket server có thể chưa khởi tạo khi test script
      }

      return newNoti;
    } catch (err) {
      logger.warn('[NotificationController] createNotification failed:', err);
      return null;
    }
  }
}
