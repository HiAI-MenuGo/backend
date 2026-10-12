# HiAI-MenuGo Backend — Nghiệp Vụ F&B (BUSINESS)

> **Góc nhìn Backend:** Tài liệu này mô tả nghiệp vụ F&B dưới dạng **data model, service logic và API behavior** để agent hiểu cần làm gì khi implement feature.
>
> - 🏗️ Entry point & cấu trúc repo: [AGENTS.md](./AGENTS.md)
> - ⛔ Luật bắt buộc khi viết code: [RULES.md](./RULES.md)
> - 🔧 Tech stack chi tiết: [TECHS.md](./TECHS.md)

---

## 1. Mô Hình Dữ Liệu Multi-Tenant

Mọi bảng nghiệp vụ đều có `tenantId`. Một số bảng có thêm `branchId` nếu thuộc chi nhánh cụ thể:

```
Tenant (id, name, slug, plan)
 ├── TenantBranding (tenantId, logo, primaryColor, secondaryColor, banner)
 ├── MembershipTier (tenantId, name, minPoints, discountPercent, color)
 ├── Voucher (tenantId, code, type: PERCENT|FIXED, value, minOrder, maxUses, expiresAt)
 └── Branch (tenantId, id, name, address, bankAccount)
      ├── TenantUser (tenantId, branchId, role: ADMIN|MANAGER|KITCHEN|CASHIER)
      ├── Table (tenantId, branchId, id, name, area, status: EMPTY|OCCUPIED|RESERVED)
      ├── MenuItem (tenantId, branchId?, id, name, price, category, isSoldOut)
      │    └── ModifierGroup (menuItemId) → ModifierOption (extraPrice)
      ├── Ingredient (tenantId, branchId, id, name, unit, quantity, minStock)
      │    └── MenuItemIngredient (menuItemId, ingredientId, quantity) ← BOM
      ├── OrderSession (tenantId, branchId, tableId, status: OPEN|CLOSED|CANCELLED)
      │    └── Order (sessionId, tenantId, branchId, status: PENDING|PREPARING|DONE|VOIDED)
      │         └── OrderItem (orderId, menuItemId, quantity, modifiers[], note, status)
      ├── Customer (tenantId, phone, name, points, tierId)
      └── InventoryLog (tenantId, branchId, ingredientId, delta, reason, createdAt)
```

### Tenant Isolation — Quy tắc bắt buộc trong mọi Prisma query:

```typescript
// ✅ Đúng:
await prisma.order.findMany({
  where: { tenantId: req.user.tenantId, branchId: req.user.branchId }
});

// ❌ Sai — không có tenantId filter:
await prisma.order.findMany({ where: { branchId: req.body.branchId } });
```

---

## 2. RBAC — Mapping Role → Middleware

```typescript
// src/middlewares/auth.middleware.ts → gắn req.user = { userId, tenantId, branchId, role }
// src/middlewares/requireRole.ts     → kiểm tra role

// Ví dụ route:
router.patch('/orders/:id/status',
  authMiddleware,
  requireRole(['KITCHEN', 'MANAGER', 'ADMIN']),
  orderController.updateStatus
);
```

| Role | Scope `branchId` | Ghi chú |
|---|---|---|
| `PLATFORM_ADMIN` | Không có | Chỉ xem platform data, **không bao giờ** truy cập tenant data |
| `ADMIN` | Tất cả chi nhánh của tenant | `branchId` có thể null trong query → xem toàn tenant |
| `MANAGER` | `req.user.branchId` cố định | Bắt buộc filter thêm `branchId` |
| `KITCHEN` | `req.user.branchId` cố định | Chỉ đọc orders, cập nhật status |
| `CASHIER` | `req.user.branchId` cố định | Tạo order, xử lý thanh toán |

---

## 3. Chu Trình Đơn Hàng — States & Transitions

```
OrderSession: OPEN → CLOSED (sau thanh toán) | CANCELLED

Order status flow:
  PENDING   ─── tiếp nhận đơn ──►  CONFIRMED / PREPARING  ─── hoàn tất ──►  DONE
     │                                                                      │
     └───────────── hủy đơn (void) ──────────────────────────────────────►  VOIDED

OrderItem status flow (theo dõi từng món):
  PENDING → PREPARING → READY → SERVED | VOIDED
```

**API tương ứng:**
- `POST /api/sessions/:tableId/order` → tạo Order mới, emit `order:new`
- `PATCH /api/orders/:id/status` → cập nhật Order status, emit `order:updated`
- `PATCH /api/orders/items/:id/status` → cập nhật từng item, emit `order:item:status`
- `POST /api/orders/:id/void` → hủy đơn + hoàn kho (nếu `reverseInventory: true`)

---

## 4. Thực Đơn & Modifiers — Data Model

```typescript
// MenuItem
{ id, tenantId, branchId, name, price, categoryId, type: 'FOOD'|'DRINK', isSoldOut }

// ModifierGroup (ví dụ: "Mức đường")
{ id, menuItemId, name, required: boolean, multiSelect: boolean, minSelect, maxSelect }

// ModifierOption (ví dụ: "50% đường")
{ id, groupId, name, extraPrice: number }
```

**Cart Item Identity (composite key)** — backend phải lưu đúng cấu trúc này:
```typescript
// Trong OrderItem:
{
  menuItemId: "...",
  quantity: 2,
  modifiers: [{ groupId: "g1", optionId: "o3", name: "50% đường", extraPrice: 0 }],
  note: "không đá",
  unitPrice: menuItem.price + sum(modifiers.extraPrice)
}
```

**API sold-out:**
- `PATCH /api/menu/items/:id/sold-out` → toggle `isSoldOut`, emit `sold_out:updated`

---

## 5. Kho & BOM — Service Logic

**Tự động trừ kho khi thanh toán** (trong `order.service.ts`):

```typescript
// Sau khi payment confirmed:
for (const item of order.items) {
  const bom = await prisma.menuItemIngredient.findMany({ where: { menuItemId: item.menuItemId } });
  for (const ingredient of bom) {
    await prisma.ingredient.update({
      where: { id: ingredient.ingredientId, tenantId },
      data: { quantity: { decrement: ingredient.quantity * item.quantity } }
    });
    // Ghi log vào InventoryLog
  }
}
emit('inventory:updated', { branchId });
```

**Hoàn kho khi void** (tham số `reverseInventory: boolean` trong request body):
- `true` → cộng lại `quantity` theo BOM
- `false` → chỉ void đơn, không đụng kho

**Cảnh báo tồn kho thấp:**
- Sau mỗi lần trừ kho, kiểm tra `quantity < minStock` → emit `inventory:updated` với flag `lowStock`

---

## 6. Loyalty & Vouchers — Tính Toán

### Tích điểm sau thanh toán:

```typescript
// Trong cashier.service.ts sau khi payment success:
const pointsEarned = Math.floor(finalAmount / tenant.pointsPerVND);
await prisma.customer.update({
  where: { tenantId, phone },
  data: {
    points: { increment: pointsEarned },
    totalSpent: { increment: finalAmount }
  }
});
// Auto-upgrade tier nếu vượt ngưỡng
```

### Áp dụng voucher (trước khi tính tiền):

```typescript
// Kiểm tra điều kiện:
if (voucher.minOrder > subtotal) throw 'Đơn chưa đạt giá trị tối thiểu';
if (voucher.usedCount >= voucher.maxUses) throw 'Voucher đã hết lượt dùng';
if (new Date() > voucher.expiresAt) throw 'Voucher đã hết hạn';

// Tính discount:
const discount = voucher.type === 'PERCENT'
  ? Math.min(subtotal * voucher.value / 100, voucher.maxDiscount ?? Infinity)
  : voucher.value;
```

### Membership Tier discount:

```typescript
// Áp dụng sau voucher:
const tier = await prisma.membershipTier.findFirst({
  where: { tenantId, minPoints: { lte: customer.points } },
  orderBy: { minPoints: 'desc' }
});
const tierDiscount = subtotal * (tier?.discountPercent ?? 0) / 100;
```

---

## 7. Z-Report — Dữ Liệu Cần Tổng Hợp

`zreport.service.ts` tính toán từ `OrderSession` và `Order` trong khoảng thời gian ca:

```typescript
{
  period: { from: Date, to: Date },
  totalOrders: number,           // Tổng số đơn DONE
  voidedItems: number,           // Số món bị VOIDED
  cashRevenue: number,           // Tổng tiền mặt thực nhận
  qrRevenue: number,             // Tổng VietQR (Pay2S confirmed)
  voucherDiscount: number,       // Tổng giảm giá từ voucher
  loyaltyDiscount: number,       // Tổng giảm từ điểm thành viên
  netRevenue: number,            // Tổng sau giảm giá
  openingCash: number,           // Tiền mặt đầu ca (nhập thủ công)
  closingCash: number,           // Tiền mặt thực đếm cuối ca (nhập thủ công)
  variance: number               // Chênh lệch (closingCash - openingCash - cashRevenue)
}
// Export: PDFKit → PDF in nhiệt | ExcelJS → .xlsx cho kế toán
```

---

## 8. Thanh Toán Pay2S — Webhook Flow

```
Client ──► POST /api/cashier/create-qr ──► sinh VietQR (amount + transferContent duy nhất)
                                                │
Pay2S server ──► POST /api/webhooks/pay2s ──────┘ (khi ngân hàng xác nhận)
  │ Verify HMAC signature (PAY2S_WEBHOOK_SECRET)
  │ Match transferContent → OrderSession
  │ Mark session CLOSED + emit payment:completed
  └► Trigger: trừ kho BOM + tích điểm customer
```

---

## 9. Branding — API & Storage

```typescript
// GET /api/branding/:tenantId → public endpoint (QR Menu dùng)
// PATCH /api/branding → ADMIN only, upload logo qua Cloudinary
{
  logo: string,          // Cloudinary URL
  primaryColor: string,  // hex, dùng làm CSS variable trên QR Menu
  secondaryColor: string,
  bannerUrl: string
}
```
