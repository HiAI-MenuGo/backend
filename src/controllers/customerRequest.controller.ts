import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { resolveTableScope } from '../utils/tableScope';
import { getIO } from '../socket';
import fs from 'fs';
import path from 'path';

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

// Lưu trữ dữ liệu bền vững qua file JSON tại backend/data
const DATA_DIR = path.join(process.cwd(), 'data');
const CALLS_FILE = path.join(DATA_DIR, 'customer_service_calls.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'customer_reviews.json');

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
    console.warn('Error reading calls file:', err);
  }
  fs.writeFileSync(CALLS_FILE, JSON.stringify(INITIAL_CALLS, null, 2), 'utf-8');
  return INITIAL_CALLS;
}

function writeCalls(calls: ServiceCallItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(CALLS_FILE, JSON.stringify(calls, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing calls file:', err);
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
    console.warn('Error reading reviews file:', err);
  }
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(INITIAL_REVIEWS, null, 2), 'utf-8');
  return INITIAL_REVIEWS;
}

function writeReviews(reviews: ReviewItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing reviews file:', err);
  }
}

export class CustomerRequestController {
  /**
   * POST /api/customer-requests/call (Public QR Menu)
   * Khách bấm Gọi thanh toán hoặc Gọi nhân viên
   */
  static async createServiceCall(req: Request, res: Response) {
    try {
      const { tableId, tableName, type, reason, paymentMethod } = req.body;

      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu thông tin bàn gọi', 400);
      }

      const scope = await resolveTableScope(tableId);
      const tenantId = scope?.tenantId || 'default-tenant';
      const branchId = scope?.branchId || 'default-branch';
      const finalTableName = tableName || scope?.tableName || `Bàn ${tableId}`;

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
            : 'Gặp nhân viên'),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const calls = readCalls();
      calls.unshift(newCall);
      writeCalls(calls);

      // Phát realtime qua Socket.IO tới màn hình web của thu ngân / phục vụ
      try {
        const io = getIO();
        io.to(`tenant:${tenantId}`).emit('call_staff:request', newCall);
        io.to(`branch:${branchId}`).emit('call_staff:request', newCall);
        io.emit('call_staff:request', newCall); // Fallback toàn hệ thống
      } catch (sockErr) {
        console.warn('[CustomerRequest] Socket emit failed:', sockErr);
      }

      return ApiResponse.success(res, newCall, 'Gửi yêu cầu tới nhân viên thành công', 201);
    } catch (err: any) {
      console.error('[CustomerRequest] createServiceCall error:', err);
      return ApiResponse.error(res, 'CREATE_CALL_ERROR', err?.message || 'Lỗi gửi yêu cầu', 500);
    }
  }

  /**
   * GET /api/customer-requests/calls (Staff Web Admin)
   * Lấy danh sách các yêu cầu gọi bàn
   */
  static async getServiceCalls(req: Request, res: Response) {
    try {
      const { status, type, branchId } = req.query;
      let calls = readCalls();

      if (branchId && branchId !== 'ALL') {
        calls = calls.filter((c) => c.branchId === branchId);
      }
      if (status && status !== 'ALL') {
        calls = calls.filter((c) => c.status === status);
      }
      if (type && type !== 'ALL') {
        calls = calls.filter((c) => c.type === type);
      }

      const pendingCount = calls.filter((c) => c.status === 'PENDING').length;
      const processingCount = calls.filter((c) => c.status === 'PROCESSING').length;

      return ApiResponse.success(
        res,
        {
          calls,
          summary: {
            total: calls.length,
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

      calls[idx].status = status;
      calls[idx].updatedAt = new Date().toISOString();
      if (status === 'COMPLETED') {
        calls[idx].resolvedAt = new Date().toISOString();
      }

      writeCalls(calls);

      // Bắn socket cập nhật realtime
      try {
        const io = getIO();
        io.to(`tenant:${calls[idx].tenantId}`).emit('call_staff:updated', calls[idx]);
        io.to(`branch:${calls[idx].branchId}`).emit('call_staff:updated', calls[idx]);
        io.emit('call_staff:updated', calls[idx]);
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
      const { tableId, tableName, rating, comment, customerName, customerPhone } = req.body;

      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return ApiResponse.error(res, 'INVALID_RATING', 'Điểm đánh giá phải từ 1 đến 5 sao', 400);
      }

      const scope = await resolveTableScope(tableId || 'default-table');
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
        io.to(`tenant:${tenantId}`).emit('review:new', newReview);
        io.to(`branch:${branchId}`).emit('review:new', newReview);
        io.emit('review:new', newReview);
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
      const { rating, branchId } = req.query;
      let reviews = readReviews();

      if (branchId && branchId !== 'ALL') {
        reviews = reviews.filter((r) => r.branchId === branchId);
      }

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
}
