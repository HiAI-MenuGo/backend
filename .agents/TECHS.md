# HiAI-MenuGo Backend — Tech Stack & Dependencies (TECHS)

> **Góc nhìn Backend:** Tài liệu công nghệ chi tiết, phiên bản thư viện, biến môi trường, cơ sở dữ liệu và kịch bản vận hành dành riêng cho repo `backend/`.
>
> - 🧭 Index & Cấu trúc repo: [AGENTS.md](./AGENTS.md)
> - 📖 Nghiệp vụ: [BUSINESS.md](./BUSINESS.md)
> - ⛔ Luật bắt buộc: [RULES.md](./RULES.md)
> - 🎨 Mastery Skills: [SKILLS.md](./SKILLS.md)

---

## 1. Core Stack & Runtime

| Thành phần | Công nghệ / Phiên bản | Vai trò & Mục đích |
|---|---|---|
| **Runtime** | Node.js 20+ LTS | Môi trường thực thi server |
| **Framework** | Express 5.0 | Định tuyến HTTP, middleware chain |
| **Ngôn ngữ** | TypeScript 5.8 | Type safety, strict mode |
| **Database** | PostgreSQL 15+ (Supabase) | Cơ sở dữ liệu quan hệ, multi-tenant |
| **ORM** | Prisma 6.4 | Data modeling, migrations, client queries |
| **Realtime** | Socket.IO 4.8 | WebSocket server chạy chung HTTP port |
| **Auth** | JWT thuần (`jsonwebtoken` 9.0) | Ký và xác thực access & refresh tokens |
| **Validation** | Zod 3.24 | Kiểm tra schema request body & params |
| **Logger** | Winston 3.17 | Structured JSON logging |

---

## 2. Port & Môi Trường Mạng

- **Cổng chạy chính:** `PORT=5000` (tự động fallback sang `5001` nếu bị chiếm dụng).
- **CORS:** Chỉ chấp nhận `FRONTEND_URL` (mặc định `http://localhost:3000`) và IP mạng LAN khi test đa thiết bị.
- **WebSocket Upgrade:** Socket.IO lắng nghe trực tiếp trên instance `http.createServer(app)`.

---

## 3. Database & Prisma ORM

- **File Schema:** `prisma/schema.prisma` (~40 models multi-tenant).
- **Client Instance:** Khởi tạo singleton duy nhất tại `src/utils/prisma.ts`.
- **Quy trình Migration:**
  ```bash
  # 1. Chỉnh sửa prisma/schema.prisma
  # 2. Định dạng & cập nhật client
  npx prisma format
  npx prisma generate
  # 3. Tạo migration mới
  npx prisma migrate dev --name <ten_migration>
  # 4. Chạy seed dữ liệu mẫu
  npx prisma db seed
  ```
- **Tài khoản Seed mặc định (`prisma/seed.ts`):**
  - Tenant: `TASTY_STATION`, Chi nhánh: `TS-01`
  - Admin: `admin@tastystation.vn` / Mật khẩu: `123456`
  - Cashier: `cashier@tastystation.vn` / Mật khẩu: `123456`

---

## 4. Thư Viện Tích Hợp (Third-Party Integrations)

- **Cloudinary (`cloudinary` 2.5):** Lưu trữ hình ảnh thực đơn, logo thương hiệu, banner quán.
- **Multer (`multer` 1.4):** Middleware nhận file upload dạng memory buffer.
- **Pay2S:** Tích hợp thanh toán chuyển khoản ngân hàng qua Webhook đối soát tự động.
- **VietQR:** Sinh mã thanh toán QR động chuẩn NAPAS 247.
- **Báo cáo & Xuất file:**
  - `pdfkit`: Sinh phiếu tạm tính và xuất báo cáo Z-Report dạng PDF.
  - `exceljs`: Xuất dữ liệu thống kê doanh thu và kiểm kê kho dạng Excel (.xlsx).
- **Security:**
  - `helmet`: Thiết lập các header bảo mật HTTP.
  - `express-rate-limit`: Giới hạn 2000 request / 15 phút tránh spam tấn công.
  - `bcryptjs`: Băm mật khẩu người dùng với salt round 10.

---

## 5. Danh Sách Biến Môi Trường (`.env`)

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# JWT Authentication
JWT_SECRET=super-secret-jwt-key-hiai-menugo-2026
JWT_REFRESH_SECRET=super-secret-refresh-key-hiai-menugo-2026

# Cloudinary
CLOUDINARY_CLOUD_NAME=hiai-cloud
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pay2S Webhook
PAY2S_WEBHOOK_SECRET=your_pay2s_webhook_secret

# SMTP Email (tùy chọn)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 6. Scripts Vận Hành

```bash
npm run dev          # Chạy server development với tsx / nodemon (hot-reload)
npm run build        # Biên dịch TypeScript sang JavaScript (dist/)
npm start            # Chạy production bundle từ dist/index.js
npm run lint         # Kiểm tra cú pháp mã nguồn
npx prisma studio    # Giao diện trực quan xem dữ liệu DB
```
