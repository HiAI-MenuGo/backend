# Backend Rules — HiAI-MenuGo

## 1. Architecture & Code Organization

### Layer Separation
- **Routes** (`src/routes/*`): HTTP definitions only. No business logic.
- **Controllers** (`src/controllers/*`): Request/response handling, validation, call services.
- **Services** (`src/services/*`): Pure business logic, DB operations via Prisma, external integrations.
- **Middlewares** (`src/middlewares/*`): Cross-cutting concerns (auth, tenant isolation, validation, rate limit).
- **Utils** (`src/utils/*`): Pure helpers (logger, response formatter, Prisma client).

### File Naming
- Controllers: `<Feature>Controller.ts` (PascalCase)
- Services: `<feature>.service.ts` (camelCase)
- Routes: `<feature>.routes.ts` (kebab-case)
- Middlewares: `<purpose>.middleware.ts` (kebab-case)

---

## 2. Database & Prisma

### Schema Changes
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
- **Never** edit migration files after commit.
- **Never** use raw SQL in application code (only in migrations).
- All models must have `createdAt` / `updatedAt` (except join tables).
- All relations: explicit `@relation` with `onDelete: Cascade | SetNull | Restrict`.
- Multi-tenant: every model has `tenantId` (except Platform-level: Tenant, ApiKey, WebhookConfig).
- Indexes: add `@@index` for common query patterns (tenantId + branchId + status/date).

### Seed Data
- Use `upsert` in `prisma/seed.ts` — idempotent, safe to re-run.
- Default password: `123456` (bcrypt hashed).
- Tenant code: `TASTY_STATION`, Branch: `TS-01`.

---

## 3. API Design

### Response Format (ApiResponse)
```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, errorCode: string, message: string, status?: number }
```
Use `ApiResponse.success(res, data, message)` / `ApiResponse.error(res, code, message, status)`.

### HTTP Status Codes
- 200: OK
- 201: Created
- 400: Validation error (Zod)
- 401: Unauthorized (token missing/expired)
- 403: Forbidden (role/tenant/branch mismatch)
- 404: Not found
- 409: Conflict (duplicate unique)
- 422: Unprocessable (business rule violation)
- 500: Server error

### Validation
- **Every** request body validated with Zod schema.
- Schema defined at top of controller file.
- `safeParse` → return 400 with first issue message.

---

## 4. Authentication & Authorization

### JWT
- Access token: 15 min, in `Authorization: Bearer` header.
- Refresh token: 7 days, HttpOnly cookie (`/api/auth` path), rotation + reuse detection.
- Secret: `JWT_SECRET` env var.

### Roles (RBAC)
| Role | Scope | Permissions |
|------|-------|-------------|
| `PLATFORM_ADMIN` | All tenants | Manage tenants, plans, platform config |
| `ADMIN` | Tenant (all branches) | Menu, staff, branches, analytics, settings |
| `MANAGER` | Assigned branch(es) | Inventory, Z-Report, staff scheduling |
| `KITCHEN` | Assigned branch | Tiếp nhận & cập nhật trạng thái đơn hàng / món |
| `CASHIER` | Assigned branch | POS: create orders, payment, tables |

### Middleware Chain
```typescript
router.use(authMiddleware, enforceTenantIsolation, requireRole(['ADMIN', 'MANAGER']))
```

### Tenant Isolation (CRITICAL)
- **Every** Prisma query MUST filter by `tenantId` from `req.user.tenantId`.
- `enforceTenantIsolation` middleware sets `req.tenantContext = { tenantId, branchId, role, userId }`.
- Use `getTenantContext(req)` in services for type-safe access.
- Never trust client-sent `tenantId` / `branchId` — always derive from JWT.

---

## 5. Socket.IO

### Room Structure
- `tenant:{tenantId}` — tenant-wide broadcasts (admin alerts)
- `branch:{branchId}` — branch-wide (orders, tables, payments)
- `table:{tableId}` — guest QR menu (single table)

### Event Naming
- Format: `<resource>:<action>` (e.g., `order:new`, `payment:completed`, `table:status-changed`)
- Defined in `src/socket/events.ts` as `SOCKET_EVENTS` enum.

### Auth
- Token in `socket.handshake.auth.token` OR `Authorization` header.
- Fallback: `tenantId`, `branchId`, `tableId` from query/auth for guest QR.
- GUEST (no JWT) → only join `table:{tableId}` room.

### Emission Helpers
```typescript
emitToTenant(tenantId, 'order:new', data)
emitToBranch(branchId, 'payment:completed', data)
emitToTable(tableId, 'call_staff:request', data)
```

---

## 6. Error Handling & Logging

### Logger (Winston)
- `logger.info()`, `logger.warn()`, `logger.error()` — structured JSON.
- Request ID propagated via `req.id` (set in `app.ts`).

### Error Handling
- Controllers: try/catch → `ApiResponse.error(res, code, message, 500)`.
- Prisma errors: catch `P2003` (FK), `P2002` (unique) → map to 400/409.
- Never leak stack traces to client.

---

## 7. Security

- Helmet enabled (`app.ts`).
- Rate limit: 2000 req / 15 min per IP (`express-rate-limit`).
- CORS: `FRONTEND_URL` only (configurable).
- Input validation: Zod on every endpoint.
- File upload: Multer + Cloudinary, validate mime/size.
- Webhook signature verification (Pay2S: `PAY2S_WEBHOOK_SECRET`).

---

## 8. Environment Variables

Required `.env`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PAY2S_WEBHOOK_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

---

## 9. Testing & Quality

```bash
npm run build        # TypeScript compile check
npm run lint         # ESLint (if configured)
npx prisma validate  # Schema syntax check
```

### Pre-commit (manual)
- Run `npm run build` before push.
- No `console.log` in production code (use `logger`).
- No `any` types — use proper interfaces.

---

## 10. Multi-Instance / Production

### Current Limitation
- **Socket.IO not shared across instances** — each backend has isolated rooms.
- For horizontal scaling: add Redis adapter (`@socket.io/redis-adapter` + ioredis).

### Deployment Checklist
- `NODE_ENV=production`
- `npm run db:deploy` (migrations)
- `npm run build` → `npm start`
- Reverse proxy (Nginx) → `localhost:5000`
- WebSocket upgrade support in proxy
- Redis for Socket.IO adapter (if multi-instance)