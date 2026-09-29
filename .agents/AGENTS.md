# HiAI-MenuGo — Agent Entry Point (AGENTS)

> **File điều phối duy nhất cho AI Agent.** Đọc file này trước, sau đó đi tới file chuyên trách tương ứng. Không nhồi mọi chi tiết vào đây — chi tiết nằm ở 4 file còn lại.

---

## 1. Bản Đồ 5 Files (đọc theo thứ tự)

| # | File | Nội dung | Khi nào đọc |
|---|---|---|---|
| 1 | [BUSINESS.md](./BUSINESS.md) | Nghiệp vụ F&B: Multi-tenant, RBAC nghiệp vụ, lifecycle QR→KDS→POS→thanh toán, Menu/Modifiers, kho BOM, Loyalty/Voucher, Z-Report, Branding | Trước khi thiết kế tính năng, kiểm tra logic đúng nghiệp vụ |
| 2 | [TECHS.md](./TECHS.md) | Stack chốt: Next.js 16, Express 5, React Native/Expo 57, Supabase/PostgreSQL, Prisma 6.4, **JWT thuần**, Socket.IO, ports, cấu trúc repo | Trước khi chọn lib, tạo project, viết API/schema/auth |
| 3 | [RULES.md](./RULES.md) | Luật cấm: tenant isolation, ApiResponse/Zod, cart composite key, cấm React Navigation, critical UI rules, git policy, checklist | Trước khi viết/sửa bất kỳ code nào |
| 4 | [SKILLS.md](./SKILLS.md) | Design System: màu F&B, typography, geometry 4 cấp, thumb zone, journey 5 chặng, component mẫu, theme tokens | Trước khi làm UI/component mới |
| 5 | `AGENTS.md` (file này) | Index + trạng thái repo + feature map + workflow | Luôn đọc đầu tiên |

---

## 2. Trạng Thái Repo Thực Tế (29/09/2026)

- Root hiện có: `mobile/` ✅ · `frontend/` ✅ · `backend/` ✅ · `docs/` · `.agents/` · `README.md`.
- Dự án quản lý trên **3 repositories độc lập**:
  - `backend.git` (A + B + C code chung): Express 5 + TypeScript 5.8 + Socket.IO + Prisma 6.
  - `mobile.git` (A: iOS & Foundation + B: Android & Operations): Expo ~57 + RN 0.86.
  - `frontend.git` (C: Web Platform): Next.js 16 (App Router) + React 19 + TailwindCSS.
- **Quy chuẩn nhánh:** Mỗi repo có `main` (production), `dev` (tích hợp), thành viên tạo nhánh `feat/...` và mở Pull Request vào `dev`.
- **Nguyên tắc dùng chung API:** Cả Mobile và Web đều kết nối vào **cùng 1 Backend API duy nhất** (port 5000/5001), dùng chung Socket.IO events, data schemas, JWT auth và các endpoint nghiệp vụ.
- Cổng: Backend `5000`/`5001` · Web `3000` · Metro `8081` — không tự đổi.


---

## 3. Feature Map Gọn

```
HiAI-MenuGo/
├── .agents/
│   ├── AGENTS.md    # Index (file này)
│   ├── BUSINESS.md  # Nghiệp vụ F&B & vận hành
│   ├── TECHS.md     # Stack: Next.js, Express, RN, Supabase, Prisma, PG, JWT thuần
│   ├── RULES.md     # Luật bắt buộc + checklist
│   └── SKILLS.md    # Design System & component mẫu
├── mobile/          # Expo 57 + RN 0.86 (đã có & verified)
│   ├── App.tsx      # Root shell: SafeArea + Custom Tab routing + Cart state
│   ├── index.ts     # Expo entry
│   └── src/         # types · theme · data (mockData, menuStore) · components · screens
├── frontend/        # Next.js 16 App Router (khung đã khởi tạo ✅)
└── backend/         # Express 5 + TypeScript + Socket.IO (khung đã khởi tạo ✅)
```

---

## 4. Workflow Bắt Buộc Của Agent

1. Đọc `AGENTS.md` (file này) → xác định task thuộc file nào → đọc file đó (+ file liên quan nếu cần).
2. Mọi Prisma query phải có `tenantId` (RULES §1). Mọi response qua `ApiResponse`, body qua Zod (RULES §2).
3. Auth chỉ JWT thuần (`jsonwebtoken`, access 15p + refresh 7d HttpOnly, rotation + reuse detection) — cấm Supabase Auth/NextAuth/Clerk (TECHS §6).
4. Mobile: cấm React Navigation/Expo Router; cart dùng `cartItemId` composite; màu từ `theme` (RULES §3).
5. **TUYỆT ĐỐI KHÔNG `git push`** khi chưa được user xác nhận. Commit atomic theo Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
6. Sửa `schema.prisma` → `npx prisma format` + `npx prisma generate` trước khi test/build.
7. Code xong tính năng nào → trong cùng phiên phải tự cập nhật `docs/A|B|C_Work_Flow.md` tương ứng (đổi trạng thái task, ghi ngày + commit) — chi tiết RULES §6 rule 6.
