# HiAI-MenuGo Backend — Master Code Patterns & Skills (SKILLS)

> **Góc nhìn Backend:** Tài liệu này chứa toàn bộ các **design pattern, code snippets chuẩn và kỹ thuật cốt lõi** trong backend Express 5 + Prisma 6 + TypeScript của HiAI-MenuGo.
>
> - 🧭 Index & Kiến trúc: [AGENTS.md](./AGENTS.md)
> - 📖 Nghiệp vụ: [BUSINESS.md](./BUSINESS.md)
> - ⛔ Luật bắt buộc: [RULES.md](./RULES.md)
> - 🔧 Tech Stack: [TECHS.md](./TECHS.md)

---

## 1. Controller & Service Architecture Pattern

Quy chuẩn phân tầng: Controller nhận request, parse Zod, lấy Context → gọi Service → trả về qua `ApiResponse`. Không viết logic nghiệp vụ hay câu truy vấn Prisma trong Controller.

### Mẫu Controller Chuẩn (`src/controllers/order.controller.ts`):
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiResponse } from '../utils/response';
import { getTenantContext } from '../utils/tenant';
import * as orderService from '../services/order.service';
import logger from '../utils/logger';

// 1. Zod Schema khai báo ngay đầu file
const UpdateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PREPARING', 'DONE', 'CANCELLED']),
  note: z.string().optional(),
});

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = UpdateOrderStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ';
    ApiResponse.error(res, 'VALIDATION_ERROR', errorMsg, 400);
    return;
  }

  try {
    const ctx = getTenantContext(req); // { tenantId, branchId, userId, role }
    const updated = await orderService.updateStatus(id, parsed.data.status, ctx);
    ApiResponse.success(res, updated, 'Cập nhật trạng thái đơn thành công');
  } catch (error: any) {
    logger.error(`[OrderController] updateOrderStatus error: ${error.message}`, { id, error });
    if (error.code === 'P2025' || error.message.includes('not found')) {
      ApiResponse.error(res, 'NOT_FOUND', 'Không tìm thấy đơn hàng', 404);
      return;
    }
    ApiResponse.error(res, 'INTERNAL_ERROR', error.message || 'Lỗi xử lý đơn hàng', 500);
  }
}
```

### Mẫu Service Chuẩn (`src/services/order.service.ts`):
```typescript
import { prisma } from '../utils/prisma';
import { TenantContext } from '../types/tenant';
import { emitToBranch } from '../socket';
import { SOCKET_EVENTS } from '../socket/events';

export async function updateStatus(
  orderId: string,
  status: any,
  ctx: TenantContext
) {
  // BẮT BUỘC filter theo tenantId từ context
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId: ctx.tenantId,
      ...(ctx.branchId && ctx.branchId !== 'ALL' ? { branchId: ctx.branchId } : {}),
    },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền quản lý');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status, updatedAt: new Date() },
    include: { items: true },
  });

  // Phát Socket Realtime tới chi nhánh
  emitToBranch(updatedOrder.branchId, SOCKET_EVENTS.ORDER_UPDATED, {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
    tableId: updatedOrder.sessionId,
  });

  return updatedOrder;
}
```

---

## 2. Prisma 6 Multi-Tenant & Transaction Patterns

### Tenant Isolation Bắt Buộc:
```typescript
// ✅ ĐÚNG: Luôn kèm tenantId trong điều kiện where
const items = await prisma.menuItem.findMany({
  where: {
    tenantId: ctx.tenantId,
    ...(branchId ? { branchId } : {}),
    isSoldOut: false,
  },
  orderBy: { createdAt: 'desc' },
});

// ❌ SAI NGHIÊM TRỌNG: Quên tenantId gây rò rỉ dữ liệu giữa các nhà hàng!
const items = await prisma.menuItem.findMany({ where: { branchId } });
```

### Transaction & Khấu Trừ Kho Nguyên Liệu (BOM):
```typescript
export async function completeOrderWithInventoryDeduction(orderId: string, ctx: TenantContext) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lấy order kèm danh sách món
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId: ctx.tenantId },
      include: {
        items: {
          include: {
            menuItem: {
              include: { recipe: true }, // BOM ingredients
            },
          },
        },
      },
    });

    if (!order) throw new Error('Order not found');

    // 2. Khấu trừ từng nguyên liệu
    for (const item of order.items) {
      for (const ingredientRecipe of item.menuItem.recipe) {
        const deductAmount = ingredientRecipe.quantity * item.quantity;
        await tx.ingredient.update({
          where: { id: ingredientRecipe.ingredientId },
          data: {
            quantity: { decrement: deductAmount },
          },
        });

        // Ghi log biến động kho
        await tx.inventoryLog.create({
          data: {
            tenantId: ctx.tenantId,
            branchId: order.branchId,
            ingredientId: ingredientRecipe.ingredientId,
            delta: -deductAmount,
            reason: 'SALE',
          },
        });
      }
    }

    // 3. Cập nhật trạng thái đơn
    return await tx.order.update({
      where: { id: orderId },
      data: { status: 'DONE' },
    });
  });
}
```

---

## 3. ApiResponse Helper Pattern (`src/utils/response.ts`)

Toàn bộ endpoint trả về cấu trúc thống nhất:
```typescript
// Thành công:
ApiResponse.success(res, data, 'Thông điệp tùy chọn', 200);
// Trả về: { success: true, data: T, message: string }

// Thất bại:
ApiResponse.error(res, 'ERROR_CODE', 'Mô tả chi tiết lỗi', 400);
// Trả về: { success: false, errorCode: string, message: string }
```

---

## 4. Socket.IO Realtime Emitter Pattern (`src/socket/index.ts`)

Backend hỗ trợ phát event tới 3 phạm vi phòng:
```typescript
import { getIO } from './index';
import { SOCKET_EVENTS } from './events';

// 1. Toàn bộ tenant (các thông báo quản trị cấp cao)
export function emitToTenant(tenantId: string, event: string, payload: any) {
  getIO().to(`tenant:${tenantId}`).emit(event, payload);
}

// 2. Một chi nhánh (đơn mới, đổi trạng thái bàn, thanh toán, hết món)
export function emitToBranch(branchId: string, event: string, payload: any) {
  getIO().to(`branch:${branchId}`).emit(event, payload);
}

// 3. Một bàn ăn cụ thể (phiên ăn, gọi nhân viên)
export function emitToTable(tableId: string, event: string, payload: any) {
  getIO().to(`table:${tableId}`).emit(event, payload);
}
```

### Các sự kiện chuẩn (`src/socket/events.ts`):
- `order:new`: Đơn mới tạo từ khách hoặc phục vụ
- `order:updated`: Cập nhật trạng thái đơn (CONFIRMED, DONE, CANCELLED)
- `order:item:status`: Cập nhật trạng thái từng món
- `payment:completed`: Thu ngân hoặc Pay2S webhook xác nhận thanh toán
- `table:status-changed`: Bàn đổi trạng thái (EMPTY, OCCUPIED, CLEANING)
- `sold_out:updated`: Báo hết / mở lại món ăn
- `call_staff:request`: Khách tại bàn bấm nút gọi phục vụ / yêu cầu thanh toán

---

## 5. Auth Middleware & Tenant Context Helper

```typescript
// Trong route middleware:
router.use(authMiddleware);
router.use(enforceTenantIsolation);
router.use(requireRole(['ADMIN', 'MANAGER', 'CASHIER']));

// Helper lấy ngữ cảnh người dùng type-safe trong Controller / Service:
export function getTenantContext(req: Request): TenantContext {
  const user = req.user;
  if (!user || !user.tenantId) {
    throw new Error('Unauthorized: Thiếu thông tin định danh tenant');
  }

  // Header x-branch-id ghi đè nếu admin muốn lọc theo chi nhánh cụ thể
  const headerBranchId = req.headers['x-branch-id'] as string;
  const branchId = user.role === 'ADMIN' && headerBranchId ? headerBranchId : user.branchId;

  return {
    tenantId: user.tenantId,
    branchId: branchId || 'ALL',
    userId: user.id,
    role: user.role,
  };
}
```

---

## 6. Upload Ảnh Cloudinary & Multer

```typescript
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận tệp hình ảnh'));
  },
});

export async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `hiai-menugo/${folder}` },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
}
```

---

## 7. Pay2S Webhook Signature & Xác Nhận Thanh Toán

```typescript
export async function handlePay2sWebhook(req: Request, res: Response) {
  const webhookSecret = process.env.PAY2S_WEBHOOK_SECRET;
  const authHeader = req.headers['authorization'];

  // Xác thực token Pay2S
  if (webhookSecret && authHeader !== `Apikey ${webhookSecret}`) {
    ApiResponse.error(res, 'UNAUTHORIZED', 'Sai mã bảo mật webhook', 401);
    return;
  }

  const { content, transferAmount } = req.body;
  // Parse mã session từ nội dung chuyển khoản (VD: "BILL 102")
  const match = content.match(/BILL\s*([a-zA-Z0-9_-]+)/i);
  if (!match) {
    ApiResponse.success(res, null, 'Giao dịch không khớp cú pháp hóa đơn quán');
    return;
  }

  const sessionId = match[1];
  await cashierService.completePayment(sessionId, 'VIETQR', transferAmount);
  ApiResponse.success(res, { received: true }, 'Đối soát thanh toán thành công');
}
```

---

## 8. Winston Structured Logging

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Sử dụng trong code:
logger.info('Tạo đơn hàng thành công', { orderId: order.id, tenantId: ctx.tenantId });
logger.error('Lỗi kết nối cơ sở dữ liệu', { error: err.message, stack: err.stack });
```
