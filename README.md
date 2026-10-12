# ⚙️ HiAI-MenuGo — Backend API

> **Máy chủ API Express 5 + TypeScript** cho hệ thống Quản lý Nhà Hàng HiAI-MenuGo.  
> Cung cấp REST API, Realtime Socket.IO, JWT Auth, Prisma ORM và tích hợp thanh toán Pay2S/VietQR.

---

## 🛠️ Tech Stack

| Tầng | Công nghệ |
|---|---|
| Runtime | **Node.js** + **Express 5** |
| Ngôn ngữ | **TypeScript 5.8** |
| ORM | **Prisma 6** (`prisma/schema.prisma`) |
| Database | **PostgreSQL** (Supabase hosted / local) |
| Realtime | **Socket.IO 4.8** (chạy chung HTTP server) |
| Auth | **JWT thuần** (`jsonwebtoken`) — Access 15p + Refresh 7d HttpOnly |
| Upload | **Multer** + **Cloudinary** |
| Thanh toán | **Pay2S Webhook** (VietQR) |
| Email | **Nodemailer** (SMTP) |
| Export | **PDFKit** + **ExcelJS** |
| Logging | **Winston** (JSON structured) |
| Security | **Helmet** + **express-rate-limit** (2000 req / 15 phút) + **Zod** validation |

---

## 🗂️ Cấu Trúc Dự Án

```
backend/
├── src/
│   ├── app.ts                  # Entry point: Express + Socket.IO + Middlewares
│   ├── controllers/            # Business logic handlers (23 controllers)
│   ├── routes/                 # API route definitions (24 route files)
│   ├── services/               # Domain services (order, auth, analytics, payment...)
│   ├── middlewares/            # authMiddleware, requireRole, upload
│   ├── socket/
│   │   ├── index.ts            # Socket.IO server khởi tạo + room logic
│   │   └── events.ts           # Danh sách event names chuẩn
│   └── utils/
│       ├── response.ts         # ApiResponse helper (chuẩn hóa mọi response)
│       └── logger.ts           # Winston logger
├── prisma/
│   ├── schema.prisma           # ~40 models: Tenant, Branch, Order, Menu, Inventory...
│   ├── seed.ts                 # Dữ liệu mẫu (tenant, branch, menu, staff)
│   └── migrations/             # Lịch sử migration
├── assets/                     # Static files
├── data/                       # Data helpers
├── docs/                       # Tài liệu bổ sung
├── .agents/                    # Ngữ cảnh cho AI Agent
│   ├── AGENTS.md               # Entry point điều phối
│   ├── BUSINESS.md             # Nghiệp vụ F&B
│   ├── TECHS.md                # Tech stack chi tiết
│   ├── RULES.md                # Luật bắt buộc
│   ├── SKILLS.md               # Design System
│   └── SYSTEM.md               # System design
├── .env                        # Biến môi trường (không commit)
├── .env.example                # Template biến môi trường
├── package.json
└── tsconfig.json
```

---

## 🗺️ API Routes Tổng Quan

| Module | Base Path | Mô tả |
|---|---|---|
| Health | `GET /api/health` | Kiểm tra trạng thái server |
| Auth | `/api/auth/*` | Login, Refresh token, Me |
| Users | `/api/users/*` | Quản lý nhân viên (RBAC) |
| Menu | `/api/menu/*` | CRUD món ăn, modifier, danh mục |
| Orders | `/api/orders/*` | Đơn hàng realtime (KDS/POS) |
| Sessions | `/api/sessions/*` | Phiên gọi món tại bàn (QR) |
| Tables | `/api/tables/*` | Sơ đồ bàn, QR code |
| Cashier | `/api/cashier/*` | Thanh toán tiền mặt / VietQR |
| Analytics | `/api/analytics/*` | Dashboard doanh thu, xu hướng |
| Z-Report | `/api/zreport/*` | Báo cáo kết ca (PDF, Excel) |
| Inventory | `/api/ingredients/*` | Quản lý kho nguyên liệu (BOM) |
| Vouchers | `/api/vouchers/*` | Mã giảm giá, promotion |
| Loyalty | `/api/loyalty/*` | Tích điểm, phân hạng thành viên |
| Branding | `/api/branding/*` | Logo, màu sắc thương hiệu |
| Branch | `/api/branches/*` | Quản lý chi nhánh |
| Upload | `/api/upload/*` | Upload ảnh (Cloudinary / local) |
| Webhook | `/api/webhooks/*` | Pay2S payment webhook |
| Platform | `/api/platform/*` | Quản lý platform (SaaS admin) |
| Reservations | `/api/reservations/*` | Đặt bàn trước |
| Customers | `/api/customers/*` | Khách hàng thân thiết |
| API Keys | `/api/apikeys/*` | Quản lý API key |

---

## 🔌 Socket.IO Events

Tất cả client (Web + Mobile) join room `branch:{branchId}` và sử dụng các events:

| Event | Hướng | Mô tả |
|---|---|---|
| `order:new` | Server → Client | Đơn mới từ QR hoặc POS |
| `order:updated` | Server → Client | Trạng thái đơn thay đổi |
| `order:item:status` | Server → Client | Trạng thái từng món thay đổi |
| `order:voided` | Server → Client | Đơn bị hủy |
| `session:updated` | Server → Client | Phiên bàn cập nhật |
| `session:closed` | Server → Client | Phiên bàn đóng (đã thanh toán) |
| `table:status-changed` | Server → Client | Trạng thái bàn thay đổi |
| `sold_out:updated` | Server → Client | Cập nhật món hết hàng |
| `payment:pending` | Server → Client | QR đang chờ thanh toán |
| `payment:completed` | Server → Client | Thanh toán thành công (Pay2S) |
| `inventory:updated` | Server → Client | Kho nguyên liệu cập nhật |

---

## 🚀 Khởi Chạy Nhanh

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo file môi trường

```bash
cp .env.example .env
# Chỉnh sửa .env với các giá trị thực
```

Các biến môi trường quan trọng:

| Biến | Ví dụ | Mô tả |
|---|---|---|
| `PORT` | `5000` | Cổng server (fallback `5001`) |
| `DATABASE_URL` | `postgresql://...` | Connection string Supabase/PostgreSQL |
| `JWT_SECRET` | `your_secret` | Secret key ký JWT |
| `CLOUDINARY_CLOUD_NAME` | `...` | Cloudinary upload ảnh |
| `PAY2S_WEBHOOK_SECRET` | `...` | Xác thực webhook Pay2S |
| `SMTP_HOST` / `SMTP_USER` | `smtp.gmail.com` | Gửi email |
| `FRONTEND_URL` | `http://localhost:3000` | CORS whitelist |

### 3. Khởi tạo Database

```bash
# Generate Prisma client
npm run db:generate

# Chạy migration (môi trường dev)
npm run db:migrate

# Seed dữ liệu mẫu
npm run db:seed
```

### 4. Chạy Development Server

```bash
npm run dev
```

Server chạy tại: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

### 5. Build & Production

```bash
npm run build
npm start
```

---

## 🔐 Auth Flow

1. `POST /api/auth/login` → trả về `accessToken` (15 phút) + set `refreshToken` HttpOnly cookie (7 ngày)
2. Mọi request cần auth: thêm header `Authorization: Bearer <accessToken>`
3. Khi access token hết hạn: `POST /api/auth/refresh` → nhận access token mới
4. Logout: `POST /api/auth/logout` → revoke refresh token + xóa cookie

---

## 📋 RBAC Roles

| Role | Phạm vi | Quyền |
|---|---|---|
| `PLATFORM_ADMIN` | Toàn hệ thống | Quản lý tenant, gói cước |
| `ADMIN` | Toàn bộ chi nhánh trong tenant | Cấu hình menu, nhân sự, báo cáo |
| `MANAGER` | Chi nhánh được phân công | Kho, nhân viên, Z-Report |
| `KITCHEN` | KDS chi nhánh | Xem và cập nhật trạng thái món |
| `CASHIER` | POS chi nhánh | Tạo đơn, thanh toán, voucher |

---

## 🛡️ Quy Tắc Quan Trọng

1. **Tenant Isolation:** Mọi Prisma query phải filter `tenantId`. Không bao giờ truy xuất dữ liệu cross-tenant.
2. **ApiResponse:** Mọi response đều qua `ApiResponse.success()` hoặc `ApiResponse.error()`.
3. **Zod Validation:** Mọi request body đều phải validate bằng Zod schema.
4. **No raw SQL:** Chỉ dùng Prisma ORM (trừ migration).
5. **Schema change workflow:** Sửa `schema.prisma` → `npx prisma format` → `npx prisma generate` → test/build.

---

## 📦 Scripts

```bash
npm run dev          # Chạy dev server với hot reload (tsx watch)
npm run build        # Build TypeScript → dist/
npm start            # Chạy production build
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Tạo và chạy migration mới
npm run db:deploy    # Chạy migration trong production
npm run db:seed      # Seed dữ liệu mẫu (tenant Tasty Station + staff + menu)
```

---

## 🛠️ Development Workflow

### Schema Changes
```bash
# 1. Sửa prisma/schema.prisma
# 2. Format & generate
npx prisma format
npx prisma generate

# 3. Tạo migration
npm run db:migrate
# hoặc: npx prisma migrate dev --name <tên_migration>

# 4. Test build
npm run build
```

### Seed Data (Development)
```bash
npm run db:seed
```
Tạo tenant `TASTY_STATION` (code: `TASTY_STATION`), branch `TS-01`, 3 staff accounts:
- `sa@email.com` / `123456` — Platform Admin
- `thd@gmail.com` / `123456` — Admin (branch TS-01)
- `pvd@gmail.com` / `123456` — Cashier (branch TS-01)

---

## 🔧 Common Issues & Fixes

| Issue | Nguyên nhân | Fix |
|-------|-------------|-----|
| `P1001: Can't reach database` | `DATABASE_URL` sai hoặc Supabase paused | Check `.env`, Supabase dashboard → Database → Connection pooling |
| `P2003: Foreign key constraint` | Xóa branch/user có data liên quan | Dùng `deleteBranch` controller (có transaction cleanup) |
| Socket.IO không connect | `FRONTEND_URL` CORS mismatch | Thêm frontend URL vào CORS trong `app.ts` |
| JWT `TOKEN_EXPIRED` | Access token 15p hết hạn | Client tự gọi `/api/auth/refresh` (HttpOnly cookie) |
| Migration failed | Schema drift với DB | `npx prisma migrate reset` (dev only) hoặc `db:deploy` (prod) |

---

## 🧪 Testing API

```bash
# Health check
curl http://localhost:5000/api/health

# Login (trả accessToken + set refreshToken cookie)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thd@gmail.com","password":"123456"}'

# Authenticated request (dùng accessToken từ login)
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:5000/api/branches
```
