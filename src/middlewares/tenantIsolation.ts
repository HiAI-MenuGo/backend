import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { prisma } from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        tenantId: string;
        branchId: string;
        role: string;
        userId: string;
      };
    }
  }
}

/**
 * Middleware để enforce multi-tenant isolation.
 * - PLATFORM_ADMIN: được phép cross-tenant (quản trị SaaS), vẫn validate branch tồn tại.
 * - ADMIN: cross-branch trong cùng tenant (validate branch thuộc tenant).
 * - Role khác: chỉ đúng branch của mình; query branch lạ -> 403.
 * - Không có user: thử derive từ tableId (QR public); fail -> 400.
 */
export async function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  // Nếu đã có tenantContext (set bởi middleware khác), skip
  if (req.tenantContext) {
    return next();
  }

  const user = (req as any).user;

  // 1. Nếu có user từ auth middleware (JWT verified)
  if (user?.tenantId) {
    const rawBranch =
      (req.query.branchId as string) ||
      (req.headers['x-branch-id'] as string) ||
      (req.body?.branchId as string);

    // PLATFORM_ADMIN: cross-tenant. Nếu client chỉ định branch -> resolve và dùng tenant của branch đó.
    if (user.role === 'PLATFORM_ADMIN') {
      if (rawBranch && rawBranch !== '' && rawBranch !== 'default-branch' && rawBranch !== 'ALL') {
        try {
          const branch = await prisma.branch.findUnique({ where: { id: rawBranch } });
          if (!branch) {
            return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
          }
          req.tenantContext = {
            tenantId: branch.tenantId,
            branchId: branch.id,
            role: user.role,
            userId: user.userId || user.id,
          };
          return next();
        } catch {
          return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
        }
      }
      req.tenantContext = {
        tenantId: user.tenantId,
        branchId: user.branchId || 'default-branch',
        role: user.role,
        userId: user.userId || user.id,
      };
      return next();
    }

    // ADMIN/PLATFORM_ADMIN được xem all-branch trong tenant (header x-branch-id: ALL)
    if (rawBranch === 'ALL' && (user.role === 'ADMIN' || user.role === 'PLATFORM_ADMIN')) {
      req.tenantContext = {
        tenantId: user.tenantId,
        branchId: 'ALL',
        role: user.role,
        userId: user.userId || user.id,
      };
      return next();
    }

    // Role thường: xác định branch yêu cầu, fallback về branch của user
    const requestedBranch =
      rawBranch && rawBranch !== '' && rawBranch !== 'ALL' ? rawBranch : user.branchId || 'default-branch';

    // 'default-branch' legacy: dùng branch của user, không cho query tự do
    if (requestedBranch === 'default-branch') {
      req.tenantContext = {
        tenantId: user.tenantId,
        branchId: user.branchId || 'default-branch',
        role: user.role || 'CASHIER',
        userId: user.userId || user.id,
      };
      return next();
    }

    // Non-ADMIN chỉ được đúng branch của mình
    if (user.role !== 'ADMIN' && requestedBranch !== user.branchId) {
      return ApiResponse.error(res, 'FORBIDDEN', 'Không có quyền truy cập chi nhánh này', 403);
    }

    // ADMIN (và cả role khác khi trùng branch mình): validate branch thuộc tenant (chặn IDOR)
    try {
      const branch = await prisma.branch.findFirst({
        where: { id: requestedBranch, tenantId: user.tenantId },
      });
      if (!branch) {
        // Trả 404 thay vì 403 để không lộ branch có tồn tại ở tenant khác
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      req.tenantContext = {
        tenantId: user.tenantId,
        branchId: branch.id,
        role: user.role || 'CASHIER',
        userId: user.userId || user.id,
      };
      return next();
    } catch {
      return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
    }
  }

  // 2. Public endpoints (QR Menu, etc.) - derive from tableId (UUID hoặc JWT QR)
  const tableId = req.params.tableId || req.body?.tableId || req.query?.tableId;
  if (tableId) {
    try {
      const { resolveTableScope } = await import('../utils/tableScope');
      const hintTenant = (req.headers['x-tenant-id'] as string) || req.query?.tenantId || req.body?.tenantId;
      const hintBranch = (req.headers['x-branch-id'] as string) || req.query?.branchId || req.body?.branchId;
      const scope = await resolveTableScope(String(tableId), {
        tenantId: hintTenant && hintTenant !== 'default-tenant' ? String(hintTenant) : undefined,
        branchId: hintBranch && hintBranch !== 'default-branch' && hintBranch !== 'ALL' ? String(hintBranch) : undefined,
      });
      if (scope) {
        const statusRow = await prisma.table
          .findUnique({ where: { id: scope.tableId }, select: { status: true } })
          .catch(() => null);
        if (statusRow?.status !== 'CLEANING') {
          req.tenantContext = {
            tenantId: scope.tenantId,
            branchId: scope.branchId,
            role: 'GUEST',
            userId: 'guest',
          };
          return next();
        }
      }
    } catch {
      // Fall through to error
    }
  }

  // 3. No valid tenant context
  return ApiResponse.error(res, 'TENANT_CONTEXT_REQUIRED', 'Không xác định được chi nhánh/quán', 400);
}

/**
 * Middleware validate branchId từ query params thuộc về tenant của user
 * Dùng cho endpoints cần cho phép query branchId khác (cross-branch view cho ADMIN)
 */
export function validateBranchAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const queryBranchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string);

  // Nếu không có query branchId hoặc là ALL hoặc default-branch, cho qua
  if (!queryBranchId || queryBranchId === 'default-branch' || queryBranchId === 'ALL') {
    return next();
  }

  // ADMIN/PLATFORM_ADMIN có thể xem cross-branch trong cùng tenant
  if (user?.role === 'PLATFORM_ADMIN' || user?.role === 'ADMIN') {
    // Validate branch thuộc cùng tenant
    return next(); // Service sẽ validate via resolveBranch
  }

  // Các role khác chỉ được truy cập branch của mình
  if (user?.branchId && queryBranchId !== user.branchId) {
    return ApiResponse.error(res, 'FORBIDDEN', 'Không có quyền truy cập chi nhánh này', 403);
  }

  next();
}

/**
 * Helper lấy tenantContext an toàn
 */
export function getTenantContext(req: Request): { tenantId: string; branchId: string } {
  const ctx = req.tenantContext;
  if (!ctx) {
    throw new Error('Tenant context not initialized. Use enforceTenantIsolation middleware.');
  }
  return { tenantId: ctx.tenantId, branchId: ctx.branchId };
}