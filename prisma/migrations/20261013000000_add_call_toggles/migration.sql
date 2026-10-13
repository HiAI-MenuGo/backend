-- Bật/tắt 2 tính năng QR khách: Gọi thanh toán & Gọi nhân viên (lưu theo tenant).
-- Idempotent (IF NOT EXISTS) để an toàn khi DB đã được sync bằng `prisma db push`.
ALTER TABLE "TenantBranding" ADD COLUMN IF NOT EXISTS "enablePaymentCall" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantBranding" ADD COLUMN IF NOT EXISTS "enableStaffCall" BOOLEAN NOT NULL DEFAULT true;
