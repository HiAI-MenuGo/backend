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
- **Backend `feat/be-admin-report-c` → `bf09a05`**: khớp spec routes (`POST /vouchers/validate` alias + `DELETE /:id` + `POST /:id/redeem` tăng `usedCount`; `GET /z-report/shift-summary`, `POST /close-shift`, `GET /export?format=excel|pdf`; `PATCH /branding/:tenantId`; `GET /admin/users/roles`); khóa `tenantId` (bỏ fallback query, bỏ auto-create branding public, MANAGER scope `branchId`); gắn Zod `validate()` + `details`; logger file `logs/`; `auth.service` login ưu tiên Prisma; hết leak `error.message`. Chạm: `voucher/zreport/branding/platform/user.controller.ts`, `voucher/zreport/branding/user.routes.ts`, `auth.service.ts`, `logger.ts`, `response.ts`, `validate.ts`, `package.json` (scripts `db:migrate/db:deploy`). Verify: `tsc --noEmit` + `npm run build` xanh.
- **Frontend `feat/web-frontend-c` → `c4566c1`**: `lib/format-note.tsx` (note đa dòng `•` cho KDS/POS/print); modal món lọc Đường/Đá không phân biệt hoa-thường + `textarea`; mock menu gắn `category.isDrink`; POS áp voucher `/vouchers/validate` + tra SĐT + nút Hủy món `justify-end rose` + QR `level="H"`; KDS mute `localStorage` + Notification; order-status `!isInitializing` + `order:item:status`; `TableQRCode` logo + tải PNG; mới `admin/integrations/page.tsx`, `table/[tableId]/loading.tsx`, `components/print/ReceiptPrintTemplate.tsx`, `@media print` 80mm, sidebar thêm `API & Webhook`. Verify: `tsc --noEmit` + `next build` xanh (23 routes).
- **Còn nợ (vòng tiếp theo)**: `prisma/migrations` cần DB thật; export PDF/Excel native (`pdfkit/exceljs`); invite mail Nodemailer; Admin pages lên dữ liệu thật thay mock fallback; `public/sounds/new_order.mp3`; phủ i18n toàn app.
