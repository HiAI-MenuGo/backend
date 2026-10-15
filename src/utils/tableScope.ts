import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hiai_menugo_2026';

export interface TableScope {
  tableId: string;
  tenantId: string;
  branchId: string;
  tableName?: string;
  tableCode?: string;
}

/**
 * Phân giải tableId thô từ QR (UUID thật, JWT đã ký, hoặc mã bàn rút gọn như "3", "tbl-03") thành scope tenant/branch.
 * - Ưu tiên tra DB trực tiếp theo id.
 * - Nếu có hints.tenantId / hints.branchId thì bắt buộc phải khớp tenant/branch, chặn leak sang quán khác.
 * - Nếu không thấy, thử verify JWT (QR standee mã hóa) rồi tra DB theo payload.tableId.
 * - Nếu là mã bàn rút gọn ("3", "tbl-03", "Bàn 3"), tra DB theo tên/số bàn trong đúng phạm vi tenant/branch.
 * - Fallback: lấy bàn hoạt động của chính tenant đó (không bao giờ leak sang tenant khác).
 */
export async function resolveTableScope(
  input: string,
  hints?: { tenantId?: string; branchId?: string }
): Promise<TableScope | null> {
  if (!input) return null;

  const filterTenantId = hints?.tenantId && hints.tenantId !== 'default-tenant' ? hints.tenantId : undefined;
  const filterBranchId = hints?.branchId && hints.branchId !== 'default-branch' && hints.branchId !== 'ALL' ? hints.branchId : undefined;

  // 1. Tra cứu trực tiếp theo UUID / id
  const byId = await prisma.table
    .findUnique({
      where: { id: input },
      select: { id: true, tenantId: true, branchId: true, name: true, code: true, isActive: true },
    })
    .catch(() => null);
  if (byId && byId.isActive) {
    if (!filterTenantId || byId.tenantId === filterTenantId) {
      return {
        tableId: byId.id,
        tenantId: byId.tenantId,
        branchId: byId.branchId,
        tableName: byId.name,
        tableCode: byId.code,
      };
    }
  }

  // 2. Thử giải mã JWT nếu là QR standee mã hóa
  try {
    const payload = jwt.verify(input, JWT_SECRET) as any;
    if (payload?.tableId) {
      const table = await prisma.table
        .findUnique({
          where: { id: String(payload.tableId) },
          select: { id: true, tenantId: true, branchId: true, name: true, code: true, isActive: true },
        })
        .catch(() => null);
      if (table && table.isActive) {
        if (!filterTenantId || table.tenantId === filterTenantId) {
          return {
            tableId: table.id,
            tenantId: table.tenantId,
            branchId: table.branchId,
            tableName: table.name,
            tableCode: table.code,
          };
        }
      }
    }
  } catch {
    // Không phải JWT, tiếp tục kiểm tra theo tên/số bàn
  }

  // 3. Tra cứu theo số bàn hoặc tên bàn (ví dụ: "3", "tbl-03", "Table #3", "Bàn 3")
  const numMatch = input.match(/\d+/);
  const tableNum = numMatch ? parseInt(numMatch[0], 10) : null;

  if (tableNum !== null) {
    const whereNum: any = {
      isActive: true,
      OR: [
        { code: { equals: input, mode: 'insensitive' } },
        { name: { equals: input, mode: 'insensitive' } },
        { name: { contains: `#${tableNum}` } },
        { name: { contains: `#0${tableNum}` } },
        { name: { contains: `Bàn ${tableNum}` } },
        { name: { contains: `Bàn 0${tableNum}` } },
        { name: { contains: `Table ${tableNum}` } },
        { name: { contains: ` ${tableNum} ` } },
        { code: { contains: `${tableNum}` } },
      ],
    };
    if (filterTenantId) whereNum.tenantId = filterTenantId;
    if (filterBranchId) whereNum.branchId = filterBranchId;

    const byName = await prisma.table
      .findFirst({
        where: whereNum,
        select: { id: true, tenantId: true, branchId: true, name: true, code: true },
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => null);

    if (byName) {
      return {
        tableId: byName.id,
        tenantId: byName.tenantId,
        branchId: byName.branchId,
        tableName: byName.name,
        tableCode: byName.code,
      };
    }
  }

  // Thử tìm theo chuỗi tên không phân biệt hoa thường
  const whereStr: any = {
    isActive: true,
    OR: [
      { name: { contains: input, mode: 'insensitive' } },
      { code: { contains: input, mode: 'insensitive' } },
    ],
  };
  if (filterTenantId) whereStr.tenantId = filterTenantId;
  if (filterBranchId) whereStr.branchId = filterBranchId;

  const byString = await prisma.table
    .findFirst({
      where: whereStr,
      select: { id: true, tenantId: true, branchId: true, name: true, code: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => null);

  if (byString) {
    return {
      tableId: byString.id,
      tenantId: byString.tenantId,
      branchId: byString.branchId,
      tableName: byString.name,
      tableCode: byString.code,
    };
  }

  // 4. Fallback an toàn: CHỈ fallback trong cùng tenant nếu có hint (không leak sang công ty khác)
  if (filterTenantId) {
    const fallbackTenantWhere: any = { isActive: true, tenantId: filterTenantId };
    if (filterBranchId) fallbackTenantWhere.branchId = filterBranchId;

    const fallbackTable = await prisma.table
      .findFirst({
        where: fallbackTenantWhere,
        select: { id: true, tenantId: true, branchId: true, name: true, code: true },
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => null);

    if (fallbackTable) {
      return {
        tableId: fallbackTable.id,
        tenantId: fallbackTable.tenantId,
        branchId: fallbackTable.branchId,
        tableName: fallbackTable.name,
        tableCode: fallbackTable.code,
      };
    }
  }

  return null;
}
