# 🤖 Workflow Thành Viên B — Android Developer & Backend Operations

> **Người phụ trách:** Nguyễn Quốc Thái (Thành viên B)
> **Nền tảng:** Mobile App Android (Expo / React Native) + Backend Operations API (Express 5 / Socket.IO)
> **Thư mục làm việc:** `mobile/` và `backend/`
> **Nhánh Git:**
> - Mobile Repo (`mobile.git`): `feat/mobile-android-b` ➔ 🟢 Đã hoàn thành & Merge vào `dev` qua PR #1 (30/09/2026)
> - Backend Repo (`backend.git`): `feat/be-cashier-kds-b` ➔ 🟢 Đã code xong (Commit `71b83c6`), chờ PR vào `dev`

---

## 🎯 Phạm Vi Công Việc

Thành viên B chịu trách nhiệm phối hợp giữa **Mobile App Android** và **Backend Operations / Realtime APIs**:

### 1. Mobile App Android (`mobile/`)
1. **Trung tâm điều hành (Operations Hub)** — OperationsScreen, giao diện HUB 6 tính năng
2. **Quản lý đơn hàng** — OrdersScreen (Đơn live: PENDING/CONFIRMED/DONE), TablesScreen (Sơ đồ bàn)
3. **Thu ngân di động** — CashierScreen (Thanh toán Tiền mặt & VietQR)
4. **Quản lý thực đơn & Kho** — SoldOutScreen, InventoryScreen
5. **Lịch sử đơn hàng** — HistoryScreen
6. **Kiểm thử Android** — Emulator Android (Samsung Galaxy S24, Pixel 7) với Status Bar 24dp, Soft Keyboard không che input, Socket.IO client kết nối ổn định.

### 2. Backend API (`backend/`) — Phụ trách các module Vận hành & Realtime:
1. **Socket.IO Core Server**: Khởi tạo Socket.IO trên HTTP server, quản lý room tenant/branch (`tenant:{tenantId}`, `branch:{branchId}`), phát các event chuẩn (`order:new`, `order:updated`, `payment:completed`, `table:status-changed`, `sold_out:updated`).
2. **Live Orders & KDS API**: Cập nhật trạng thái đơn (PENDING ➔ CONFIRMED ➔ DONE ➔ CANCELLED), cập nhật trạng thái từng món bếp, hủy đơn (void) hoàn trả số lượng.
3. **Cashier & VietQR Engine**: Thanh toán tiền mặt CASH, sinh mã VietQR động theo chuẩn Napas 247, webhook xử lý tự động khi tiền về tài khoản ngân hàng.
4. **Tables & Floor Map**: CRUD danh sách bàn, trạng thái bàn (EMPTY, OCCUPIED, RESERVED), sync realtime đổi màu bàn.
5. **Inventory BOM & Khấu trừ tự động**: Quản lý nguyên vật liệu, điều chỉnh tồn kho, tự động trừ định lượng kho khi món chuyển sang DONE.
6. **Khách hàng & Loyalty**: Tra cứu số điện thoại khách hàng, tính toán cộng điểm thành viên sau khi thanh toán thành công.

---

## 📁 Files & Màn Hình Phụ Trách

### Mobile (`mobile/`)
| File | Mô tả | Trạng thái |
|------|--------|------------|
| `mobile/src/screens/OperationsScreen.tsx` | Hub trung tâm: Grid 6 tính năng, routing sub-views | 🟢 Đã hoàn thành (PR #1 - Commit `04cbd24`, `60d778b`) |
| `mobile/src/screens/operations/OrdersScreen.tsx` | Đơn live: Kanban PENDING/CONFIRMED/DONE, Countdown | 🟢 Đã hoàn thành (PR #1 - Commit `04cbd24`) |
| `mobile/src/screens/operations/CashierScreen.tsx` | Thu ngân: CASH/VIETQR, đếm ngược QR, in bill | 🟢 Đã hoàn thành (PR #1 - Commit `04cbd24`) |
| `mobile/src/screens/operations/SoldOutScreen.tsx` | Báo hết món: Toggle trạng thái từng món | 🟢 Đã hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/InventoryScreen.tsx` | Kho nguyên liệu: Tồn kho, cảnh báo ngưỡng, điều chỉnh | 🟢 Đã hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/HistoryScreen.tsx` | Lịch sử đơn: Search, filter ngày, chi tiết đơn | 🟢 Đã hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/PrepTimeDetailScreen.tsx` | Countdown chế biến theo từng đơn | 🟢 Đã hoàn thành (PR #1 - Commit `60d778b`) |
| `mobile/src/screens/operations/ModifierDetailScreen.tsx` | Chi tiết & CRUD Modifier Group | 🟢 Đã hoàn thành (PR #1 - Commit `e3b1541`) |
| `mobile/src/screens/operations/TablesScreen.tsx` | Sơ đồ bàn realtime | 🟢 Đã hoàn thành (PR #1 - Commit `60d778b`) |

### Backend (`backend/`)
| File | Mô tả | Trạng thái |
|------|--------|------------|
| `backend/src/socket/index.ts` | Khởi tạo Socket.IO server, join rooms theo tenantId/branchId | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/socket/events.ts` | Định nghĩa & dispatch 11 event Socket.IO chuẩn | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/controllers/order.controller.ts` | Quản lý đơn live, chuyển trạng thái Kanban KDS, void đơn | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/controllers/cashier.controller.ts` | Thanh toán CASH, tạo mã VietQR, xác nhận thanh toán | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/services/payment/vietqr.service.ts` | Xử lý sinh QR động & Webhook đối soát giao dịch | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/controllers/table.controller.ts` | Danh sách bàn, trạng thái bàn, sơ đồ khu vực | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/controllers/ingredient.controller.ts` | Quản lý kho, tồn kho, điều chỉnh số lượng | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/services/inventory.service.ts` | Logic khấu trừ nguyên liệu BOM tự động | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |
| `backend/src/controllers/customer.controller.ts` | Tra cứu thành viên, tích lũy điểm thưởng | 🟢 Đã code xong (Commit `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`) |


---

## 📋 Danh Sách Task Chi Tiết

### 🏗️ GIAI ĐOẠN 1 — Android Setup & Foundation (Tuần 1)

#### Task B-001: Android Status Bar & Navigation Bar Chuẩn
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/App.tsx`, tất cả màn hình phụ trách
- **Việc làm:**
  1. Kiểm tra `useSafeAreaInsets()` hoạt động đúng trên Android (Status Bar 24dp thay vì 44pt như iOS).
  2. Thiết lập `StatusBar` component của Expo để không che nội dung trên Android 13+ có Navigation Bar 3 nút / cử chỉ.
  3. Thêm `android:windowSoftInputMode="adjustResize"` vào `app.json` để keyboard không che Input trong CashierScreen và InventoryScreen.
  4. Test trên Emulator: Pixel 7 (Android 14), Galaxy S24 (One UI 6.1).
- **Định nghĩa hoàn thành:** Tất cả màn hình hiển thị đúng trên Android không bị tràn hoặc bị che bởi System Bar.

#### Task B-002: Cài đặt & Cấu hình Socket.IO Client
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/hooks/useSocket.ts` *(tạo mới)*
- **Việc làm:**
  1. Cài package: `npm install socket.io-client`
  2. Tạo hook `useSocket()` tại `mobile/src/hooks/useSocket.ts`:
     ```ts
     // Kết nối sau khi đăng nhập thành công
     const socket = io(BASE_URL, {
       auth: { token: authStore.accessToken },
       transports: ['websocket'],
       reconnection: true,
       reconnectionDelay: 1000,
     });
     ```
  3. Tự động reconnect khi mạng phục hồi (listening `netinfo` state).
  4. Export `socket` instance để các màn hình của B dùng chung.
- **Định nghĩa hoàn thành:** Socket kết nối ổn định, tự reconnect khi mất mạng, không gây memory leak khi unmount component.

#### Task B-003: Cài đặt Audio Alert cho đơn mới
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `234fc10`, merged PR #1 vào `dev`)
- **File:** `mobile/src/hooks/useSocket.ts`, `mobile/src/screens/operations/OrdersScreen.tsx`
- **Việc làm:**
  1. Cài package: `expo-audio` hoặc `expo-av`.
  2. Thêm file âm thanh chuông `mobile/assets/sounds/new_order.mp3` và `payment_complete.mp3`.
  3. Khi sự kiện `order:new` tới → phát âm thanh `new_order.mp3` + rung thiết bị.
  4. Khi sự kiện `payment:completed` tới → phát âm thanh `payment_complete.mp3`.
  5. Toggle âm thanh trong `SettingsScreen` (do thành viên A quản lý) → đọc từ `authStore.soundEnabled`.
- **Định nghĩa hoàn thành:** Đơn mới phát âm thanh + rung, thanh toán thành công có âm báo riêng, tắt được từ Settings.

---

### 🏢 GIAI ĐOẠN 2 — OperationsScreen Hub & Routing (Tuần 1-2)

#### Task B-004: OperationsScreen Hub — Kết nối dữ liệu thực
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/OperationsScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/sessions/active-summary?branchId={branchId}
  Response: { pendingOrders: number, pendingPayment: number, soldOutCount: number, menuItemCount: number }
  ```
- **Việc làm:**
  1. Gọi API để lấy badge số liệu thực cho từng Feature Card:
     - **Tạo Order:** Badge `"N món trong giỏ"` lấy từ cart state của App.tsx.
     - **Quản Lý Đơn:** Badge `"X đang chờ"` từ API.
     - **Quản Lý Thanh Toán:** Badge `"Y đơn chờ thanh toán"` từ API.
     - **Thực đơn:** Badge `"Z món • W tạm hết"` từ API.
  2. Cập nhật lại badge khi nhận sự kiện Socket.IO `order:new`, `order:updated`.
  3. Pull-to-refresh toàn bộ Hub bằng RefreshControl.
- **Định nghĩa hoàn thành:** Các badge số liệu trên Hub luôn phản ánh trạng thái thực tế, cập nhật <2s khi có đơn mới.

#### Task B-005: TablesScreen — Sơ Đồ Bàn Realtime
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/TablesScreen.tsx` *(tạo mới hoặc hoàn thiện)*
- **API & Socket cần dùng:**
  ```
  GET /api/tables?branchId={branchId}
  Response: [{ id, name, status: 'EMPTY'|'OCCUPIED'|'RESERVED', currentSessionId?, customerCount? }]
  Socket: 'table:status-changed' → { tableId, status }
  ```
- **Việc làm:**
  1. Tải danh sách bàn theo chi nhánh từ API.
  2. Hiển thị Grid bàn: Card màu Xanh lá (trống), Cam (có khách), Đỏ (chờ thanh toán).
  3. Socket.IO `table:status-changed` → cập nhật màu card ngay lập tức.
  4. Bấm vào bàn đang có khách (`OCCUPIED`) → mở modal xem chi tiết món đã gọi, có nút **Chuyển Thanh Toán** → điều hướng sang CashierScreen với `sessionId` tương ứng.
  5. Nút **Tạo Đơn Mới cho Bàn** → điều hướng sang OrderScreen với `tableId` đã chọn.
- **Định nghĩa hoàn thành:** Sơ đồ bàn cập nhật realtime, nhân viên có thể thấy bàn nào đang bận/trống ngay lập tức.

---

### 📋 GIAI ĐOẠN 3 — OrdersScreen — Đơn Hàng Live (Tuần 2)

#### Task B-006: OrdersScreen — Kết nối Socket.IO Đơn Live
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/OrdersScreen.tsx`
- **API & Socket cần dùng:**
  ```
  GET /api/orders/active?branchId={branchId}
  Response: LiveOrder[]   (khớp interface trong types/index.ts)

  Socket Events:
  - 'order:new'     → prepend vào danh sách đơn PENDING
  - 'order:updated' → cập nhật status của đơn tương ứng theo orderId
  - 'order:voided'  → xóa đơn khỏi danh sách hoặc mark VOIDED
  ```
- **Việc làm:**
  1. Mount: tải danh sách đơn active từ REST API.
  2. Subscribe Socket: `order:new` → thêm vào đầu PENDING list + phát âm thanh chuông.
  3. Subscribe Socket: `order:updated` → tìm đơn theo `orderId`, cập nhật `status` và re-render thẻ Kanban.
  4. Hiển thị đúng 3 cột filter: **PENDING** (xám), **CONFIRMED/PREPARING** (xanh), **DONE** (xanh lá).
  5. Countdown `countdownSeconds` mỗi giây theo `setInterval` cho đơn đang PREPARING.
- **Định nghĩa hoàn thành:** Đơn hàng mới xuất hiện <1s, countdown chạy mượt không giật, trạng thái bếp đồng bộ từ KDS Web.

#### Task B-007: OrdersScreen — Hành Động Trên Đơn (Confirm, Done, Void)
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/OrdersScreen.tsx`
- **API cần dùng:**
  ```
  PATCH /api/orders/:orderId/status
  Body: { status: 'CONFIRMED' | 'DONE' }

  POST /api/orders/:orderId/void
  Body: { reason: string }
  ```
- **Việc làm:**
  1. Nút **Xác nhận** (PENDING → CONFIRMED): Swipe phải hoặc nút bấm → gọi PATCH API.
  2. Nút **Hoàn thành** (CONFIRMED → DONE): Bấm nút → gọi PATCH API → thẻ chuyển màu xanh lá và tự biến mất sau 3 giây.
  3. Nút **Hủy Món** (Void): Long press trên thẻ đơn → Modal xác nhận + nhập lý do → gọi void API.
  4. Loading state trên từng thẻ trong khi đang gọi API (hiển thị ActivityIndicator nhỏ trên nút).
- **Định nghĩa hoàn thành:** Nhân viên có thể xác nhận, hoàn thành và hủy đơn trực tiếp từ mobile, trạng thái đồng bộ sang Web KDS ngay lập tức.

---

### 💰 GIAI ĐOẠN 4 — CashierScreen — Thu Ngân Di Động (Tuần 2-3)

#### Task B-008: CashierScreen — Danh Sách Đơn Chờ Thanh Toán
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/CashierScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/sessions/pending-payment?branchId={branchId}
  Response: [{ sessionId, tableId, tableName, total, items, createdAt }]
  ```
- **Việc làm:**
  1. Tải danh sách các bàn đang chờ thanh toán.
  2. Hiển thị từng thẻ: Số bàn, Tổng tiền đậm, số lượng món, thời gian ngồi.
  3. Bấm vào thẻ → mở màn hình chi tiết đơn với danh sách món + nút chọn phương thức thanh toán.
  4. Socket `session:updated` → cập nhật danh sách realtime.
- **Định nghĩa hoàn thành:** Thu ngân thấy được tất cả bàn đang chờ thanh toán, cập nhật tự động khi có bàn mới.

#### Task B-009: CashierScreen — Thanh Toán Tiền Mặt
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/CashierScreen.tsx`
- **API cần dùng:**
  ```
  POST /api/cashier/pay
  Body: { sessionId, method: 'CASH', cashReceived: number, voucherCode?: string, customerId?: string }
  Response: { success, change, pointsEarned, receiptId }
  ```
- **Việc làm:**
  1. Input số tiền khách đưa với bàn phím số (`keyboardType: "number-pad"`).
  2. Tính và hiển thị số tiền thối `change = cashReceived - total` ngay khi nhập.
  3. Disable nút **Thanh Toán** nếu `cashReceived < total`.
  4. Bấm thanh toán → gọi API → Modal thành công hiển thị số tiền thối + điểm tích lũy.
  5. Bàn chuyển trạng thái EMPTY sau thanh toán thành công.
- **Định nghĩa hoàn thành:** Thanh toán tiền mặt hoàn tất trong <3s, hiển thị chính xác số tiền thối.

#### Task B-010: CashierScreen — Thanh Toán VietQR
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `04cbd24`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/CashierScreen.tsx`
- **API & Socket cần dùng:**
  ```
  POST /api/cashier/create-qr
  Body: { sessionId, amount: number }
  Response: { qrCodeUrl, qrCode, transactionRef, expiresAt }

  Socket: 'payment:completed' → { sessionId, transactionRef }
  ```
- **Việc làm:**
  1. Bấm **VietQR** → gọi API tạo mã QR động → hiển thị ảnh QR trong Modal.
  2. Modal có countdown `60 giây` đếm ngược, hết giờ tự đóng và báo hết hạn.
  3. Lắng nghe Socket `payment:completed` với đúng `sessionId` → đóng Modal QR → hiển thị Modal thành công.
  4. Nút **Hủy QR** đóng Modal và không thanh toán.
  5. Nút **Tạo lại QR** nếu hết hạn.
- **Định nghĩa hoàn thành:** Khách quét QR ngân hàng → hệ thống tự động xác nhận trong <5s, không cần nhân viên thao tác thêm.

---

### 🚫 GIAI ĐOẠN 5 — SoldOut, Inventory, History (Tuần 3)

#### Task B-011: SoldOutScreen — Toggle Hết Món Realtime
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/SoldOutScreen.tsx`
- **API & Socket cần dùng:**
  ```
  GET /api/menu/items?branchId={branchId}  — Tải danh sách kèm isSoldOut status
  PATCH /api/menu/items/:id/sold-out
  Body: { isSoldOut: boolean }

  Socket emit: 'sold_out:updated' → { itemId, isSoldOut }
  ```
- **Việc làm:**
  1. Tải danh sách món với trạng thái `isSoldOut` từ API.
  2. Switch Toggle từng món → gọi PATCH API.
  3. Sau khi API thành công, emit Socket event `sold_out:updated` để QR Menu Web và KDS cập nhật ngay.
  4. Badge đỏ tổng số món hết hàng ở header cập nhật tức thì sau toggle.
  5. Lọc hiển thị: **Tất cả / Đang bán / Tạm hết**.
- **Định nghĩa hoàn thành:** Bật "Hết hàng" trên mobile → khách không thể thêm món đó vào giỏ trên Web QR Menu trong <2s.

#### Task B-012: InventoryScreen — Quản Lý Kho Nguyên Liệu
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/InventoryScreen.tsx`
- **API cần dùng:**
  ```
  GET /api/ingredients?branchId={branchId}
  Response: [{ id, name, quantity, unit, lowStockThreshold, category }]

  PATCH /api/ingredients/:id/adjust
  Body: { adjustment: number, reason: string, type: 'ADD'|'REMOVE'|'SET' }
  ```
- **Việc làm:**
  1. Tải danh sách nguyên liệu với số lượng tồn kho thực.
  2. Highlight màu đỏ các nguyên liệu dưới ngưỡng cảnh báo (`quantity < lowStockThreshold`).
  3. Bấm vào nguyên liệu → Modal nhập số lượng điều chỉnh + lý do (Nhập kho / Hao hụt / Kiểm kê).
  4. Tìm kiếm nguyên liệu theo tên (`filter` local, không gọi API).
  5. Pull-to-refresh để lấy số liệu mới nhất.
- **Định nghĩa hoàn thành:** Nhân viên kho có thể kiểm kê và điều chỉnh số lượng nguyên liệu từ điện thoại Android ngay tại kho.

#### Task B-013: HistoryScreen — Lịch Sử & Tra Cứu Đơn
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/HistoryScreen.tsx`, `mobile/src/data/historyStore.ts`
- **API cần dùng:**
  ```
  GET /api/orders/history?branchId={branchId}&page=1&limit=20&startDate=&endDate=&search=
  Response: { orders: LiveOrder[], total: number, page: number, totalPages: number }
  ```
- **Việc làm:**
  1. Tải danh sách đơn hàng theo trang (Pagination: 20 đơn/trang) + **Infinite Scroll** khi cuộn xuống đáy.
  2. Tìm kiếm theo mã đơn hoặc tên bàn: debounce 300ms trước khi gọi API.
  3. Filter theo ngày: DatePicker Modal chọn khoảng ngày (start → end).
  4. Bấm vào đơn → Modal chi tiết: danh sách món, tổng tiền, phương thức thanh toán, giờ vào/ra.
  5. Nút **Xuất Excel** (nếu role MANAGER/ADMIN): gọi `GET /api/orders/history/export` → download file.
- **Định nghĩa hoàn thành:** Tải được 100+ đơn hàng mượt mà với infinite scroll, tìm kiếm và lọc ngày hoạt động đúng.

---

### 🔧 GIAI ĐOẠN 6 — ModifierDetailScreen & PrepTime (Tuần 3-4)

#### Task B-014: ModifierDetailScreen — CRUD Modifier Group
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `e3b1541`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/ModifierDetailScreen.tsx`
- **API cần dùng:**
  ```
  POST /api/menu/modifier-groups
  PATCH /api/menu/modifier-groups/:id
  DELETE /api/menu/modifier-groups/:id
  POST /api/menu/modifier-groups/:groupId/options
  PATCH /api/menu/modifier-options/:id
  DELETE /api/menu/modifier-options/:id
  ```
- **Việc làm:**
  1. Form thêm/sửa tên Group và danh sách Options.
  2. Inline editing: bấm đúp vào Option tên → inline TextInput chỉnh sửa tên/giá.
  3. Kéo thả sắp xếp thứ tự Options (dùng `react-native-reanimated` gesture).
  4. Xóa Option → swipe trái để lộ nút Xóa đỏ.
- **Định nghĩa hoàn thành:** CRUD Modifier Group hoàn chỉnh từ mobile, thứ tự tùy chỉnh, đồng bộ với Web Admin.

#### Task B-015: PrepTimeDetailScreen — Countdown Chế Biến
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `60d778b`, merged PR #1 vào `dev`)
- **File:** `mobile/src/screens/operations/PrepTimeDetailScreen.tsx`
- **Việc làm:**
  1. Nhận `prepTimeMinutes` từ props, chạy countdown ngược `prepTimeMinutes × 60` giây.
  2. Progress ring dạng vòng tròn (Circle Progress, dùng `react-native-svg`) thể hiện % còn lại.
  3. Khi countdown = 0: rung thiết bị + phát âm thanh + đổi màu thành xanh lá "Đã xong!".
  4. Nút **Dừng** và **Thêm 2 phút** để điều chỉnh khi bếp cần thêm thời gian.
- **Định nghĩa hoàn thành:** Countdown chạy chính xác, có thể dừng và gia hạn, thông báo âm thanh + rung khi xong.

---

### ⚙️ GIAI ĐOẠN 7 — Backend Operations & Realtime (Tuần 1 - Tuần 3)

#### Task B-BE-001: Socket.IO Server & Kiến Trúc Multi-tenant Room
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/socket/index.ts`, `backend/src/socket/events.ts`
- **Yêu cầu kỹ thuật:**
  1. Gắn Socket.IO vào chung HTTP server với Express 5.
  2. Xác thực handshake bằng JWT token lấy từ `auth.token`.
  3. Cho socket tự động join 2 rooms: `tenant:{tenantId}` (toàn chuỗi) và `branch:{branchId}` (riêng chi nhánh).
  4. Quản trị 11 events chuẩn: `order:new`, `order:updated`, `order:voided`, `order:item-status`, `table:status-changed`, `payment:completed`, `sold_out:updated`, `session:updated`, `inventory:warning`, `call_staff:request`, `notification:new`.
- **Định nghĩa hoàn thành:** Socket kết nối được từ cả Web và Mobile, bắn event đến đúng room chi nhánh, không rò rỉ sang tenant khác.

#### Task B-BE-002: Live Orders Management & KDS Kanban API
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/controllers/order.controller.ts`, `backend/src/services/order.service.ts`, `backend/src/routes/order.routes.ts`
- **Endpoints:**
  - `GET /api/orders/active?branchId=` (hỗ trợ query param `view=kanban|list`)
  - `PATCH /api/orders/:id/status` (chuyển trạng thái đơn PENDING ➔ CONFIRMED ➔ DONE)
  - `PATCH /api/orders/items/:id/status` (bếp đánh dấu từng món xong)
  - `POST /api/orders/:id/void` (hủy đơn có ghi lý do, hoàn kho tự động)
  - `GET /api/orders/history` & `/api/orders/history/export` (phân trang + xuất excel)
- **Định nghĩa hoàn thành:** Thao tác chuyển trạng thái đơn trên mobile/web phản hồi <200ms và đồng bộ tức thì qua Socket.IO.

#### Task B-BE-003: Cashier & VietQR Dynamic Payment Engine
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/controllers/cashier.controller.ts`, `backend/src/services/payment/vietqr.service.ts`, `backend/src/routes/cashier.routes.ts`
- **Endpoints:**
  - `POST /api/cashier/pay`: Thanh toán tiền mặt CASH, đóng session bàn, tạo Payment record.
  - `POST /api/cashier/create-qr`: Sinh chuỗi và ảnh VietQR động với mã tham chiếu đơn (Napas 247).
  - `POST /api/cashier/webhook`: Nhận webhook từ ngân hàng/cổng thanh toán khi khách chuyển khoản, kiểm tra đúng số tiền và nội dung đơn ➔ auto hoàn thành đơn và phát `payment:completed`.
- **Định nghĩa hoàn thành:** Luồng thanh toán tiền mặt và VietQR chạy trơn tru, webhook tự động xác nhận đơn.

#### Task B-BE-004: Tables & Floor Management API
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/controllers/table.controller.ts`, `backend/src/routes/table.routes.ts`
- **Endpoints:**
  - `GET /api/tables?branchId=`: Trả về danh sách bàn, trạng thái (EMPTY/OCCUPIED/RESERVED), tổng tiền tạm tính hiện tại.
  - `PATCH /api/tables/:id/status`: Đổi trạng thái bàn thủ công + emit `table:status-changed`.
- **Định nghĩa hoàn thành:** Bàn đổi trạng thái cập nhật ngay lập tức trên TablesScreen của Mobile và POS của Web.

#### Task B-BE-005: Inventory & BOM Auto-deduction Engine
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/controllers/ingredient.controller.ts`, `backend/src/services/inventory.service.ts`, `backend/src/routes/ingredient.routes.ts`
- **Nghiệp vụ:**
  - `GET /api/ingredients`: Danh sách tồn kho theo chi nhánh.
  - `PATCH /api/ingredients/:id/adjust`: Kiểm kho và điều chỉnh tăng/giảm tồn kho thực tế.
  - Tích hợp hàm `deductInventoryByOrder(orderId)`: Khi món chuyển trạng thái `DONE`, tự động tìm công thức BOM (`RecipeItem`) để trừ lượng nguyên liệu tương ứng. Nếu tồn dưới ngưỡng `minThreshold` ➔ phát socket `inventory:warning`.
- **Định nghĩa hoàn thành:** Kho tự động khấu trừ chính xác theo định lượng, cảnh báo kịp thời khi nguyên liệu sắp hết.

#### Task B-BE-006: Khách hàng & Loyalty Point Engine
- **Trạng thái:** 🟢 Đã code xong (30/09/2026 - Commit: `71b83c6` trên `feat/be-cashier-kds-b`, chờ PR vào `dev`)
- **File:** `backend/src/controllers/customer.controller.ts`, `backend/src/services/customer.service.ts`, `backend/src/routes/customer.routes.ts`
- **Nghiệp vụ:** Tra cứu thông tin khách theo SĐT, lưu lịch sử chi tiêu, cộng điểm thưởng (ví dụ: 10,000 VNĐ = 1 điểm) và chiết khấu hạng thành viên khi thanh toán tại cashier.
- **Định nghĩa hoàn thành:** Thu ngân nhập SĐT là thấy ngay tên và số điểm tích lũy của khách.

---

### ✅ GIAI ĐOẠN 8 — Android Build & Release (Tuần 4)

#### Task B-016: Kiểm Thử Android Toàn Diện
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `644fb62`, merged PR #1 vào `dev`)
- Chạy tất cả màn hình trên các thiết bị: Pixel 7 (Android 14), Galaxy S24 (One UI), Redmi Note 12 (MIUI).
- Kiểm tra:
  - Phím ảo (Soft Keyboard) không che các Input trong CashierScreen khi nhập số tiền.
  - Notification Badge hiển thị đúng trên icon app Android.
  - VietQR countdown đếm ngược chính xác và không bị gián đoạn khi chuyển sang app khác.
  - App không crash khi xoay ngang màn hình (nếu hỗ trợ).

#### Task B-017: Android Build Config (EAS Build)
- **Trạng thái:** 🟢 Đã hoàn thành (30/09/2026 - Commit: `644fb62`, merged PR #1 vào `dev`)
- Cấu hình `eas.json` profile `preview` cho Android APK internal testing.
- Tạo build APK upload lên Google Play Internal Testing.
- Commit cuối: `feat(android): production-ready android build configuration`

---

## 🚦 Quy Tắc Git (2 Repositories)

Mỗi repository đều có 2 nhánh chính `main` (production) và `dev` (tích hợp). Thành viên B tự tạo nhánh riêng để code:

### 1. Mobile App Repo (`mobile.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/mobile-android-b

# Commits mẫu
feat(orders): connect orders screen to socket.io for real-time updates
fix(cashier): fix vietqr countdown not stopping after payment completed
feat(sold-out): implement sold out toggle with realtime socket emit

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/mobile-android-b
```

### 2. Backend Repo (`backend.git`)
```bash
git checkout dev
git pull origin dev
git checkout -b feat/be-cashier-kds-b

# Commits mẫu
feat(socket): initialize socket.io server and branch rooms
feat(kds): implement live orders status transition and item status
feat(cashier): add cash payment and dynamic vietqr generation
feat(inventory): implement bom auto deduction on order completion

# Đẩy nhánh cá nhân & tạo PR vào dev
git push origin feat/be-cashier-kds-b
```

> [!WARNING]
> TUYỆT ĐỐI KHÔNG `git push --force` và không push trực tiếp vào `main` hoặc `dev`. Luôn mở Pull Request vào `dev`.

---

## 🔗 API Endpoints Thành Viên B Xây Dựng & Phụ Trách

| Nhóm | Endpoint | Method | Trách nhiệm của B |
|---|---|---|---|
| **Realtime** | `src/socket/*` | WS | Khởi tạo Socket.IO server & quản lý phòng |
| **Orders** | `/api/orders/active` | GET | Đơn live phân theo Kanban/List |
| **Orders** | `/api/orders/:id/status` | PATCH | Cập nhật tiến trình đơn (PENDING/CONFIRMED/DONE) |
| **Orders** | `/api/orders/items/:id/status` | PATCH | Cập nhật trạng thái từng món trong bếp |
| **Orders** | `/api/orders/:id/void` | POST | Hủy đơn & hoàn kho |
| **Orders** | `/api/orders/history` | GET | Lịch sử đơn hàng có phân trang |
| **Cashier** | `/api/cashier/pay` | POST | Thanh toán tiền mặt CASH |
| **Cashier** | `/api/cashier/create-qr` | POST | Sinh mã VietQR động kèm mã giao dịch |
| **Cashier** | `/api/cashier/webhook` | POST | Webhook nhận thông báo tiền về ngân hàng |
| **Tables** | `/api/tables` | GET/PATCH | Danh sách & cập nhật trạng thái bàn ăn |
| **Inventory** | `/api/ingredients` | GET/PATCH | Quản lý nguyên vật liệu & điều chỉnh tồn kho |
| **Customers** | `/api/customers` | GET/PATCH | Tra cứu khách hàng theo SĐT & cộng điểm |

---

## 🔌 Socket.IO Events Thành Viên B Lắng Nghe

| Event | Màn hình xử lý | Hành động |
|-------|---------------|-----------|
| `order:new` | OrdersScreen | Thêm đơn vào đầu PENDING list + âm thanh |
| `order:updated` | OrdersScreen | Cập nhật trạng thái thẻ đơn |
| `order:voided` | OrdersScreen | Xóa đơn hoặc mark VOIDED |
| `table:status-changed` | TablesScreen | Đổi màu thẻ bàn |
| `payment:completed` | CashierScreen | Đóng modal QR + modal thành công |
| `sold_out:updated` | SoldOutScreen | Sync toggle từ Web nếu có |
| `session:updated` | CashierScreen | Cập nhật danh sách bàn chờ thanh toán |

---

## 📌 Ghi Chú & Lưu Ý Kỹ Thuật

> [!IMPORTANT]
> Thành viên B **KHÔNG sửa** các file `src/types/index.ts` và `src/theme/index.ts` trực tiếp. Khi cần thêm type mới (ví dụ: interface `InventoryItem`, `TableDetail`), tạo Pull Request sang nhánh của Thành viên A để merge trước.

> [!WARNING]
> Khi gọi `onRemoveFromCart` trong OrdersScreen, phải lấy đúng `cartItemId` (composite key do A quản lý ở App.tsx), **không** dùng `item.id` thuần để tránh bug xóa nhầm món.

> [!NOTE]
> Hook `useSocket()` do Thành viên B tạo ra tại `mobile/src/hooks/useSocket.ts`. Khi Thành viên A cần dùng (cho NotificationScreen), import trực tiếp hook này — **không** tạo một kết nối Socket thứ hai.

---

## 🧾 Kiểm định độc lập 09/10/2026 — Backlog còn lại của B

> Phạm vi kiểm định: nhánh `feat/be-cashier-kds-b` + `feat/mobile-android-b` + `dev`.
> Verify: backend `tsc --noEmit` xanh, suite `scripts/test_b_suite.ts` **19/19 PASS**, mobile `tsc --noEmit` xanh.
> Các mục dưới đây là việc **chưa xong thật**, cần bổ sung (không sửa các claim đã ghi ở trên):

| Mã | Việc còn lại | Liên quan | Tiêu chí xong |
|---|---|---|---|
| B-REM-001 | Endpoint `GET /api/orders/history/export` (xuất Excel) chưa tồn tại trong `order.routes.ts`, test suite cũng không cover | B-013, B-BE-002 | Có route + controller + test E2E; phân quyền MANAGER/ADMIN |
| B-REM-002 | Toggle hết món local-first, gọi API fire-and-forget (`.catch` chỉ warn), không rollback UI khi API lỗi | B-011, `SoldOutScreen.tsx` | API lỗi → rollback switch + banner lỗi đỏ; sync ngược `sold_out:updated` đầy đủ |
| B-REM-003 | CRUD Modifier Group local-only, chưa có backend `/api/menu/modifier-groups` (không endpoint nào tồn tại) | B-014, `ModifierDetailScreen.tsx` | Có endpoint CRUD thật + mobile gọi API, hoặc chốt scope local bằng văn bản |
| B-REM-004 | Backend B chạy mock in-memory (`activeOrders`, `pendingSessions` array — mất dữ liệu khi restart) | B-BE-002 → B-BE-006 | Migrate orders/cashier/inventory sang Prisma (phối hợp C), hoặc xác nhận giữ mock cho demo |
| B-REM-005 | Chưa có bằng chứng build APK / upload Play Internal Testing (mới có config `eas.json` + `app.json`) | B-016, B-017 | File APK + ảnh chụp Play Internal Testing đính kèm log |
| B-REM-006 | Docs trên nhánh `main` vẫn trạng thái vàng 🟡 (do `main` chưa merge `dev`) | — | Chỉ sync bằng merge `dev`, không sửa tay trên `main` |
