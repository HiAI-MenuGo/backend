# HiAI-MenuGo — Mandatory Rules (RULES)

> Luật cấm và quy tắc bắt buộc. Vi phạm = bug bảo mật hoặc phá vỡ UX. Đọc kỹ trước khi viết bất kỳ dòng code nào.
>
> - 📖 Nghiệp vụ: [BUSINESS.md](./BUSINESS.md) · 🏗️ Stack: [TECHS.md](./TECHS.md)
> - 🎨 Design: [SKILLS.md](./SKILLS.md) · 🧭 Index: [AGENTS.md](./AGENTS.md)

---

## 1. Multi-Tenant RBAC (CRITICAL — Quy Tắc Bảo Mật Số 1)

SaaS Multi-Tenant — cô lập dữ liệu là yêu cầu an ninh bắt buộc:

| Role | Phạm vi | Giới hạn |
|---|---|---|
| `PLATFORM_ADMIN` | SaaS Operator | Chỉ `/api/platform-admin/*` và `/platform-admin` web. **ZERO ACCESS** dữ liệu kinh doanh của quán. |
| `ADMIN` | Chủ thương hiệu | Toàn bộ chi nhánh trong cùng `tenantId`. |
| `MANAGER` | Quản lý chi nhánh | **LUÔN** append `branchId: req.user.branchId` vào query. |
| `KITCHEN` | Bếp / pha chế | Chỉ KDS routes + toggle sold-out. Không chạm thanh toán. |
| `CASHIER` | Thu ngân / phục vụ | Chỉ POS/Cashier routes + hoàn kho (inventory reverse). |

```typescript
// ĐÚNG — luôn có tenantId
const items = await prisma.menuItem.findMany({
  where: { tenantId: req.user.tenantId, branchId: req.user.branchId },
});

// SAI NGHIÊM TRỌNG — rò rỉ dữ liệu liên quán
const items = await prisma.menuItem.findMany({
  where: { branchId: req.user.branchId }
});
```

Auth JWT thuần: `authMiddleware` + `requireRole([...])` — xem [TECHS.md](./TECHS.md#6-auth--jwt-thuần-bắt-buộc-không-dùng-auth-dịch-vụ). Cấm Supabase Auth / NextAuth / Clerk.

---

## 2. Quy Chuẩn Backend & API

1. **Response:** LUÔN qua `ApiResponse` helper (`src/utils/response.ts`):
   ```typescript
   ApiResponse.success(res, data, 'Lấy danh sách món thành công');
   ApiResponse.error(res, 'ITEM_NOT_FOUND', 'Món không tồn tại', 404);
   ```
2. **Auth middleware:** `router.get('/orders', authMiddleware, requireRole(['ADMIN','MANAGER','CASHIER']), controller)` — `req.user` có `userId, tenantId, branchId, role, permissions`.
3. **Validation:** mọi body qua Zod `validateBody(schema)`:
   ```typescript
   const createItemSchema = z.object({
     name: z.string().min(1, 'Tên món không được để trống'),
     price: z.number().positive('Giá phải lớn hơn 0'),
     categoryId: z.string().uuid(),
   });
   ```
4. **Socket events:** chỉ dùng 11 events chuẩn trong [TECHS.md](./TECHS.md#7-socketio-events-chuẩn-srcsocketseventsts). Không tự đặt tên event mới khi chưa thống nhất.
5. **Không query SQL thô** — chỉ Prisma. Sửa schema → `npx prisma format` + `npx prisma generate`.

---

## 3. Quy Chuẩn Mobile App (`mobile/`)

1. **Cấm React Navigation / Expo Router.** Điều hướng qua `activeTab` (`TabType`) + `operationSubView` (`OperationSubView`) trong `App.tsx` và `OperationsScreen.tsx`. Màn hình mới → thêm giá trị vào `OperationSubView` (`types/index.ts`) + branch trong `OperationsScreen.tsx`.
2. **Cart composite key (khóa cứng):**
   ```ts
   const cartItemId = `${item.id}__${JSON.stringify(modifiers)}__${note}`;
   ```
   Tăng/giảm/xóa **bắt buộc dùng `cartItemId`**, không dùng `item.id` thuần khi món có modifiers/note. (Bug đã biết: `OrderScreen.tsx` đang truyền `item.id` — phải sửa khi chạm logic cart.)
3. **Safe Area:** mọi màn hình có header/dock phải dùng `useSafeAreaInsets()`. Không hardcode pixel, không dùng `Constants.statusBarHeight`.
4. **Theme Tokens:** không hardcode hex trong component con — luôn `theme.colors.*`, `theme.radii.*`, `theme.shadows.*`.
5. **Icons:** duy nhất `lucide-react-native`, `strokeWidth` 2~2.5.
6. **Zustand:** `useMenuStore` là single source cho menu; `mockMenuItems` chỉ là seed. Không mutate mock trực tiếp — qua `addItem/updateItem/deleteItem/addCategory` (nhớ dedupe `categories`).
7. **Mock vs API:** hiện tại data là mock. Khi nối API giữ nguyên interfaces trong `src/types`, chỉ thay implementation + thêm loading/error states.
8. **Naming:** component PascalCase, store camelCase. Chưa có import alias — dùng relative `../theme`, `../types`, `../data/*`.

---

## 4. Quy Chuẩn Web Frontend (`frontend/`)

1. **i18n:** dùng `useI18n()` từ `@/context/i18nContext`; từ mới bổ sung vào `frontend/context/i18nContext.tsx`.
2. **Food vs Drink an toàn** — `item.category` có thể là string hoặc `{ id, name }`, luôn type-check trước `.toLowerCase()`:
   ```typescript
   const catRaw = item.category || '';
   const catName = typeof catRaw === 'string' ? catRaw : (catRaw as any)?.name || '';
   const isDrink = ['coffee','tea','drink','juice','boba','smoothie'].some(k => catName.toLowerCase().includes(k));
   ```
3. **QR bàn tích hợp logo:** `QRCodeSVG` từ `qrcode.react`, bắt buộc `level="H"`.
4. **Import:** không barrel `@/components/auth` — import trực tiếp file (`@/components/auth/RoleGate`).

---

## 5. Critical UI Rules (đã thiết lập, không được phá)

- **A. Note món multi-line bắt buộc** (`CashierClient`, `kds/page`, `KitchenTicketTemplate`, `ReceiptPrintTemplate`, `OrdersScreen` mobile): chuỗi `item.note` nối bằng `•`/`|` phải tách thành từng dòng có bullet, không hiển thị nguyên chuỗi dài. POS/KDS dùng text cam/vàng; bill in nhiệt dùng `- xxx` chữ đen.
- **B. Nút HỦY MÓN trong POS luôn canh phải** (`justify-end`, `text-rose-400 border-rose-500/20`) — tránh bấm nhầm.
- **C. Nút Thanh Toán QR Menu chống giật:** thêm `!isInitializing` vào điều kiện render để không chớp khi Socket `PENDING` đang đồng bộ.
- **D. Form tích điểm đồng bộ branding:** container SĐT + nút xác nhận dùng `primaryColor`/`secondaryColor` của quán; badge hạng + badge điểm cùng 1 hàng flex.
- **E. Bản in nhiệt:** phiếu bếp và hóa đơn chữ đen trên trắng, đủ thông tin bill + VietQR chân bill, không icon màu/viền lòe loẹt (hỏng đầu kim 80mm/58mm).

---

## 6. Quy Tắc Hành Vi Của Agent

1. **Git Push:** TUYỆT ĐỐI KHÔNG tự ý `git push`. Chỉ commit local, chờ user xác nhận mới push.
2. **Atomic Commits:** mỗi tính năng/fix là 1 commit riêng, Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
3. **Bảo toàn mã nguồn:** không xóa tính năng/chú thích hiện có trừ khi user yêu cầu rõ.
4. **Cổng:** Backend `5000`/`5001`, Web `3000`, Metro `8081` — không tự đổi.
5. **Không commit** `.expo`, `node_modules`, `package-lock.json` thay đổi không cần thiết.
6. **Code xong phải cập nhật Workflow (luật dùng chung — áp dụng mọi agent/thành viên):**
   - Agent code/vibe xong tính năng nào → **trong cùng phiên làm việc**, trước khi báo xong, PHẢI tự cập nhật file workflow tương ứng, không đợi user nhắc:
     - Thành viên A → `docs/A_Work_Flow.md` · B → `docs/B_Work_Flow.md` · C → `docs/C_Work_Flow.md`.
   - Nội dung cập nhật: đổi trạng thái task/file liên quan (🟡 → 🟢 khi đạt "Định nghĩa hoàn thành", giữ 🟡 + ghi chú nếu mới xong một phần), ghi ngày hoàn thành + hash commit + file đã chạm.
   - Task chưa có trong workflow → tự bổ sung vào đúng Giai đoạn/Phase tương ứng, không tự ý xóa task của người khác.
   - Ví dụ: người C vibe xong QR Menu → agent cập nhật `docs/C_Work_Flow.md` (đánh dấu task QR Menu hoàn thành, file `app/table/[tableId]/page.tsx` → 🟢) rồi mới báo cáo.

---

## 7. Checklist Khi Thêm Tính Năng Mới

- [ ] Type mới → `src/types/index.ts`; màu/radii/shadow mới → `src/theme/index.ts` (không hardcode).
- [ ] Màn hình thao tác mobile → thêm `OperationSubView` + branch trong `OperationsScreen.tsx`.
- [ ] State toàn cục → mở rộng `useMenuStore` hoặc store mới `src/data/*.ts`.
- [ ] Query DB nào cũng có `tenantId` (+ `branchId` nếu cấp chi nhánh).
- [ ] Dùng `theme.colors.*`, `lucide-react-native`, `StyleSheet.create`, Safe Area insets.
- [ ] Test iOS notch 44pt + Android status bar — kiểm tra dock không bị Home Indicator che; `BottomNav` ẩn đúng ở sub-view (`App.tsx`).
