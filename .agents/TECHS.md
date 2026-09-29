# HiAI-MenuGo — Tech Stack (TECHS)

> Tài liệu kỹ thuật duy nhất về stack công nghệ. Mọi quyết định thư viện, version, cổng, schema DB và auth đều phải theo file này.
>
> - 📖 Nghiệp vụ: [BUSINESS.md](./BUSINESS.md) · ⛔ Luật cấm: [RULES.md](./RULES.md)
> - 🎨 Design: [SKILLS.md](./SKILLS.md) · 🧭 Index: [AGENTS.md](./AGENTS.md)

---

## 1. Tổng Quan Stack (6 trụ cột + JWT thuần)

| Tầng | Công nghệ chốt | Ghi chú |
|---|---|---|
| Web Frontend | **Next.js 16** (App Router) + React 19 | ✅ Đã khởi tạo khung trong `frontend/` (chuẩn mục 3) |
| Backend API | **Express 5** + TypeScript 5.8 | ✅ Đã khởi tạo khung trong `backend/` (chuẩn mục 4) |
| Mobile App | **React Native 0.86.3 + Expo ~57.0.23** + React 19.2.3 | ✅ Đã có trong `mobile/` (verified `mobile/package.json`) |
| Database | **PostgreSQL** qua **Supabase** (local adapter khi dev) | Source of truth, multi-tenant theo `tenantId` + `branchId` |
| ORM | **Prisma 6.4**, schema `prisma/schema.prisma` (~40 models) | Sửa schema → `npx prisma format` + `npx prisma generate` |
| Auth | **JWT thuần** (tự ký/verify bằng `jsonwebtoken`) | ⛔ Cấm Supabase Auth / NextAuth / Clerk — chi tiết mục 6 |
| Realtime | **Socket.IO 4.8** (server chung HTTP với Express) | Events chuẩn ở mục 7 |
| State | **Zustand 5** (cả web lẫn mobile) | Web: `auth.store` + `cart.store`; Mobile: `menuStore` + local state |

> ℹ️ **Trạng thái repo thực tế (29/09/2026):** root đã có đầy đủ `mobile/`, `frontend/`, `backend/`, `docs/`, `.agents/`. Cả Mobile (A/B) và Web (C) đều dùng chung duy nhất 1 backend Express trên port 5000/5001. Mọi mô tả frontend/backend dưới đây là **chuẩn kiến trúc bắt buộc khi triển khai**.

---

## 2. Mobile App (`mobile/`) — đã có, verified

- **Runtime:** Expo ~57.0.23 + React Native 0.86.3 + React 19.2.3. Entry `mobile/index.ts` → `registerRootComponent(App)`.
- **Ngôn ngữ:** TypeScript ~6.0.3, `strict: true`, extends `expo/tsconfig.base`.
- **Navigation:** Custom Tab + Hub Pattern trong `App.tsx` & `OperationsScreen.tsx`. **Cấm** React Navigation / Expo Router (xem RULES).
- **State:** Zustand 5.0.15 (`useMenuStore` trong `src/data/menuStore.ts`) + local `useState` cho `cart`, `activeTab`, `operationSubView`.
- **Styling:** `StyleSheet.create` + NativeWind v4 + Theme Tokens (`src/theme/index.ts`). Không hardcode hex rời rạc.
- **Icons:** `lucide-react-native` ^1.47.0 — duy nhất.
- **Libs khác:** `expo-image-picker` 57.0.19, `react-native-svg` 15.15.5, `react-native-safe-area-context` 5.7.0, `expo-status-bar`, `react-native-reanimated` 4.5.1, `tailwindcss` 3.4.19.
- **Config:** `app.json` — `orientation: portrait`, `userInterfaceStyle: light`.
- **Scripts:** `npm start` / `npm run android` / `npm run ios` / `npm run web` (Metro port **8081**).

Cấu trúc `mobile/src`: `types/index.ts` (TabType, OperationSubView, MenuItem, CartItem, LiveOrder…), `theme/index.ts` (colors/radii/shadows), `data/` (mockData + menuStore), `components/BottomNav.tsx`, `screens/` (Home, Revenue, Order, Operations, Notification, Settings + `operations/*` 10 sub-views).

---

## 3. Web Frontend (`frontend/`) — chuẩn khi tạo mới

- **Framework:** Next.js 16 App Router, React 19. Port **3000**.
- **Styling:** TailwindCSS 4, dark mode mặc định `bg-zinc-950` cho Admin/POS/KDS.
- **State:** Zustand 5 — `useAuthStore` (`stores/auth.store.ts`), `useCartStore` (`stores/cart.store.ts`).
- **Icons:** Lucide only. **Font:** `Be Vietnam Pro` + `Geist Mono` + `Playfair Display` (`app/layout.tsx`).
- **i18n:** `I18nProvider` từ `context/i18nContext.tsx`, hook `useI18n()`.
- **Realtime:** `socket.io-client` 4.8.
- **Routes chuẩn:** `app/admin/*` (Dashboard, Menu, Inventory, Vouchers, Z-Report, Roles), `app/pos/*`, `app/kds/*`, `app/table/[tableId]/*` (QR Menu), `app/platform-admin/*`.

---

## 4. Backend API (`backend/`) — chuẩn khi tạo mới

- **Runtime:** Node.js + Express 5 + TypeScript 5.8. Port **5000** (fallback `5001`).
- **Realtime:** Socket.IO 4.8 chạy chung HTTP server với Express (`src/socket/index.ts`).
- **Logging:** Winston JSON structured (`src/utils/logger.ts`).
- **Cache/Queue:** `ioredis` + `BullMQ` (Webhook SePay & background jobs).
- **Security:** `helmet` + `express-rate-limit` (2000 req/15 phút) + Zod validation mọi body.
- **Third-party:** Cloudinary (ảnh món), Nodemailer, PDFKit, ExcelJS, SePay Webhook.
- **Payment:** Payment Factory Pattern (`src/services/payment/`).
- **Response:** LUÔN qua `ApiResponse` helper (`src/utils/response.ts`) — `{ success, data, message }` / `{ success: false, message, errorCode }`.

---

## 5. Database — Supabase (PostgreSQL) + Prisma

- **Engine:** PostgreSQL (Supabase hosted / local adapter khi dev). Prisma 6.4 là ORM duy nhất — cấm query SQL thô trừ migration.
- **Schema:** `backend/prisma/schema.prisma` (~40 models: Tenant, Branch, TenantUser, Table, MenuItem, ModifierGroup/Option, OrderSession, Order, Inventory, InventoryLog, Voucher, MembershipTier…).
- **Multi-tenant columns:** mọi bảng nghiệp vụ phải có `tenantId` (+ `branchId` nếu thuộc chi nhánh). Mọi query bắt buộc filter `tenantId` (xem RULES).
- **Workflow:** sửa schema → `npx prisma format` → `npx prisma generate` → mới test/build.

---

## 6. Auth — JWT Thuần (bắt buộc, không dùng Auth dịch vụ)

- **Cơ chế duy nhất:** tự ký/verify JWT bằng thư viện `jsonwebtoken` trong backend Express. **Cấm tuyệt đối** Supabase Auth, NextAuth/Auth.js, Clerk, Firebase Auth.
- **Token pair:**
  - Access Token: TTL **15 phút**, payload `{ userId, tenantId, branchId, role, permissions }`, gửi qua `Authorization: Bearer <token>`.
  - Refresh Token: TTL **7 ngày**, lưu **HttpOnly cookie** (`Secure` + `SameSite` khi production), rotation mỗi lần refresh + reuse detection (phát hiện dùng lại token cũ → revoke toàn bộ session của user).
- **Middleware:** `authMiddleware` giải mã access token → gắn `req.user`; `requireRole([...])` kiểm tra role (xem RULES).
- **Frontend/Mobile:** lưu access token trong memory/Zustand (không localStorage cho web nhạy cảm), tự refresh khi 401, logout thì xóa cả 2 token + gọi revoke.

---

## 7. Socket.IO Events Chuẩn (`src/socket/events.ts`)

`order:new` · `order:updated` (PENDING ➔ PREPARING ➔ DONE) · `order:item:status` · `order:voided` · `session:updated` · `session:closed` · `table:status-changed` · `sold_out:updated` · `payment:pending` · `payment:completed` · `inventory:updated`.

---

## 8. Cổng & Lệnh Chạy

| Service | Port | Lệnh |
|---|---|---|
| Backend Express | `5000` (fallback `5001`) | `npm run dev` trong `backend/` |
| Web Next.js | `3000` | `npm run dev` trong `frontend/` |
| Mobile Metro | `8081` | `npm start` trong `mobile/` |

Tuyệt đối không tự ý đổi cổng.

---

## 9. Kiến Trúc Dùng Chung API (Shared Backend API Architecture)

Cả **Mobile (A + B)** và **Web (C)** đều giao tiếp với **cùng 1 Backend Express duy nhất** (port 5000/5001). Không tạo endpoint trùng lặp hoặc riêng rẽ cho từng client.

| Module | Endpoints Dùng Chung | Ghi chú & Cơ chế đồng bộ |
|---|---|---|
| **Auth** | `POST /api/auth/login`<br>`POST /api/auth/refresh`<br>`GET /api/auth/me` | Cùng JWT token logic. Mobile gửi `Authorization: Bearer <token>`, Web dùng HttpOnly Cookie hoặc Bearer header |
| **Menu** | `GET /api/menu/items?branchId=`<br>`POST/PATCH/DELETE /api/menu/items`<br>`PATCH /api/menu/items/:id/sold-out`<br>`GET /api/menu/:tableId` (public QR) | Chung data model MenuItem + ModifierGroup. Mobile POS & Web Admin/POS dùng chung API |
| **Orders** | `POST /api/sessions/:tableId/order`<br>`GET /api/orders/active?branchId=&view=list\|kanban`<br>`PATCH /api/orders/:id/status`<br>`PATCH /api/orders/items/:id/status`<br>`POST /api/orders/:id/void` | **Gộp chuẩn:** `GET /api/orders/active` hỗ trợ cả Mobile OrdersScreen (`view=list`) và Web KDS (`view=kanban`) |
| **Cashier** | `POST /api/cashier/pay`<br>`POST /api/cashier/create-qr` | Chung xử lý thanh toán tiền mặt & VietQR |
| **Analytics** | `GET /api/analytics/today-overview`<br>`GET /api/analytics/revenue` | Cùng số liệu; Mobile vẽ bar/stat card, Web vẽ chart Recharts |
| **Kho BOM** | `GET /api/ingredients?branchId=`<br>`PATCH /api/ingredients/:id/adjust` | Mobile B kiểm kê điều chỉnh kho, Web Admin quản lý định lượng BOM |
| **Socket.IO** | Cùng 1 instance Socket.IO server | Mọi client (Mobile & Web) cùng join room chi nhánh (`branch:{branchId}`) và nhận/gửi cùng bộ event names |

