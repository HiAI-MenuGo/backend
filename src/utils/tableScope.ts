import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

export interface TableScope {
  tableId: string;
  tenantId: string;
  branchId: string;
}

/**
 * Phân giải tableId thô từ QR (UUID thật hoặc JWT đã ký) thành scope tenant/branch.
 * - Ưu tiên tra DB trực tiếp theo id.
 * - Nếu không thấy, thử verify JWT (QR standee mã hóa) rồi tra DB theo payload.tableId.
 * - Luôn đối chiếu DB (bàn phải tồn tại + active) — không tin payload JWT mù quáng.
 * Trả null khi không phân giải được.
 */
export async function resolveTableScope(input: string): Promise<TableScope | null> {
  if (!input) return null;

  const byId = await prisma.table
    .findUnique({
      where: { id: input },
      select: { id: true, tenantId: true, branchId: true, isActive: true },
    })
    .catch(() => null);
  if (byId && byId.isActive) {
    return { tableId: byId.id, tenantId: byId.tenantId, branchId: byId.branchId };
  }

  try {
    const payload = jwt.verify(input, JWT_SECRET) as any;
    if (!payload?.tableId) return null;
    const table = await prisma.table
      .findUnique({
        where: { id: String(payload.tableId) },
        select: { id: true, tenantId: true, branchId: true, isActive: true },
      })
      .catch(() => null);
    if (!table || !table.isActive) return null;
    return { tableId: table.id, tenantId: table.tenantId, branchId: table.branchId };
  } catch {
    return null;
  }
}
