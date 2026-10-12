# HiAI-MenuGo Backend — Agent Entry Point

> **Repo này là `backend/`** — Express 5 + TypeScript + Prisma + Socket.IO.  
> Đây là file điều phối cho AI Agent làm việc trong repo backend. Đọc file này trước, sau đó đến file chuyên trách.

---

## 1. Bản Đồ Files (đọc theo thứ tự)

| # | File | Nội dung chính | Khi nào đọc |
|---|---|---|---|
| 1 | `AGENTS.md` (file này) | Index repo · cấu trúc thư mục · workflow backend | Luôn đọc đầu tiên |
| 2 | [BUSINESS.md](./BUSINESS.md) | Nghiệp vụ F&B: lifecycle QR → Đặt món & Quản lý đơn live → POS → Thanh toán, Multi-tenant, RBAC, Menu/Modifiers, BOM, Loyalty, Z-Report | Trước khi thiết kế API hay business logic mới |
| 3 | [TECHS.md](./TECHS.md) | Stack: Express 5, Prisma 6, Socket.IO 4.8, JWT thuần, Cloudinary, Pay2S, ports | Trước khi chọn thư viện, tạo service, viết schema |
| 4 | [RULES.md](./RULES.md) | Luật bắt buộc: tenant isolation, ApiResponse/Zod, Prisma workflow, git policy, checklist | Trước khi viết/sửa bất kỳ code nào |
| 5 | [SKILLS.md](./SKILLS.md) | Patterns & snippets: ApiResponse, authMiddleware, Zod schema mẫu, Socket emit pattern | Khi cần tham chiếu code pattern chuẩn |
| 6 | [SYSTEM.md](./SYSTEM.md) | System design: multi-tenant isolation, payment flow, webhook Pay2S, Z-Report | Khi làm tính năng phức tạp liên quan hệ thống |

---

## 2. Thông Tin Repo Này

- **Repo:** `backend.git` — dùng chung bởi cả Mobile (A, B) và Web (C)
- **Runtime:** Node.js · Express 5 · TypeScript 5.8
- **Port:** `5000` (fallback `5001`) — **không tự đổi**
- **Nhánh hiện tại:** `dev` → PR vào `dev`, merge `main` khi release
- **Database:** PostgreSQL qua Supabase · ORM: Prisma 6 · Schema: `prisma/schema.prisma`
- **Auth:** JWT thuần (`jsonwebtoken`) — **cấm tuyệt đối** Supabase Auth / NextAuth / Clerk

---

## 3. Cấu Trúc Thư Mục Backend

```
backend/
├── src/
│   ├── app.ts                    # Entry: Express setup + Socket.IO + middlewares + rate-limit
│   ├── routes/
│   │   ├── index.ts              # Gộp tất cả route với prefix /api
│   │   ├── auth.routes.ts
│   │   ├── menu.routes.ts
│   │   ├── order.routes.ts
│   │   ├── session.routes.ts     # Phiên bàn QR (table session)
│   │   ├── cashier.routes.ts     # POS thanh toán
│   │   ├── table.routes.ts       # Sơ đồ bàn + QR code
│   │   ├── analytics.routes.ts   # Dashboard & doanh thu
│   │   ├── zreport.routes.ts     # Báo cáo kết ca
│   │   ├── ingredient.routes.ts  # Kho nguyên liệu (BOM)
│   │   ├── voucher.routes.ts     # Mã giảm giá
│   │   ├── loyalty.routes.ts     # Tích điểm & hạng thành viên
│   │   ├── branding.routes.ts    # Nhận diện thương hiệu
│   │   ├── branch.routes.ts      # Chi nhánh
│   │   ├── upload.routes.ts      # Upload ảnh (Multer + Cloudinary)
│   │   ├── webhook.routes.ts     # Pay2S payment webhook
│   │   ├── user.routes.ts        # Nhân viên & RBAC
│   │   ├── category.routes.ts    # Danh mục món ăn
│   │   ├── platform.routes.ts    # Platform admin (SaaS)
│   │   ├── reservation.routes.ts # Đặt bàn trước
│   │   ├── customer.routes.ts    # Khách hàng thân thiết
│   │   ├── customerRequest.routes.ts # Yêu cầu từ bàn
│   │   ├── apikey.routes.ts      # API key management
│   │   └── health.routes.ts      # GET /api/health
│   ├── controllers/              # Xử lý request/response (23 files, 1-1 với routes)
│   ├── services/                 # Business logic thuần (không res/req)
│   │   ├── order.service.ts      # Logic đơn hàng + kho BOM
│   │   ├── analytics.service.ts  # Tính toán doanh thu, thống kê
│   │   ├── auth.service.ts       # JWT ký/verify, refresh, revoke
│   │   ├── session-order.service.ts # Phiên bàn QR
│   │   ├── zreport.service.ts    # Kết ca Z-Report
│   │   ├── voucher-quote.service.ts # Tính giảm giá voucher
│   │   ├── inventory.service.ts  # Kho & BOM
│   │   └── payment/              # Payment Factory Pattern (tiền mặt, VietQR)
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # Giải mã JWT → req.user
│   │   └── requireRole.ts        # RBAC kiểm tra role
│   ├── socket/
│   │   ├── index.ts              # Khởi tạo Socket.IO server + room logic
│   │   └── events.ts             # Danh sách event name chuẩn (export const)
│   └── utils/
│       ├── response.ts           # ApiResponse.success() / ApiResponse.error()
│       └── logger.ts             # Winston JSON structured logger
├── prisma/
│   ├── schema.prisma             # ~40 models (Tenant, Branch, Order, Menu, Inventory...)
│   ├── seed.ts                   # Dữ liệu mẫu dev
│   └── migrations/               # Lịch sử migration
├── .env / .env.example
├── package.json
└── tsconfig.json
```

---

## 4. Kiến Trúc API Chuẩn

```
Request → authMiddleware → requireRole → Controller → Service → Prisma → DB
                                                    ↓
                                             Socket.IO emit (nếu có realtime)
                                                    ↓
                                            ApiResponse.success(res, data)
```

**Mọi controller phải tuân thủ:**
1. Validate body bằng **Zod schema** (ném lỗi 400 nếu fail)
2. Filter query Prisma bằng **`tenantId`** từ `req.user.tenantId`
3. Trả response qua **`ApiResponse.success()`** hoặc **`ApiResponse.error()`**
4. Emit Socket.IO event nếu hành động ảnh hưởng realtime (đơn mới, thanh toán, sold-out...)

---

## 5. Prisma Workflow (bắt buộc)

```bash
# Khi sửa schema.prisma:
npx prisma format       # 1. Format schema
npx prisma generate     # 2. Regenerate client
# Sau đó mới test/build

# Migration dev:
npm run db:migrate      # Tạo migration mới + apply

# Migration production:
npm run db:deploy       # Chỉ apply migration đã có
```

> ⛔ **Cấm dùng raw SQL** trừ trong file migration. Mọi truy vấn phải qua Prisma ORM.

---

## 6. Socket.IO Events Chuẩn

Import từ `src/socket/events.ts`. **Không tự tạo event name mới** — thêm vào file events.ts trước.

| Event | Trigger khi nào |
|---|---|
| `order:new` | Khách đặt món qua QR hoặc POS tạo đơn |
| `order:updated` | Trạng thái đơn thay đổi (PENDING→PREPARING→DONE) |
| `order:item:status` | Trạng thái từng món item thay đổi |
| `order:voided` | Đơn bị hủy |
| `session:updated` | Phiên bàn có thay đổi (gọi thêm món...) |
| `session:closed` | Phiên bàn đóng sau thanh toán |
| `table:status-changed` | Bàn đổi trạng thái (empty→occupied→reserved) |
| `sold_out:updated` | Bật/tắt hết món |
| `payment:pending` | QR đang chờ thanh toán |
| `payment:completed` | Webhook Pay2S xác nhận thanh toán |
| `inventory:updated` | Kho nguyên liệu thay đổi |

---

## 7. Workflow Bắt Buộc Của Agent

1. Đọc file này → xác định task thuộc domain nào → đọc file chuyên trách.
2. **Mọi Prisma query bắt buộc** có `where: { tenantId: req.user.tenantId, ... }`.
3. **Mọi response** phải qua `ApiResponse` — không `res.json()` trực tiếp.
4. **Mọi body request** phải validate bằng Zod trước khi xử lý.
5. Sửa schema → `npx prisma format` → `npx prisma generate` → test.
6. **TUYỆT ĐỐI KHÔNG `git push`** khi chưa có xác nhận của user.
7. Commit theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
