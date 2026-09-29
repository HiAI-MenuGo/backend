# 📱 Workflow Thành Viên A — iOS Developer & Backend Core

> **Người phụ trách:** Trần Hoàng Đạt (Thành viên A)
> **Nền tảng:** Mobile App iOS (Expo / React Native) + Backend Core API (Express 5 / TypeScript)
> **Thư mục làm việc:** `mobile/` và `backend/`
> **Nhánh Git:**
> - Mobile Repo (`mobile.git`): `feat/mobile-ios-a` ➔ PR vào `dev`
> - Backend Repo (`backend.git`): `feat/be-auth-menu-a` ➔ PR vào `dev`

---

## 🎯 Phạm Vi Công Việc

Thành viên A chịu trách nhiệm phối hợp giữa **Mobile App iOS** và **Backend Core APIs**:

### 1. Mobile App iOS (`mobile/`)
1. **App Shell & Foundation** — Cấu trúc khung ứng dụng, điều hướng không dùng React Navigation, SafeArea và Design Tokens
2. **Trải nghiệm khách hàng / Nhân viên** — HomeScreen (Doanh thu & Shortcuts), RevenueScreen, NotificationScreen
3. **Tính năng Gọi món tại bàn (POS Mobile)** — OrderScreen, ItemOptionsScreen, MenuItemFormScreen
4. **Cài đặt & Hồ sơ** — SettingsScreen
5. **Kiểm thử iOS** — Kiểm tra trên Simulator iOS (iPhone SE, iPhone 14 Pro, iPhone 15 Pro Max) với Notch, Dynamic Island, Safe Area insets.

### 2. Backend API (`backend/`) — Phụ trách các module Core:
1. **Auth & JWT System**: Đăng nhập, refresh token rotation, me, change-password, authMiddleware, role guard (`/api/auth/*`).
2. **Menu & Modifiers CRUD**: Quản lý danh mục, món ăn, tùy chọn đường/đá/size/topping (`/api/menu/*`).
3. **Session & Order Placement**: Khởi tạo session bàn, nhận payload gọi món từ Mobile/Web QR (`/api/sessions/:tableId/order`).
4. **Analytics Overview**: Dashboard doanh thu ngày, top món bán chạy (`/api/analytics/*`).
5. **Cloudinary Upload Service**: Upload hình ảnh món ăn, logo nhà hàng (`/api/upload/image`).

---

## 📁 Files & Màn Hình Phụ Trách

### Mobile (`mobile/`)
| File | Mô tả | Trạng thái |
|------|--------|------------|
| `mobile/App.tsx` | Root Shell, SafeArea Provider, CartLogic, Custom Tab Navigation | 🟡 Cần kết nối API |
| `mobile/src/components/BottomNav.tsx` | Floating Bottom Dock 5 tabs + Badge giỏ hàng | 🟡 Cần kết nối API |
| `mobile/src/screens/HomeScreen.tsx` | Trang chủ: Doanh thu, Shortcuts, Món bán chạy | 🟡 Cần kết nối API |
| `mobile/src/screens/RevenueScreen.tsx` | Báo cáo doanh thu: Biểu đồ ngày/tháng/năm, giao dịch | 🟡 Cần kết nối API |
| `mobile/src/screens/NotificationScreen.tsx` | Thông báo realtime: Filter loại, đánh dấu đã đọc | 🟡 Cần kết nối Socket.IO |
| `mobile/src/screens/SettingsScreen.tsx` | Hồ sơ nhân viên, Cài đặt âm thanh, Đăng xuất | 🟡 Cần kết nối API |
| `mobile/src/screens/OrderScreen.tsx` | Gọi món: Grid menu, Giỏ hàng, Xác nhận đơn, thành công | 🟡 Cần kết nối API |
| `mobile/src/screens/operations/ItemOptionsScreen.tsx` | Chọn tùy chỉnh: Đường/Đá/Size/Topping, Stepper, Ghi chú | 🟡 Cần kết nối API |
| `mobile/src/screens/operations/MenuItemFormScreen.tsx` | Thêm/sửa món: Form, Image Picker, Modifier CRUD | 🟡 Cần kết nối API |
| `mobile/src/data/menuStore.ts` | Zustand Store: CRUD Thực đơn, Danh mục | 🟡 Cần kết nối API |
| `mobile/src/types/index.ts` | TypeScript interfaces toàn bộ project mobile | 🟢 Dùng chung, không xung đột |
| `mobile/src/theme/index.ts` | Design Tokens: Colors, Radii, Shadows | 🟢 Dùng chung, không xung đột |

### Backend (`backend/`)
| File | Mô tả | Trạng thái |
|------|--------|------------|
| `backend/src/controllers/auth.controller.ts` | Xử lý login, refresh token, get me, đổi mật khẩu | 🟡 Cần hoàn thiện |
| `backend/src/services/auth.service.ts` | Nghiệp vụ JWT thuần (15m access, 7d refresh HttpOnly, token reuse detection) | 🟡 Cần hoàn thiện |
| `backend/src/middlewares/auth.middleware.ts` | Xác thực JWT, inject `req.user`, guard phân quyền `requireRole` | 🟡 Cần hoàn thiện |
| `backend/src/controllers/menu.controller.ts` | CRUD menu items, categories, modifier groups | 🟡 Cần hoàn thiện |
| `backend/src/services/menu.service.ts` | Nghiệp vụ menu, query lọc theo tenantId & branchId | 🟡 Cần hoàn thiện |
| `backend/src/controllers/session.controller.ts` | Tạo đơn hàng mới từ bàn, session init | 🟡 Cần hoàn thiện |
| `backend/src/controllers/analytics.controller.ts` | Tổng quan doanh thu hôm nay, tăng trưởng | 🟡 Cần hoàn thiện |
| `backend/src/controllers/upload.controller.ts` | Upload hình ảnh món ăn qua Cloudinary | 🟡 Cần hoàn thiện |


---

## 📋 Danh Sách Task Chi Tiết

### 🏗️ GIAI ĐOẠN 1 — Foundation & App Shell (Tuần 1)

#### Task A-001: Tách Mock Data — Chuẩn bị layer kết nối API
- **File:** `mobile/src/data/mockData.ts`, `mobile/src/data/menuStore.ts`
- **Việc làm:**
  1. Tạo file `mobile/src/services/api.ts` — cấu hình `axios` instance với `baseURL` từ biến môi trường (`.env`), interceptor tự động gắn JWT token vào header.
  2. Tạo file `mobile/src/services/auth.service.ts` — hàm `login()`, `refreshToken()`, `getProfile()`.
  3. Tạo file `mobile/src/services/menu.service.ts` — hàm `getMenuItems()`, `createMenuItem()`, `updateMenuItem()`, `deleteMenuItem()`.
  4. Refactor `menuStore.ts`: thay `mockMenuItems` thành gọi API thực, bổ sung state `loading` và `error`.
- **Định nghĩa hoàn thành:** `useMenuStore` load được dữ liệu từ backend `GET /api/menu/items`. Fallback về mock nếu API lỗi.

#### Task A-002: Auth Flow — Đăng nhập & Lưu phiên
- **File:** `mobile/App.tsx`, `mobile/src/screens/SettingsScreen.tsx`
- **Việc làm:**
  1. Cài thêm `expo-secure-store` để lưu JWT Access Token và Refresh Token.
  2. Tạo `mobile/src/data/authStore.ts` (Zustand) với state: `user`, `accessToken`, `isAuthenticated`, `login()`, `logout()`, `loadFromStorage()`.
  3. Bọc `App.tsx` bằng màn hình `LoginScreen.tsx` nếu chưa đăng nhập. Sau khi login thành công, điều hướng sang `MainApp`.
  4. Cập nhật `SettingsScreen.tsx` nút **Đăng xuất** để gọi `authStore.logout()`, xóa token, quay về màn hình Login.
- **Định nghĩa hoàn thành:** Mở app khi chưa login thì vào màn hình Đăng nhập; sau khi login lưu token, mở lại app vẫn giữ phiên cho đến khi đăng xuất.

#### Task A-003: iOS Safe Area & Safe Zone Testing
- **File:** `mobile/App.tsx`, tất cả Screens có Header hoặc Dock
- **Việc làm:**
  1. Kiểm tra `dynamicTop = Math.max(insets.top, 44)` trên iPhone với Dynamic Island.
  2. Kiểm tra `dynamicTop = Math.max(insets.top, 20)` trên iPhone SE không có Notch.
  3. Kiểm tra Floating Dock không bị che bởi Home Indicator trên tất cả model iPhone.
  4. Ghi lại kết quả test dưới dạng checklist trong file `docs/TEST_iOS.md`.
- **Định nghĩa hoàn thành:** Tất cả màn hình hiển thị đúng trên Simulator iPhone SE, iPhone 14 Pro, iPhone 15 Pro Max.

---

### 🏠 GIAI ĐOẠN 2 — HomeScreen & Dashboard (Tuần 1-2)

#### Task A-004: HomeScreen — Kết nối API dữ liệu thực
- **File:** `mobile/src/screens/HomeScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/analytics/today-overview
  Response: { revenue: number, orderCount: number, pendingOrders: number, pendingPayment: number, growth: number, topItems: MenuItem[] }
  ```
- **Việc làm:**
  1. Thêm state `loading`, `todayData` vào `HomeScreen`.
  2. `useEffect` gọi API khi mount, hiển thị skeleton placeholder khi đang tải.
  3. Hiển thị dữ liệu thực: Doanh thu hôm nay, số đơn hàng, top món bán chạy 4 cái.
  4. Pull-to-refresh bằng `RefreshControl` trên `ScrollView`.
  5. Xử lý trường hợp lỗi API: hiển thị toast và giữ dữ liệu cũ nếu có cache.
- **Định nghĩa hoàn thành:** HomeScreen hiển thị dữ liệu thực từ API và tự động làm mới khi vuốt xuống.

#### Task A-005: HomeScreen — Chuyển hướng Navigation từ Shortcuts
- **File:** `mobile/src/screens/HomeScreen.tsx`
- **Việc làm:**
  1. Thẻ `6 đơn Đang chờ` → `onNavigate('order', 'orders')` (jump thẳng vào tab Đơn hàng Live).
  2. Thẻ `3 đơn Chờ thanh toán` → `onNavigate('order', 'cashier')` (jump thẳng vào Thu ngân).
  3. Thẻ `Đơn hoàn thành` → `onNavigate('order', 'history')`.
  4. Nút **Tạo Order Món** → `onNavigate('order', 'order')`.
  5. Nút **Xem Báo Cáo** → `onNavigate('revenue')`.
- **Định nghĩa hoàn thành:** Mọi shortcut trên HomeScreen dẫn đúng đến màn hình tương ứng.

---

### 📊 GIAI ĐOẠN 3 — RevenueScreen & Analytics (Tuần 2)

#### Task A-006: RevenueScreen — Kết nối API Analytics
- **File:** `mobile/src/screens/RevenueScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/analytics/revenue?timeframe=day&date=2026-09-29
  GET /api/analytics/revenue?timeframe=month&month=9&year=2026
  GET /api/analytics/revenue?timeframe=year&year=2026
  Response: RevenueData (khớp interface đã có trong types/index.ts)
  ```
- **Việc làm:**
  1. Thay `getComputedRevenue()` hiện đang tính mock thành gọi API thực.
  2. Khi người dùng đổi timeframe hoặc ngày/tháng, gọi lại API với params tương ứng.
  3. Thêm loading state: hiển thị shimmer animation trên Bar Chart khi đang tải.
  4. Bảo lưu lần tải gần nhất vào cache `useState` để tránh nhấp nháy khi điều hướng tới/lui.
- **Định nghĩa hoàn thành:** RevenueScreen hiển thị dữ liệu chính xác từ backend cho tất cả 3 chế độ xem (Ngày/Tháng/Năm), biểu đồ render không bị giật.

#### Task A-007: RevenueScreen — Cải thiện UX Date Picker
- **File:** `mobile/src/screens/RevenueScreen.tsx`
- **Việc làm:**
  1. Thêm animation `Animated.spring` cho Modal Date Picker khi mở/đóng.
  2. Highlight ngày/tháng hiện tại (hôm nay) trong lưới chọn ngày.
  3. Vô hiệu hóa (disable style xám, không thể bấm) các ngày trong tương lai.
  4. Thêm vibration `Haptics.impactAsync(ImpactFeedbackStyle.Light)` khi bấm chọn ngày.
- **Định nghĩa hoàn thành:** Date Picker có animation mượt, không cho chọn ngày tương lai, rung nhẹ khi chọn.

---

### 🛒 GIAI ĐOẠN 4 — OrderScreen & Gọi Món POS (Tuần 2-3)

#### Task A-008: OrderScreen — Kết nối API Thực đơn
- **File:** `mobile/src/screens/OrderScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/menu/items?branchId={branchId}
  Response: { categories: string[], items: MenuItem[] }
  ```
- **Việc làm:**
  1. Thay `mockMenuItems` và `mockCategories` bằng gọi API.
  2. Hiển thị skeleton Grid 2 cột khi đang tải danh sách món.
  3. Xử lý tìm kiếm: `filter` trên danh sách đã tải, không cần gọi API mỗi lần gõ.
  4. Xử lý Sold Out: Món có `isSoldOut: true` hiển thị badge đỏ "Hết hàng" và tắt nút thêm giỏ.
- **Định nghĩa hoàn thành:** OrderScreen load thực đơn thực, tìm kiếm mượt mà, món hết hàng không thể thêm giỏ.

#### Task A-009: OrderScreen — Gửi đơn hàng lên Backend
- **File:** `mobile/src/screens/OrderScreen.tsx`, `mobile/App.tsx`
- **API cần dùng:**
  ```
  POST /api/sessions/{tableId}/order
  Body: { items: [{ menuItemId, quantity, note, selectedModifiers }], tableId, orderType: 'DINE_IN'|'TAKEAWAY' }
  Response: { success: true, orderId: string, sessionId: string }
  ```
- **Việc làm:**
  1. Sau khi nhân viên bấm **Xác nhận đơn**, gọi API tạo đơn và chờ kết quả.
  2. Hiển thị loading state (nút mờ + spinner nhỏ) trong khi gọi API.
  3. Thành công: hiển thị `orderSuccessModal` → `onClearCart()` → đóng modal sau 2 giây.
  4. Lỗi: Hiển thị toast màu đỏ với nội dung lỗi, giữ nguyên giỏ hàng để nhân viên thử lại.
- **Định nghĩa hoàn thành:** Đơn hàng được tạo thành công trên backend, giỏ hàng tự xóa sau khi đặt, đơn xuất hiện trên màn hình KDS/OrdersScreen ngay lập tức.

#### Task A-010: ItemOptionsScreen — Tính toán tổng tiền tùy chọn
- **File:** `mobile/src/screens/operations/ItemOptionsScreen.tsx`
- **Việc làm:**
  1. Khi người dùng chọn/bỏ Topping, tính toán lại tổng giá `unitPrice = basePrice + extraPrices`.
  2. Hiển thị preview giá realtime phía trên nút **Thêm vào Giỏ**: `"45.000đ + 10.000đ = 55.000đ"`.
  3. Thêm animation `Animated.timing` nhẹ khi giá thay đổi (scale 1 → 1.05 → 1) để thu hút sự chú ý.
  4. Bộ đếm số lượng (Stepper) hiển thị tổng cộng `unitPrice × quantity` ở footer.
- **Định nghĩa hoàn thành:** Giá cập nhật tức thì khi chọn tùy chọn, tổng tiền chính xác theo công thức `(basePrice + extraFromModifiers) × quantity`.

#### Task A-011: MenuItemFormScreen — Kết nối API Quản lý thực đơn
- **File:** `mobile/src/screens/operations/MenuItemFormScreen.tsx`
- **API cần dùng:**
  ```
  POST /api/menu/items       — Thêm món mới
  PATCH /api/menu/items/:id  — Cập nhật món
  ```
- **Việc làm:**
  1. Submit form → gọi API → cập nhật `useMenuStore.items` nếu thành công.
  2. Upload ảnh: sử dụng `expo-image-picker` lấy ảnh → gọi `POST /api/upload/image` → nhận URL từ Cloudinary, gán vào field `imageUrl`.
  3. Hiển thị preview ảnh vừa chọn trước khi upload.
  4. Validate form trước khi submit: Tên không được rỗng, Giá phải > 0, Danh mục phải chọn.
- **Định nghĩa hoàn thành:** Có thể thêm / sửa món ăn từ mobile, ảnh upload lên Cloudinary và hiển thị đúng trên giao diện.

---

### 🔔 GIAI ĐOẠN 5 — Notification & Realtime (Tuần 3)

#### Task A-012: NotificationScreen — Kết nối Socket.IO
- **File:** `mobile/src/screens/NotificationScreen.tsx`
- **Việc làm:**
  1. Cài `socket.io-client` cho React Native.
  2. Tạo hook `useSocket()` tại `mobile/src/hooks/useSocket.ts`:
     - Kết nối với backend `socket.io-client(BASE_URL, { auth: { token } })`.
     - Lắng nghe sự kiện `order:new` → đẩy `NotificationItem` vào đầu danh sách.
     - Lắng nghe `payment:completed` → đẩy thông báo thanh toán.
  3. Badge số thông báo chưa đọc trên `BottomNav` tab **Thông Báo** cập nhật tức thì.
  4. Bấm vào notification `ORDER` → điều hướng `onNavigate('order', 'orders')`.
- **Định nghĩa hoàn thành:** Thông báo mới xuất hiện tức thì (<1s) mà không cần tải lại màn hình.

#### Task A-013: SettingsScreen — Kết nối API Profile
- **File:** `mobile/src/screens/SettingsScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/auth/me
  PATCH /api/users/profile — Cập nhật thông tin
  POST /api/auth/change-password
  ```
- **Việc làm:**
  1. Tải và hiển thị thông tin thực của nhân viên đang đăng nhập từ `GET /api/auth/me`.
  2. Nút **Cập Nhật Thông Tin** gọi API PATCH với form data.
  3. Luồng Đổi mật khẩu: Modal nhập Mật khẩu cũ → Mật khẩu mới → Xác nhận → gọi API → hiển thị kết quả.
- **Định nghĩa hoàn thành:** Thông tin hồ sơ thực từ tài khoản đang đăng nhập, đổi mật khẩu hoạt động bình thường.

---

### ✅ GIAI ĐOẠN 6 — iOS Build & Release (Tuần 4)

#### Task A-014: Kiểm Thử iOS Toàn Diện
- Chạy tất cả màn hình trên các Simulator: iPhone SE (iOS 16), iPhone 14 Pro (iOS 17), iPhone 15 Pro Max (iOS 17).
- Kiểm tra các trường hợp đặc biệt:
  - Mất kết nối mạng giữa chừng (Airplane Mode).
  - Token hết hạn → tự động gọi refresh token → tiếp tục làm việc bình thường.
  - Đặt đơn khi offline → thông báo lỗi rõ ràng, không crash app.
  - Danh sách thực đơn trống (không có món nào).

#### Task A-015: iOS Build Config (EAS Build)
- Cấu hình `eas.json` profile `preview` cho iOS internal testing.
- Submit build lên TestFlight để test trên thiết bị thật.
- Commit cuối: `feat(ios): production-ready iOS build configuration`

---

### ⚙️ GIAI ĐOẠN 7 — Backend Core APIs (Tuần 1 - Tuần 3)

#### Task A-BE-001: Hệ thống Xác thực Auth & JWT thuần (Bắt buộc không dùng thư viện thứ 3)
- **File:** `backend/src/controllers/auth.controller.ts`, `backend/src/services/auth.service.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/routes/auth.routes.ts`
- **Yêu cầu kỹ thuật:**
  1. Token Access: Thời hạn 15 phút, chứa `userId`, `tenantId`, `branchId`, `role`.
  2. Refresh Token: Thời hạn 7 ngày, lưu vào HttpOnly cookie hoặc DB, hỗ trợ rotation và reuse detection.
  3. Middleware `authMiddleware`: Parse Authorization Bearer, xác thực chữ ký JWT, inject `req.user`.
  4. Middleware `requireRole(allowedRoles)`: Phân quyền theo vai trò (`ADMIN`, `MANAGER`, `KITCHEN`, `CASHIER`, `PLATFORM_ADMIN`).
  5. Đổi mật khẩu: `POST /api/auth/change-password` kiểm tra old password qua `bcrypt`.
- **Định nghĩa hoàn thành:** Postman test pass 100% login, refresh token, role-guard từ chối khi không đúng vai trò.

#### Task A-BE-002: Menu & Modifiers API (Multi-tenant & Caching)
- **File:** `backend/src/controllers/menu.controller.ts`, `backend/src/services/menu.service.ts`, `backend/src/routes/menu.routes.ts`
- **Endpoints:**
  - `GET /api/menu/items?branchId=` (lọc theo tenantId và branchId)
  - `GET /api/menu/:tableId` (public cho khách quét QR, trả kèm modifier groups)
  - `POST /api/menu/items` (tạo món mới, validate Zod)
  - `PATCH /api/menu/items/:id` & `DELETE /api/menu/items/:id`
  - `POST/PATCH/DELETE /api/menu/modifier-groups` & `/api/menu/modifier-options`
- **Định nghĩa hoàn thành:** CRUD thực đơn hoạt động mượt mà, query luôn kẹp `tenantId: req.user.tenantId`.

#### Task A-BE-003: Session Khách & Gọi món (Session & Order Placement)
- **File:** `backend/src/controllers/session.controller.ts`, `backend/src/routes/session.routes.ts`
- **Endpoints:**
  - `POST /api/sessions/:tableId/order`: Nhận payload mảng món gọi kèm modifiers/note, tạo `Order` và các `OrderItem` trong transaction Prisma.
  - Cập nhật `Table.status = OCCUPIED` khi có đơn mới.
  - Phát event Socket.IO `order:new` đến room của chi nhánh `branch:{branchId}` để Bếp KDS và Thu ngân nhận được.
- **Định nghĩa hoàn thành:** Gọi món thành công từ Mobile/QR Menu, data lưu đúng cấu trúc Order/OrderItem, Socket event bắn tức thì.

#### Task A-BE-004: Analytics & Doanh Thu Tổng Quan API
- **File:** `backend/src/controllers/analytics.controller.ts`, `backend/src/services/analytics.service.ts`, `backend/src/routes/analytics.routes.ts`
- **Endpoints:**
  - `GET /api/analytics/today-overview`: Tính tổng doanh thu hôm nay, số đơn, đơn chờ, tỉ lệ tăng trưởng so với ngày hôm trước.
  - `GET /api/analytics/revenue?timeframe=day|month|year`: Thống kê doanh thu theo mốc thời gian để vẽ biểu đồ trên mobile `RevenueScreen`.
- **Định nghĩa hoàn thành:** Dữ liệu tính toán chính xác, response format chuẩn `ApiResponse.success`.

#### Task A-BE-005: Cloudinary Image Upload Service
- **File:** `backend/src/controllers/upload.controller.ts`, `backend/src/routes/upload.routes.ts`
- **Nghiệp vụ:** Tiếp nhận file upload từ form thêm món (`MenuItemFormScreen` mobile / Admin web), upload lên Cloudinary thư mục `menu-go/{tenantId}/`, trả về HTTPS secure URL.
- **Định nghĩa hoàn thành:** Trả về URL ảnh chuẩn để gán vào thuộc tính `imageUrl` của món ăn.

---

## 🚦 Quy Tắc Git (2 Repositories)

Mỗi repository đều có 2 nhánh chính `main` (production) và `dev` (tích hợp). Thành viên A tự tạo nhánh riêng để code:

### 1. Mobile App Repo (`mobile.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/mobile-ios-a

# Commits mẫu
feat(home): connect homescreen to analytics api
fix(order): correct cart item composite key for modifier items
feat(auth): implement secure token storage with expo-secure-store

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/mobile-ios-a
```

### 2. Backend Repo (`backend.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/be-auth-menu-a

# Commits mẫu
feat(auth): implement pure jwt rotation and role guard middleware
feat(menu): add crud endpoints for menu items and modifier groups
feat(orders): implement session order placement and socket broadcast
feat(analytics): add today overview and revenue timeline endpoints

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/be-auth-menu-a
```

> [!WARNING]
> TUYỆT ĐỐI KHÔNG `git push --force` và không push trực tiếp vào `main` hoặc `dev`. Luôn mở Pull Request vào `dev`.

---

## 🔗 API Endpoints Thành Viên A Xây Dựng & Phụ Trách

| Nhóm | Endpoint | Method | Trách nhiệm của A |
|---|---|---|---|
| **Auth** | `/api/auth/login` | POST | Viết Controller & Service JWT |
| **Auth** | `/api/auth/me` | GET | Lấy thông tin tài khoản hiện tại |
| **Auth** | `/api/auth/refresh` | POST | Xử lý cấp mới access token |
| **Auth** | `/api/auth/change-password` | POST | Xác thực và cập nhật hash mật khẩu |
| **Menu** | `/api/menu/items` | GET/POST | Lấy thực đơn / Tạo món mới |
| **Menu** | `/api/menu/items/:id` | PATCH/DELETE | Cập nhật / Xóa món |
| **Menu** | `/api/menu/:tableId` | GET | Menu công khai cho QR |
| **Menu** | `/api/menu/modifier-groups` | ALL | Quản lý nhóm tùy chọn đường/đá/size |
| **Sessions** | `/api/sessions/:tableId/order` | POST | Tiếp nhận đơn gọi món tại bàn |
| **Analytics** | `/api/analytics/today-overview` | GET | Tổng hợp số liệu Dashboard |
| **Analytics** | `/api/analytics/revenue` | GET | Chuỗi số liệu doanh thu vẽ chart |
| **Upload** | `/api/upload/image` | POST | Xử lý upload ảnh Cloudinary |


---

## 📌 Ghi Chú & Lưu Ý Kỹ Thuật

> [!IMPORTANT]
> Tất cả màu sắc phải lấy từ `src/theme/index.ts` — **TUYỆT ĐỐI KHÔNG hardcode** hex màu trực tiếp trong file TSX. Mã màu hệ thống đã được chuẩn hóa và thành viên B có thể kế thừa.

> [!WARNING]
> Mỗi Cart Item có composite key `cartItemId = ${item.id}__${JSON.stringify(modifiers)}__${note}`. Khi gọi `onRemoveFromCart` phải truyền đúng `cartItemId`, **KHÔNG** truyền `item.id` thuần nếu món có modifier — sẽ gây bug xóa nhầm.

> [!NOTE]
> Thành viên A và B dùng chung `src/types/index.ts` và `src/theme/index.ts`. Hai file này do **Thành viên A quản lý**. Khi Thành viên B cần thêm type mới, tạo Pull Request vào nhánh của A để tránh xung đột.
