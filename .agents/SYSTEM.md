# Backend System Design — HiAI-MenuGo

## 1. Architecture Overview

**API Server** cho hệ thống quản lý nhà hàng F&B multi-tenant (SaaS).
- **Runtime:** Node.js + Express 5 + TypeScript 5.8
- **ORM:** Prisma 6 (PostgreSQL on Supabase)
- **Realtime:** Socket.IO 4.8 (shared HTTP server)
- **Auth:** JWT thuần (jsonwebtoken) — Access 15m + Refresh 7d HttpOnly cookie
- **Port:** 5000 (fallback 5001) — **không tự đổi**

---

## 2. Multi-Tenant Isolation (CRITICAL)

### Data Model
- Every model (except Platform-level: Tenant, ApiKey, WebhookConfig) has `tenantId`
- `Branch` belongs to `Tenant` (unique `[tenantId, code]`)
- All queries MUST filter by `tenantId` from authenticated user

### Enforcement
```typescript
// Middleware chain
router.use(authMiddleware, enforceTenantIsolation, requireRole([...]))

// In services - use tenant context
const { tenantId, branchId } = getTenantContext(req);
const orders = await prisma.order.findMany({ where: { tenantId, branchId, ... } });
```

### Middleware: `enforceTenantIsolation` (`src/middlewares/tenantIsolation.ts`)
- Sets `req.tenantContext = { tenantId, branchId, role, userId }`
- PLATFORM_ADMIN: cross-tenant (validate branch exists)
- ADMIN: cross-branch within tenant
- Other roles: only own branch
- GUEST (QR): derive from tableId

---

## 3. API Routes (Actual — from `src/routes/index.ts`)

| Module | Base Path | Mounted Route |
|--------|-----------|---------------|
| Health | `GET /api/health` | `healthRoutes` |
| Auth | `/api/auth/*` | `authRouter` |
| Orders | `/api/orders/*` | `orderRouter` |
| Tables | `/api/tables/*` | `tableRouter` |
| Cashier | `/api/cashier/*` | `cashierRouter` |
| Sessions | `/api/sessions/*` | `sessionRouter` |
| Ingredients | `/api/ingredients/*` | `ingredientRouter` |
| Menu | `/api/menu/*` | `menuRouter` |
| Categories | `/api/categories/*` | `categoryRouter` |
| Reservations | `/api/reservations/*` | `reservationRouter` |
| Upload | `/api/upload/*` | `uploadRouter` |
| Customer Requests | `/api/customer-requests/*` | `customerRequestRouter` |
| Platform Admin | `/api/platform-admin/*` | `platformRouter` |
| Admin Users | `/api/admin/users/*` | `userRouter` |
| Z-Report | `/api/z-report/*` | `zreportRouter` |
| Analytics | `/api/analytics/*` | `analyticsRouter` |
| Vouchers | `/api/vouchers/*` | `voucherRouter` |
| Branding | `/api/branding/*` | `brandingRouter` |
| API Keys | `/api/api-keys/*` | `apiKeyRouter` |
| Branches | `/api/branches/*` | `branchRouter` |
| Webhooks | `/api/webhooks/*` | `webhookRouter` |
| Tiers | `/api/tiers/*` | `tierRouter` |
| Customers | `/api/customers/*` | `loyaltyCustomerRouter` |

> **Note:** `/api/users/*` không tồn tại (dùng `/api/admin/users/*`). `/api/loyalty/*` không tồn tại (dùng `/api/tiers/*` và `/api/customers/*`).

---

## 4. API Design Standards

### Response Format (ApiResponse)
```typescript
// src/utils/response.ts
{ success: true, data: T, message?: string }
{ success: false, errorCode: string, message: string, status?: number }
```

### HTTP Status Codes
| Code | Use Case |
|------|----------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error (Zod) |
| 401 | Unauthorized (token missing/expired) |
| 403 | Forbidden (role/tenant/branch mismatch) |
| 404 | Not found |
| 409 | Conflict (duplicate unique) |
| 422 | Business rule violation |
| 500 | Server error |

### Validation
- **Every** request body validated with Zod schema
- Schema defined at top of controller
- `safeParse` → return 400 with first issue message

---

## 5. Authentication & RBAC

### JWT
- Access: 15 min, `Authorization: Bearer`
- Refresh: 7 days, HttpOnly cookie (`/api/auth` path)
- Rotation + reuse detection (revoke all on reuse)
- Secret: `JWT_SECRET` env

### Roles
| Role | Scope | Permissions |
|------|-------|-------------|
| `PLATFORM_ADMIN` | All tenants | Manage tenants, plans |
| `ADMIN` | Tenant (all branches) | Menu, staff, branches, analytics |
| `MANAGER` | Assigned branch(es) | Inventory, Z-Report, scheduling |
| `KITCHEN` | Assigned branch | KDS: view/update item status |
| `CASHIER` | Assigned branch | POS: orders, payment, tables |

---

## 6. Socket.IO Real-time (from `src/socket/events.ts`)

### Room Structure
- `tenant:{tenantId}` — tenant-wide (admin alerts)
- `branch:{branchId}` — branch-wide (orders, tables, payments)
- `table:{tableId}` — guest QR menu (single table)

### Events (SOCKET_EVENTS enum)
| Event | Direction | Trigger |
|-------|-----------|---------|
| `order:new` | Server→Client | New order from QR/POS |
| `order:updated` | Server→Client | Order status change |
| `order:item-status` | Server→Client | Item status change |
| `order:voided` | Server→Client | Order cancelled |
| `session:updated` | Server→Client | Session change |
| `session:closed` | Server→Client | Session closed (paid) |
| `table:status-changed` | Server→Client | Table status change |
| `sold_out:updated` | Server→Client | Menu item sold out toggle |
| `payment:pending` | Server→Client | QR waiting payment |
| `payment:completed` | Server→Client | SePay webhook confirmed |
| `inventory:updated` | Server→Client | Stock changed |
| `inventory:warning` | Server→Client | Low stock warning |
| `menu_item:deleted` | Server→Client | Menu item deleted |
| `call_staff:request` | Server→Client | Guest calls staff |
| `notification:new` | Server→Client | New notification |

### Emission Helpers
```typescript
emitToTenant(tenantId, 'order:new', data)
emitToBranch(branchId, 'payment:completed', data)
emitToTable(tableId, 'call_staff:request', data)
```

### Auth
- Token in `socket.handshake.auth.token` OR `Authorization` header
- Fallback: query params `tenantId`, `branchId`, `tableId` (guest QR)
- GUEST (no JWT) → only joins `table:{tableId}`

---

## 7. Database (Prisma)

### Core Domains
| Domain | Models |
|--------|--------|
| Multi-tenant | `Tenant`, `TenantBranding`, `Branch` |
| Auth/RBAC | `TenantUser` (roles), `RefreshToken` |
| Floor/Table | `Area`, `Table` (qrToken), `Reservation` |
| Menu | `MenuCategory`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `ItemModifierGroup` |
| Inventory | `Ingredient`, `Recipe` (BOM), `InventoryLog` |
| Order | `OrderSession`, `Order`, `OrderItem`, `OrderItemModifier`, `PaymentTransaction` |
| Customer/Loyalty | `Customer`, `MembershipTier`, `Voucher`, `VoucherUsage` |
| Z-Report | `ZReport` |
| Integration | `ApiKey`, `WebhookConfig`, `WebhookDelivery` |

### Schema Workflow (MANDATORY)
```bash
# 1. Edit prisma/schema.prisma
# 2. Format & generate
npx prisma format
npx prisma generate

# 3. Create migration
npx prisma migrate dev --name <descriptive_name>

# 4. Test build
npm run build
```

### Rules
- Never edit migration files after commit
- Never raw SQL in app code (only migrations)
- All models: `createdAt`/`updatedAt` (except join tables)
- Relations: explicit `@relation` with `onDelete`
- Indexes: `@@index([tenantId, branchId, status/date])`

---

## 8. Key Flows

### Order Flow (QR → KDS → POS → Payment)
```
1. Guest scans QR → /table/[tableId] (public)
2. Creates OrderSession → join table room
3. Guest orders → POST /orders → emit order:new (KDS)
4. Kitchen updates status → order:item-status
5. Cashier opens session → payment:pending (VietQR)
6. SePay webhook → payment:completed → session:closed
7. Z-Report includes session
```

### Inventory BOM Deduction
```
OrderItem created → Recipe lookup → Ingredient.currentStock -= qty
InventoryLog created (USAGE)
Low stock → emit inventory:warning
```

### Z-Report (Shift Accounting)
```
Cashier ends shift → POST /zreport
Aggregates: cashRevenue, qrRevenue, cardRevenue, totalDiscount
Discrepancy = actualCash - (openingCash + cashRevenue)
PDF/Excel export
```

---

## 9. Payment Integration (SePay/VietQR)

### VietQR Generation
```
POST /cashier/create-qr { sessionId, amount }
→ SePay API → returns QR code + transactionRef
→ emit payment:pending
```

### Webhook Handler
```
POST /webhooks/sepay (SePay calls back)
→ Verify signature (SEPAY_WEBHOOK_SECRET)
→ Find session by transactionRef
→ Update PaymentTransaction + OrderSession
→ emit payment:completed
```

---

## 10. Security

- Helmet (security headers)
- Rate limit: 2000 req/15min/IP
- CORS: `FRONTEND_URL` only
- Zod validation on all endpoints
- Multer + Cloudinary (validate mime/size)
- Webhook signature verification

---

## 11. Current Limitation: Multi-Instance Socket.IO

**Problem:** Each backend instance has isolated Socket.IO rooms. Events don't propagate across instances.

**Solution (for production):**
```bash
npm install ioredis @socket.io/redis-adapter
```

```typescript
// src/socket/index.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'ioredis';

const pubClient = createClient(process.env.REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 12. File Navigation Quick Reference

| Need | File |
|------|------|
| Server entry | `src/app.ts` |
| All routes | `src/routes/index.ts` |
| Auth/JWT/RBAC | `src/middlewares/auth.middleware.ts`, `src/services/auth.service.ts` |
| Tenant isolation | `src/middlewares/tenantIsolation.ts` |
| Socket.IO | `src/socket/index.ts`, `src/socket/events.ts` |
| DB Schema | `prisma/schema.prisma` |
| Seed data | `prisma/seed.ts` |
| Response wrapper | `src/utils/response.ts` |
| Prisma client | `src/utils/prisma.ts` |

---

## 13. Environment Variables (`.env`)

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SEPAY_WEBHOOK_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

---

## 14. Quality Gates (Pre-push)

```bash
npm run build        # TypeScript compile
npm run lint         # ESLint (if configured)
npx prisma validate  # Schema syntax
```