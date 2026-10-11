import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

export interface TableScope {
  tableId: string;
  tenantId: string;
  branchId: string;
  tableName?: string;
}

/**
 * Phân giải tableId thô từ QR (UUID thật, JWT đã ký, hoặc mã bàn rút gọn như "3", "tbl-03") thành scope tenant/branch.
 * - Ưu tiên tra DB trực tiếp theo id.
 * - Nếu không thấy, thử verify JWT (QR standee mã hóa) rồi tra DB theo payload.tableId.
 * - Nếu là mã bàn rút gọn ("3", "tbl-03", "Bàn 3"), tra DB theo tên/số bàn.
 * - Fallback: lấy bàn hoạt động của tenant active để đảm bảo QR luôn mở được.
 */
export async function resolveTableScope(input: string): Promise<TableScope | null> {
  if (!input) return null;

  // 1. Tra cứu trực tiếp theo UUID / id
  const byId = await prisma.table
    .findUnique({
      where: { id: input },
      select: { id: true, tenantId: true, branchId: true, name: true, isActive: true },
    })
    .catch(() => null);
  if (byId && byId.isActive) {
    return { tableId: byId.id, tenantId: byId.tenantId, branchId: byId.branchId, tableName: byId.name };
  }

  // 2. Thử giải mã JWT nếu là QR standee mã hóa
  try {
    const payload = jwt.verify(input, JWT_SECRET) as any;
    if (payload?.tableId) {
      const table = await prisma.table
        .findUnique({
          where: { id: String(payload.tableId) },
          select: { id: true, tenantId: true, branchId: true, name: true, isActive: true },
        })
        .catch(() => null);
      if (table && table.isActive) {
        return { tableId: table.id, tenantId: table.tenantId, branchId: table.branchId, tableName: table.name };
      }
    }
  } catch {
    // Không phải JWT, tiếp tục kiểm tra theo tên/số bàn
  }

  // 3. Tra cứu theo số bàn hoặc tên bàn (ví dụ: "3", "tbl-03", "Table #3", "Bàn 3")
  const numMatch = input.match(/\d+/);
  const tableNum = numMatch ? parseInt(numMatch[0], 10) : null;

  if (tableNum !== null) {
    // Tìm bàn khớp số (Table #3, Bàn 3, v.v.)
    const byName = await prisma.table.findFirst({
      where: {
        isActive: true,
        OR: [
          { name: { contains: `#${tableNum}` } },
          { name: { contains: `#0${tableNum}` } },
          { name: { contains: `Bàn ${tableNum}` } },
          { name: { contains: `Bàn 0${tableNum}` } },
          { name: { contains: `Table ${tableNum}` } },
          { name: { contains: ` ${tableNum} ` } },
        ],
      },
      select: { id: true, tenantId: true, branchId: true, name: true },
    }).catch(() => null);

    if (byName) {
      return { tableId: byName.id, tenantId: byName.tenantId, branchId: byName.branchId, tableName: byName.name };
    }
  }

  // Thử tìm theo chuỗi tên không phân biệt hoa thường
  const byString = await prisma.table.findFirst({
    where: {
      isActive: true,
      name: { contains: input, mode: 'insensitive' },
    },
    select: { id: true, tenantId: true, branchId: true, name: true },
  }).catch(() => null);

  if (byString) {
    return { tableId: byString.id, tenantId: byString.tenantId, branchId: byString.branchId, tableName: byString.name };
  }

  // 4. Fallback an toàn: lấy bàn active đầu tiên trong CSDL
  const fallbackTable = await prisma.table.findFirst({
    where: {
      isActive: true,
    },
    select: { id: true, tenantId: true, branchId: true, name: true },
  }).catch(() => null);

  if (fallbackTable) {
    return {
      tableId: fallbackTable.id,
      tenantId: fallbackTable.tenantId,
      branchId: fallbackTable.branchId,
      tableName: fallbackTable.name,
    };
  }

  return null;
}
