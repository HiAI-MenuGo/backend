# 📱 Workflow Thành Viên A — iOS Developer & Backend Core

> **Người phụ trách:** Trần Hoàng Đạt (Thành viên A)  
> **Nền tảng:** Mobile App iOS (Expo / React Native) + Backend Core API (Express 5 / TypeScript)  
> **Thư mục làm việc:** `mobile/` và `backend/`  
> **Nhánh Git phụ trách:**
> - Mobile Repo (`mobile.git`): `feat/mobile-ios-a` ➔ Merge vào `dev` (Commit `42b7d84` qua PR #5)
> - Backend Repo (`backend.git`): `feat/be-auth-menu-a` ➔ Merge vào `dev` (Commit `c8abdae` qua PR #2)
>
> ⚠️ **TỔNG KẾT TIẾN ĐỘ THỰC TẾ (Audit ngày 09/10/2026):**  
> - **Tiến độ hoàn thành:** **~18%** (Đã làm: Khung Auth JWT Backend + AuthGate & Login Mobile; **Chưa làm:** 11/15 task Mobile vẫn chạy Mock Data, 4/5 API Backend chưa được viết).  
> - **Lịch sử commit:** Hoạt động cuối ghi nhận vào **30/09/2026**. Sau ngày 30/09/2026 không có thêm commit phát triển tính năng nào từ Thành viên A.

---

## 🎯 Phạm Vi Công Việc & Mục Tiêu

Thành viên A chịu trách nhiệm phối hợp giữa **Mobile App iOS** và **Backend Core APIs**:

### 1. Mobile App iOS (`mobile/`)
1. **App Shell & Foundation:** Cấu trúc khung ứng dụng, SafeArea, Design Tokens, Auth Gate và lưu trữ phiên an toàn (`expo-secure-store`).
2. **Màn hình phía Nhân viên:** HomeScreen (Tổng quan kinh doanh & Phím tắt), RevenueScreen (Báo cáo doanh thu), NotificationScreen (Thông báo realtime).
3. **Nghiệp vụ Gọi món POS:** OrderScreen (Menu đặt món), ItemOptionsScreen (Chọn topping/đường/đá), MenuItemFormScreen (Thêm/sửa món ăn).
4. **Cài đặt & Hồ sơ:** SettingsScreen (Xem hồ sơ, đổi mật khẩu, đăng xuất).
5. **Kiểm thử & Đóng gói iOS:** Kiểm thử trên Simulator iOS (iPhone SE, 14 Pro, 15 Pro Max) và cấu hình EAS Build iOS.

### 2. Backend API (`backend/`)
1. **Auth & JWT System (`/api/auth/*`):** Đăng nhập, refresh token rotation, me, change-password, authMiddleware, role guard.
2. **Menu & Modifiers CRUD (`/api/menu/*`):** Quản lý danh mục, món ăn, nhóm tùy chọn đường/đá/size/topping.
3. **Session & Gọi món (`/api/sessions/:tableId/order`):** Tiếp nhận đơn gọi món tại bàn, cập nhật bàn, broadcast socket `order:new`.
4. **Analytics Overview (`/api/analytics/*`):** Thống kê doanh thu ngày, số đơn, top món bán chạy để cấp cho mobile.
5. **Cloudinary Upload Service (`/api/upload/image`):** Upload hình ảnh món ăn.

---

## 📁 Bảng Tổng Hợp Trạng Thái Thực Tế

### 📱 Phía Mobile App (`mobile/`)
| File / Màn hình | Nhiệm vụ chính | Trạng thái thực tế | Chi tiết Đã làm / Chưa làm |
|---|---|:---:|---|
| `mobile/App.tsx` | Root Shell, SafeArea, AuthGate, CartLogic | 🟢 Đã hoàn thành | **Đã làm:** Bọc `AuthGate`, điều hướng `LoginScreen` khi chưa đăng nhập (Commit `42b7d84`). |
| `mobile/src/theme/index.ts` | Design Tokens: Colors, Radii, Shadows | 🟢 Đã hoàn thành | **Đã làm:** Khởi tạo đầy đủ tokens chuẩn F&B (Commit `42b7d84`). |
| `mobile/src/screens/LoginScreen.tsx` | Màn hình Đăng nhập nhân viên | 🟢 Đã hoàn thành | **Đã làm:** Giao diện đăng nhập, gọi API auth, lưu token vào SecureStore (Commit `42b7d84`). |
| `mobile/src/data/authStore.ts` | Zustand Store: Auth & Tokens | 🟢 Đã hoàn thành | **Đã làm:** Quản lý state đăng nhập, nạp token từ `expo-secure-store` (Commit `42b7d84`). |
| `mobile/src/services/api.ts` | Cấu hình Axios & Interceptor | 🟡 Hoàn thành 1 phần | **Đã làm:** Axios instance + gắn JWT token.<br>🔴 **Chưa làm:** Chưa có các hàm gọi API Menu, Analytics, Session Order. |
| `mobile/src/services/auth.service.ts` | Service Auth phía client | 🟢 Đã hoàn thành | **Đã làm:** `login()`, `refreshToken()`, `getProfile()` (Commit `42b7d84`). |
| `mobile/src/services/menu.service.ts` | Service kết nối Menu API | 🔴 Chưa thực hiện | **Chưa có file.** Chưa viết layer gọi API thực đơn. |
| `mobile/src/data/menuStore.ts` | Zustand Menu Store | 🔴 Chưa hoàn thành | **Chưa làm:** Vẫn dùng 100% `mockMenuItems` trong bộ nhớ RAM, chưa nối API thực, thiếu state `loading`/`error`. |
| `mobile/src/screens/HomeScreen.tsx` | Trang chủ Dashboard | 🔴 Chưa hoàn thành | **Chưa làm:** 100% dữ liệu cứng hardcode (không có useEffect, không gọi API, không pull-to-refresh). Phím tắt "Đang chờ" gọi nhầm tab `tables`. |
| `mobile/src/screens/RevenueScreen.tsx` | Báo cáo doanh thu & biểu đồ | 🔴 Chưa hoàn thành | **Chưa làm:** Doanh thu tính toán bằng công thức ảo `selectedDay * 170000 % 2200000`. Chưa gọi API Analytics, chưa có Haptics hay spring animation. |
| `mobile/src/screens/NotificationScreen.tsx` | Thông báo realtime | 🔴 Chưa hoàn thành | **Chưa làm:** Vẫn đọc từ `mockNotifications`, chưa lắng nghe sự kiện Socket.IO `order:new` hay `payment:completed`. |
| `mobile/src/screens/OrderScreen.tsx` | Màn hình gọi món POS | 🔴 Chưa hoàn thành | **Chưa làm:** Dữ liệu món lấy từ mock; nút "Xác nhận đơn" chỉ xử lý state local, không gọi `POST /api/sessions/:tableId/order`. |
| `mobile/src/screens/operations/ItemOptionsScreen.tsx` | Chọn đường/đá/size/topping | 🟡 Hoàn thành 70% | **Đã làm:** Giao diện chọn topping và tính tổng đơn giá.<br>🔴 **Chưa làm:** Thiếu preview realtime `"45k + 10k = 55k"` và animation scale. |
| `mobile/src/screens/operations/MenuItemFormScreen.tsx` | Thêm / Sửa món ăn | 🔴 Chưa hoàn thành | **Chưa làm:** Không gọi API backend, không tích hợp Cloudinary upload, chỉ lưu tạm vào store in-memory. |
| `mobile/src/screens/SettingsScreen.tsx` | Hồ sơ cá nhân & Cài đặt | 🟡 Hoàn thành 30% | **Đã làm:** UI form hồ sơ.<br>🔴 **Chưa làm:** Chưa gọi `GET /api/auth/me`, chưa có API đổi mật khẩu; nút Đăng xuất chỉ hiện Alert mà không xóa session. |
| `mobile/docs/TEST_iOS.md` | Báo cáo kiểm thử iOS | 🔴 Chưa thực hiện | **Chưa có file.** Chưa có kết quả test trên Simulator iPhone SE/14 Pro/15 Pro Max. |
| `mobile/eas.json` | Cấu hình build EAS | 🟡 Hoàn thành 1 phần | File do Thành viên B tạo cho Android; Thành viên A chưa cấu hình profile iOS và chưa test TestFlight. |

---

### ⚙️ Phía Backend Core APIs (`backend/`)
| File / Module | Nhiệm vụ chính | Trạng thái thực tế | Chi tiết Đã làm / Chưa làm |
|---|---|:---:|---|
| `backend/src/controllers/auth.controller.ts`<br>`backend/src/services/auth.service.ts`<br>`backend/src/middlewares/auth.middleware.ts`<br>`backend/src/routes/auth.routes.ts` | Xác thực Auth & JWT thuần | 🟢 Đã hoàn thành ban đầu | **Đã làm:** Viết đầy đủ logic JWT thuần (access 15m, refresh 7d, rotation, role-guard) ở Commit `c8abdae`.<br>*(Lưu ý: Bản ban đầu dùng in-memory mock, sau đó Thành viên C đã refactor nối vào Prisma DB).* |
| `backend/src/controllers/menu.controller.ts`<br>`backend/src/services/menu.service.ts`<br>`backend/src/routes/menu.routes.ts` | Menu & Modifiers API | 🔴 Thành viên A chưa làm | **Chưa làm:** A không tạo module này. (Thành viên B và C đã phải tự tạo tạm một phần để kịp tiến độ frontend/mobile của họ). |
| `backend/src/controllers/session.controller.ts`<br>`backend/src/routes/session.routes.ts` | Đặt món tại bàn & Bắn Socket | 🔴 Thành viên A chưa làm | **Chưa làm:** A không tạo module này. (Thành viên B & C đã phải tự viết `order.controller.ts` thay thế). |
| `backend/src/controllers/analytics.controller.ts`<br>`backend/src/services/analytics.service.ts`<br>`backend/src/routes/analytics.routes.ts` | Thống kê doanh thu & Dashboard | 🔴 Thành viên A chưa làm | **Chưa làm:** A hoàn toàn bỏ trống module này. (Thành viên C đã phải nhảy vào viết API Analytics trên branch `feat/be-admin-report-c` commit `20e6454`). |
| `backend/src/controllers/upload.controller.ts`<br>`backend/src/routes/upload.routes.ts` | Upload ảnh Cloudinary | 🔴 Thành viên A chưa làm | **Chưa làm:** Hoàn toàn chưa có controller hay route upload ảnh. |

---

## 📋 Chi Tiết Từng Task: Đã Làm, Chưa Làm & Việc Cần Làm Tiếp Theo

### 🏗️ GIAI ĐOẠN 1 — Foundation & App Shell

#### Task A-001: Tách Mock Data — Chuẩn bị layer kết nối API
- **Trạng thái:** 🟡 Hoàn thành 50%
- **Đã làm (Commit `42b7d84`):**
  - Tạo `mobile/src/services/api.ts` thiết lập Axios instance kèm interceptor tự động gắn `Authorization: Bearer <token>`.
  - Tạo `mobile/src/services/auth.service.ts` chứa các hàm `login()`, `refreshToken()`, `getProfile()`.
- **Chưa làm (Tồn đọng):**
  - Chưa tạo `mobile/src/services/menu.service.ts` (`getMenuItems()`, `createMenuItem()`, `updateMenuItem()`, `deleteMenuItem()`).
  - Chưa refactor `mobile/src/data/menuStore.ts`: Vẫn đang import trực tiếp `mockMenuItems` tĩnh, chưa có state `loading: boolean`, `error: string | null`, và hàm `fetchItems()`.
- **Hành động cần làm tiếp theo:**
  1. Viết `menu.service.ts` gọi `GET /api/menu/items`.
  2. Bổ sung `fetchItems: async () => void`, `isLoading`, `error` vào `menuStore.ts`. Fallback về mock data nếu mất mạng.

---

#### Task A-002: Auth Flow — Đăng nhập & Lưu phiên
- **Trạng thái:** 🟡 Hoàn thành 80%
- **Đã làm (Commit `42b7d84`):**
  - Cài đặt thư viện `expo-secure-store`.
  - Viết `mobile/src/data/authStore.ts` quản lý token an toàn qua SecureStore.
  - Viết `mobile/src/screens/LoginScreen.tsx` hỗ trợ đăng nhập email/mật khẩu và chọn vai trò demo.
  - Bọc `AuthGate` ở `mobile/App.tsx`, kiểm tra trạng thái đăng nhập khi mở app.
- **Chưa làm (Tồn đọng):**
  - Nút **Đăng xuất** trong `mobile/src/screens/SettingsScreen.tsx` chưa gọi `useAuthStore.getState().logout()`. Khi bấm đăng xuất hiện tại chỉ hiển thị `Alert.alert` rồi giữ nguyên tài khoản và màn hình.
- **Hành động cần làm tiếp theo:**
  - Import `useAuthStore` vào `SettingsScreen.tsx`, cập nhật hàm `handleConfirmLogout` gọi `logout()` để xóa SecureStore và tự động chuyển về màn hình `LoginScreen`.

---

#### Task A-003: iOS Safe Area & Safe Zone Testing
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Chưa tạo file checklist kiểm thử `docs/TEST_iOS.md`.
  - Chưa kiểm tra thực tế hành vi Floating Dock với Dynamic Island (iPhone 14/15 Pro) và Home Indicator.
- **Hành động cần làm tiếp theo:**
  - Chạy app trên Simulator iOS (iPhone SE, iPhone 15 Pro), chụp màn hình kiểm tra Safe Area insets, ghi lại biên bản trong `docs/TEST_iOS.md`.

---

### 🏠 GIAI ĐOẠN 2 — HomeScreen & Dashboard

#### Task A-004: HomeScreen — Kết nối API dữ liệu thực
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Màn hình `mobile/src/screens/HomeScreen.tsx` đang chứa 100% số liệu hardcoded (24.500.000đ, 48 đơn, 6 đơn chờ...).
  - Không có hook `useEffect` nào để gọi API `GET /api/analytics/today-overview`.
  - Thiếu skeleton placeholder khi tải dữ liệu.
  - Thiếu cơ chế Pull-to-refresh (`RefreshControl`) để nhân viên làm mới số liệu.
- **Hành động cần làm tiếp theo:**
  - Thêm state `todayData`, `isLoading`, `onRefresh`.
  - Gọi API overview khi mount, hiển thị dữ liệu thật lên các card chỉ số và danh sách Top món bán chạy.

---

#### Task A-005: HomeScreen — Chuyển hướng Navigation từ Shortcuts
- **Trạng thái:** 🟡 Hoàn thành 50%
- **Đã làm:**
  - Đã có props `onNavigate` và gán sự kiện cho các card phím tắt.
- **Chưa làm (Tồn đọng):**
  - Shortcut "6 đơn Đang chờ" đang trỏ nhầm về `onNavigate('order', 'tables')` thay vì `'orders'`.
  - Số lượng đơn hiển thị trên shortcut chưa phản ánh đúng số đơn thực từ KDS.
- **Hành động cần làm tiếp theo:**
  - Sửa lại đích đến của shortcut Đang chờ sang `'orders'`. Kết nối badge số lượng với `historyStore` hoặc API live orders.

---

### 📊 GIAI ĐOẠN 3 — RevenueScreen & Analytics

#### Task A-006: RevenueScreen — Kết nối API Analytics
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Chưa gọi API `GET /api/analytics/revenue?timeframe=day|month|year`.
  - Toàn bộ dữ liệu doanh thu được tính toán bằng thuật toán giả lập `getComputedRevenue()` trong file (`selectedDay * 170000 % 2200000`).
  - Chưa có loading shimmer trên biểu đồ cột.
- **Hành động cần làm tiếp theo:**
  - Tạo `services/analytics.service.ts` gọi API backend.
  - Thay thế hoàn toàn hàm `getComputedRevenue()` bằng dữ liệu trả về từ backend.

---

#### Task A-007: RevenueScreen — Cải thiện UX Date Picker
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Chưa tích hợp rung phản hồi `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
  - Modal Date Picker chưa có animation mượt `Animated.spring`.
  - Chưa vô hiệu hóa (disable) các ngày trong tương lai.
- **Hành động cần làm tiếp theo:**
  - Cài đặt/import `expo-haptics`, thêm rung khi chọn ngày và kiểm tra điều kiện `date > today` để disable.

---

### 🛒 GIAI ĐOẠN 4 — OrderScreen & Gọi Món POS

#### Task A-008: OrderScreen — Kết nối API Thực đơn
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Vẫn đang đọc danh sách món từ `useMenuStore` (bản mock data).
  - Chưa có skeleton UI 2 cột khi đang nạp thực đơn từ mạng.
- **Hành động cần làm tiếp theo:**
  - Cho `OrderScreen` gọi `fetchItems()` khi mount và hiển thị skeleton trong thời gian tải.

---

#### Task A-009: OrderScreen — Gửi đơn hàng lên Backend
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Sau khi chọn món và bấm "Xác nhận đơn", app chỉ mở modal thành công ảo và xóa giỏ hàng local.
  - Không hề có lệnh gọi `POST /api/sessions/:tableId/order` lên backend.
  - Đơn hàng không bao giờ đến được Bếp KDS hay Thu ngân.
- **Hành động cần làm tiếp theo:**
  - Viết hàm `submitOrder()` gửi payload `{ tableId, items, orderType }` qua Axios lên backend.
  - Hiển thị spinner lúc gửi, báo lỗi nếu backend phản hồi thất bại.

---

#### Task A-010: ItemOptionsScreen — Tính toán tổng tiền tùy chọn
- **Trạng thái:** 🟡 Hoàn thành 70%
- **Đã làm:**
  - Đã có giao diện chọn topping, đường, đá, ghi chú và bộ đếm số lượng (Stepper).
  - Đã tính toán đúng `totalPrice = (basePrice + extraPrices) * quantity`.
- **Chưa làm (Tồn đọng):**
  - Thiếu chuỗi hiển thị công thức giá realtime phía trên nút bấm (ví dụ: `"45.000đ + 10.000đ = 55.000đ"`).
  - Thiếu hiệu ứng animation scale nhẹ khi giá thay đổi.
- **Hành động cần làm tiếp theo:**
  - Bổ sung text phụ thể hiện chi tiết tiền gốc + topping và gắn animation scale 1.05 cho tổng giá.

---

#### Task A-011: MenuItemFormScreen — Thêm/sửa món & Upload ảnh
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Form thêm/sửa món chỉ gọi `useMenuStore.addItem()` để lưu tạm vào bộ nhớ in-memory, app reload là mất.
  - Chưa tích hợp Cloudinary Image Upload (`POST /api/upload/image`). Ảnh món ăn chỉ lấy URL ảnh mẫu unsplash.
- **Hành động cần làm tiếp theo:**
  - Nối `expo-image-picker` với API upload ảnh backend, sau đó gửi payload món ăn lên `POST /api/menu/items`.

---

### 🔔 GIAI ĐOẠN 5 — Notification & Settings

#### Task A-012: NotificationScreen — Kết nối Socket.IO
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Mặc dù Thành viên B đã tạo hook `useSocket.ts`, nhưng `NotificationScreen.tsx` vẫn đọc mảng cứng `mockNotifications`.
  - Chưa có listener cho các sự kiện `order:new` hay `payment:completed` để đẩy thông báo mới vào màn hình.
- **Hành động cần làm tiếp theo:**
  - Tích hợp `useSocket()` vào `NotificationScreen`, nhận event và thêm thông báo mới realtime kèm cập nhật badge ở thanh BottomNav.

---

#### Task A-013: SettingsScreen — Kết nối API Profile & Đổi mật khẩu
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:**
  - Thông tin nhân viên (Trần Tuấn, Quản lý ca) là dữ liệu tĩnh.
  - Chưa gọi `GET /api/auth/me` để lấy thông tin thực của tài khoản đang đăng nhập.
  - Modal đổi mật khẩu chỉ bấm nút hiện thông báo giả, chưa gọi `POST /api/auth/change-password`.
- **Hành động cần làm tiếp theo:**
  - Kết nối `GET /api/auth/me` và `POST /api/auth/change-password`.

---

### ✅ GIAI ĐOẠN 6 — iOS Build & Release

#### Task A-014: Kiểm Thử iOS Toàn Diện
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:** Chưa thực hiện kiểm thử chế độ offline, token hết hạn, và các dòng iPhone SE/14 Pro/15 Pro Max.

#### Task A-015: iOS Build Config (EAS Build)
- **Trạng thái:** 🔴 Chưa thực hiện (0%)
- **Chưa làm:** Chưa cấu hình chứng chỉ Apple Developer và profile iOS trong `eas.json`.

---

### ⚙️ GIAI ĐOẠN 7 — Backend Core APIs

#### Task A-BE-001: Hệ thống Xác thực Auth & JWT thuần
- **Trạng thái:** 🟢 Đã hoàn thành ban đầu (Commit `c8abdae`)
- **Đã làm:**
  - Xây dựng hệ thống JWT thuần không phụ thuộc thư viện bên ngoài:
    - `backend/src/services/auth.service.ts`: Tạo Access Token (15m), Refresh Token (7d), mã hóa SHA256, rotation và reuse detection.
    - `backend/src/controllers/auth.controller.ts`: Xử lý login, refresh, me, change-password, logout.
    - `backend/src/middlewares/auth.middleware.ts`: Xác thực Bearer token, phân quyền vai trò `requireRole()`.
    - `backend/src/routes/auth.routes.ts`: Đăng ký toàn bộ router `/api/auth/*`.
- **Ghi chú phối hợp:** Phiên bản ban đầu của A dùng mock DB in-memory. Sau đó, Thành viên C đã refactor ở Commit `bf09a05` để kết nối vào Prisma & PostgreSQL thật.

---

#### Task A-BE-002: Menu & Modifiers API (`/api/menu/*`)
- **Trạng thái:** 🔴 Thành viên A chưa thực hiện (0%)
- **Chi tiết:** Thành viên A chưa viết `menu.controller.ts`, `menu.service.ts`, `menu.routes.ts`. Để hệ thống có thể hoạt động, Thành viên B và C đã phải tự tạo tạm một phần endpoints menu cơ bản. Các API CRUD Modifier Groups chuyên sâu vẫn đang thiếu.

---

#### Task A-BE-003: Session Khách & Đặt món (`/api/sessions/:tableId/order`)
- **Trạng thái:** 🔴 Thành viên A chưa thực hiện (0%)
- **Chi tiết:** Thành viên A không viết endpoint đặt đơn này. Thành viên B và C đã phải gánh thay logic tạo đơn tại `order.controller.ts` và `customer.controller.ts`.

---

#### Task A-BE-004: Analytics & Doanh Thu Tổng Quan API (`/api/analytics/*`)
- **Trạng thái:** 🔴 Thành viên A chưa thực hiện (0%)
- **Chi tiết:** Thành viên A hoàn toàn bỏ trống module này. Thành viên C đã phải tự viết API tính toán metrics thực tế và xu hướng doanh thu theo giờ tại nhánh `feat/be-admin-report-c` (Commit `20e6454`).

---

#### Task A-BE-005: Cloudinary Image Upload Service (`/api/upload/image`)
- **Trạng thái:** 🔴 Thành viên A chưa thực hiện (0%)
- **Chi tiết:** Chưa khởi tạo controller, route và cấu hình Cloudinary SDK cho backend.

---

## 🚦 Tác Động Phối Hợp Chéo (Cross-Member Impact)

Do Thành viên A dừng hoạt động sau ngày 30/09/2026:
1. **Thành viên B (Mobile & Operations):** Đã phải tự tạo các màn hình sơ đồ bàn (`TablesScreen.tsx`), hook `useSocket.ts` và file cấu hình `eas.json` để giữ tiến độ dự án.
2. **Thành viên C (Web & Backend Architecture):** Đã phải refactor lại toàn bộ module Auth của A từ in-memory sang Prisma DB thật, đồng thời phải tự viết API Analytics overview (`/api/analytics/*`) vốn thuộc trách nhiệm của A.
3. **Ứng dụng Mobile:** Hiện tại phần lớn các màn hình của A (Home, Revenue, Order, MenuForm, Settings) chỉ là **vỏ giao diện (Mock UI)**, chưa thể vận hành thực tế với backend.

---

## 📌 Checklist Cần Hoàn Thiện Ngay Để Đóng Task Của A

- [ ] **Ưu tiên 1:** Nối nút Đăng xuất tại `SettingsScreen.tsx` vào `authStore.logout()` (giải quyết dứt điểm Auth Flow).
- [ ] **Ưu tiên 2:** Chuyển `menuStore.ts` sang gọi API thực `GET /api/menu/items`, loại bỏ phụ thuộc `mockData.ts`.
- [ ] **Ưu tiên 3:** Nối API `POST /api/sessions/:tableId/order` vào nút Xác nhận đơn trên `OrderScreen.tsx`.
- [ ] **Ưu tiên 4:** Nối API `GET /api/analytics/today-overview` và `GET /api/analytics/revenue` vào `HomeScreen.tsx` và `RevenueScreen.tsx`.
- [ ] **Ưu tiên 5:** Viết service upload ảnh Cloudinary trên backend (`POST /api/upload/image`) và nối vào `MenuItemFormScreen.tsx`.
