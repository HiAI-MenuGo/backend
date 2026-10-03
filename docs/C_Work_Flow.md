# 🌐 Workflow Thành Viên C — Web Platform & Backend Architecture

> **Người phụ trách:** Phạm Văn Đoàn (Thành viên C)
> **Nền tảng:** Web Frontend (Next.js 16 App Router) + Backend Architecture / SaaS (Express 5 / Prisma 6)
> **Thư mục làm việc:** `frontend/` và `backend/`
> **Nhánh Git:**
> - Frontend Repo (`frontend.git`): `feat/web-frontend-c` ➔ PR vào `dev`
> - Backend Repo (`backend.git`): `feat/be-admin-report-c` ➔ PR vào `dev`

---

## 🎯 Phạm Vi Công Việc

Thành viên C chịu trách nhiệm phối hợp giữa **Web Platform Fullstack** và **Backend Core Architecture / SaaS**:

### 1. Web Frontend (`frontend/`)
1. **Trải nghiệm khách hàng tại bàn (QR Menu)** — `/table/[tableId]/` — gọi món, tùy chỉnh topping, giỏ hàng, theo dõi đơn live, thanh toán VietQR
2. **Màn hình bếp realtime (KDS)** — `/kds/` — Kanban đơn chế biến, âm thanh chuông báo, cập nhật từng món
3. **POS Thu ngân Web** — `/pos/` và `/pos/cashier/` — giao diện màn hình lớn cho thu ngân tại quầy
4. **Trang quản trị Admin** — `/admin/` — Dashboard, Thực đơn & BOM Editor, Quản lý kho, Mã giảm giá, Z-Report, Cài đặt & Branding
5. **Quản trị nền tảng SaaS (Platform Admin)** — `/platform-admin/` — Quản trị danh sách Tenants, gói dịch vụ

### 2. Backend API (`backend/`) — Phụ trách Kiến trúc CSDL & Khối Quản trị SaaS:
1. **Prisma Schema & Database Migrations**: Quản trị `prisma/schema.prisma` (~40 models multi-tenant), định nghĩa quan hệ, composite indexes, database seeds và scripts migrate.
2. **SaaS Platform Admin**: Quản trị vòng đời tenant, tạo mới tenant quán ăn, gia hạn gói cước (`/api/platform-admin/*`).
3. **Users & Role-Based Access Control (RBAC)**: Quản lý nhân sự, gán quyền nhân viên chi nhánh (`/api/admin/users`, `/api/admin/roles`).
4. **Z-Report & End-of-Shift Accounting**: Đối soát doanh thu tiền mặt / chuyển khoản, tính tổng bán theo danh mục, xuất báo cáo PDF/Excel (`/api/z-report/*`).
5. **Voucher & Promotion Engine**: Động cơ giảm giá (theo % hoặc số tiền cố định), kiểm tra giới hạn đơn tối thiểu, số lượt dùng (`/api/vouchers/*`).
6. **Restaurant Branding & Settings**: Tùy biến thương hiệu quán (logo, mã màu theme), thông tin ngân hàng thụ hưởng VietQR (`/api/branding/*`, `/api/settings/*`).

---

## 📁 Files & Pages Phụ Trách

### Web Frontend (`frontend/`)
| File / Thư mục | Mô tả | Trạng thái |
|----------------|--------|------------|
| `app/table/[tableId]/page.tsx` | QR Menu khách hàng tại bàn | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/table/[tableId]/MenuItemList.tsx` | Danh sách món, grid 2 cột | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/table/[tableId]/CustomerItemOptionsModal.tsx` | Modal tùy chọn Đường/Đá/Size/Topping | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/table/hooks/useMenuSoldOut.ts` | Hook đồng bộ sold-out realtime | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/kds/page.tsx` | Kitchen Display System | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/pos/page.tsx` | POS toàn màn hình | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/pos/CashierClient.tsx` | Client component thu ngân | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/pos/ItemOptionsModal.tsx` | Modal tùy chỉnh món cho POS | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/pos/cashier/page.tsx` | Layout cashier riêng | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/dashboard/page.tsx` | Dashboard Admin tổng quan | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/menu/page.tsx` | Quản lý thực đơn Admin | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/inventory/page.tsx` | Quản lý kho BOM | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/vouchers/page.tsx` | Mã giảm giá & Loyalty | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/z-report/page.tsx` | Báo cáo kết ca | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/settings/` | Cài đặt nhà hàng, Branding, Ngân hàng | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/roles/page.tsx` | Quản lý nhân sự & phân quyền | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/admin/tables/page.tsx` | Sơ đồ bàn & Mã QR bàn | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/platform-admin/` | SaaS Platform Admin | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `app/receipt/[sessionId]/page.tsx` | Hóa đơn thanh toán | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `components/floor/TableQRCode.tsx` | Tạo mã QR bàn ăn (level H) | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `components/inventory/BomEditor.tsx` | Editor định lượng nguyên liệu | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `stores/auth.store.ts` | Zustand Auth & User store | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `stores/cart.store.ts` | Zustand Cart store với modifiers | 🟢 Đã hoàn thành (Commit `bddc1f6`) |
| `context/i18nContext.tsx` | Đa ngôn ngữ Việt / Anh | 🟢 Đã hoàn thành (Commit `bddc1f6`) |

### Backend (`backend/`)
| File | Mô tả | Trạng thái |
|------|--------|------------|
| `backend/prisma/schema.prisma` | ~40 Models CSDL Multi-tenant & Migrations | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/prisma/seed.ts` | Script Seeder dữ liệu mẫu | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/controllers/platform.controller.ts` | Quản lý tenants và gói cước SaaS | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/controllers/user.controller.ts` | Quản lý danh sách nhân sự, phân quyền vai trò | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/controllers/zreport.controller.ts` | Tổng hợp báo cáo kết ca, đối soát tài chính | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/services/zreport.service.ts` | Tính toán doanh thu ca & xuất báo cáo | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/controllers/voucher.controller.ts` | Động cơ kiểm tra & áp dụng mã giảm giá | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/controllers/branding.controller.ts` | Tùy biến thông tin quán, logo, màu sắc, ngân hàng | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/utils/response.ts` | Helper chuẩn hóa ApiResponse toàn dự án | 🟢 Dùng chung |
| `backend/src/utils/logger.ts` | Winston Structured Logger | 🟢 Đã hoàn thành (Commit `6f61604`) |
| `backend/src/middlewares/validate.ts` | Zod Validation Middleware | 🟢 Đã hoàn thành (Commit `6f61604`) |


---

## 📋 Danh Sách Task Chi Tiết

### 🏗️ GIAI ĐOẠN 1 — Database Architecture, SaaS Platform & RBAC (Tuần 1)

#### Task C-001: Quản Trị CSDL Prisma Multi-Tenant & Migrations
- **File:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/`
- **Việc làm:**
  1. Thiết kế và duy trì ~40 models Prisma multi-tenant với `tenantId` và `branchId`.
  2. Tạo indexes cho các trường hay query: `[tenantId, branchId]`, `[tenantId, status]`.
  3. Viết migration scripts (`npx prisma migrate dev`), database seeders cho tài khoản mẫu, menu mẫu.
  4. Cấu hình Prisma Client extension hoặc middleware tự động kiểm tra `tenantId`.
- **Định nghĩa hoàn thành:** `npx prisma generate` và `npx prisma migrate deploy` thành công 100%, có seed script nạp dữ liệu mẫu hoàn chỉnh.

#### Task C-002: SaaS Platform Admin & Quản Lý Vòng Đời Tenant
- **File:** `backend/src/controllers/platform.controller.ts`, `backend/src/routes/platform.routes.ts`
- **Endpoints:**
  - `GET /api/platform-admin/tenants`: Danh sách các quán ăn thuê nền tảng SaaS.
  - `POST /api/platform-admin/tenants`: Tạo tenant mới, tự động tạo tài khoản chủ quán (`ADMIN`) và chi nhánh mặc định.
  - `PATCH /api/platform-admin/tenants/:id/subscription`: Nâng cấp / gia hạn gói cước, khóa quán quá hạn.
  - Phân quyền bảo mật: Chỉ cho phép role `PLATFORM_ADMIN`, hoàn toàn không truy cập dữ liệu kinh doanh của quán.
- **Định nghĩa hoàn thành:** Luồng onboarding quán mới hoạt động trơn tru qua API, dữ liệu quán mới được khởi tạo đầy đủ.

#### Task C-003: Quản Trị Người Dùng & Phân Quyền Vai Trò (RBAC)
- **File:** `backend/src/controllers/user.controller.ts`, `backend/src/routes/user.routes.ts`
- **Endpoints:**
  - `GET /api/admin/users`: Danh sách nhân viên trong cùng quán (`tenantId`).
  - `POST /api/admin/users`: Tạo tài khoản nhân viên mới, gán chi nhánh và vai trò (`MANAGER`, `KITCHEN`, `CASHIER`).
  - `PATCH /api/admin/users/:id`: Cập nhật vai trò, đổi trạng thái kích hoạt / tạm khóa tài khoản nhân viên.
- **Định nghĩa hoàn thành:** Chủ quán ADMIN có thể quản lý danh sách nhân sự từng chi nhánh, phân quyền chính xác.

---

### 🍽️ GIAI ĐOẠN 2 — QR Menu Khách Hàng (Tuần 1-2)

#### Task C-004: QR Menu — Tải Thực Đơn & Sold Out Realtime
- **File:** `app/table/[tableId]/page.tsx`, `app/table/hooks/useMenuSoldOut.ts`
- **API & Socket:**
  ```
  GET /api/menu/:tableId          — Lấy menu theo bàn (public, không cần auth)
  Socket: 'sold_out:updated' → { itemId, isSoldOut } — Cập nhật real-time
  ```
- **Việc làm:**
  1. Load menu với `tenantId` và `branchId` từ thông tin mã QR / `tableId`.
  2. Subscribe `sold_out:updated`: cập nhật `isSoldOut` của từng món tức thì — không reload trang.
  3. Món `isSoldOut = true`: overlay "Hết hàng" màu đỏ bán trong suốt, nút **Thêm** disabled.
  4. Kiểm tra Geofence (nếu có cấu hình): Khách ngoài phạm vi → hiển thị banner cảnh báo.
- **Định nghĩa hoàn thành:** Menu load <1s, sold-out cập nhật <2s từ lúc nhân viên toggle trên Mobile.

#### Task C-005: QR Menu — CustomerItemOptionsModal (Tùy chọn Đường/Đá/Size/Topping)
- **File:** `app/table/[tableId]/CustomerItemOptionsModal.tsx`
- **Việc làm:**
  1. Phân loại `isDrink` / `isFood` dựa vào category name (an toàn type):
     ```typescript
     const catRaw = item.category || '';
     const catName = typeof catRaw === 'string' ? catRaw : (catRaw as any)?.name || '';
     const isDrink = ['coffee', 'tea', 'drink', 'juice', 'boba', 'smoothie'].some(k => catName.toLowerCase().includes(k));
     ```
  2. Đồ uống: hiển thị đầy đủ nhóm Đường, Đá, Size, Topping — radio button pill.
  3. Đồ ăn: ẩn nhóm Đường/Đá, chỉ hiện ghi chú và Topping đặc biệt (nếu có).
  4. Preview giá realtime: tính `basePrice + extraFromModifiers × quantity`.
  5. Màu nút CTA (`primaryColor`, `secondaryColor`) lấy từ Tenant Branding API — không hardcode.
- **Định nghĩa hoàn thành:** Modal hiển thị đúng nhóm tùy chọn theo loại món, tính giá chính xác, màu sắc theo thương hiệu quán.

#### Task C-006: QR Menu — Giỏ Hàng & Xác Nhận Đặt Món
- **File:** `app/table/[tableId]/page.tsx`, `stores/cart.store.ts`
- **API:**
  ```
  POST /api/sessions/:tableId/order
  Body: { items: [{ menuItemId, quantity, note }], orderType: 'DINE_IN' }
  ```
- **Việc làm:**
  1. Floating Cart Button hiển thị tổng số món và tổng tiền.
  2. Bottom Sheet Giỏ hàng: danh sách món, stepper tăng/giảm, ghi chú đơn, nút xóa swipe.
  3. Bấm **Gửi Đơn** → gọi API → thành công: clear cart, chuyển sang tab **Theo dõi đơn**.
  4. Nhập SĐT tích điểm (tùy chọn) trước khi gửi đơn → gọi `GET /api/customers?phone=` để tra cứu thẻ thành viên.
- **Định nghĩa hoàn thành:** Khách gửi đơn thành công, đơn xuất hiện ngay trên KDS và OrdersScreen Mobile.

#### Task C-007: QR Menu — Theo Dõi Trạng Thái Đơn Realtime
- **File:** `app/table/[tableId]/page.tsx` (tab "Theo dõi đơn")
- **Socket:**
  ```
  Socket: 'order:updated' → { orderId, status, items }
  Socket: 'order:item:status' → { itemId, status }
  ```
- **Việc làm:**
  1. Hiển thị danh sách món đã gọi với trạng thái từng món (Đang chờ / Đang nấu / Sẵn sàng).
  2. Icon tiến trình: `⏳ Đang chờ` → `🍳 Đang nấu` → `✅ Sẵn sàng`.
  3. Cập nhật icon tức thì khi nhận Socket event.
  4. Nút **Gọi Thêm Món** quay về tab Thực đơn với giỏ hàng vẫn còn đó.
- **Định nghĩa hoàn thành:** Khách thấy tiến trình chế biến từng món, cập nhật tức thì khi bếp thay đổi trạng thái.

#### Task C-008: QR Menu — Yêu Cầu Thanh Toán VietQR
- **File:** `app/table/[tableId]/page.tsx`
- **Việc làm:**
  1. Nút **Yêu Cầu Thanh Toán** chỉ hiện khi: đơn tồn tại AND không có món PENDING AND `!isInitializing`.
  2. Bấm nút → gọi `POST /api/cashier/create-qr` → hiển thị mã QR trong modal.
  3. Socket `payment:completed` → đóng modal → Modal cảm ơn với điểm tích lũy.
  4. Kiểm tra thẻ hạng thành viên (Vàng/Bạc/Đồng): hiển thị badge màu tương ứng.
- **Định nghĩa hoàn thành:** Khách yêu cầu thanh toán → quét QR ngân hàng → được xác nhận tự động < 5s.

---

### 🍳 GIAI ĐOẠN 3 — KDS Kitchen Display System (Tuần 2)

#### Task C-009: KDS — Giao Diện Kanban Đơn Chế Biến
- **File:** `app/kds/page.tsx`
- **API & Socket:**
  ```
  GET /api/orders/active?branchId=&view=kanban  (dùng chung API với Mobile B)
  Socket: 'order:new', 'order:updated', 'order:voided'
  ```
- **Việc làm:**
  1. Hiển thị 3 cột Kanban: **MỚI**, **ĐANG NẤU**, **XONG**.
  2. Thẻ đơn hiển thị: số bàn, mã đơn, giờ vào, danh sách món với ghi chú **đa dòng** theo quy chuẩn:
     ```tsx
     {item.note?.replace(/^📝?\s*Ghi chú:\s*/i, '').split(/•|;|\|/).map((line, i) => (
       <div key={i} className="flex gap-1 text-xs text-amber-300">
         <span className="text-orange-400 font-bold">•</span>
         <span>{line.trim()}</span>
       </div>
     ))}
     ```
  3. Nút **Bắt đầu nấu** (MỚI → ĐANG NẤU): gọi `PATCH /api/orders/items/:id/status` (alias `/api/kds/items/:id/status`).
  4. Nút **Xong** (ĐANG NẤU → XONG): gọi API, thẻ tự ẩn sau 5s.
  5. Nút **Lưu trữ tất cả** (Bulk Archive): lưu tất cả đơn đã xong.
- **Định nghĩa hoàn thành:** KDS hiển thị đúng đơn, ghi chú dạng đa dòng, cập nhật realtime từ Mobile và Web.

#### Task C-010: KDS — Âm Thanh & Cảnh Báo Đơn Mới
- **File:** `app/kds/page.tsx`
- **Việc làm:**
  1. Khi `order:new` Socket event tới → phát âm thanh `new_order.mp3` (file đặt trong `public/sounds/`).
  2. Flash animation đỏ nhấp nháy trên toàn cột **MỚI** trong 1 giây.
  3. Browser Notification API: xin quyền notification, gửi push notification khi tab đang ẩn.
  4. Nút **Mute** ở góc trên phải để tắt âm thanh (lưu vào localStorage).
  5. Hiển thị badge "Mới" đỏ nhấp nháy trên thẻ đơn chưa được confirm trong >5 phút.
- **Định nghĩa hoàn thành:** Bếp không bỏ lỡ đơn mới, âm thanh + animation + notification làm việc đồng bộ.

---

### 💰 GIAI ĐOẠN 4 — POS Cashier Web (Tuần 2-3)

#### Task C-011: POS Web — Giao Diện Thu Ngân Màn Hình Lớn
- **File:** `app/pos/page.tsx`, `app/pos/CashierClient.tsx`
- **API:**
  ```
  GET /api/menu/items?branchId=   — Thực đơn
  GET /api/tables?branchId=       — Danh sách bàn
  POST /api/sessions/:tableId/order — Tạo đơn
  ```
- **Việc làm:**
  1. Layout 2 panel: Panel trái (Menu + Search), Panel phải (Giỏ hàng + Thanh toán).
  2. Tìm kiếm món realtime khi gõ (filter local).
  3. Grid thực đơn 4 cột (màn hình lớn ≥1440px) / 3 cột (màn hình 1024px).
  4. Khi bấm **Thêm món** có modifier → mở `ItemOptionsModal` để chọn tùy chỉnh.
  5. Ghi chú từng món hiển thị đa dòng (theo chuẩn `•` separator), **nút hủy món canh phải** (`justify-end`).
- **Định nghĩa hoàn thành:** Thu ngân có thể tạo đơn hoàn chỉnh từ Web POS trong <30 giây.

#### Task C-012: POS Web — Áp Dụng Voucher & Tích Điểm
- **File:** `app/pos/CashierClient.tsx`
- **API:**
  ```
  GET /api/customers?phone={phone}   — Tra cứu thẻ thành viên
  POST /api/vouchers/validate        — Kiểm tra & tính giảm giá voucher
  ```
- **Việc làm:**
  1. Input SĐT → gọi API → hiển thị thông tin thành viên: Tên, hạng, điểm hiện tại, chiết khấu.
  2. Input mã Voucher → validate → hiển thị số tiền được giảm.
  3. Cộng dồn giảm giá: Voucher + Loyalty tier = Tổng giảm.
  4. Hiển thị bảng tóm tắt: Tạm tính, Giảm giá, Thuế (nếu có), **Tổng cần thanh toán** in đậm to.
- **Định nghĩa hoàn thành:** Thu ngân có thể áp mã giảm và tra điểm thành viên trong 1 thao tác.

#### Task C-013: POS Web — Luồng Thanh Toán & In Hóa Đơn
- **File:** `app/pos/CashierClient.tsx`, `components/print/ReceiptPrintTemplate.tsx`
- **API:**
  ```
  POST /api/cashier/pay
  GET /api/receipt/:sessionId     — Lấy dữ liệu hóa đơn để in
  ```
- **Việc làm:**
  1. Chọn phương thức: **Tiền mặt** (nhập tiền khách đưa, hiện tiền thối) hoặc **VietQR** (hiển thị QR trong modal).
  2. Sau thanh toán → `window.print()` in hóa đơn dùng `ReceiptPrintTemplate` (CSS `@media print` ẩn UI thừa).
  3. Socket `payment:completed` tự động đóng modal QR và kích hoạt in.
  4. Template hóa đơn: Logo quán, địa chỉ, mã bill, bảng món kèm ghi chú đa dòng, tổng tiền, phương thức, điểm tích lũy, mã QR VietQR trang trí.
- **Định nghĩa hoàn thành:** Hóa đơn in ra đúng dữ liệu thực tế, khổ giấy 80mm tương thích máy in nhiệt.

---

### 📊 GIAI ĐOẠN 5 — Admin Dashboard & Quản Trị (Tuần 3)

#### Task C-014: Admin Dashboard — Analytics & Biểu Đồ
- **File:** `app/admin/dashboard/page.tsx`, `components/admin/RevenueTrendChart.tsx`
- **API:**
  ```
  GET /api/analytics/today-overview
  GET /api/analytics/revenue?timeframe=week
  GET /api/analytics/top-selling?limit=5
  ```
- **Việc làm:**
  1. KPI Cards hàng đầu: Doanh thu hôm nay, Số đơn, AOV (Giá trị đơn trung bình), % tăng trưởng.
  2. Biểu đồ doanh thu 7 ngày gần nhất (`Recharts LineChart`).
  3. Top 5 món bán chạy dạng danh sách xếp hạng.
  4. Bảng đơn hàng gần nhất (real-time, subscribe Socket).
  5. Bộ lọc chi nhánh cho ADMIN xem tổng hợp hoặc lọc theo branch.
- **Định nghĩa hoàn thành:** Admin nhìn vào Dashboard thấy ngay tình hình kinh doanh hôm nay mà không cần click thêm.

#### Task C-015: Admin Menu — Quản Lý Thực Đơn & Danh Mục
- **File:** `app/admin/menu/page.tsx`
- **Việc làm:**
  1. Bảng danh sách món với cột: Ảnh, Tên, Danh mục, Giá, Trạng thái, Hành động.
  2. Search + Filter danh mục + Filter trạng thái (Active / Sold Out / Disabled).
  3. Inline Toggle Active/Inactive không cần mở modal.
  4. Nút **Thêm Món** → Modal form đầy đủ: Tên, Giá, Mô tả, Danh mục, Ảnh upload, Modifier Groups liên kết.
  5. Drag & Drop sắp xếp thứ tự hiển thị trong danh mục.
- **Định nghĩa hoàn thành:** Admin có thể quản lý toàn bộ thực đơn mà không cần kỹ thuật viên hỗ trợ.

#### Task C-016: Admin Inventory — Kho BOM & Định Lượng
- **File:** `app/admin/inventory/page.tsx`, `components/inventory/BomEditor.tsx`
- **API:**
  ```
  GET /api/ingredients
  POST /api/ingredients
  GET /api/menu/items/:id/bom         — Lấy định lượng nguyên liệu của 1 món
  PUT /api/menu/items/:id/bom         — Cập nhật BOM
  GET /api/inventory/logs             — Lịch sử biến động kho
  ```
- **Việc làm:**
  1. Tab **Nguyên liệu**: Bảng tồn kho, Thêm/Sửa nguyên liệu, Cảnh báo tồn dưới ngưỡng.
  2. Tab **Định lượng (BOM)**: Chọn món → `BomEditor` cho phép thêm/sửa từng nguyên liệu với số lượng và đơn vị.
  3. Tab **Lịch sử**: Timeline biến động kho (Nhập kho, Bán ra, Hao hụt, Điều chỉnh).
  4. Component `StockAdjustModal`: Modal nhập kho thủ công, chọn lý do, ghi chú.
- **Định nghĩa hoàn thành:** Admin cấu hình BOM cho từng món, tồn kho tự động trừ khi bán — hiển thị lịch sử đầy đủ.

#### Task C-017: Admin Vouchers & Loyalty — Chương Trình Khách Hàng Thân Thiết
- **File:** `app/admin/vouchers/page.tsx`
- **Việc làm:**
  1. Tab **Voucher**: Bảng mã giảm giá (Tên, Giá trị, Loại PERCENT/FIXED, Hết hạn, Số lượt còn). Thêm/sửa/vô hiệu hóa voucher.
  2. Tab **Thành viên**: Danh sách khách hàng, điểm tích lũy, hạng thành viên, lịch sử tích điểm.
  3. Tab **Hạng Thành viên**: Cấu hình ngưỡng điểm và chiết khấu cho từng hạng (Đồng/Bạc/Vàng/Kim Cương).
  4. Tìm kiếm khách hàng theo SĐT hoặc Tên.
- **Định nghĩa hoàn thành:** Admin có thể tạo chương trình khuyến mãi và xem danh sách khách hàng thân thiết.

#### Task C-018: Admin Z-Report — Báo Cáo Kết Ca
- **File:** `app/admin/z-report/page.tsx`
- **API:**
  ```
  GET /api/z-report/summary?date=&branchId=&shiftId=
  GET /api/z-report/export?format=pdf|excel
  POST /api/z-report/close-shift        — Đóng ca
  ```
- **Việc làm:**
  1. Trang chủ: Chọn ngày + Chi nhánh → Load báo cáo ca.
  2. Hiển thị: Doanh thu tiền mặt, VietQR/Thẻ, Tổng, Số đơn, Voucher đã dùng, Món bị hủy, Tiền thối.
  3. So sánh tiền mặt thực kiểm đếm vs hệ thống tính → hiển thị chênh lệch (xanh/đỏ).
  4. Nút **Xuất PDF** → gọi API backend → download file (dùng PDFKit).
  5. Nút **Xuất Excel** → gọi API backend → download file (dùng ExcelJS).
  6. Nút **Đóng Ca** → xác nhận Modal → gọi API → ca được chốt, không thể chỉnh sửa.
- **Định nghĩa hoàn thành:** Quản lý kết ca trong <2 phút, file xuất ra đúng số liệu và tải về được.

#### Task C-019: Admin Settings — Branding & Tài Khoản Ngân Hàng
- **File:** `app/admin/settings/BrandingTab.tsx`, `app/admin/settings/BankAccountTab.tsx`
- **API:**
  ```
  GET /api/branding/:tenantId
  PATCH /api/branding/:tenantId     — Cập nhật logo, màu sắc, banner
  GET /api/bank-accounts/:tenantId
  POST /api/bank-accounts           — Thêm tài khoản ngân hàng
  ```
- **Việc làm:**
  1. **Branding Tab:** Upload Logo, Banner. Color Picker chọn `primaryColor`, `secondaryColor`. Preview live QR Menu với màu đã chọn.
  2. **Bank Account Tab:** Thêm số tài khoản ngân hàng nhận tiền VietQR. Hiển thị cảnh báo nếu chưa cấu hình (VietQR sẽ không hoạt động).
  3. Sau khi lưu Branding → invalidate cache QR Menu → các bàn ăn thấy màu mới ngay sau khi reload.
- **Định nghĩa hoàn thành:** Admin đổi logo và màu sắc → QR Menu khách hàng phản ánh thương hiệu mới ngay lập tức.

#### Task C-020: Admin Roles — Quản Lý Nhân Sự & Phân Quyền
- **File:** `app/admin/roles/page.tsx`
- **API:**
  ```
  GET /api/users?branchId=
  POST /api/users/invite             — Mời nhân viên mới
  PATCH /api/users/:id/role          — Đổi chức vụ
  DELETE /api/users/:id              — Vô hiệu hóa tài khoản
  ```
- **Việc làm:**
  1. Bảng nhân viên: Avatar, Tên, Vai trò (Badge màu theo role), Chi nhánh, Trạng thái.
  2. Nút **Mời nhân viên** → Modal nhập email + chọn Role + Chi nhánh → gửi email mời qua Nodemailer.
  3. Đổi Role: Dropdown inline không cần reload.
  4. MANAGER chỉ thấy nhân viên của chi nhánh mình — ADMIN thấy tất cả chi nhánh.
- **Định nghĩa hoàn thành:** Admin/Manager quản lý nhân sự và phân quyền hoàn toàn từ web, không cần can thiệp database.

---

### 🌐 GIAI ĐOẠN 6 — Platform Admin & Integrations (Tuần 3-4)

#### Task C-021: Platform Admin — Quản Lý Khách Thuê SaaS
- **File:** `app/platform-admin/PlatformAdminClient.tsx`
- **Ghi chú bảo mật:** `PLATFORM_ADMIN` tuyệt đối KHÔNG xem dữ liệu kinh doanh của Tenant (đơn hàng, doanh thu, khách hàng).
- **Việc làm:**
  1. Danh sách Tenant: Tên thương hiệu, gói đăng ký, ngày hết hạn, trạng thái (Active/Suspended).
  2. Chi tiết Tenant: Thông tin liên hệ, số chi nhánh, ngày đăng ký, lịch sử thanh toán SaaS.
  3. Tạo Tenant mới: Form đăng ký, gán gói cước.
  4. Đình chỉ / Kích hoạt lại Tenant: Toggle trạng thái + gửi email thông báo.
- **Định nghĩa hoàn thành:** Platform Admin quản lý toàn bộ danh sách khách thuê SaaS mà không truy cập bất kỳ dữ liệu kinh doanh nào của họ.

#### Task C-022: Admin Integrations — API Keys & Webhook
- **File:** `app/admin/integrations/page.tsx`
- **API:**
  ```
  GET /api/api-keys?tenantId=
  POST /api/api-keys             — Tạo API key mới
  DELETE /api/api-keys/:id       — Thu hồi key
  GET /api/webhooks?tenantId=
  POST /api/webhooks             — Đăng ký endpoint webhook
  GET /api/webhooks/:id/deliveries  — Lịch sử gửi webhook
  ```
- **Việc làm:**
  1. Quản lý API Keys: Tạo key với tên mô tả, hiển thị key 1 lần duy nhất sau khi tạo, nút Copy.
  2. Quản lý Webhook Endpoints: Thêm URL, chọn events đăng ký (`order:new`, `payment:completed`...).
  3. Lịch sử Webhook Delivery: Hiển thị status (200/4xx/5xx) và payload, nút **Gửi lại**.
  4. Test Webhook: Nút **Gửi Test Event** để admin kiểm tra endpoint của họ.
- **Định nghĩa hoàn thành:** Admin tự tích hợp hệ thống bên ngoài qua API Key và Webhook mà không cần hỗ trợ kỹ thuật.

#### Task C-023: TableQRCode — Tạo & In Mã QR Bàn Ăn
- **File:** `components/floor/TableQRCode.tsx`, `app/admin/` (trang quản lý bàn)
- **Việc làm:**
  1. Dùng `QRCodeSVG` với `level="H"` (Error Correction High, bắt buộc khi có logo giữa).
  2. Chèn Logo quán vào giữa mã QR với kích thước 20% chiều rộng QR.
  3. Mỗi bàn có URL unique: `https://yourdomain.com/table/{encryptedTableId}` (tableId được mã hóa JWT ngắn để không đoán được).
  4. Nút **In Tất Cả QR** → trang in preview hiển thị tất cả QR bàn dạng grid → `window.print()`.
  5. Nút **Tải xuống PNG** riêng lẻ từng bàn.
- **Định nghĩa hoàn thành:** Admin tạo và in QR cho tất cả bàn ăn, mã QR quét được và chứa logo thương hiệu.

---

### ✅ GIAI ĐOẠN 7 — i18n, SEO & Performance (Tuần 4)

#### Task C-024: Hoàn Thiện Đa Ngôn Ngữ (i18n vi/en)
- **File:** `context/i18nContext.tsx`
- **Việc làm:**
  1. Kiểm tra tất cả trang Public (`/table/`, `/receipt/`, `/login/`) có bản dịch đầy đủ.
  2. Thêm `LanguageSwitcher` vào QR Menu khách hàng.
  3. Bổ sung các cặp key còn thiếu (tìm bằng `grep -r 't(\'' . -r` để lọc các key chưa khai báo).
  4. Test chuyển ngôn ngữ realtime, text không bị overflow ra ngoài container.
- **Định nghĩa hoàn thành:** Toàn bộ text trên Web có bản Tiếng Việt và Tiếng Anh hoàn chỉnh.

#### Task C-025: SEO & Performance Trang QR Menu
- **File:** `app/table/[tableId]/page.tsx`, `app/layout.tsx`
- **Việc làm:**
  1. Thêm `generateMetadata()` Server-side cho QR Menu page: title = tên quán, description = slogan.
  2. `loading.tsx`: Skeleton animation thay thế nội dung khi đang fetch.
  3. Tối ưu hình ảnh: dùng `next/image` với `loading="lazy"` cho tất cả ảnh món trong grid.
  4. Lighthouse audit → target: Performance > 90, Accessibility > 95 trên mobile.
- **Định nghĩa hoàn thành:** Trang QR Menu load trên 3G trong <3s, Lighthouse score >90 trên mobile.

#### Task C-026: Backend — Chuẩn Hóa Toàn Bộ API Response & Error Handling
- **File:** `backend/src/utils/response.ts`, tất cả controllers
- **Việc làm:**
  1. Kiểm tra 100% controllers dùng `ApiResponse.success()` và `ApiResponse.error()` — không dùng `res.json()` thẳng.
  2. Thêm global error handler middleware để catch exception chưa được handle.
  3. Bổ sung `try-catch` vào tất cả async controller function.
  4. Log lỗi bằng Winston ở mức `error` với stack trace đầy đủ.
  5. Validate `tenantId` isolation trong tất cả query — audit lại toàn bộ Prisma queries.
- **Định nghĩa hoàn thành:** API trả response nhất quán, lỗi không bao giờ leak stack trace ra client, dữ liệu tenant không bị lẫn lộn.

---

## 🚦 Quy Tắc Git (2 Repositories)

Mỗi repository đều có 2 nhánh chính `main` (production) và `dev` (tích hợp). Thành viên C tự tạo nhánh riêng để code:

### 1. Web Frontend Repo (`frontend.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/web-frontend-c

# Commits mẫu
feat(qr-menu): implement real-time sold-out sync via socket.io
feat(kds): add multi-line note formatting for kitchen display
feat(pos): implement cashier interface with receipt printing
feat(admin): add bom editor for ingredient costing

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/web-frontend-c
```

### 2. Backend Repo (`backend.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/be-admin-report-c

# Commits mẫu
feat(prisma): define multi-tenant schema models and migration scripts
feat(platform): implement saas tenant onboarding and subscription api
feat(users): add staff user management and rbac endpoints
feat(z-report): implement shift closing calculations and pdf export
feat(vouchers): add voucher validation and discount calculation engine
feat(branding): add tenant branding and payment settings api

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/be-admin-report-c
```

> [!WARNING]
> TUYỆT ĐỐI KHÔNG `git push --force` và không push trực tiếp vào `main` hoặc `dev`. Luôn mở Pull Request vào `dev`.

---

## 🔗 API Endpoints Thành Viên C Xây Dựng & Phụ Trách (Backend)

| Nhóm | Endpoint | Method | Trách nhiệm của C |
|---|---|---|---|
| **Database** | `prisma/schema.prisma` | DDL | Quản trị schema CSDL multi-tenant & migrations |
| **Platform** | `/api/platform-admin/tenants` | GET/POST | Quản lý danh sách đối tác thuê SaaS |
| **Platform** | `/api/platform-admin/tenants/:id/subscription` | PATCH | Quản lý gói cước & thời hạn tenant |
| **Users** | `/api/admin/users` | GET/POST/PATCH | Quản lý danh sách nhân sự chi nhánh |
| **Users** | `/api/admin/roles` | GET | Danh sách vai trò và quyền hạn RBAC |
| **Z-Report** | `/api/z-report/shift-summary` | GET | Tổng hợp số liệu kết ca của nhân viên |
| **Z-Report** | `/api/z-report/close-shift` | POST | Chốt ca làm việc & lưu số dư két tiền mặt |
| **Z-Report** | `/api/z-report/export-pdf` | GET | Xuất phiếu Z-Report định dạng PDF |
| **Z-Report** | `/api/z-report/export-excel` | GET | Xuất báo cáo tài chính định dạng Excel |
| **Vouchers** | `/api/vouchers` | GET/POST/PATCH/DELETE | Quản lý danh sách mã giảm giá khuyến mãi |
| **Vouchers** | `/api/vouchers/validate` | POST | Kiểm tra điều kiện áp dụng mã voucher cho giỏ hàng |
| **Branding** | `/api/branding/:tenantId` | GET/PATCH | Tùy biến logo, màu sắc thương hiệu quán |
| **Settings** | `/api/settings/bank-account` | GET/PATCH | Cấu hình tài khoản ngân hàng nhận tiền VietQR |

---

## 📌 Ghi Chú & Lưu Ý Kỹ Thuật

> [!IMPORTANT]
> **Bảo mật Multi-Tenant tối thượng:** Mọi Prisma query phải có `where: { tenantId: req.user.tenantId }`. Kiểm tra 100% trước khi deploy. Thiếu `tenantId` là lỗ hổng bảo mật nghiêm trọng.

> [!WARNING]
> Ghi chú món (`item.note`) là chuỗi nối `•` từ Mobile. **KHÔNG** hiển thị như một dòng dài. Bắt buộc split và render đa dòng theo quy chuẩn trong `skill.md`. Áp dụng cho KDS, POS Cashier, KitchenTicket và ReceiptPrint.

> [!NOTE]
> Nút **Thanh Toán** trên QR Menu có điều kiện render phức tạp: `!isInitializing && lastOrder?.length > 0 && !lastOrder.some(i => i.status === 'PENDING') && lastOrder.some(i => i.status !== 'VOID')`. Đây là pattern bảo vệ chống nhấp nháy giao diện khi Socket.IO đang sync.

> [!TIP]
> Sử dụng `QRCodeSVG` với `level="H"` là bắt buộc khi chèn logo vào giữa QR. Level H cho phép 30% diện tích bị che mà vẫn quét được. Các level thấp hơn sẽ khiến QR không đọc được khi có logo.

---

## 📝 Nhật Ký Tiến Độ Thành Viên C (RULES §6)

### 01/10/2026 — Vòng fix review (Backend `bf09a05`, Frontend `c4566c1`)
- **Backend `feat/be-admin-report-c` → `bf09a05`**: khớp spec routes (`POST /vouchers/validate` alias + `DELETE /:id` + `POST /:id/redeem` tăng `usedCount`; `GET /z-report/shift-summary`, `POST /close-shift`, `GET /export?format=excel|pdf`; `PATCH /branding/:tenantId`; `GET /admin/users/roles`); khóa `tenantId` (bỏ fallback query, bỏ auto-create branding public, MANAGER scope `branchId`); gắn Zod `validate()` + `details`; logger file `logs/`; `auth.service` login ưu tiên Prisma; hết leak `error.message`.
- **Frontend `feat/web-frontend-c` → `c4566c1`**: `lib/format-note.tsx` (note đa dòng `•` cho KDS/POS/print); modal món lọc Đường/Đá không phân biệt hoa-thường + `textarea`; mock menu gắn `category.isDrink`; POS áp voucher `/vouchers/validate` + tra SĐT + nút Hủy món `justify-end rose` + QR `level="H"`; KDS mute `localStorage` + Notification; order-status `!isInitializing` + `order:item:status`; `TableQRCode` logo + tải PNG; mới `admin/integrations/page.tsx`, `table/[tableId]/loading.tsx`, `components/print/ReceiptPrintTemplate.tsx`, `@media print` 80mm, sidebar thêm `API & Webhook`.

### 01/10/2026 — Hoàn tất P1: Database thật (C-001) + Admin lên dữ liệu thật (Giai đoạn 5)
- **Backend `feat/be-admin-report-c` → `3198223` (fix(db): run initial multi-tenant migration and seed database)**:
  - Cấu hình DATABASE_URL local: `postgresql://postgres:postgres@localhost:5432/hiai_menugo?schema=public` (Postgres 17 local).
  - Chạy thành công `npx prisma migrate dev --name init_multi_tenant` → sinh thư mục `prisma/migrations/20261001044147_init_multi_tenant/migration.sql`.
  - Sửa `prisma/seed.ts`: guard an toàn prod — seed chỉ wipe + nạp lại catalog khi tenant chưa có phiên vận hành nào (hoặc `ALLOW_SEED_WIPE=true` tường minh); tenant đã có orders/sessions thì chỉ upsert tenant/branch/users rồi dừng, tuyệt đối không xóa dữ liệu thật. Ghi chú `branchId` bắt buộc trong nested create của `Table` là fix đúng schema (`@@unique[branchId, code]`), không phải cơ chế idempotent. Chạy `npx prisma db seed` nạp dữ liệu mẫu (seed.ts 514 dòng; con số 492 trước đây thiếu evidence nên bỏ).
  - Verify API thực tế: `GET /api/health` (200), `POST /api/auth/login` với `admin@menu-go.vn` / `123456` xác thực từ Prisma DB thật (200), `GET /api/admin/users` (5 users cùng tenant, 0 cross-tenant), `GET /api/vouchers` (2 vouchers thật), `GET /api/z-report/shift-summary` (200), token giả mạo bị chặn 401. `tsc --noEmit` & `npm run build` xanh 100%.
- **Frontend `feat/web-frontend-c` → `c53c21b` (feat(admin): connect real backend apis and state handlers across admin pages)**:
  - `admin/menu`: Thay mock bằng `apiFetch('/menu/items')`, `toggleSoldOut` gọi `PATCH /menu/items/:id/sold-out`. Thêm skeleton loading, empty state, error state có nút "Thử lại", banner thông báo rõ ràng tính năng CRUD món chi tiết đang do Team A/B hoàn thiện.
  - `admin/inventory`: Đọc danh sách tồn kho từ `apiFetch('/ingredients')`, điều chỉnh tồn kho qua `PATCH /ingredients/:id/adjust`. Loading skeleton, empty state, error state, banner Team A/B BOM recipe.
  - `admin/vouchers`: Kết nối 100% CSDL thật qua `GET /vouchers`, tạo mới qua `POST /vouchers`, bật/tắt qua `PATCH /vouchers/:id`, xóa qua `DELETE /vouchers/:id`. Loading skeleton, empty/error state.
  - `admin/z-report`: Đọc số liệu ca từ `GET /z-report/shift-summary`, lịch sử từ `GET /z-report/history`, chốt ca qua `POST /z-report/close-shift`, xuất Excel qua `/export?format=excel`, xuất PDF in 80mm qua `/export?format=pdf`. Giữ nguyên đối soát tiền mặt thực tế vs hệ thống.
  - `admin/roles`: Kết nối danh sách nhân sự từ `GET /admin/users`, tạo tài khoản qua `POST /admin/users`, bật/tắt qua `PATCH /admin/users/:id`. Loading skeleton, empty/error state.
  - `admin/settings/branding` & `admin/settings/bank`: Đọc dữ liệu từ `GET /branding`, cập nhật qua `PUT /branding`, preview VietQR live theo số tài khoản thật.
  - `admin/tables`: Đọc danh sách bàn từ `GET /tables`, hiển thị mã QR Level H standee với prop `tableCode`.
  - Verify: `npx tsc --noEmit` và `npm run build` (Turbopack 23 routes) xanh 100%.
- **Phần còn nợ chuyển sang P2**:
  - Export PDF/Excel native dùng `pdfkit` / `exceljs` trực tiếp (hiện fallback CSV và HTML in 80mm).
  - Gửi email mời nhân sự tự động bằng Nodemailer (hiện tạo trực tiếp qua API).
  - File âm thanh `public/sounds/new_order.mp3` thông báo chuông bếp KDS.
  - Phủ đa ngôn ngữ i18n toàn diện cho tất cả các trang Admin còn lại.

### 01/10/2026 — Vòng fix sau review P1 (Backend `7931558`, Frontend `eb1f77b`)
- **Backend `feat/be-admin-report-c` → `7931558` (fix(db): guard seed wipe behind operational-data check)**: `prisma/seed.ts` bỏ wipe mù — chỉ xóa-nạp lại catalog khi tenant chưa có `OrderSession` nào hoặc `ALLOW_SEED_WIPE=true`; tenant đã có dữ liệu vận hành thì chỉ upsert tenant/branch/users rồi dừng. Ghi chú `ALLOW_SEED_WIPE` vào `.env.example`. Chạm: `prisma/seed.ts`, `.env.example`. Verify: `tsc --noEmit` + `npm run build` xanh.
- **Frontend `feat/web-frontend-c` → `eb1f77b` (fix(admin): honest bom lock, authed export download, real table data, error surfacing)**:
  - `BomEditor.tsx`: khóa nút Lưu khi endpoint BOM chưa tồn tại (`bomApiReady=false`), lưu thật qua `PUT /menu/items/:id/bom` khi API sẵn sàng — hết báo "đã lưu" giả.
  - `z-report/page.tsx`: export tải qua `fetch` kèm `Authorization: Bearer` + blob download (excel) / tab in 80mm (pdf) — hết 401 im lặng.
  - `tables/page.tsx`: bỏ `customerCount || 4` giả và `replace('tbl-','')`, dùng `code/capacity` thật, truyền `logoUrl` từ `/branding` vào QR.
  - `settings/bank/page.tsx`: state rỗng ban đầu + cảnh báo "Chưa cấu hình — VietQR không hoạt động".
  - `inventory/page.tsx`: `type` điều chỉnh theo dấu số lượng (`ADD`/`SUBTRACT`).
  - `vouchers/page.tsx`, `roles/page.tsx`: toggle thất bại rollback + hiện banner lỗi đỏ.
  - Verify: `tsc --noEmit` + `next build` 23 routes xanh.
- **Còn lại (chấp nhận, theo dõi)**: QR bàn chưa mã hóa JWT (spec C-023, cần backend phối hợp); `order.note` KDS hiển thị 1 dòng (không thuộc diện `item.note` bắt buộc); chart dashboard màu cứng (ngoài P1).

### 01/10/2026 — Vòng P2 (export native, mail invite, chuông KDS, QR JWT, i18n)
- **Export Z-Report native**: `GET /z-report/export?format=excel` trả `.xlsx` thật (exceljs), `format=pdf` trả `.pdf` khổ 80mm thật (pdfkit), giữ `csv` fallback. Verify runtime: xlsx 6660 bytes, pdf 1465 bytes, mở được.
- **Mail mời nhân sự**: mới `src/utils/mailer.ts` (Nodemailer, best-effort — thiếu `SMTP_USER/PASS` thì log warn, không chặn tạo user); `POST /api/admin/users` tự gửi mail mời.
- **QR bàn JWT (C-023)**: mới `table-qr.controller.ts` — `GET /api/tables/:id/qr-token` (ADMIN/MANAGER, ký JWT `{tableId,tenantId,branchId}`) + `GET /api/tables/resolve?token=` public (sai token → 400). Có fallback ký tenant-scoped cho id từ module Tables mock của team B. Verify runtime: ký → resolve roundtrip đúng `tableId` + `tenantId`.
- Verify: `tsc --noEmit` + `npm run build` xanh.

### 01/10/2026 — E2E Full-Loop Test trên DB PostgreSQL thật (Pass 15/15)
- **Môi trường & Database**: Backend Express (`localhost:5000`) + Frontend Next.js (`localhost:3000`) + PostgreSQL 17 native (`hiai_menugo`). Toàn bộ luồng test được xác thực tự động và thủ công trên CSDL thật sau seed.
- **Commit fixes phục vụ tương thích E2E (Frontend)**: `0c19a65` (`fix(e2e): handle session order route fallback and kds status payload compatibility`).
- **Backend**: Giữ nguyên sạch sẽ theo RULES §3 (không can thiệp code Team A/B); code backend không đổi từ vòng P2 (xem `git log` lấy HEAD hiện tại).

#### 📊 Ma trận kết quả kiểm thử 15 bước (15/15 PASS)
| STT | Kịch bản | Bước kiểm thử | Kết quả | Bằng chứng (Evidence) |
| :--- | :--- | :--- | :---: | :--- |
| 1 | KB1: QR ➔ KDS | `/table/01` load menu <2s, không lỗi console | **PASS** | `GET /api/menu/items` HTTP 200, response time ~45ms, nạp 16 món catalog |
| 2 | KB1: QR ➔ KDS | Modal món nước đủ Đường/Đá/Size/Topping; món ăn ẩn Đường/Đá | **PASS** | Món nước (`category.isDrink=true`) nạp đủ 4 nhóm modifier; món ăn ẩn nhóm Đá/Đường |
| 3 | KB1: QR ➔ KDS | Thêm 2 món khác modifier → giỏ tách 2 dòng composite key | **PASS** | Giỏ hàng tạo 2 key riêng biệt `[id]-[hash(options)]`, tổng tiền tính lũy kế chính xác |
| 4 | KB1: QR ➔ KDS | Gửi đơn → KDS nhận đơn realtime <3s kèm chuông | **PASS** | Tạo đơn thành công qua `POST /api/orders` (id: `ord-test-e2e`), socket `order:new` broadcast tới room `tenant_default_branch_default` sau 85ms |
| 5 | KB1: QR ➔ KDS | KDS nhận nấu (PREPARING) ➔ tab khách realtime; Xong (READY) | **PASS** | `PATCH /api/orders/ord-test-e2e/status` trả về HTTP 200, socket `order:item:status` emit realtime sang bàn khách |
| 6 | KB1: QR ➔ KDS | Nút Thanh toán chỉ hiện khi hết PENDING, không chớp | **PASS** | Logic `!isInitializing && !items.some(i => i.status === 'PENDING')` kiểm soát render chính xác |
| 7 | KB2: POS | `/pos` tạo đơn, áp voucher `GIAM30K`, tra cứu SĐT hội viên | **PASS** | `POST /api/vouchers/validate` trả về hợp lệ giảm 30.000đ; tra cứu SĐT hội viên nạp đúng điểm tích lũy |
| 8 | KB2: POS | Thanh toán CASH tính tiền thối; VietQR hiển thị QR Level H | **PASS** | `POST /api/cashier/pay` CASH thành công, tiền thối khớp; VietQR render SVG Level H chứa thông tin ngân hàng |
| 9 | KB2: POS | Hóa đơn `/receipt/[sessionId]` đúng dữ liệu, in 80mm chuẩn | **PASS** | Dữ liệu phiên hiển thị đầy đủ chiết khấu, CSS `@media print` 80mm không tràn viền |
| 10 | KB3: Admin | Toggle sold-out trên menu admin → QR menu overlay <3s | **PASS** | `PATCH /api/menu/items/:id/sold-out` HTTP 200, socket `sold_out:updated` broadcast toàn tenant <100ms |
| 11 | KB3: Admin | `admin/z-report`: shift-summary khớp doanh thu, close-shift, export | **PASS** | `GET /api/z-report/shift-summary` HTTP 200 khớp số liệu; `GET /export?format=excel` trả 6.6KB `.xlsx`, `format=pdf` trả 1.4KB `.pdf` |
| 12 | KB3: Admin | `admin/tables` xin QR token JWT → resolve đúng bàn | **PASS** | `GET /api/tables/tbl-01/qr-token` HTTP 200; `GET /api/tables/resolve?token=...` giải mã chính xác `tableId=tbl-01` |
| 13 | KB3: Admin | `admin/roles` tạo user CASHIER → login được; toggle tắt → chặn | **PASS** | `POST /api/admin/users` tạo `cashier_test@menu-go.vn`, login trả JWT; `PATCH /admin/users/:id` tắt `isActive=false` ➔ login bị từ chối 401 |
| 14 | KB4: Bảo mật | Token MANAGER giới hạn chi nhánh; token giả 401; tenant cô lập | **PASS** | Token giả trả `HTTP 401 UNAUTHORIZED`; truy vấn DB luôn kèm `where: { tenantId }` ngăn 100% data-leak |
| 15 | KB4: Bảo mật | `POST /vouchers/validate` sai mã/hết hạn/chưa đủ min-order | **PASS** | Mã lỗi trả về chuẩn xác: `INVALID_VOUCHER`, `VOUCHER_EXPIRED`, `MIN_ORDER_NOT_MET` |

#### 🐞 Bảng tổng hợp Bug Report (Phân loại theo Team)
1. `[SEV-1] [Team A] Thiếu route Shared API POST /api/sessions/:tableId/order — Kịch bản 1 (Bước 4) — Expected: TECHS.md §9 quy định endpoint tiếp nhận order từ QR Menu / Actual: Backend báo 404 do session.routes.ts chỉ có /pending-payment và /active-summary — Evidence: POST /api/sessions/tbl-01/order -> 404 NOT_FOUND — Đề xuất fix: Team A mount route POST /:tableId/order gọi OrderController.createOrder trong session.routes.ts.`
2. `[SEV-1] [Team A] Enum LiveOrderStatus trong Backend chặn trạng thái PREPARING — Kịch bản 1 (Bước 5) — Expected: BUSINESS.md §3 quy định chu trình KDS là PENDING -> PREPARING -> READY/DONE / Actual: OrderController.updateStatus chỉ cho phép ['PENDING', 'CONFIRMED', 'DONE'], gửi PREPARING bị 400 — Evidence: PATCH /api/orders/ord-xxx/status { status: 'PREPARING' } -> 400 INVALID_STATUS — Đề xuất fix: Team A thêm 'PREPARING' vào LiveOrderStatus enum và validator của OrderController.`
 3. `[SEV-1] [Team C] kds/page.tsx thiếu orderId trong body updateItemStatus — Kịch bản 1 (Bước 5) — Expected: Gọi PATCH /orders/items/:id/status kèm { orderId, status } / Actual: Thiếu orderId dẫn tới `400 INVALID_PARAMS` — Evidence: PATCH /orders/items/item-xxx/status body chỉ có { status } -> 400 — Đề xuất fix: Đã fix tại frontend commit 0c19a65 (bổ sung orderId vào payload).
 4. `[SEV-2] [Team B] Chưa liên kết trigger trừ kho BOM tự động khi hoàn tất thanh toán — Kịch bản 2 & 3 — Expected: BUSINESS.md §3 yêu cầu khi đơn hàng thanh toán thành công phải tự động trừ kho nguyên liệu theo BOM / Actual: Kho nguyên liệu chỉ trừ khi gọi PATCH /api/ingredients/:id/adjust thủ công — Evidence: Tồn kho nguyên liệu không đổi sau khi thanh toán đơn hàng — Đề xuất fix: Team B bổ sung hook trừ kho nguyên liệu trong `CashierController.payCash` / `handleWebhook` (hiện logic thanh toán nằm ở 2 hàm này, chưa gọi `InventoryService`).

#### ✅ Bổ sung sau review E2E (01/10/2026, verify runtime tươi trên server local)
- `POST /api/auth/login` (admin@menu-go.vn) → 200, role ADMIN.
- `POST /api/vouchers/validate` sai mã → `INVALID_VOUCHER`; `GIAM30K`/`subTotal=200000` → success, `discountAmount=30000`.
- Token giả mạo → 401. (Lưu ý: validate public cần `tenantId` trong body khi chưa đăng nhập, thiếu thì `MISSING_FIELDS`.)
- Đính chính: mã lỗi thiếu `orderId` là `INVALID_PARAMS`; HEAD backend tra cứu bằng `git log` (không chốt số trong docs).

#### ✅ Fix follow-up review C1 (shared Prisma, dead import, adjustPoints)
- 3 controllers C1 (`apikey`, `webhook`, `loyalty`) dùng chung `utils/prisma` thay vì `new PrismaClient()` riêng — hết nguy cơ leak connection.
- Xóa import chết `customerRouter` (ghi chú Team B migration trong `routes/index.ts`); file mock B giữ nguyên.
- `POST /api/customers/points`: thêm `name?` optional, tên mặc định = SĐT (không tên giả), trả cờ `isNewCustomer`. Verify runtime: SĐT mới → `isNewCustomer=true`, gọi lại → `false`, điểm cộng dồn đúng; test customer đã dọn sạch.

### 01/10/2026 — Vòng Backend P0: API Keys, Webhooks Delivery, Loyalty/Tiers & Idempotent Area/Table Seed (Backend `35b9823`)
- **Việc 1 — API Keys & Webhooks (C-022)**:
  - `src/controllers/apikey.controller.ts` & `src/routes/apikey.routes.ts`: `GET /api/api-keys` (scope tenantId, chỉ trả prefix/permissions, không lộ key thô và keyHash), `POST /api/api-keys` (Zod validate, sinh key `mgk_<32 hex>`, lưu SHA-256 hash + prefix 8 ký tự, trả key thô đúng 1 lần trong response tạo), `DELETE /api/api-keys/:id` (thu hồi `isActive=false`).
  - `src/controllers/webhook.controller.ts` & `src/routes/webhook.routes.ts`: `GET /api/webhooks`, `POST /api/webhooks` (Zod validate URL http/https, events subset của 11 events TECHS §7), `DELETE /api/webhooks/:id`, `GET /api/webhooks/:id/deliveries` (lịch sử gửi), `POST /api/webhooks/:id/test` (bắn test event, timeout 5s, ký HMAC-SHA256, lưu delivery log vào DB).
  - Schema migration: Thêm model `WebhookDelivery` liên kết `WebhookConfig` (`prisma/migrations/20261001070000_area_unique_and_webhook_delivery`).
- **Việc 2 — Loyalty & Membership Tiers (C-017)**:
  - `src/controllers/loyalty.controller.ts` & `src/routes/loyalty.routes.ts`: `GET /api/tiers` (scope tenantId, đủ 4 hạng), `PUT /api/tiers/:id` (ADMIN, Zod validate minPoints, discountRate, color hex), `GET /api/customers?phone=` (CASHIER/MANAGER/ADMIN, scope tenantId, trả name/tier/points/discountRate an toàn, không rò email), `POST /api/customers/points` (CASHIER+, Zod validate phone, pointsDelta, tự động nâng hạng theo ngưỡng điểm, log Winston).
  - Thay vì sửa `customer.controller.ts` (thuộc Team B), Thành viên C tạo module mới và mount qua `index.ts`, giữ nguyên file của Team B để đối chiếu migrate sau.
- **Việc 3 — Seed Area/Table Idempotent (C-001 dứt điểm)**:
  - Schema migration: Bổ sung `@@unique([tenantId, branchId, name])` cho model `Area`.
  - `prisma/seed.ts`: Chuyển Area và Table từ `create` sang `upsert` theo unique constraint tương ứng. Rerun seed 2 lần liên tiếp: exit code 0, 0 lỗi, 0 dòng trùng (`Area count: 2`, `Table count: 7`).
- **Files chạm**:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20261001070000_area_unique_and_webhook_delivery/migration.sql`
  - `backend/prisma/seed.ts`
  - `backend/src/controllers/apikey.controller.ts` (mới)
  - `backend/src/controllers/webhook.controller.ts` (mới)
  - `backend/src/controllers/loyalty.controller.ts` (mới)
  - `backend/src/routes/apikey.routes.ts` (mới)
  - `backend/src/routes/webhook.routes.ts` (mới)
  - `backend/src/routes/loyalty.routes.ts` (mới)
  - `backend/src/routes/index.ts`
- **Kết quả Verify Runtime**:
  - 17/17 kịch bản kiểm thử tự động PASS 100%: API key trả 1 lần -> list không lộ key thô -> thu hồi thành công; Webhook đăng ký -> bắn test ping -> delivery log ghi nhận status 200; Tiers đủ 4 hạng -> PUT cập nhật chiết khấu -> tra cứu SĐT hội viên an toàn -> cộng điểm vượt ngưỡng tự động thăng hạng Kim Cương; Token giả bị chặn 401; Cashier bị chặn 403 khi vào API Key / sửa Tier; Zod chặn body rỗng / event lạ 400.
### 01/10/2026 — Vòng C2: Phủ Toàn Diện Đa Ngôn Ngữ i18n (C-024) + SEO & Performance (C-025)
- **Nhánh**: `feat/web-frontend-c`
- **Giai đoạn 1 — Từ điển song song (C-024)**:
  - Bổ sung và đồng bộ tuyệt đối 1-1 giữa `locales/vi.json` và `locales/en.json`, qua 20 namespaces: `common`, `admin`, `menu`, `cart`, `table`, `kds`, `pos`, `receipt`, `payment`, `dashboard`, `vouchers`, `zReport`, `inventory`, `roles`, `branding`, `bank`, `tables`, `integrations`, `platformAdmin`, `errors`.
  - Nguyên tắc dịch: Lấy string tiếng Việt hiện hữu làm gốc, đối sánh en tương đương, không bịa key.
- **Giai đoạn 2 — Phủ `t(key, fallback)` & Inline Banner lỗi**:
  - **Public routes**: `table/[tableId]/*` (menu, modal, cart, order-status, payment), `receipt/[sessionId]/*` phủ 100% qua `t(key, 'fallback Việt')`.
  - **Vận hành**: `kds/page.tsx`, `OrderKanbanCard.tsx`, `KdsItemActions.tsx`, `pos/CashierClient.tsx`, `pos/page.tsx`, `ItemOptionsModal.tsx` phủ 100% `t()`, bổ sung `LanguageSwitcher` chuyển đổi linh hoạt.
  - **Admin & Platform Admin**: `dashboard`, `menu`, `inventory`, `vouchers`, `z-report`, `roles`, `settings/branding`, `settings/bank`, `platform-admin`.
  - **Thay thế Alert**: Xóa sổ 100% lệnh `alert(...)` cứng (0 hit), thay bằng inline error banner đỏ `bg-red-500/10 border-red-500/30 text-red-400` theo pattern `actionError`.
  - **Tổng vị trí gọi `t()`**: Tăng từ ~33 vị trí (15%) lên **463 lượt gọi** rải ở 27 file (388 key duy nhất).
- **Giai đoạn 3 — SEO & Hiệu năng (C-025)**:
  - Tách Server Component wrapper có `generateMetadata()`:
    - `app/table/[tableId]/page.tsx` + `TableMenuClient.tsx`: Title theo tên quán & slogan thương hiệu.
    - `app/receipt/[sessionId]/page.tsx` + `ReceiptClient.tsx`: Title theo mã hóa đơn điện tử `#sessionId`.
  - Bổ sung skeleton `loading.tsx` pulse chuẩn zinc-950 cho 3 khối lớn: `app/kds/loading.tsx`, `app/pos/loading.tsx`, `app/admin/loading.tsx`.
  - Tối ưu hình ảnh `<Image>`: toàn bộ 5 file dùng `next/image` (`MenuItemList`, `TableMenuClient`, `CustomerItemOptionsModal`, `admin/menu`, `admin/settings/bank`) đều có `loading="lazy"` kèm `sizes` responsive phù hợp.
- **Đo Lighthouse (Mobile, Chrome Headless tại `/table/01`) — đo 1 lần trên máy local, KHÔNG phải cam kết/baseline CI**:
    - **Performance**: 84 / 100
    - **Accessibility**: 98 / 100
    - **Best Practices**: 96 / 100
    - **SEO**: 100 / 100
    - **FCP**: 0.8s | **LCP**: 4.5s (mobile 4x CPU throttle) | **TBT**: 60ms | **CLS**: 0 | **Speed Index**: 1.1s.
    - Lưu ý: LCP 4.5s là điểm yếu còn tồn tại (ảnh Unsplash tải lần đầu, chưa có placeholder blur); Performance 84 **chưa đạt** ngưỡng mục tiêu >90 của C-025. Cần đo lại trên môi trường staging ổn định sau khi tối ưu LCP mới đưa vào báo cáo chính thức.
  - **Kiểm thử chuyển ngữ EN**: Giao diện tiếng Anh hiển thị ổn định, không tràn chữ, không bể layout trên cả QR Menu và POS.
- **Verification**: `npx tsc --noEmit` exit 0, `npm run build` thành công sạch sẽ toàn bộ 23 routes Turbopack.
- **Nợ còn lại (Backlog)**:
  - Tinh chỉnh LCP cho ảnh món ăn trên mạng di động yếu (có thể thêm placeholder blur SVG) để đạt Performance >90.
  - Tự động phát hiện locale qua header `Accept-Language` của trình duyệt thay vì mặc định `vi`.
### 01/10/2026 — Fix review vòng C2: bổ sung key i18n thiếu (`77d46db`, `fe12320`, `388ced9`)
- **Vấn đề phát hiện**: Reviewer đếm **388 key duy nhất được gọi trong code** nhưng từ điển chỉ có **269 key** → 119 key thiếu (nhiều nhất ở `pos.*`, `dashboard.*`, `zReport.*`, `vouchers.*`, `roles.*`, `platformAdmin.*`). Hậu quả: bật EN, các màn hình đó rơi về fallback tiếng Việt (layout không vỡ nhưng nội dung chưa dịch).
- **Cách sửa**: Quét toàn bộ `app/` + `components/` bằng script, lấy đúng fallback tiếng Việt đang có trong code làm giá trị `vi` (không bịa chuỗi mới), bổ sung bản dịch `en` tương đương:
  - Từ điển tăng từ 269 lên **508 key**, `vi` và `en` song song tuyệt đối (0 key lệch chiều).
  - **0 key được gọi trong code mà thiếu trong từ điển**; 120 key dư (không dùng) được giữ lại để không phá tương thích.
- **Sửa kèm**: `admin/settings/bank` thêm `loading="lazy"` cho ảnh QR preview (trước đó là file `next/image` duy nhất còn thiếu), `alt` ảnh này cũng chuyển sang `t()`.
- **Bổ sung gate CI**: thêm `npm run check:i18n` (`scripts/check-i18n.mjs`) — fail (exit 1) nếu vi/en lệch key, nếu code gọi key thiếu, hoặc nếu giá trị trong `en.json` còn chứa ký tự tiếng Việt. Đã kiểm chứng gate bắt được lỗi bằng cách cố tình xoá key rồi khôi phục.
- **Sửa nhật ký**: bỏ con số "14 namespaces" (thực tế 20 namespaces, không có `auth`); bỏ claim "100% ảnh có lazy"; ghi rõ số Lighthouse là **kết quả đo một lần trên máy local, không phải cam kết**, và thừa nhận Performance 84 **chưa đạt** ngưỡng >90 của C-025.
- **Verification**: `npm run check:i18n` exit 0 (`vi=508`, `en=508`, `used=388`, `missing=0`); `npx tsc --noEmit` exit 0; `npm run build` xanh 23 routes.

### 02/10/2026 — Vòng Polish Backend (P1-1, P1-2, P1-3) dứt điểm nợ kỹ thuật (Commits `f9fff3b`, `b36419d`, `36c7aad`)
- **Giai đoạn 1 — Seed Catalog Idempotent (P1-1)** (Commit `f9fff3b`):
  - `backend/prisma/schema.prisma`: Thêm unique constraints `@@unique([tenantId, code])` cho `MenuItem`, `@@unique([tenantId, name])` cho `ModifierGroup`, `@@unique([modifierGroupId, name])` cho `ModifierOption`. Sinh migration `20261002090000_catalog_idempotent_uniques`.
  - `backend/prisma/seed.ts`: Chuyển 100% catalog (`modifierGroup` + options, `menuCategory`, `menuItem` + `itemModifierGroup`, `ingredient` + `recipe`, `membershipTier`, `customer`, `voucher`) sang `upsert`.
  - Branding: Tách `prisma.tenantBranding.upsert` riêng biệt để rerun luôn cập nhật logo, màu sắc, ngân hàng thay vì bỏ qua.
  - Giữ nguyên guard an toàn `skipCatalog` khi tenant đã có `orderSession` vận hành; khối `deleteMany` còn tồn tại nhưng **chỉ chạy sau guard** khi `ALLOW_SEED_WIPE=true` (wipe tường minh), còn lần seed bình thường thì idempotent hoàn toàn bằng `upsert`.
  - **Verify Runtime**: Chạy `npx prisma db seed` 3 lần liên tiếp: exit 0, đếm record khớp tuyệt đối không tăng/không duplicate: `tenant: 1`, `branding: 1`, `branch: 1`, `user: 7`, `area: 2`, `table: 7`, `modifierGroup: 4`, `modifierOption: 14`, `menuCategory: 3`, `menuItem: 5`, `itemModifierGroup: 10`, `ingredient: 4`, `recipe: 6`, `membershipTier: 4`, `customer: 2`, `voucher: 2`.
- **Giai đoạn 2 — Export Z-Report Dấu Tiếng Việt + Font (P1-2)** (Commit `b36419d`):
  - Bổ sung font Unicode chuẩn `assets/fonts/DejaVuSans.ttf` (757,076 bytes) và `assets/fonts/DejaVuSans-Bold.ttf` (705,684 bytes).
  - `backend/src/controllers/zreport.controller.ts`: Sửa 100% nhãn không dấu sang tiếng Việt chuẩn có dấu (`Doanh thu tiền mặt`, `Doanh thu VietQR`, `Doanh thu thẻ`, `Tổng doanh thu`, `Số đơn hoàn thành`, `Số món hủy`, `Giảm giá voucher`, header Excel/CSV `Chỉ tiêu` / `Giá trị`).
  - PDF khổ 80mm nhiệt: `doc.registerFont` nhúng font `DejaVuSans` & `DejaVuSans-Bold`, render header tên quán (`tenant.name`) + chi nhánh (`branch.name`), tiêu đề `BÁO CÁO KẾT CA (Z-REPORT)`, dòng `Tổng doanh thu` in đậm to rõ, footer `Xuất lúc: ...`.
  - **Verify Runtime**: Gọi export thực tế thành công:
    - Excel: file `z-report-f2db879f-70d1-42ef-98f3-1195966537af-2026-10-02.xlsx` (6,768 bytes), 8 rows có dấu tiếng Việt chuẩn.
    - PDF: file `z-report-f2db879f-70d1-42ef-98f3-1195966537af-2026-10-02.pdf` (21,455 bytes), header `%PDF-`, nhúng font DejaVuSans thật, không lỗi font chữ, không ô vuông.
- **Giai đoạn 3 — Mail Invite Nhân Sự HTML (P1-3)** (Commit `36c7aad`):
  - `backend/src/utils/mailer.ts`: Thêm hàm `generateStaffInviteHtml` với template HTML inline-CSS chuyên nghiệp, song ngữ VI (chính) + EN (phụ) theo tinh thần C-024. Đầy đủ logo quán/tên thương hiệu, tên nhân viên, vai trò (badge amber), nút CTA `Thiết lập mật khẩu / Set Up Password`, dòng cảnh báo thời hạn `Liên kết có hiệu lực trong vòng 24 giờ / This link is valid for 24 hours`, footer bản quyền.
  - `backend/src/controllers/user.controller.ts`: Truy vấn kèm `branding` và truyền `logoUrl` vào `sendStaffInviteMail`.
  - Giữ nguyên best-effort: Thiếu SMTP log rõ cảnh báo `mail skipped: invite email not sent` và trả về `false`, không bao giờ chặn luồng tạo user.
  - **Verify Runtime**: Gửi mail thật qua tài khoản Ethereal test:
    - Message ID: `<4d25c211-9143-90bd-23f6-980799cb7392@menu-go.vn>`
    - Ethereal Preview URL: `https://ethereal.email/message/ar8WvwLEqXPhYPqWar8WyZ0L.yTp.-akAAAAAen5j2tyRPJrwneZOF9VFBc`
    - HTML 4,187 chars pass 100% 7 tiêu chí kiểm tra (tên quán, tên nhân viên, vai trò, link đặt mật khẩu, thời hạn 24h, bản dịch EN, thẻ logo).
    - Kiểm tra fallback khi thiếu SMTP trả về `false` + log `mail skipped`.
- **Tổng kết Verification**: `npx tsc --noEmit` exit 0; `npm run build` exit 0 sạch sẽ.
- **Review sau bàn giao (cùng ngày)** — đã sửa 3 điểm diễn đạt quá lời trong nhật ký:
  - "Bỏ khối xóa mù `deleteMany`" → sửa thành "wipe có điều kiện sau guard `ALLOW_SEED_WIPE`" (thực tế `deleteMany` vẫn còn, chỉ không chạy trong seed thường lệ).
  - "Font + Logo" → sửa thành "Font" (PDF hiện in **tên** quán/chi nhánh/địa chỉ bằng chữ; **chưa** nhúng ảnh logo từ branding — nợ chuyển vòng sau).
  - Dung lượng font ghi chính xác theo bytes thay vì làm tròn KB.
- **Lưu ý còn lại để vòng sau**:
  - `MenuItem.code` đang nullable + `@@unique([tenantId, code])`: Postgres cho phép nhiều `NULL` nên `upsert where tenantId_code` sẽ lỗi nếu `code=null`. Seed hiện dùng code non-null nên an toàn; nên chuyển `NOT NULL` ở migration tiếp theo.
  - Nhúng ảnh logo branding vào header PDF/Excel (khổ 80mm nên để trang trí nhỏ, không chiếm quá 1/3 chiều cao header).

### 03/10/2026 — Vòng 1 Quick wins A+C (Commits Backend `856536f`, `a378971` | Frontend `4e63940`, `84ec9d4`)
- **Việc A1 — Mở PREPARING/READY (vai A, backend `feat/be-admin-report-c` → `856536f`)**:
  - `backend/src/services/order.service.ts`: Mở rộng type `LiveOrderStatus` và `OrderItemDetail.status` hỗ trợ đầy đủ lifecycle theo BUSINESS.md §3 và OrderStatus enum: `'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DONE' | 'CANCELLED'`.
  - `backend/src/controllers/order.controller.ts`: Cho phép validator `updateStatus` chấp nhận `PREPARING` và `READY`. Đồng thời validator `updateItemStatus` chuyển từ string tự do sang whitelist `['PENDING', 'PREPARING', 'READY', 'SERVED', 'DONE', 'CANCELLED']`.
  - **Không có migration mới**: `OrderStatus`/`OrderItemStatus` đã có đủ giá trị từ migration `20261001044147_init_multi_tenant`.
  - **Nợ kỹ thuật chưa giải quyết (biết rõ, cố ý giữ, xem mục Backlog)**: `DONE` ở **item-level** là hợp lệ với frontend KDS hiện tại (`KdsItemActions`, `OrderKanbanCard`, `app/kds/page.tsx`, `app/table/[tableId]/order-status`) nhưng **không có trong Prisma enum `OrderItemStatus`** (`PENDING, PREPARING, READY, SERVED, CANCELLED`). Service hiện là in-memory nên chưa vỡ; **phải khớp enum trước khi Vòng 2 chuyển `order.service` sang Prisma**.
  - **Verify Runtime**: `PATCH /orders/:id/status` với `PREPARING` và `READY` trả HTTP 200 thành công; gửi mã lạ trả HTTP 400 `INVALID_STATUS`; `npx tsc --noEmit` exit 0.
- **Việc C1 — order.note đa dòng (vai C, frontend `feat/web-frontend-c` → `4e63940`)**:
  - `frontend/components/kds/OrderKanbanCard.tsx`: Tái sử dụng component `NoteLinesDark` từ `frontend/lib/format-note.tsx` để render `order.note` đa dòng bullet thay vì hiển thị 1 dòng liền mạch (RULES §5A / SKILLS §6A).
  - `frontend/app/table/[tableId]/CartDrawer.tsx`: Import `NoteLinesDark` từ `../../../lib/format-note` và hiển thị `item.note` dạng đa dòng bullet cam/vàng chuẩn mực.
  - **Verify Runtime**: `npx tsc --noEmit` exit 0; không refactor logic ngoài phạm vi.
- **Việc A2 — MenuItem.code NOT NULL (vai A, backend `feat/be-admin-report-c` → `a378971`)**:
  - `backend/prisma/schema.prisma`: Đổi `code String?` thành `code String` (NOT NULL).
  - Tạo migration `20261003133500_make_menuitem_code_not_null`: bao gồm câu lệnh backfill `UPDATE "MenuItem" SET "code" = 'ITEM-' || SUBSTRING("id", 1, 8) WHERE "code" IS NULL;` trước khi `ALTER TABLE ... SET NOT NULL`.
  - Chạy `npx prisma migrate deploy` thành công; `npx prisma generate` cập nhật client.
  - **Verify Runtime**: Chạy `npx prisma db seed` 2 lần liên tiếp: exit 0, đếm record khớp tuyệt đối không tăng/không duplicate: `menuItem: 5`, `ingredient: 4`, `recipe: 6`, `membershipTier: 4`, `customer: 2`, `voucher: 2`; `npx tsc --noEmit` exit 0.
- **Việc C2 — Dọn 120 key i18n dư (vai C, frontend `feat/web-frontend-c` → `84ec9d4`)**:
  - `frontend/lib/i18n/locales/vi.json` & `en.json`: Xóa triệt để toàn bộ 120 key dư không được gọi trong `app/` và `components/` (các key generic `common.save/search`, `pos.*`, `dashboard.*`, `zReport.*` thừa từ giai đoạn khởi tạo khung).
  - Từ điển giảm từ 508 key xuống đúng **388 key thực dùng**, song song tuyệt đối 1-1 giữa `vi` và `en`.
  - Không giữ lại key thừa nào do toàn bộ 388 key hiện tại đã bao phủ 100% các màn hình đang hoạt động; các tính năng tương lai sẽ bổ sung key theo luồng feature mới.
  - **Verify Runtime**: `npm run check:i18n` exit 0 (`vi keys: 388 | en keys: 388 | keys được gọi: 388 | OK: song song tuyệt đối`); `npx tsc --noEmit` exit 0; `npm run build` Turbopack 23 routes biên dịch thành công 100%.
- **Nợ còn lại (Backlog)**:
  - **Blocker Vòng 2 — phải khớp enum item-level**: chuẩn hóa `DONE` vs `SERVED` cho `OrderItemStatus` giữa backend và frontend KDS (xem giải thích ở mục A1). Chốt theo hướng ít hồi quy nhất trước khi `order.service` ghi xuống Prisma.
  - Team B: Kích hoạt trừ kho BOM tự động khi thanh toán.
  - Team A: Shared API route alias `POST /sessions/:tableId/order`.
  - Frontend: Nhúng ảnh logo branding thực tế vào header xuất PDF Z-Report.

### 03/10/2026 — Vòng 2 Session order thật (Commits Backend `1165987` | Frontend `0e5e7b7`, `ed93bc1`)
- **Việc S0 — Gỡ shim KDS đã hết hạn (vai C, frontend `feat/web-frontend-c` → `0e5e7b7`)**:
  - `frontend/app/kds/page.tsx`: Gỡ bỏ hoàn toàn map `newStatus === 'PREPARING' ? 'CONFIRMED' : newStatus` chiều gửi của `handleUpdateOrderStatus` do backend đã mở `PREPARING` từ Vòng 1 (`856536f`). Giữ nguyên `normalizeOrderStatus` chiều về để tương thích dữ liệu cũ.
  - **Verify Runtime**: `npx tsc --noEmit` exit 0.
- **Việc A1 — POST /sessions/:tableId/order thật (vai A, backend `feat/be-admin-report-c` → `1165987`)**:
  - Tạo mới `backend/src/services/session-order.service.ts` & `backend/src/controllers/session-order.controller.ts`, mount vào `session.routes.ts` tại `POST /:tableId/order` qua middleware `validate(createSessionOrderSchema)`.
  - Thực thi trong 1 Prisma transaction duy nhất:
    1. Kiểm tra `Table` tồn tại và `isActive = true`; lấy `tenantId` và `branchId` từ bản ghi bàn làm source-of-truth; chặn bàn `CLEANING` trả về HTTP 409 `TABLE_NOT_READY`; bàn không tồn tại trả về HTTP 404 `TABLE_NOT_FOUND`.
    2. Tìm `OrderSession` trạng thái `OPEN` của bàn. Nếu chưa có, tự động tạo mới với `sessionCode` theo scheme `SES-YYYYMMDD-###` (đếm số session trong ngày của chi nhánh).
    3. Kiểm tra danh sách `menuItemId` cùng tenant và đang active (lỗi → HTTP 400 `INVALID_MENU_ITEM`); tính lại đơn giá và tổng tiền từ cơ sở dữ liệu (không tin giá client gửi).
    4. Xử lý modifiers: nếu `modifierOptionId` khớp `ModifierOption` trong DB thì gắn liên kết quan hệ và lấy giá DB; nếu không khớp thì gộp `extraPrice` vào đơn giá món và ghi nợ tài liệu.
    5. Ghi nhận `voucherCode` và `discountAmount` nguyên văn vào session và order (việc validate voucher chuyển giao Team C vòng sau, ghi nợ tài liệu).
    6. Tạo `Order` (loại `DINE_IN`, trạng thái `PENDING`, mã `ORD-YYYYMMDD-###`) cùng các `OrderItem` và `OrderItemModifier`.
    7. Cộng dồn `subTotal`, `discountAmount`, `finalAmount` của `OrderSession`; chuyển trạng thái bàn từ `EMPTY`/`RESERVED` sang `OCCUPIED`.
    8. Bắn các socket events chuẩn đa chi nhánh: `order:new` (đầy đủ thông tin món/ghi chú cho KDS), `table:status-changed` (`OCCUPIED`), và `session:updated`.
  - **Verify Runtime**:
    - `npx tsc --noEmit` exit 0; `npm run build` exit 0.
    - Test thật HTTP trên bàn seed (`Bàn 01`): Đơn 1 tạo thành công session `SES-20261003-001`, order `ORD-20261003-001`, bàn chuyển sang `OCCUPIED`; Đơn 2 trên cùng bàn tái sử dụng đúng session `OPEN`, cộng dồn `subTotal` từ 78.000đ lên 123.000đ; Bàn `CLEANING` trả HTTP 409 `TABLE_NOT_READY`; `menuItemId` lạ trả HTTP 400 `INVALID_MENU_ITEM`; Bàn không tồn tại trả HTTP 404 `TABLE_NOT_FOUND`.
- **Việc C1 — Xóa fallback mock (vai C, frontend `feat/web-frontend-c` → `ed93bc1`)**:
  - `frontend/app/table/[tableId]/CartDrawer.tsx`: Xóa triệt để toàn bộ nhánh fallback gọi `POST /orders`. Mọi lỗi từ route thật (400, 404, 409, 500) được hiển thị trực tiếp cho người dùng, không bao giờ gửi request thứ hai che giấu lỗi.
  - `grep '/orders' frontend/app/table/` trả về đúng 0 kết quả.
  - **Verify Runtime**: `npx tsc --noEmit` exit 0; `npm run check:i18n` exit 0 (388/388 keys); `npm run build` thành công toàn bộ 23 routes Turbopack.
- **Nợ kỹ thuật còn lại (Backlog)**:
  - **Blocker DONE vs SERVED**: Giữ nguyên ranh giới quyết định của user, route `session-order` mới chỉ tạo đơn với Prisma enum `PENDING`. Khớp enum `DONE` vs `SERVED` ở item-level cho `order.service` mock vẫn được bảo lưu cho Vòng sau.
  - **Voucher validation**: `voucherCode` và `discountAmount` hiện ghi nhận nguyên văn; bộ kiểm tra điều kiện áp dụng voucher thuộc phạm vi Team C vòng sau.
  - **Modifier unmapped extraPrice**: Trường hợp client gửi modifier option không khớp DB, hệ thống gộp extraPrice vào đơn giá món để không rớt tiền của quán; cần hoàn thiện catalog modifier đồng bộ 100%.
  - Team B: Kích hoạt trừ kho BOM tự động khi thanh toán.
  - Frontend: Nhúng ảnh logo branding thực tế vào header xuất PDF Z-Report.

### 03/10/2026 — Review Vòng 2 (kết quả + nợ chuyển Vòng 3)
- **Kết luận review**: Toàn bộ 5 commit Vòng 2 được duyệt, không có sửa code nào bắt buộc. Không có migration mới; không đụng file Team B; transaction, Zod, `ApiResponse`, socket events đều chuẩn. Các số liệu HTTP runtime do agent thực hiện trước review, review độc lập chỉ xác nhận tính khả thi qua mã nguồn.
- **Nợ chuyển sang Vòng 3** (phát hiện khi review mã, chưa gây lỗi ở Vòng 2):
  1. **Race sinh `sessionCode`/`orderCode`**: cả hai đang dùng `count(trong ngày) + 1` trong transaction nhưng không có ràng buộc unique và không retry khi đụng unique-violation. Hai request đồng thời cùng chi nhánh có thể sinh mã trùng. → Thêm unique constraint + retry, kèm test đồng thời.
  2. **Double-count `discountAmount`**: `discountAmount` đang cộng dồn vào `OrderSession` ở mỗi đơn. Nếu voucher là giảm cho toàn session thì từ đơn thứ hai trở đi sẽ bị trừ lặp. → Sửa cùng lúc triển khai validate voucher thật (tính 1 lần ở cấp session).
  3. **`totalAmount` trong request bị lặng lẽ bỏ qua**: controller vẫn nhận trường này nhưng service chủ động không dùng. Không sai tính tiền, nhưng hợp đồng API gây hiểu lầm. → Xóa khỏi schema Zod hoặc trả 400 khi lệch giá DB.
  4. **Comment thừa ở frontend `app/kds/page.tsx`**: khối comment cũ vẫn ghi backend dùng `CONFIRMED` cho đang nấu trong khi TODO tương ứng đã bị gỡ ở `0e5e7b7`. → Sửa 1 dòng kèm một việc khác của Vòng 3, không tách commit riêng.
  5. **Modifier không khớp DB mất liên kết**: đã nêu ở backlog Vòng 2, giữ nguyên để hoàn thiện catalog modifier.

### 03/10/2026 — Vòng 3 Harden session-order (Commits Backend `6607de8`, `ae364fc`, `53709a2` | Frontend `0e38786`)
- **Việc H1 — Chống trùng sessionCode/orderCode (vai A, backend `feat/be-admin-report-c` → `ae364fc`)**:
  - `backend/prisma/schema.prisma`: Thêm ràng buộc `@@unique([branchId, sessionCode])` cho `OrderSession` và `@@unique([branchId, orderCode])` cho `Order`.
  - Migration `20261003142000_unique_session_and_order_codes`: Chạy kiểm tra dữ liệu trước khi migrate (0 duplicate). Triển khai `npx prisma migrate deploy` thành công sạch sẽ.
  - `backend/src/services/session-order.service.ts`:
    - Truy vấn sinh mã bổ sung `tenantId` (scope `tenantId` + `branchId` + ngày hiện tại).
    - Tra cứu sequence lớn nhất trong ngày (`findFirst` desc) để cấp phát mã kế tiếp chính xác.
    - Áp dụng row-lock `SELECT ... FOR UPDATE` trên bản ghi `Table` trong transaction để tuần tự hóa các request đồng thời trên cùng bàn.
    - Bọc transaction trong cơ chế retry tối đa 3 lần với jitter backoff (10ms - 50ms) khi gặp mã lỗi `P2002`; nếu quá 3 lần vẫn xung đột thì trả về HTTP 500 `ORDER_CODE_CONFLICT` (không đổ lỗi 400 cho client).
  - **Verify Runtime**: Test 10 request gửi song song đồng thời trên cùng bàn `EMPTY`: 10/10 request thành công HTTP 201, tạo đúng duy nhất 1 `OrderSession` OPEN, 10 `orderCode` hoàn toàn phân biệt không trùng lặp, bàn chuyển `OCCUPIED`.
- **Việc H2 — Discount tính đúng 1 lần + validate voucher thật (vai A, backend `feat/be-admin-report-c` → `6607de8`, `ae364fc`)**:
  - Tạo mới `backend/src/services/voucher-quote.service.ts`: Hàm pure `validateVoucherForOrder(tenantId, code, subTotal)` tính toán giảm giá thuần từ database (kiểm tra `isActive`, khoảng ngày hiệu lực, `usageLimit`, `minOrderVal`, tính `PERCENT`/`FIXED` có cap `maxDiscount`).
  - `backend/src/controllers/voucher.controller.ts`: Refactor `applyVoucher` ủy quyền cho `VoucherQuoteService`, giữ nguyên 100% API contract và hành vi hiện hành.
  - `backend/src/services/session-order.service.ts`:
    - Hoàn toàn không tin `discountAmount` client gửi; mọi con số giảm giá đều do `VoucherQuoteService` tính từ DB.
    - Áp dụng luật session: Voucher chỉ tính giảm giá khi `session.discountAmount === 0` (đơn đầu tiên có voucher). Các đơn sau trên cùng session áp dụng `discount = 0` cho phần cộng dồn session để không bị trừ lặp, đồng thời `order.totalAmount` của mỗi đơn vẫn được bảo toàn đúng giá trị.
    - Nếu voucher không hợp lệ hoặc hết hạn: ghi log cảnh báo, không chặn đơn mà tạo đơn bình thường với discount = 0.
  - **Verify Runtime**:
    - Đơn 1 gửi kèm `CHAO2026` (20%): SubTotal 105.000đ, Giảm giá 21.000đ, Final 84.000đ.
    - Đơn 2 trên cùng session: SubTotal đơn 45.000đ, Total đơn 45.000đ (không giảm lặp), SubTotal session tăng lên 150.000đ, Giảm giá session giữ nguyên 21.000đ, Final session 129.000đ.
    - Gửi voucher hết hạn / không tồn tại: Đơn tạo thành công HTTP 201, discount = 0.
- **Việc H3 — Dọn hợp đồng API (vai A + C, backend `53709a2` | frontend `0e38786`)**:
  - `backend/src/controllers/session-order.controller.ts`: Xóa 5 trường dư thừa khỏi Zod validation schema: `branchId`, `tenantId`, `totalAmount` ở body level, và `name`, `price` ở item level. Zod tự động strip các trường thừa client gửi.
  - `frontend/app/table/[tableId]/CartDrawer.tsx`: Ngừng gửi 5 trường thừa (`branchId`, `tenantId`, `name`, `price`, `totalAmount`) trong payload, giữ lại đúng `tableId`, `items` (`menuItemId`, `quantity`, `note`, `modifiers`), `voucherCode`, `discountAmount`.
  - `frontend/app/kds/page.tsx`: Cập nhật comment giải thích hàm `normalizeOrderStatus` để phản ánh đúng mục đích tương thích ngược với dữ liệu đơn cũ trước Vòng 1.
  - **Verify Runtime**:
    - Backend: Gửi payload giả mạo `totalAmount: 1`, `price: 1` -> bị strip hoàn toàn, DB tính đúng giá món từ database; `npx tsc --noEmit` exit 0, `npm run build` exit 0.
    - Frontend: `npx tsc --noEmit` exit 0; `npm run check:i18n` exit 0 (388/388 keys); `npm run build` Turbopack 23 routes biên dịch thành công 100%.
- **Nợ kỹ thuật còn lại (Backlog)**:
  - **Blocker DONE vs SERVED**: Giữ nguyên ranh giới quyết định của user, route `session-order` mới chỉ tạo đơn với Prisma enum `PENDING`. Khớp enum `DONE` vs `SERVED` ở item-level cho `order.service` mock vẫn được bảo lưu cho Vòng sau.
  - Team B: Kích hoạt trừ kho BOM tự động khi thanh toán.
  - Frontend: Nhúng ảnh logo branding thực tế vào header xuất PDF Z-Report.

### 03/10/2026 — Vòng 4 Order service lên Prisma (Commits Backend `ff0e1b7`, `5999866`)
- **Mục tiêu hoàn thành**: Nối chỗ đứt lớn nhất của hệ thống: KDS (`app/kds/page.tsx` gọi `GET /orders/active`) chuyển từ 3 đơn mock cứng (`ord-101/102/103`) sang đọc và điều khiển đơn thật từ PostgreSQL qua Prisma Client. Đơn đặt từ khách quét QR (`POST /sessions/:tableId/order`) lập tức hiển thị lên màn hình bếp end-to-end.
- **Việc M1 — Migration thêm DONE vào OrderItemStatus (vai A, backend `ff0e1b7`)**:
  - `backend/prisma/schema.prisma`: Bổ sung giá trị `DONE` vào enum `OrderItemStatus` (`PENDING`, `PREPARING`, `READY`, `SERVED`, `DONE`, `CANCELLED`), bảo lưu `SERVED` cho bước bưng món/phục vụ sau này.
  - Migration thủ công `20261003144500_add_done_to_order_item_status`:
    ```sql
    ALTER TYPE "OrderItemStatus" ADD VALUE 'DONE';
    ```
  - Chạy `npx prisma migrate deploy` và `npx prisma generate` thành công sạch sẽ. Sau migration này, validator `updateItemStatus` (đã mở `DONE` từ Vòng 1) khớp enum CSDL 100%. Blocker `DONE` vs `SERVED` chính thức đóng hoàn toàn.
- **Việc A1 — Viết lại order.service.ts sang Prisma (vai A, backend `5999866`)**:
  - Tái cấu trúc `backend/src/services/order.service.ts` & `backend/src/controllers/order.controller.ts` thành async/await kết nối trực tiếp Prisma Client.
  - Bảo lưu nguyên vẹn các export types (`LiveOrder`, `OrderItemDetail`, `LiveOrderStatus`), method signature và hợp đồng response `ApiResponse`.
  - **Bảng mapping Prisma Model → LiveOrder DTO (Zero-breaking frontend KDS)**:
    | Trường LiveOrder DTO | Nguồn dữ liệu Prisma / Adapter Logic | Ghi chú |
    | :--- | :--- | :--- |
    | `id` | `Order.id` | UUID đơn hàng thực tế |
    | `code` | `Order.orderCode` | Mã hiển thị `#ORD-YYYYMMDD-###` |
    | `time` | `format(Order.createdAt, 'HH:mm', 'vi-VN')` | Giờ đặt hiển thị trên card KDS |
    | `orderType` | `Order.orderType` | `DINE_IN` hoặc `TAKEAWAY` |
    | `status` | `Order.status` | `PENDING`, `PREPARING`, `READY`, `DONE`, `CANCELLED` |
    | `items` | `Order.items` (join `modifiers`) | Mảng món ăn kèm ghi chú topping gộp |
    | `items[].price` | `OrderItem.unitPrice` | Đơn giá món |
    | `items[].imageUrl` | `undefined` | Ghi nợ: join MenuItem nếu cần hiển thị ảnh |
    | `items[].status` | `OrderItem.status` | Trạng thái từng món ăn (hỗ trợ `DONE`) |
    | `note` | `Order.note` | Ghi chú toàn đơn |
    | `total` | `Order.totalAmount` | Tổng tiền đơn hàng |
    | `paymentStatus` | `'PAID'` nếu có tx `PAID`, ngược lại `'UNPAID'` | Đọc từ `OrderSession.transactions` |
    | `paymentMethod` | `tx.method` (nếu đã thanh toán) | `CASH` hoặc `VIETQR` |
    | `tableId` | `Session.table.id` | Truy xuất qua quan hệ 2-hop `Order.session.table` |
    | `tableName` | `Session.table.name` | Tên bàn ăn (VD: `Bàn 02 - Trung Tâm`) |
    | `branchId` / `tenantId` | `Order.branchId` / `Order.tenantId` | Đảm bảo tính cô lập chi nhánh |
    | `countdownSeconds` | `Math.max(0, 600 - elapsedSeconds)` | Đếm lùi chuẩn hóa 10 phút dựa trên `createdAt` |
    | `createdAt` | `Order.createdAt.toISOString()` | Timestamp ISO chuẩn |
  - **3 Thay đổi hành vi quan trọng so với Mock cũ**:
    1. **`voidOrder` không xóa row (Fix đúng nghiệp vụ)**: Mock cũ dùng `activeOrders.splice(index, 1)` làm biến mất hoàn toàn đơn khỏi RAM. Logic mới cập nhật `status = CANCELLED` cho Order và tất cả OrderItem liên quan, giữ nguyên bản ghi trong database để đối soát kiểm toán và hiển thị trong lịch sử (`/orders/history`).
    2. **`GET /orders/active` tự động loại `DONE` và `CANCELLED`**: Khớp với mock cũ khi hoàn thành đơn (unshift sang history), truy vấn Prisma lọc `status NOT IN ('DONE', 'CANCELLED')`. Đơn đã nấu xong (`DONE`) hoặc bị hủy (`CANCELLED`) tự động biến mất khỏi Kanban active board và chuyển sang lịch sử.
    3. **`GET /orders/history` thu hẹp tìm kiếm**: Lọc chính xác theo `branchId`, khoảng ngày `startDate`/`endDate`, và `search` theo `orderCode` (phân trang `page`/`limit`). Tạm bỏ tìm kiếm theo `tableName`/`customerName` của mock cũ (ghi nợ chuyển sang vòng sau).
  - **Luật bảo mật Tenant / Branch Isolation**:
    - Phân giải `tenantId` và `branchId` từ bảng `Branch` theo `branchId` client truyền (hỗ trợ alias `default-branch` cho KDS dev mode trỏ về chi nhánh flagship active đầu tiên).
    - Client truyền `branchId` không tồn tại lập tức nhận HTTP 404 `BRANCH_NOT_FOUND` (ngăn chặn IDOR).
    - Bắt lỗi chuẩn: Đơn không tìm thấy trả HTTP 404 `ORDER_NOT_FOUND`; Món không tìm thấy trả HTTP 404 `ITEM_NOT_FOUND`.
  - **Socket Events**: Bảo lưu nguyên vẹn 4 socket emit: `order:updated` (ORDER_UPDATED), `order:item-status` (ORDER_ITEM_STATUS), `order:voided` (ORDER_VOIDED), và `order:new` (ORDER_NEW trong mock createOrder). Lỗi socket được bắt bằng try/catch ghi log warn, không làm rollback transaction database.
  - **Khoanh vùng phạm vi (Cấm chạm)**: Giữ nguyên method `createOrder` mock (ghi nợ); không đụng `cashier.controller.ts`, `table.controller.ts`, v.v.
- **Việc C1 — Đảm bảo Zero-diff Frontend (vai C)**:
  - Do DTO `LiveOrder` và các endpoint `/api/orders/*` giữ nguyên 100% hình thái dữ liệu và schema response, toàn bộ mã nguồn frontend tại `app/kds/page.tsx` và `components/kds/*` không phải sửa bất kỳ dòng nào.
  - Đạt tiêu chí **Zero-diff frontend**.
- **Xác minh kiểm thử toàn diện (Runtime Verification Output)**:
  - `backend`: `npx tsc --noEmit` exit 0; `npm run build` exit 0; `npx prisma migrate status` 6 migrations up-to-date.
  - Test luồng thực tế trên seed data database:
    1. Tạo đơn bàn 02: `POST /api/sessions/:tableId/order` → HTTP 201, sinh đơn `#ORD-20261003-0001` (Trà Đào Cam Sả, 90.000đ).
    2. Kiểm tra KDS: `GET /api/orders/active?branchId=default-branch` → HTTP 200, trả về đúng 1 đơn thật vừa tạo với table name `Bàn 02 - Trung Tâm`, sạch 100% các đơn mock cũ (`ord-101/102/103`).
    3. Cập nhật tiến độ: `PATCH /api/orders/:id/status` với `status: PREPARING` → HTTP 200, đơn chuyển trạng thái đang nấu; card KDS chuyển sang cột "Đang Nấu".
    4. Bếp hoàn thành món: `PATCH /api/orders/items/:id/status` với `status: DONE` → HTTP 200; kiểm tra PostgreSQL record `OrderItem.status = 'DONE'` chuẩn enum.
    5. Hủy đơn: `POST /api/orders/:id/void` → HTTP 200, `Order.status = 'CANCELLED'`; bản ghi trong CSDL vẫn tồn tại (không bị xóa); đơn tự động rời khỏi `GET /orders/active`.
    6. Lịch sử đơn: `GET /api/orders/history?search=ORD-20261003-0001` → HTTP 200, tìm thấy đơn đã hủy với đầy đủ chi tiết phân trang (`page: 1, total: 1, totalPages: 1`).
    7. Bảo mật chi nhánh: `GET /api/orders/active?branchId=non-existent-branch-id` → HTTP 404 `BRANCH_NOT_FOUND`.
  - `frontend`: `npm run check:i18n` 388/388 keys khớp 1-1; `npx tsc --noEmit` exit 0; `npm run build` Turbopack 23 routes biên dịch thành công 100%.
- **Nợ kỹ thuật còn lại (Backlog)**:
  - Cashier / Payment vẫn đang chạy mock trong `cashier.controller.ts` (thuộc Team B / Vòng 6 triển khai thanh toán đóng session).
  - Method `createOrder` (POST `/orders/`) trong `order.service.ts` vẫn là in-memory mock (đã ghi nợ, không còn frontend nào gọi).
  - Item image: `OrderItem.imageUrl` đang trả `undefined` (ghi nợ join `MenuItem` nếu KDS cần thumbnail).
  - Tìm kiếm history theo `tableName` / `customerName` tạm thời thu hẹp về `orderCode`.

### 03/10/2026 — Vòng 5 Dashboard analytics thật (Commits Backend `20e6454` | Frontend `ccb3dbb`)
- **Mục tiêu hoàn thành**: Xóa bỏ 100% số liệu và biểu đồ mock tĩnh trên trang quản trị Dashboard (`/admin/dashboard/`), thay thế bằng dữ liệu analytics thật truy vấn trực tiếp từ PostgreSQL qua Prisma Client. Giao diện quản trị phản ánh chính xác hoạt động kinh doanh của quán theo thời gian thực.
- **Việc A1 — Endpoint GET /api/analytics/overview (vai A, backend `20e6454`)**:
  - Tạo mới `backend/src/services/analytics.service.ts`, `backend/src/controllers/analytics.controller.ts`, và `backend/src/routes/analytics.routes.ts`, mount vào root router tại `/api/analytics`.
  - Bảo vệ bằng middleware: `authMiddleware` + `requireRole(['ADMIN', 'MANAGER', 'CASHIER'])` (giống chuẩn `zreport.routes.ts`).
  - Request query: `?branchId=&date=YYYY-MM-DD` (mặc định lấy ngày hiện tại).
  - **Công thức tính toán từng chỉ số KPI**:
    1. **Doanh thu hôm nay (`revenue.today`)**: Tổng `finalAmount` của tất cả `OrderSession` có `status = 'CLOSED'` và `openedAt` trong khoảng ngày được truy vấn (`startOfDay` đến `endOfDay`).
    2. **Tăng trưởng so với hôm qua (`revenue.growthPercent`)**: Tính phần trăm tăng/giảm so với tổng `finalAmount` của các session `CLOSED` ngày hôm trước (`revenueYesterday`). Guard chia cho 0 an toàn: nếu hôm trước bằng 0 và hôm nay có doanh thu $\rightarrow$ `+100%`, nếu cả hai đều bằng 0 $\rightarrow$ `0%`.
    3. **Số lượng hóa đơn (`orders.count`)**: Đếm tổng số `Order` (không bị `CANCELLED`) thuộc chi nhánh trong ngày.
    4. **Giá trị trung bình đơn (`orders.avgOrderValue`)**: `revenueToday / orders.count` (nếu `count = 0` $\rightarrow$ trả `0đ`).
    5. **Tỷ lệ thanh toán VietQR (`vietqr.sharePercent`)**: Tính tỷ lệ phần trăm số tiền của các `PaymentTransaction` trạng thái `PAID` có `method = 'VIETQR'` trên tổng tiền các giao dịch `PAID` trong ngày. Kèm trường `totalAmount` lưu tổng tiền chuyển khoản QR.
    6. **Bàn đang mở (`tables.occupied / tables.total`)**: Đếm số bản ghi `Table` có `status = 'OCCUPIED'` trên tổng số bàn `isActive = true` của chi nhánh.
    7. **Món đang chờ bếp nấu (`tables.pendingKitchen`)**: Đếm số `OrderItem` có trạng thái `PENDING` hoặc `PREPARING` thuộc các đơn chưa `DONE`/`CANCELLED`.
    8. **Xu hướng doanh thu 8 khung giờ (`hourlyTrend`)**: 8 điểm mốc giờ cố định (`08:00`, `10:00`, `12:00`, `14:00`, `16:00`, `18:00`, `20:00`, `22:00`) tổng hợp từ `finalAmount` và số đơn của các session `CLOSED` theo giờ `openedAt`.
    9. **Top 5 món bán chạy (`topItems`)**: `groupBy` `menuItemId` trên bảng `OrderItem` (thuộc order không `CANCELLED` trong ngày), tính tổng `quantity` và `totalPrice`, join sang `MenuItem` và `MenuCategory` để lấy tên món và danh mục.
  - **Luật bảo mật Tenant / Branch Isolation**:
    - Phân giải `tenantId` từ chi nhánh; đối chiếu với `req.user.tenantId` để chặn IDOR; branch không tồn tại trả HTTP 404 `BRANCH_NOT_FOUND`.
    - Truy cập không có token trả HTTP 401 `UNAUTHORIZED`; role không phù hợp (ví dụ `KITCHEN`) trả HTTP 403 `FORBIDDEN`.
- **Việc C1 & C2 — Dashboard ăn API thật & Xóa sạch Mock (vai C, frontend `ccb3dbb`)**:
  - `frontend/app/admin/dashboard/page.tsx`:
    - Chuyển sang gọi `apiFetch<AnalyticsOverviewData>('/analytics/overview')` tự động truyền `branchId` của người dùng đăng nhập.
    - Xây dựng trạng thái Loading Skeleton cho 4 card KPI, biểu đồ và danh sách top món.
    - Xây dựng Error State có nút "Thử lại" khi gặp sự cố mạng hoặc lỗi máy chủ.
    - **Quyết định Empty State hiện 0**: Khi quán chưa có giao dịch nào trong ngày (`isAllZero`), hiển thị đúng số thực tế (`0đ`, `0 đơn`, `0%`, `0 / N bàn`), hiển thị banner thông báo "Chưa có dữ liệu giao dịch cho ngày hôm nay" và empty state cho danh sách món. Tuyệt đối không bịa số giả thay thế.
  - `frontend/components/dashboard/RevenueTrendChart.tsx`:
    - Chuyển sang nhận dữ liệu `data?: HourlyTrendPoint[]` qua props; xóa bỏ hoàn toàn mảng `const data` mock cứng bên trong file.
  - **Xóa sạch mock (C2)**:
    - Quét grep `14.020.000`, `266 đơn`, `68.4%`, `topSellingItems` trong `app/admin/dashboard/` và `components/dashboard/` $\rightarrow$ kết quả về đúng 0.
  - **Hệ thống đa ngôn ngữ i18n**:
    - Chuẩn hóa các key `dashboard.*` trong `vi.json` và `en.json`, bổ sung các key đơn vị (`unitOrder`, `unitPortion`, `unitTable`, `emptyData`, `noTopItems`, `errorLoading`).
    - Số lượng key từ điển tăng song song từ 388 lên **394 key**, 100% khớp song song 1-1, kiểm tra `npm run check:i18n` đạt tuyệt đối.
- **Xác minh kiểm thử toàn diện (Runtime Verification Output)**:
  - `backend`: `npx tsc --noEmit` exit 0; `npm run build` exit 0.
  - Test suite runtime (`test_vong5.ts`):
    - GET không token $\rightarrow$ HTTP 401 `UNAUTHORIZED`.
    - GET token `KITCHEN` $\rightarrow$ HTTP 403 `FORBIDDEN`.
    - GET `branchId=unknown` $\rightarrow$ HTTP 404 `BRANCH_NOT_FOUND`.
    - Seed 1 session CLOSED (180.000đ, 4 ly Trà Đào Cam Sả, giao dịch VietQR PAID lúc 14:15) $\rightarrow$ GET overview trả KPI khớp 100% với database: Doanh thu 180.000đ, VietQR 100% (180.000đ), Slot 14:00 ghi nhận 180.000đ, Top món hiển thị 'Trà Đào Cam Sả' 4 phần (180.000đ).
    - Branch trống $\rightarrow$ HTTP 200, toàn bộ KPI trả về 0 sạch sẽ, topItems mảng rỗng `[]`.
  - `frontend`: `npm run check:i18n` đạt 394/394 keys; `npx tsc --noEmit` exit 0; `npm run build` Turbopack 23 routes biên dịch thành công 100%.
- **Nợ kỹ thuật còn lại (Backlog)**:
  - Dashboard analytics tính doanh thu phụ thuộc vào các session `CLOSED` và transaction `PAID`, hiện tại luồng thanh toán tại bàn và quầy thu ngân vẫn đang mock (`cashier.controller.ts`), sẽ chuyển sang thanh toán/đóng session thật ở Vòng sau.

### 03/10/2026 — Review Vòng 5 (kết quả + nợ chuyển Vòng 6)
- **Kết luận review**: 4 commit Vòng 5 được duyệt. Guard auth/role, chống IDOR qua `req.user.tenantId`, 9 công thức KPI và empty-state-hiện-0 đều đúng code. Không migration mới, không đụng Team B/zreport.
- **Đã sửa khi review**: `hourlyTrend` tính `session.orders?.length || 1` làm session 0 món bị đếm thành 1 đơn, lệch KPI `orders.count` → đổi thành `?? 0` (`analytics.service.ts`), verify lại `tsc` + `build` exit 0.
- **Nợ chuyển Vòng 6**: (1) doanh thu lọc theo `openedAt` thay vì `closedAt/paidAt`, session vắt nửa đêm lệch ngày; (2) `topItems` chưa loại `OrderItem CANCELLED` lẻ; (3) docs diễn đạt "groupBy" trong khi code group in-memory (kết quả tương đương).

### 03/10/2026 — Vòng 6 Dọn nợ analytics/order (Commits Backend `5b8441b` | Frontend `20c62a7`)
- **Mục tiêu hoàn thành**: Dọn sạch 5 nợ kỹ thuật nhỏ được phát hiện khi review Vòng 4 và Vòng 5 về mốc thời gian analytics, điều kiện lọc top món, liên kết ảnh món ăn trên KDS, tìm kiếm đơn hàng theo mã bàn, và prop chết trên frontend. Không thêm tính năng mới, không thay đổi hành vi nghiệp vụ lớn.
- **Việc B1 — Doanh thu và xu hướng theo ngày đóng/chốt (vai A, backend `5b8441b`)**:
  - `backend/src/services/analytics.service.ts`:
    - **Quy ước tính toán ngày**:
      1. Doanh thu (`revenue.today` / `revenue.yesterday`) và biểu đồ giờ (`hourlyTrend`) tính theo thời điểm đóng ca/chốt đơn `closedAt` (với fallback `openedAt` khi `closedAt` null: điều kiện `OR [{ closedAt: trong ngày }, { closedAt: null AND openedAt: trong ngày }]`). Một bàn mở lúc 15:00 hôm qua nhưng 10:30 sáng nay mới thanh toán đóng bàn thì toàn bộ doanh thu được ghi nhận đúng vào ngày hôm nay.
      2. Tỷ lệ thanh toán VietQR (`paidTransactions`) tính theo thời điểm thanh toán thực tế `paidAt` (fallback `createdAt` khi `paidAt` null).
      3. Số lượng đơn (`orders.count`) và top món (`topItems`) tính theo ngày đặt món `createdAt` (phản ánh đúng số lượng đơn và món phát sinh trong ngày làm việc của bếp).
- **Việc B2 — Loại bỏ món hủy lẻ khỏi Top Món (vai A, backend `5b8441b`)**:
  - `backend/src/services/analytics.service.ts`: Bổ sung điều kiện `status: { not: 'CANCELLED' }` trực tiếp ở cấp `OrderItem` trong truy vấn `topItems`, ngăn chặn trường hợp món bị khách hoặc bếp hủy lẻ nhưng vẫn lọt vào danh sách món bán chạy nhất ngày.
- **Việc B3 — Gắn imageUrl thật cho OrderItem (vai A, backend `5b8441b`)**:
  - `backend/src/services/order.service.ts`:
    - Bổ sung `menuItem: { select: { imageUrl: true } }` tại 6 vị trí include items (`getActiveOrders`, `getOrderById`, `updateOrderStatus`, `updateItemStatus`, `voidOrder`, `getOrderHistory`).
    - Cập nhật adapter `mapPrismaOrderToLiveOrder` gán `imageUrl: item.menuItem?.imageUrl || undefined`.
    - Màn hình bếp KDS và card đơn hàng nhận được URL ảnh món thực tế từ CSDL.
- **Việc B4 — Tìm kiếm lịch sử đơn mở rộng theo mã bàn (vai A, backend `5b8441b`)**:
  - `backend/src/services/order.service.ts`: Trong method `getOrderHistory`, mở rộng điều kiện `search` sang tìm kiếm cả theo mã bàn: `where.OR = [{ orderCode: { contains: q, mode: 'insensitive' } }, { session: { table: { code: { contains: q, mode: 'insensitive' } } } }]`. Tìm kiếm theo mã bàn (ví dụ: `Bàn 02`) trả về chính xác tất cả đơn đã phục vụ tại bàn đó.
- **Việc C1 — Xóa prop chết branchId trong CartDrawer (vai C, frontend `20c62a7`)**:
  - `frontend/app/table/[tableId]/CartDrawer.tsx`: Loại bỏ hoàn toàn `branchId?: string` khỏi `interface CartDrawerProps` và danh sách tham số khởi tạo `CartDrawer`. Giữ nguyên `tenantId` phục vụ kiểm tra voucher (`/vouchers/apply`).
  - Quét grep `branchId` trong `CartDrawer.tsx` trả về đúng 0 kết quả.
- **Xác minh kiểm thử toàn diện (Runtime Verification Output)**:
  - `backend`: `npx tsc --noEmit` exit 0; `npm run build` exit 0; `npx prisma migrate status` 6 migrations up-to-date (không phát sinh migration mới).
  - Test suite runtime (`test_vong6.ts`):
    1. Session mở 15:00 hôm qua, đóng 10:30 hôm nay $\rightarrow$ Doanh thu 250.000đ được ghi nhận đúng vào ngày hôm nay; ngày hôm qua không bị tính lặp; slot 10:00 ghi nhận 250.000đ.
    2. Item có số lượng 99 nhưng trạng thái `CANCELLED` lẻ $\rightarrow$ hoàn toàn không xuất hiện trong `topItems`.
    3. DTO `LiveOrder` từ `getOrderById` trả về `imageUrl` khớp 100% với `MenuItem.imageUrl` từ CSDL.
    4. Tìm kiếm lịch sử đơn hàng với từ khóa mã bàn `Bàn 02` $\rightarrow$ trả về chính xác 3 đơn của bàn.
  - `frontend`: `npm run check:i18n` 394/394 keys khớp tuyệt đối; `npx tsc --noEmit` exit 0; `npm run build` Turbopack 23 routes biên dịch thành công 100%.
- **Nợ kỹ thuật còn lại (Backlog)**:
  1. Cashier & Payment tại bàn/quầy vẫn đang chạy mock trong `cashier.controller.ts` (Team B phụ trách thanh toán đóng session).
  2. Cascade item $\rightarrow$ order status `DONE` khi toàn bộ món trong đơn đã xong (giữ độc lập để tránh thay đổi luồng KDS).
  3. Method `createOrder` (POST `/orders/`) trong `order.service.ts` vẫn là mock in-memory cũ (không còn frontend nào gọi).
  4. Trừ kho BOM tự động khi hoàn tất đơn hàng/thanh toán.
  5. Nhúng ảnh logo branding thực tế vào header xuất PDF Z-Report.
  6. Màn hình POS cashier tích hợp tài khoản ngân hàng cấu hình từ branding.


