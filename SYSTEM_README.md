# 🍽️ HiAI-MenuGo — Hệ Thống Quản Lý Nhà Hàng F&B Real-time

<div align="center">

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Expo 57](https://img.shields.io/badge/Expo-57-000020?logo=expo)
![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)
![Express 5](https://img.shields.io/badge/Express-5-green?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma%206-blue?logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white?logo=socketdotio)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

**Nền tảng F&B đa khách thuê (Multi-Tenant) — Gọi món QR · POS Web & Mobile · Bếp KDS · Kho định lượng BOM · Real-time Analytics**

</div>

---

## 📌 Tổng Quan

**HiAI-MenuGo** là giải pháp chuyển đổi số toàn diện cho chuỗi nhà hàng và quán cafe:
- 📱 **QR Menu khách hàng:** Quét mã QR tại bàn gọi món ngay, tùy chỉnh topping/đường/đá, thanh toán VietQR tự động.
- 📲 **Mobile App nhân viên (`mobile/`):** POS cầm tay, cập nhật sơ đồ bàn, theo dõi đơn live, kiểm kho nhanh và thu ngân di động.
- 🖥️ **Web Quản trị & Bếp (`frontend/`):** KDS bếp Kanban realtime, POS thu ngân màn hình lớn, quản lý công thức BOM, xuất Z-Report và báo cáo doanh thu.
- ⚙️ **Backend duy nhất (`backend/`):** REST API Express 5 + Socket.IO, PostgreSQL (Prisma), bảo mật Multi-tenant và JWT thuần.

---

## 🛠️ Tech Stack & Ports

| Nền tảng | Công nghệ chính | Cổng (Port) |
|---|---|:---:|
| **Backend API** | Express 5, TypeScript 5.8, Prisma 6.4, Socket.IO 4.8, JWT thuần | `5000` / `5001` |
| **Web Frontend** | Next.js 16 (App Router), React 19, TailwindCSS 4, Zustand 5 | `3000` |
| **Mobile App** | Expo ~57, React Native 0.86, NativeWind, Zustand 5, Custom Nav | `8081` |
| **Database** | PostgreSQL (Supabase / Local) với ~40 models Prisma multi-tenant | — |

---

## 📁 Cấu Trúc Dự Án & 3 Git Repositories

Dự án được phân tách thành **3 repositories độc lập**, kết nối qua API dùng chung và tuân thủ quy chuẩn nhánh:
- `main`: Nhánh production ổn định.
- `dev`: Nhánh tích hợp chung (mọi Pull Request đều vào đây).
- `feat/...`: Nhánh tính năng cá nhân của từng thành viên.

| Repository | GitHub Remote URL | Thành viên đóng góp |
|---|---|---|
| **Backend API** | `https://github.com/HiAI-MenuGo/backend.git` | **A + B + C** (Code chung, chia đều module API) |
| **Mobile App** | `https://github.com/HiAI-MenuGo/mobile.git` | **A** (iOS & Foundation) + **B** (Android & Operations) |
| **Web Frontend** | `https://github.com/HiAI-MenuGo/frontend.git` | **C** (QR Menu, KDS, POS, Admin, Platform Admin) |

```
HiAI-MenuGo/
├── backend/          # Máy chủ API Express 5 + Prisma ORM + Socket.IO server (A + B + C)
│   ├── prisma/       # schema.prisma (~40 models multi-tenant) & migrations
│   └── src/          # controllers · routes · middlewares · services · socket
├── frontend/         # Web Next.js 16 (App Router) (C phụ trách chính)
│   └── app/          # /table (QR Menu) · /kds (Bếp) · /pos (Thu ngân) · /admin · /platform-admin
├── mobile/           # Ứng dụng Expo 57 / React Native 0.86 cho nhân viên (A + B)
│   └── src/          # screens/operations (Cashier, Orders, Tables, Inventory...)
├── docs/             # Workflow chi tiết 3 thành viên: A_Work_Flow, B_Work_Flow, C_Work_Flow
└── .agents/          # Quy chuẩn kiến trúc dùng chung: AGENTS, BUSINESS, TECHS, RULES, SKILLS
```

---

## 🚀 Cài Đặt & Khởi Chạy

### 1. Chuẩn bị môi trường
Yêu cầu: **Node.js ≥ 18**, **PostgreSQL**, **npm**.

### 2. Backend API (Cổng `5000`)
```bash
cd backend
cp .env.example .env     # Cấu hình DATABASE_URL & JWT_SECRET
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### 3. Web Frontend (Cổng `3000`)
```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

### 4. Mobile App (Metro `8081`)
```bash
cd mobile
npm install
npm start                # Quét mã QR bằng Expo Go hoặc phím 'a' (Android) / 'i' (iOS)
```

---

## 🔒 Phân Quyền Hệ Thống (RBAC)

| Role | Phạm vi dữ liệu | Quyền hạn chính |
|---|---|---|
| `PLATFORM_ADMIN` | Toàn hệ thống SaaS | Quản trị Tenant, gói cước thuê (không xem dữ liệu kinh doanh của quán) |
| `ADMIN` | Toàn bộ chuỗi / Tenant | Thực đơn, nhân sự, tài khoản ngân hàng, kho BOM, báo cáo tổng |
| `MANAGER` | Chi nhánh được phân công | Quản lý ca trực, sơ đồ bàn, kiểm kho, xuất Z-Report kết ca |
| `KITCHEN` | Màn hình Bếp KDS | Nhận đơn live, chuyển trạng thái chế biến (Kanban), bật/tắt báo hết món |
| `CASHIER` | Quầy Thu ngân / POS | Tạo đơn tại quầy, áp dụng voucher/tích điểm, xác nhận tiền mặt / VietQR |

---

## 📖 Tài Liệu Tham Khảo

Chi tiết về quy chuẩn kỹ thuật và phân công công việc:
- [Kiến trúc kỹ thuật & Tech stack](.agents/TECHS.md)
- [Quy chuẩn nghiệp vụ F&B](.agents/BUSINESS.md)
- [Luật bắt buộc & Quy tắc code](.agents/RULES.md)
- [Design System & Tokens](.agents/SKILLS.md)
- [Phân chia nhiệm vụ 3 thành viên](docs/) (`A_Work_Flow.md`, `B_Work_Flow.md`, `C_Work_Flow.md`)

---

## 👥 Đội Ngũ Phát Triển & Phân Chia Công Việc

Backend được dùng chung cho cả Mobile & Web và **chia đều công việc cho cả 3 thành viên**:

| Thành viên | Phụ trách Client | Phụ trách Backend (Routes / Controllers / Services) | Nhánh Git cá nhân |
|---|---|---|---|
| **Trần Hoàng Đạt**<br>*(Thành viên A)* | **Mobile App (iOS & Foundation)**<br>• App Shell, Theme, Shared Types<br>• HomeScreen, RevenueScreen, Settings<br>• OrderScreen, MenuItemForm, ItemOptions | **Core & Menu & Order Placement**<br>• Auth JWT & Middleware (`/api/auth/*`)<br>• Menu & Modifier CRUD (`/api/menu/*`)<br>• Customer Session & Order (`/api/sessions/*`)<br>• Analytics Overview (`/api/analytics/*`)<br>• Upload Cloudinary (`/api/upload/*`) | `backend.git`: `feat/be-auth-menu-a`<br>`mobile.git`: `feat/mobile-ios-a` |
| **Nguyễn Quốc Thái**<br>*(Thành viên B)* | **Mobile App (Android & Operations)**<br>• Operations Hub, Orders Kanban<br>• CashierScreen (CASH/VietQR)<br>• InventoryScreen, SoldOutScreen<br>• HistoryScreen, PrepTimeDetail | **Operations & Realtime & KDS**<br>• Cashier & VietQR Pay (`/api/cashier/*`)<br>• Tables & Sơ đồ bàn (`/api/tables/*`)<br>• Inventory BOM & Khấu trừ kho (`/api/ingredients/*`)<br>• Live Orders & Bếp KDS (`/api/orders/*`)<br>• Khách hàng & Loyalty (`/api/customers/*`)<br>• Socket.IO Server & Events (`src/socket/*`) | `backend.git`: `feat/be-cashier-kds-b`<br>`mobile.git`: `feat/mobile-android-b` |
| **Phạm Văn Đoàn**<br>*(Thành viên C)* | **Web Platform (Next.js 16)**<br>• QR Menu gọi món tại bàn (`/table/*`)<br>• Màn hình Bếp KDS Realtime (`/kds/*`)<br>• POS Thu ngân Web (`/pos/*`)<br>• Admin Dashboard, Roles, Settings<br>• Platform Admin SaaS (`/platform-admin/*`) | **Database & SaaS & Administration**<br>• Prisma Schema & Migrations (`schema.prisma`)<br>• Platform Admin SaaS (`/api/platform-admin/*`)<br>• Quản trị nhân sự & RBAC (`/api/admin/users`)<br>• Z-Report & Kết ca (`/api/z-report/*`)<br>• Động cơ Voucher & Khuyến mãi (`/api/vouchers/*`)<br>• Cấu hình Quán & Branding (`/api/branding/*`) | `backend.git`: `feat/be-admin-report-c`<br>`frontend.git`: `feat/web-frontend-c` |

---

<div align="center">
  <sub>Phát triển bởi <strong>HiAI-MenuGo Team</strong> © 2026. Phân phối dưới giấy phép <strong>ISC License</strong>.</sub>
</div>
