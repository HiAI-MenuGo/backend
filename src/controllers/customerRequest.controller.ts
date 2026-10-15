import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { resolveTableScope } from '../utils/tableScope';
import { getTenantContext } from '../middlewares/tenantIsolation';
import { getIO } from '../socket';
import prisma from '../utils/prisma';
import { NotificationController } from './notification.controller';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface ServiceCallItem {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  tableName: string;
  type: 'PAYMENT' | 'STAFF';
  paymentMethod?: 'CASH' | 'VIETQR';
  reason: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ReviewItem {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  tableName: string;
  customerName?: string;
  customerPhone?: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CALLS_FILE = path.join(DATA_DIR, 'customer_service_calls.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'customer_reviews.json');
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');

export interface FeedbackItem {
  id: string;
  category: string;
  title?: string;
  content: string;
  userName?: string;
  userEmail?: string;
  branchId?: string;
  createdAt: string;
}

function readFeedbacks(): FeedbackItem[] {
  ensureDataDir();
  if (!fs.existsSync(FEEDBACKS_FILE)) {
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(FEEDBACKS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeFeedbacks(feedbacks: FeedbackItem[]) {
  ensureDataDir();
  fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Sample seed ban đầu để hiển thị giao diện sinh động
const INITIAL_CALLS: ServiceCallItem[] = [
  {
    id: 'call-1',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: '3',
    tableName: 'Bàn 03 (Tầng 1)',
    type: 'PAYMENT',
    paymentMethod: 'VIETQR',
    reason: 'Yêu cầu thanh toán (VietQR)',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: 'call-2',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: 'tbl-vip-1',
    tableName: 'Bàn VIP 01',
    type: 'STAFF',
    reason: 'Thêm đá và khăn lạnh',
    status: 'PROCESSING',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'call-3',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: 'tbl-out-2',
    tableName: 'Bàn O-02 (Sân vườn)',
    type: 'STAFF',
    reason: 'Gặp nhân viên tư vấn món',
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: '3',
    tableName: 'Bàn 03',
    customerName: 'Anh Minh',
    customerPhone: '0988776655',
    rating: 5,
    comment: 'Trà đào cam sả rất thanh mát, nhân viên phục vụ tận tình và ra món nhanh chóng!',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-2',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: 'tbl-vip-1',
    tableName: 'Bàn VIP 01',
    customerName: 'Chị Lan',
    customerPhone: '0912345678',
    rating: 5,
    comment: 'Không gian phòng VIP yên tĩnh sang trọng, đồ ăn ngon chuẩn vị.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-3',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: 'tbl-05',
    tableName: 'Bàn 05',
    customerName: 'Khách hàng',
    rating: 4,
    comment: 'Bạc xỉu sữa tươi 3 tầng thơm béo, nhưng đá tan hơi nhanh một chút.',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'rev-4',
    tenantId: 'default-tenant',
    branchId: 'default-branch',
    tableId: 'tbl-02',
    tableName: 'Bàn 02',
    customerName: 'Quang Huy',
    customerPhone: '0933445566',
    rating: 5,
    comment: 'Giao diện quét QR gọi món tại bàn cực kỳ tiện lợi và hiện đại!',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

function readCalls(): ServiceCallItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(CALLS_FILE)) {
      const raw = fs.readFileSync(CALLS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn('Error reading calls file:', err);
  }
  fs.writeFileSync(CALLS_FILE, JSON.stringify(INITIAL_CALLS, null, 2), 'utf-8');
  return INITIAL_CALLS;
}

function writeCalls(calls: ServiceCallItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(CALLS_FILE, JSON.stringify(calls, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Error writing calls file:', err);
  }
}

function readReviews(): ReviewItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const raw = fs.readFileSync(REVIEWS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn('Error reading reviews file:', err);
  }
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(INITIAL_REVIEWS, null, 2), 'utf-8');
  return INITIAL_REVIEWS;
}

function writeReviews(reviews: ReviewItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Error writing reviews file:', err);
  }
}

export class CustomerRequestController {
  /**
   * POST /api/customer-requests/call (Public QR Menu)
   * Khách bấm Gọi thanh toán hoặc Gọi nhân viên
   */
  static async createServiceCall(req: Request, res: Response) {
    try {
      const { tableId, tableName, type, reason, paymentMethod, tenantId: bodyTenant, branchId: bodyBranch } = req.body;

      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu thông tin bàn gọi', 400);
      }

      const scope = await resolveTableScope(tableId, {
        tenantId: bodyTenant && bodyTenant !== 'default-tenant' ? bodyTenant : undefined,
        branchId: bodyBranch && bodyBranch !== 'default-branch' ? bodyBranch : undefined,
      });
      const tenantId = scope?.tenantId || 'default-tenant';
      const branchId = scope?.branchId || 'default-branch';
      const finalTableName = tableName || scope?.tableName || `Bàn ${tableId}`;

      // Tôn trọng công tắc bật/tắt ở Cài đặt (TenantBranding)
      const callType = type === 'PAYMENT' ? 'PAYMENT' : 'STAFF';
      try {
        const branding = await prisma.tenantBranding.findUnique({
          where: { tenantId },
          select: { enablePaymentCall: true, enableStaffCall: true },
        });
        if (callType === 'PAYMENT' && branding && branding.enablePaymentCall === false) {
          return ApiResponse.error(res, 'FEATURE_DISABLED', 'Quán đã tắt tính năng gọi thanh toán', 403);
        }
        if (callType === 'STAFF' && branding && branding.enableStaffCall === false) {
          return ApiResponse.error(res, 'FEATURE_DISABLED', 'Quán đã tắt tính năng gọi nhân viên', 403);
        }
      } catch {
        // Bỏ qua khi DB chưa migrate kịp — mặc định cho phép gọi
      }

      const newCall: ServiceCallItem = {
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tenantId,
        branchId,
        tableId,
        tableName: finalTableName,
        type: type === 'PAYMENT' ? 'PAYMENT' : 'STAFF',
        paymentMethod: paymentMethod === 'VIETQR' ? 'VIETQR' : 'CASH',
        reason:
          reason ||
          (type === 'PAYMENT'
            ? paymentMethod === 'VIETQR'
              ? 'Phương thức: Chuyển khoản'
              : 'Phương thức: Tiền mặt'
            : 'Phục vụ tại bàn'),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const calls = readCalls();
      calls.unshift(newCall);
      writeCalls(calls);

      // Lưu notification vào hệ thống và phát realtime cho mobile app
      try {
        const isDispatch = typeof newCall.reason === 'string' && newCall.reason.includes('Điều phối:');
        NotificationController.createNotification({
          tenantId: tenantId || 'd53146c8-0087-4765-8fc6-4bc9f2ac0f32',
          branchId: branchId || '177a45ad-19ff-4641-a6c4-18de95029803',
          title: isDispatch
            ? `🛎️ Điều phối nhân viên: ${newCall.tableName || 'Bàn'}`
            : newCall.type === 'PAYMENT'
            ? `Yêu cầu thanh toán: ${newCall.tableName || 'Bàn'}`
            : `Yêu cầu phục vụ: ${newCall.tableName || 'Bàn'}`,
          message: newCall.reason || (newCall.type === 'PAYMENT' ? 'Khách yêu cầu thanh toán' : 'Khách gọi nhân viên'),
          time: 'Vừa xong',
          type: newCall.type === 'PAYMENT' ? 'PAYMENT' : 'ORDER',
          isRead: false,
        });
      } catch (notiErr) {
        logger.warn('[CustomerRequest] createNotification failed:', notiErr);
      }

      // Phát realtime qua Socket.IO tới màn hình web của thu ngân / phục vụ
      try {
        const io = getIO();
        if (tenantId && tenantId !== 'default-tenant') {
          io.to(`tenant:${tenantId}`).to(`branch:${branchId}`).emit('call_staff:request', newCall);
        } else {
          io.emit('call_staff:request', newCall);
        }
      } catch (sockErr) {
        logger.warn('[CustomerRequest] Socket emit failed:', sockErr);
      }

      return ApiResponse.success(res, newCall, 'Gửi yêu cầu tới nhân viên thành công', 201);
    } catch (err: any) {
      logger.error('[CustomerRequest] createServiceCall error:', err);
      return ApiResponse.error(res, 'CREATE_CALL_ERROR', err?.message || 'Lỗi gửi yêu cầu', 500);
    }
  }

  /**
   * GET /api/customer-requests/calls (Staff Web Admin)
   * Lấy danh sách các yêu cầu gọi bàn
   */
  static async getServiceCalls(req: Request, res: Response) {
    try {
      const { status, type } = req.query;
      const { tenantId, branchId } = getTenantContext(req);
      let calls = readCalls();

      // Chặn leak cross-tenant: chỉ trả calls thuộc tenant của user
      calls = calls.filter((c) => c.tenantId === tenantId);
      if (branchId && branchId !== 'ALL') {
        calls = calls.filter((c) => c.branchId === branchId);
      }

      const pendingCount = calls.filter((c) => c.status === 'PENDING').length;
      const processingCount = calls.filter((c) => c.status === 'PROCESSING').length;
      const totalCount = calls.length;

      if (status && status !== 'ALL') {
        calls = calls.filter((c) => c.status === status);
      }
      if (type && type !== 'ALL') {
        calls = calls.filter((c) => c.type === type);
      }

      return ApiResponse.success(
        res,
        {
          calls,
          summary: {
            total: totalCount,
            pending: pendingCount,
            processing: processingCount,
          },
        },
        'Lấy danh sách yêu cầu gọi bàn thành công'
      );
    } catch (err: any) {
      return ApiResponse.error(res, 'GET_CALLS_ERROR', err?.message, 500);
    }
  }

  /**
   * PATCH /api/customer-requests/calls/:id (Staff Web Admin)
   * Cập nhật trạng thái yêu cầu (Tiếp nhận / Hoàn tất / Hủy)
   */
  static async updateServiceCallStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái không hợp lệ', 400);
      }

      const calls = readCalls();
      const idx = calls.findIndex((c) => c.id === id);
      if (idx === -1) {
        return ApiResponse.error(res, 'CALL_NOT_FOUND', 'Không tìm thấy yêu cầu gọi bàn', 404);
      }

      // Chặn IDOR: call phải thuộc tenant (và branch, trừ ADMIN xem ALL) của user
      const { tenantId, branchId } = getTenantContext(req);
      if (calls[idx].tenantId !== tenantId || (branchId !== 'ALL' && calls[idx].branchId !== branchId)) {
        return ApiResponse.error(res, 'CALL_NOT_FOUND', 'Không tìm thấy yêu cầu gọi bàn', 404);
      }

      calls[idx].status = status;
      calls[idx].updatedAt = new Date().toISOString();
      if (status === 'COMPLETED') {
        calls[idx].resolvedAt = new Date().toISOString();
      }

      writeCalls(calls);

      // Bắn socket cập nhật realtime
      try {
        const io = getIO();
        if (calls[idx].tenantId && calls[idx].tenantId !== 'default-tenant') {
          io.to(`tenant:${calls[idx].tenantId}`).to(`branch:${calls[idx].branchId}`).emit('call_staff:updated', calls[idx]);
        } else {
          io.emit('call_staff:updated', calls[idx]);
        }
      } catch {}

      return ApiResponse.success(res, calls[idx], 'Cập nhật trạng thái yêu cầu thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_CALL_ERROR', err?.message, 500);
    }
  }

  /**
   * POST /api/customer-requests/reviews (Public QR Menu)
   * Khách hàng gửi đánh giá và nhận xét
   */
  static async createReview(req: Request, res: Response) {
    try {
      const { tableId, tableName, rating, comment, customerName, customerPhone, tenantId: bodyTenant, branchId: bodyBranch } = req.body;

      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return ApiResponse.error(res, 'INVALID_RATING', 'Điểm đánh giá phải từ 1 đến 5 sao', 400);
      }

      const scope = await resolveTableScope(tableId || 'default-table', {
        tenantId: bodyTenant && bodyTenant !== 'default-tenant' ? bodyTenant : undefined,
        branchId: bodyBranch && bodyBranch !== 'default-branch' ? bodyBranch : undefined,
      });
      const tenantId = scope?.tenantId || 'default-tenant';
      const branchId = scope?.branchId || 'default-branch';
      const finalTableName = tableName || scope?.tableName || `Bàn ${tableId}`;

      const newReview: ReviewItem = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tenantId,
        branchId,
        tableId: tableId || 'default-table',
        tableName: finalTableName,
        customerName: customerName?.trim() || 'Khách vãng lai',
        customerPhone: customerPhone?.trim() || undefined,
        rating: numRating,
        comment: comment?.trim() || '',
        createdAt: new Date().toISOString(),
      };

      const reviews = readReviews();
      reviews.unshift(newReview);
      writeReviews(reviews);

      // Bắn socket thông báo review mới
      try {
        const io = getIO();
        if (tenantId && tenantId !== 'default-tenant') {
          io.to(`tenant:${tenantId}`).to(`branch:${branchId}`).emit('review:new', newReview);
        } else {
          io.emit('review:new', newReview);
        }
      } catch {}

      return ApiResponse.success(res, newReview, 'Cảm ơn bạn đã gửi đánh giá!', 201);
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_REVIEW_ERROR', err?.message, 500);
    }
  }

  /**
   * GET /api/customer-requests/reviews (Staff Web Admin)
   * Lấy danh sách đánh giá kèm KPI tóm tắt
   */
  static async getReviews(req: Request, res: Response) {
    try {
      const { rating } = req.query;
      const { tenantId, branchId } = getTenantContext(req);
      let reviews = readReviews();

      // Chặn leak cross-tenant (kèm PII customerPhone)
      reviews = reviews.filter((r) => r.tenantId === tenantId);
      if (branchId && branchId !== 'ALL') {
        reviews = reviews.filter((r) => r.branchId === branchId);
      }

      // Hiển thị toàn bộ đánh giá từ trước đến giờ: KHÔNG lọc theo ngày,
      // chỉ sắp xếp mới nhất lên đầu để dễ theo dõi.
      reviews = [...reviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const totalReviews = reviews.length;
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sumRating = 0;

      reviews.forEach((r) => {
        const stars = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
        ratingCounts[stars] = (ratingCounts[stars] || 0) + 1;
        sumRating += r.rating;
      });

      const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 5.0;
      const happyCount = (ratingCounts[4] || 0) + (ratingCounts[5] || 0);
      const satisfactionRate = totalReviews > 0 ? Math.round((happyCount / totalReviews) * 100) : 100;

      if (rating && rating !== 'ALL') {
        const filterStars = Number(rating);
        reviews = reviews.filter((r) => r.rating === filterStars);
      }

      return ApiResponse.success(
        res,
        {
          summary: {
            averageRating,
            totalReviews,
            satisfactionRate,
            ratingCounts,
          },
          reviews,
        },
        'Lấy danh sách đánh giá thành công'
      );
    } catch (err: any) {
      return ApiResponse.error(res, 'GET_REVIEWS_ERROR', err?.message, 500);
    }
  }

  /**
   * POST /api/customer-requests/feedback
   * Gửi ý kiến đóng góp từ ứng dụng mobile hoặc web
   */
  static async createFeedback(req: Request, res: Response) {
    try {
      const { category, title, content, userName, userEmail, branchId } = req.body;

      if (!content || !content.trim()) {
        return ApiResponse.error(res, 'VALIDATION_ERROR', 'Nội dung ý kiến đóng góp không được để trống', 400);
      }

      const newFeedback: FeedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: category || 'Góp ý tính năng',
        title: title ? String(title).trim() : undefined,
        content: String(content).trim(),
        userName: userName || (req.user as any)?.name || 'Người dùng',
        userEmail: userEmail || (req.user as any)?.email,
        branchId: branchId || (req.user as any)?.branchId,
        createdAt: new Date().toISOString(),
      };

      const feedbacks = readFeedbacks();
      feedbacks.unshift(newFeedback);
      writeFeedbacks(feedbacks);

      return ApiResponse.success(res, newFeedback, 'Gửi ý kiến đóng góp thành công', 201);
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_FEEDBACK_ERROR', err?.message || 'Lỗi gửi ý kiến đóng góp', 500);
    }
  }

  /**
   * GET /api/customer-requests/feedback
   * Lấy danh sách ý kiến đóng góp
   */
  static async getFeedbacks(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const { branchId } = getTenantContext(req);
      let feedbacks = readFeedbacks();
      // Feedback lưu theo branchId: staff chỉ thấy góp ý thuộc phạm vi mình
      if (branchId && branchId !== 'ALL') {
        feedbacks = feedbacks.filter((f) => !f.branchId || f.branchId === branchId);
      }
      if (category && category !== 'ALL') {
        feedbacks = feedbacks.filter((f) => f.category === category);
      }
      return ApiResponse.success(res, feedbacks, 'Lấy danh sách ý kiến đóng góp thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'GET_FEEDBACKS_ERROR', err?.message, 500);
    }
  }
}
