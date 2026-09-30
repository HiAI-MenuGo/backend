# 🤖 Workflow Thành Viên B — Android Developer & Backend Operations

> **Người phụ trách:** Nguyễn Quốc Thái (Thành viên B)  
> **Nền tảng:** Mobile App Android (Expo / React Native) + Backend Operations API (Express 5 / Socket.IO)  
> **Thư mục làm việc:** `mobile/` và `backend/`  
> **Nhánh Git:**  
> - Mobile Repo (`mobile.git`): `feat/mobile-android-b` ➔ 🟢 Đã hoàn thành & Merge vào `dev` qua PR #1 (30/09/2026)  
> - Backend Repo (`backend.git`): `feat/be-cashier-kds-b` ➔ 🟢 Đã hoàn thành & Sẵn sàng mở PR vào `dev`  
> **Tiến độ tổng thể:** 🟢 **100% HOÀN THÀNH TOÀN BỘ CÁC TASK & ĐÃ PASS 19/19 TEST E2E**

---

## 🎯 Phạm Vi Công Việc

Thành viên B chịu trách nhiệm phối hợp giữa **Mobile App Android** và **Backend Operations / Realtime APIs**:

### 1. Mobile App Android (`mobile/`)
1. **Trung tâm điều hành (Operations Hub)** — OperationsScreen, giao diện HUB 6 tính năng, realtime badges qua Socket.IO & API.
2. **Quản lý đơn hàng** — OrdersScreen (Đơn live: PENDING/CONFIRMED/DONE), countdown, TablesScreen (Sơ đồ bàn realtime).
3. **Thu ngân di động** — CashierScreen (Thanh toán Tiền mặt & VietQR Napas 247).
4. **Quản lý thực đơn & Kho** — SoldOutScreen, InventoryScreen (cảnh báo tồn kho đỏ, modal điều chỉnh Android-compatible).
5. **Lịch sử đơn hàng** — HistoryScreen (tra cứu, phân trang, lọc ngày).
6. **Kiểm thử Android** — Soft Keyboard `adjustResize` không che input, Status Bar 24dp, Socket.IO client kết nối ổn định tự reconnect, âm thanh chuông + rung.
7. **Cấu hình phát hành** — `eas.json` profile `preview` đóng gói APK test nội bộ.

### 2. Backend API (`backend/`) — Phụ trách các module Vận hành & Realtime:
1. **Socket.IO Core Server**: Khởi tạo Socket.IO trên HTTP server, quản lý room tenant/branch (`tenant:{tenantId}`, `branch:{branchId}`), phát 11 events chuẩn (`order:new`, `order:updated`, `payment:completed`, `table:status-changed`, `sold_out:updated`...).
2. **Live Orders & KDS API**: Cập nhật trạng thái đơn (PENDING ➔ CONFIRMED ➔ DONE ➔ CANCELLED), cập nhật trạng thái từng món bếp, hủy đơn (void) hoàn trả số lượng & lưu trữ lịch sử.
3. **Cashier & VietQR Engine**: Thanh toán tiền mặt CASH, tính tiền thối, sinh mã VietQR động theo chuẩn Napas 247, webhook xử lý tự động khi tiền về tài khoản ngân hàng (SePay).
4. **Tables & Floor Map**: CRUD danh sách bàn, trạng thái bàn (EMPTY, OCCUPIED, RESERVED), sync realtime đổi màu bàn.
5. **Inventory BOM & Khấu trừ tự động**: Quản lý nguyên vật liệu, điều chỉnh tồn kho, tự động trừ định lượng kho khi món chuyển sang DONE.
6. **Khách hàng & Loyalty**: Tra cứu số điện thoại khách hàng, tính toán cộng điểm thành viên sau khi thanh toán thành công và tự động nâng hạng thẻ.

---

## 📁 Files & Màn Hình Phụ Trách

### Mobile (`mobile/`)
| File | Mô tả | Trạng thái |
|------|--------|:---:|
| `mobile/src/screens/OperationsScreen.tsx` | Hub trung tâm: Grid 6 tính năng, routing sub-views, badge số liệu thực | 🟢 Hoàn thành (PR #1 - Commit `04cbd24`, `60d778b`) |
| `mobile/src/screens/operations/OrdersScreen.tsx` | Đơn live: Kanban PENDING/CONFIRMED/DONE, Countdown, Confirm/Done/Void | 🟢 Hoàn thành (PR #1 - Commit `04cbd24`, `234fc10`) |
| `mobile/src/screens/operations/TablesScreen.tsx` | Sơ đồ bàn realtime, đồng bộ `table:status-changed`, chuyển Thu ngân/Tạo đơn | 🟢 Hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/CashierScreen.tsx` | Thu ngân: CASH/VIETQR, đếm ngược QR 60s, tự đóng khi nhận thanh toán | 🟢 Hoàn thành (PR #1 - Commit `04cbd24`, `234fc10`) |
| `mobile/src/screens/operations/SoldOutScreen.tsx` | Báo hết món: Toggle trạng thái từng món, phát socket `sold_out:updated` | 🟢 Hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/InventoryScreen.tsx` | Kho nguyên liệu: Tồn kho, cảnh báo ngưỡng đỏ, modal điều chỉnh Android | 🟢 Hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/HistoryScreen.tsx` | Lịch sử đơn: Search debounce, filter ngày, chi tiết đơn | 🟢 Hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/PrepTimeDetailScreen.tsx` | Countdown chế biến vòng tròn SVG (`react-native-svg`), rung `Vibration` | 🟢 Hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/ModifierDetailScreen.tsx` | Chi tiết & CRUD Modifier Group: Đổi tên nhóm, modal sửa option, di chuyển lên/xuống | 🟢 Hoàn thành (PR #1 - Commit `e3b1541`) |
| `mobile/src/services/sound.ts` | Quản lý phát âm báo (`new_order.mp3`, `payment_complete.mp3`) và rung | 🟢 Hoàn thành (Commit `234fc10`) |
| `mobile/src/hooks/useSocket.ts` | Hook Socket.IO client, auto-reconnect, fallback `10.0.2.2` trên Android Emulator | 🟢 Hoàn thành (Commit `04cbd24`, `234fc10`) |
| `mobile/eas.json` & `mobile/app.json` | Cấu hình EAS Build profile `preview` tạo file APK và quyền Android | 🟢 Hoàn thành (Commit `644fb62`) |

### Backend (`backend/`)
| File | Mô tả | Trạng thái |
|------|--------|:---:|
| `backend/src/socket/index.ts` | Khởi tạo Socket.IO server trên HTTP server chung, join rooms tenant/branch | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/socket/events.ts` | Định nghĩa & dispatch 11 event Socket.IO chuẩn | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/controllers/order.controller.ts` | Quản lý đơn live, chuyển trạng thái Kanban KDS, void đơn, lịch sử | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/controllers/cashier.controller.ts` | Thanh toán CASH, tạo mã VietQR, webhook đối soát giao dịch | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/services/payment/vietqr.service.ts` | Xử lý sinh QR động Napas 247 QuickLink & Webhook đối soát SePay | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/controllers/table.controller.ts` | Danh sách bàn, trạng thái bàn, sơ đồ khu vực | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/controllers/ingredient.controller.ts` | Quản lý kho, tồn kho, điều chỉnh số lượng | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/services/inventory.service.ts` | Logic khấu trừ nguyên liệu BOM tự động khi món DONE, cảnh báo ngưỡng | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/src/controllers/customer.controller.ts` | Tra cứu thành viên theo SĐT, tích lũy điểm thưởng loyalty và nâng hạng thẻ | 🟢 Hoàn thành (Commit `71b83c6`, E2E Tested) |
| `backend/scripts/test_b_suite.ts` | Bộ kiểm thử tự động End-to-End toàn diện cho toàn bộ module Thành viên B | 🟢 Hoàn thành (19/19 Tests Passed) |

---

## 📋 Danh Sách Task Chi Tiết

### 🏗️ GIAI ĐOẠN 1 — Android Setup & Foundation
- 🟢 **Task B-001: Android Status Bar & Navigation Bar Chuẩn**
  - **Trạng thái:** Hoàn thành.
  - Đã thêm `"softwareKeyboardLayoutMode": "resize"` vào `mobile/app.json` giúp bàn phím ảo không che Input trong CashierScreen và InventoryScreen.
  - Sử dụng `useSafeAreaInsets()` đảm bảo giao diện không tràn lên System Bar trên Android.
- 🟢 **Task B-002: Cài đặt & Cấu hình Socket.IO Client**
  - **Trạng thái:** Hoàn thành.
  - Tạo hook `useSocket()` tại `mobile/src/hooks/useSocket.ts` với auto-reconnect, fallback endpoint `http://10.0.2.2:5000` cho Android Emulator và `localhost:5000` cho iOS/Web.
  - Cung cấp `useSocketEvent()` giúp component lắng nghe và tự huỷ listener an toàn khi unmount.
- 🟢 **Task B-003: Cài đặt Audio Alert cho đơn mới**
  - **Trạng thái:** Hoàn thành.
  - Cài đặt thư viện `expo-av`.
  - Thêm file âm thanh chuẩn `mobile/assets/sounds/new_order.mp3` và `payment_complete.mp3`.
  - Tạo service `mobile/src/services/sound.ts` tích hợp Zustand store `useSoundStore` và `Vibration` (rung nhịp kép khi có đơn mới, rung đơn khi hoàn tất thanh toán).
  - Tự động kích hoạt khi có socket event `order:new` và `payment:completed`.

---

### 🏢 GIAI ĐOẠN 2 — OperationsScreen Hub & Routing
- 🟢 **Task B-004: OperationsScreen Hub — Kết nối dữ liệu thực**
  - **Trạng thái:** Hoàn thành.
  - Kết nối endpoint `GET /api/sessions/active-summary?branchId={branchId}`.
  - Badge số liệu thực tế cho 4 thẻ chức năng: Đơn đang chờ, Đơn chờ thanh toán, Số món trong giỏ, Món tạm hết.
  - Tự động cập nhật badge khi nhận socket `order:new`, `order:updated`, `payment:completed`, `sold_out:updated`.
  - Hỗ trợ kéo để làm mới (Pull-to-refresh) qua `RefreshControl`.
- 🟢 **Task B-005: TablesScreen — Sơ Đồ Bàn Realtime**
  - **Trạng thái:** Hoàn thành.
  - Tạo mới `mobile/src/screens/operations/TablesScreen.tsx`.
  - Tải danh sách bàn từ `GET /api/tables?branchId={branchId}`.
  - Grid card bàn đổi màu realtime qua socket `table:status-changed`: Xanh lá (trống), Cam (có khách), Đỏ (chờ thanh toán).
  - Modal chi tiết bàn có nút **Chuyển Thanh Toán** (điều hướng sang Cashier) và nút **Tạo Đơn Mới** (điều hướng sang Order).

---

### 📋 GIAI ĐOẠN 3 — OrdersScreen — Đơn Hàng Live
- 🟢 **Task B-006: OrdersScreen — Kết nối Socket.IO Đơn Live**
  - **Trạng thái:** Hoàn thành.
  - Tải danh sách đơn active từ `GET /api/orders/active?branchId={branchId}`.
  - Lắng nghe Socket.IO: `order:new` (thêm vào đầu PENDING + phát chuông & rung), `order:updated` (cập nhật status), `order:voided` (xóa/mark void).
  - Hiển thị 3 cột filter: **PENDING**, **CONFIRMED**, **DONE**.
  - Bộ đếm ngược `countdownSeconds` mỗi giây theo thời gian chế biến.
- 🟢 **Task B-007: OrdersScreen — Hành Động Trên Đơn (Confirm, Done, Void)**
  - **Trạng thái:** Hoàn thành.
  - Nút **Xác nhận**: Gọi `PATCH /api/orders/:id/status` (chuyển sang CONFIRMED).
  - Nút **Hoàn thành**: Gọi `PATCH /api/orders/:id/status` (chuyển sang DONE, tự động kích hoạt khấu trừ kho BOM).
  - Nút **Hủy Đơn (Void)**: Modal xác nhận + nhập lý do, gọi `POST /api/orders/:id/void`.

---

### 💰 GIAI ĐOẠN 4 — CashierScreen — Thu Ngân Di Động
- 🟢 **Task B-008: CashierScreen — Danh Sách Đơn Chờ Thanh Toán**
  - **Trạng thái:** Hoàn thành.
  - Tải danh sách bàn chờ thanh toán từ `GET /api/sessions/pending-payment?branchId={branchId}`.
  - Hiển thị số bàn, tổng tiền, số lượng món và giờ vào.
- 🟢 **Task B-009: CashierScreen — Thanh Toán Tiền Mặt**
  - **Trạng thái:** Hoàn thành.
  - Input số tiền khách đưa với bàn phím số (`keyboardType="number-pad"`).
  - Tính tiền thối tức thì `change = cashReceived - total`, disable nút khi không đủ tiền.
  - Gọi API `POST /api/cashier/pay`, hiển thị modal thành công và số điểm tích lũy.
- 🟢 **Task B-010: CashierScreen — Thanh Toán VietQR**
  - **Trạng thái:** Hoàn thành.
  - Gọi API `POST /api/cashier/create-qr` sinh mã VietQR Napas 247 QuickLink.
  - Modal hiển thị ảnh QR kèm đồng hồ đếm ngược `60 giây`.
  - Lắng nghe Socket `payment:completed` ➔ tự động đóng Modal QR, phát chuông báo hoàn tất thanh toán.

---

### 🚫 GIAI ĐOẠN 5 — SoldOut, Inventory, History
- 🟢 **Task B-011: SoldOutScreen — Toggle Hết Món Realtime**
  - **Trạng thái:** Hoàn thành.
  - Tải danh sách món từ `GET /api/menu/items`.
  - Switch toggle từng món gọi `PATCH /api/menu/items/:id/sold-out` và phát socket `sold_out:updated`.
  - Bộ lọc: Tất cả / Đang bán / Tạm hết.
- 🟢 **Task B-012: InventoryScreen — Quản Lý Kho Nguyên Liệu**
  - **Trạng thái:** Hoàn thành.
  - Tải tồn kho từ `GET /api/ingredients`, highlight cảnh báo đỏ các nguyên liệu dưới ngưỡng.
  - Xây dựng Modal điều chỉnh kho tương thích Android (thay thế `Alert.prompt` vốn chỉ chạy trên iOS) gọi `PATCH /api/ingredients/:id/adjust`.
- 🟢 **Task B-013: HistoryScreen — Lịch Sử & Tra Cứu Đơn**
  - **Trạng thái:** Hoàn thành.
  - Tải lịch sử phân trang từ `GET /api/orders/history`.
  - Tìm kiếm debounce theo mã đơn, lọc theo khoảng ngày, modal xem chi tiết đơn.

---

### 🔧 GIAI ĐOẠN 6 — ModifierDetailScreen & PrepTime
- 🟢 **Task B-014: ModifierDetailScreen — CRUD Modifier Group**
  - **Trạng thái:** Hoàn thành.
  - Đổi tên nhóm inline với nút Lưu / Hủy.
  - Modal chỉnh sửa Option: đổi tên, giá phụ thu (+đ), nút Xóa.
  - Sắp xếp thứ tự: Nút **Lên trên (Move Up)** / **Xuống dưới (Move Down)**.
  - Hàng mẫu nhanh: Đường, Đá, Size, Topping.
- 🟢 **Task B-015: PrepTimeDetailScreen — Countdown Chế Biến**
  - **Trạng thái:** Hoàn thành.
  - Vòng tròn tiến độ SVG đếm ngược (`react-native-svg`).
  - Hết giờ: Rung `Vibration` + phát âm báo hoàn tất.
  - Nút **Tạm dừng / Tiếp tục** và **+2 Phút** gia hạn thời gian bếp.

---

### ⚙️ GIAI ĐOẠN 7 — Backend Operations & Realtime
- 🟢 **Task B-BE-001: Socket.IO Server & Kiến Trúc Multi-tenant Room**
  - **Trạng thái:** Hoàn thành.
  - Gắn Socket.IO vào HTTP server Express 5 tại `backend/src/socket/index.ts`.
  - Quản lý rooms: `tenant:{tenantId}` và `branch:{branchId}`.
  - Quản lý 11 socket events chuẩn trong `backend/src/socket/events.ts`.
- 🟢 **Task B-BE-002: Live Orders Management & KDS Kanban API**
  - **Trạng thái:** Hoàn thành.
  - Endpoints: `GET /api/orders/active`, `PATCH /api/orders/:id/status`, `PATCH /api/orders/items/:id/status`, `POST /api/orders/:id/void`, `GET /api/orders/history`.
- 🟢 **Task B-BE-003: Cashier & VietQR Dynamic Payment Engine**
  - **Trạng thái:** Hoàn thành.
  - Service `vietqr.service.ts`: Sinh link VietQR chuẩn Napas 247 và parser webhook.
  - Endpoints: `POST /api/cashier/pay`, `POST /api/cashier/create-qr`, `POST /api/cashier/webhook`.
- 🟢 **Task B-BE-004: Tables & Floor Management API**
  - **Trạng thái:** Hoàn thành.
  - Endpoints: `GET /api/tables`, `PATCH /api/tables/:id/status`.
- 🟢 **Task B-BE-005: Inventory & BOM Auto-deduction Engine**
  - **Trạng thái:** Hoàn thành.
  - Service `inventory.service.ts`: Tự động tìm công thức BOM trừ nguyên liệu khi món chuyển sang `DONE`.
  - Phát event `inventory:warning` khi tồn kho dưới ngưỡng an toàn.
- 🟢 **Task B-BE-006: Khách hàng & Loyalty Point Engine**
  - **Trạng thái:** Hoàn thành.
  - Tra cứu khách hàng theo SĐT qua `GET /api/customers?phone=`.
  - Tích lũy điểm thưởng qua `POST /api/customers/points` và tự động nâng hạng thành viên (BRONZE ➔ SILVER ➔ GOLD ➔ DIAMOND).

---

### ✅ GIAI ĐOẠN 8 — Android Build & Release
- 🟢 **Task B-016: Kiểm Thử Android Toàn Diện**
  - **Trạng thái:** Hoàn thành.
  - Kiểm tra giao diện không tràn mép, bàn phím số không che input, kết nối websocket ổn định.
- 🟢 **Task B-017: Android Build Config (EAS Build)**
  - **Trạng thái:** Hoàn thành.
  - Tạo cấu hình `mobile/eas.json` với profile `preview` xuất trực tiếp file APK để test nội bộ.
  - Cấu hình package `com.hiaimenugo.mobile` và permissions (`INTERNET`, `VIBRATE`, `ACCESS_NETWORK_STATE`) trong `mobile/app.json`.

---

## 📊 Kết Quả Kiểm Thử Toàn Diện (End-to-End Test Suite)

Bộ test tự động tại `backend/scripts/test_b_suite.ts` đã được thực thi và vượt qua **19/19 bài kiểm thử (100% PASS)**:

```bash
cd backend
npx tsx scripts/test_b_suite.ts
```

| STT | Kịch Bản Kiểm Thử | Endpoint / Chức Năng | Kết Quả |
|:---:|---|---|:---:|
| 1 | Kiểm tra Health Check | `GET /api/health` | ✅ PASS |
| 2 | Lấy thống kê tổng quan Hub | `GET /api/sessions/active-summary` | ✅ PASS |
| 3 | Lấy danh sách đơn live KDS | `GET /api/orders/active` | ✅ PASS |
| 4 | Chuyển trạng thái sang CONFIRMED | `PATCH /api/orders/:id/status` | ✅ PASS |
| 5 | Chuyển sang DONE & khấu trừ kho BOM | `PATCH /api/orders/:id/status` | ✅ PASS |
| 6 | Hủy đơn hàng (Void) hoàn kho & archive | `POST /api/orders/:id/void` | ✅ PASS |
| 7 | Lấy lịch sử đơn hàng có phân trang | `GET /api/orders/history` | ✅ PASS |
| 8 | Lấy danh sách bàn chờ thanh toán | `GET /api/sessions/pending-payment` | ✅ PASS |
| 9 | Thanh toán tiền mặt CASH & tính tiền thối | `POST /api/cashier/pay` | ✅ PASS |
| 10 | Sinh mã VietQR động Napas 247 | `POST /api/cashier/create-qr` | ✅ PASS |
| 11 | Nhận Webhook SePay auto hoàn tất thanh toán | `POST /api/cashier/webhook` | ✅ PASS |
| 12 | Lấy danh sách bàn ăn & sơ đồ | `GET /api/tables` | ✅ PASS |
| 13 | Đổi trạng thái bàn sang OCCUPIED | `PATCH /api/tables/:id/status` | ✅ PASS |
| 14 | Lấy danh sách tồn kho nguyên liệu | `GET /api/ingredients` | ✅ PASS |
| 15 | Điều chỉnh tồn kho nguyên liệu | `PATCH /api/ingredients/:id/adjust` | ✅ PASS |
| 16 | Tra cứu thông tin khách hàng qua SĐT | `GET /api/customers?phone=` | ✅ PASS |
| 17 | Tích điểm thưởng Loyalty & nâng hạng | `POST /api/customers/points` | ✅ PASS |
| 18 | Bật/tắt trạng thái hết món (Sold Out) | `PATCH /api/menu/items/:id/sold-out` | ✅ PASS |
| 19 | Handshake & Polling Socket.IO Server | `/socket.io/?EIO=4&transport=polling` | ✅ PASS |

**Tổng kết:** **19 PASSED / 0 FAILED** • **0 TypeScript Errors** trên cả `backend/` và `mobile/`.

---

## 🚦 Quy Tắc Git Đã Thực Hiện

Hai nhánh tính năng đã được tạo và push lên remote theo đúng Git Flow:
1. **Mobile Repo:** `feat/mobile-android-b` ➔ [Mở PR vào dev](https://github.com/HiAI-MenuGo/mobile/pull/new/feat/mobile-android-b)
2. **Backend Repo:** `feat/be-cashier-kds-b` ➔ [Mở PR vào dev](https://github.com/HiAI-MenuGo/backend/pull/new/feat/be-cashier-kds-b)
