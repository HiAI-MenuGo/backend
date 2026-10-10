# Backend - Hệ thống điều hướng Code (HiAI-MenuGo)

## Tổng quan
API Server cho hệ thống quản lý nhà hàng F&B multi-tenant (SaaS). Express 5 + TypeScript + Prisma (PostgreSQL) + Socket.IO realtime.

---

## Cấu trúc thư mục thực tế

```
backend/
├── src/
│   ├── app.ts                    # Entry point Express + Socket.IO server
│   ├── routes/                   # API Routes (19 route files)
│   │   ├── index.ts              # Root router aggregator
│   │   ├── auth.routes.ts        # Đăng nhập, refresh token, đổi mật khẩu
│   │   ├── user.routes.ts        # Quản lý user/nhân viên
│   │   ├── branch.routes.ts      # Quản lý chi nhánh
│   │   ├── table.routes.ts       # Quản lý bàn, khu vực, QR code
│   │   ├── category.routes.ts    # Danh mục menu
│   │   ├── menu.routes.ts        # Món ăn, modifier groups/options
│   │   ├── ingredient.routes.ts  # Nguyên liệu, kho, recipe (BOM)
│   │   ├── order.routes.ts       # Đơn hàng, session, thanh toán
│   │   ├── session.routes.ts     # Phiên đặt bàn (OrderSession)
│   │   ├── customer.routes.ts    # Khách hàng, membership tier
│   │   ├── loyalty.routes.ts     # Voucher, tích điểm
│   │   ├── cashier.routes.ts     # Thu ngân, Z-report, chốt ca
│   │   ├── reservation.routes.ts # Đặt bàn trước
│   │   ├── branding.routes.ts    # Branding tenant (logo, color, bank)
│   │   ├── analytics.routes.ts   # Báo cáo doanh thu, top món
│   │   ├── voucher-quote.routes.ts # Báo giá voucher
│   │   ├── zreport.routes.ts     # Z-report chi tiết
│   │   ├── webhook.routes.ts     # Webhook config & delivery
│   │   ├── upload.routes.ts      # Upload ảnh (Cloudinary/local)
│   │   ├── platform.routes.ts    # Platform admin (multi-tenant)
│   │   ├── apikey.routes.ts      # API Key management
│   │   └── health.routes.ts      # Health check
│   ├── controllers/              # Controllers (1 per route file)
│   ├── services/                 # Business logic
│   │   ├── auth.service.ts
│   │   ├── order.service.ts
│   │   ├── inventory.service.ts
│   │   ├── analytics.service.ts
│   │   ├── session-order.service.ts
│   │   ├── voucher-quote.service.ts
│   │   ├── zreport.service.ts
│   │   └── payment/vietqr.service.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT verify, RBAC
│   │   └── validate.ts           # Zod validation
│   ├── utils/
│   │   ├── response.ts           # ApiResponse wrapper
│   │   ├── prisma.ts             # PrismaClient singleton
│   │   ├── logger.ts             # Winston logger
│   │   ├── mailer.ts             # Nodemailer
│   │   └── cloudinary.ts         # Cloudinary upload
│   ├── socket/
│   │   ├── index.ts              # Socket.IO init + auth
│   │   └── events.ts             # Event names constants
│   └── types/                    # (nếu có, hoặc dùng từ Prisma)
├── prisma/
│   ├── schema.prisma             # Schema DB hoàn chỉnh (740 dòng)
│   ├── seed.ts                   # Seed data
│   └── migrations/               # Migration history
├── assets/fonts/                 # DejaVu fonts cho PDF
├── logs/                         # Winston logs
├── dist/                         # Build output
├── package.json
├── tsconfig.json
├── .env / .env.example
└── README.md
```

---

## Database Schema (Prisma) - Models chính

| Domain | Models |
|--------|--------|
| **Multi-tenant** | `Tenant`, `TenantBranding`, `Branch` |
| **Auth & RBAC** | `TenantUser` (roles: PLATFORM_ADMIN, ADMIN, MANAGER, KITCHEN, CASHIER), `RefreshToken` |
| **Floor/Table** | `Area`, `Table` (qrToken), `Reservation` |
| **Menu** | `MenuCategory`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `ItemModifierGroup` |
| **Inventory** | `Ingredient`, `Recipe` (BOM), `InventoryLog` |
| **Order** | `OrderSession`, `Order`, `OrderItem`, `OrderItemModifier`, `PaymentTransaction` |
| **Customer/Loyalty** | `Customer`, `MembershipTier`, `Voucher`, `VoucherUsage` |
| **Z-Report** | `ZReport` (shift accounting) |
| **Integration** | `ApiKey`, `WebhookConfig`, `WebhookDelivery` |

**Enums quan trọng:** `UserRole`, `TableStatus`, `SessionStatus`, `OrderStatus`, `OrderItemStatus`, `OrderType`, `PaymentStatus`, `PaymentMethod`, `VoucherType`, `InventoryAdjustmentType`, `ReservationStatus`, `TenantStatus`, `SubscriptionPlan`

---

## Tìm file nhanh (theo chức năng)

| Cần tìm | File/Thư mục |
|---------|-------------|
| Khởi động server | `src/app.ts` |
| Tất cả routes | `src/routes/index.ts` |
| Auth (login, JWT, RBAC) | `src/routes/auth.routes.ts`, `src/controllers/auth.controller.ts`, `src/services/auth.service.ts`, `src/middlewares/auth.middleware.ts` |
| Menu (CRUD món, category, modifier) | `src/routes/menu.routes.ts`, `category.routes.ts`, `src/controllers/menu.controller.ts` |
| Bàn, khu vực, QR | `src/routes/table.routes.ts`, `src/controllers/table.controller.ts`, `table-qr.controller.ts` |
| Đơn hàng, session, thanh toán | `src/routes/order.routes.ts`, `session.routes.ts`, `src/controllers/order.controller.ts`, `session-order.controller.ts`, `src/services/order.service.ts`, `session-order.service.ts` |
| Nguyên liệu, kho, recipe | `src/routes/ingredient.routes.ts`, `src/controllers/ingredient.controller.ts`, `src/services/inventory.service.ts` |
| Khách hàng, voucher, loyalty | `src/routes/customer.routes.ts`, `loyalty.routes.ts`, `voucher-quote.routes.ts` |
| Thu ngân, Z-report, chốt ca | `src/routes/cashier.routes.ts`, `zreport.routes.ts`, `src/controllers/cashier.controller.ts`, `zreport.controller.ts`, `src/services/zreport.service.ts` |
| Báo cáo, analytics | `src/routes/analytics.routes.ts`, `src/controllers/analytics.controller.ts`, `src/services/analytics.service.ts` |
| Branding tenant | `src/routes/branding.routes.ts`, `src/controllers/branding.controller.ts` |
| Đặt bàn | `src/routes/reservation.routes.ts`, `src/controllers/reservation.controller.ts` |
| Webhook, API Key | `src/routes/webhook.routes.ts`, `apikey.routes.ts` |
| Upload ảnh | `src/routes/upload.routes.ts`, `src/controllers/upload.controller.ts`, `src/utils/cloudinary.ts` |
| Platform admin (multi-tenant) | `src/routes/platform.routes.ts`, `src/controllers/platform.controller.ts` |
| Socket.IO realtime | `src/socket/index.ts`, `src/socket/events.ts` |
| Schema DB | `prisma/schema.prisma` |
| Middleware validate (Zod) | `src/middlewares/validate.ts` |
| Response wrapper | `src/utils/response.ts` |
| Prisma client | `src/utils/prisma.ts` |

---

## Patterns tìm code (ripgrep)

```bash
# Tìm endpoint theo method
rg "router\.(get|post|put|delete|patch)" src/routes/

# Tìm controller
rg "export.*Controller\|class.*Controller" src/controllers/

# Tìm service
rg "export.*Service\|class.*Service" src/services/

# Tìm middleware
rg "export.*middleware\|export.*Middleware" src/middlewares/

# Tìm Zod schema validation
rg "z\.(object|string|number|array|enum)" src/

# Tìm Prisma model/query
rg "prisma\.\w+\." src/ --include="*.ts"

# Tìm Socket.IO event
rg "socket\.emit\|socket\.on\|io\.emit" src/socket/

# Tìm type/interface
rg "interface\|type " src/ --include="*.ts"

# Tìm enum
rg "enum " prisma/schema.prisma

# Tìm error handling
rg "ApiResponse\.error\|throw new" src/
```

---

## Scripts quan trọng (package.json)

```bash
npm run dev        # Dev với hot reload (tsx watch)
npm run build      # Build TypeScript -> dist/
npm start          # Chạy production (node dist/app.js)
npm run db:generate  # Prisma generate
npm run db:migrate   # Prisma migrate dev
npm run db:deploy    # Prisma migrate deploy (prod)
npm run db:seed      # Seed database
```

---

## File quan trọng phải đọc trước
1. `README.md` - Tổng quan
2. `src/app.ts` - Entry point, middleware chain, Socket.IO init
3. `prisma/schema.prisma` - Schema DB đầy đủ
4. `src/routes/index.ts` - Danh sách tất cả routes
5. `src/utils/response.ts` - Format response chuẩn
6. `src/middlewares/auth.middleware.ts` - JWT & RBAC logic
7. `.env.example` - Biến môi trường cần thiết