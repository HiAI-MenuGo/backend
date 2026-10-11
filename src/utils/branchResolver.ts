import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TargetBranchResult {
  branchId: string;
  branch?: any;
}

/**
 * Resolve target branchId for write operations when user is at "ALL" view.
 * 
 * Rules:
 * - If user is NOT at ALL view (tenantContext.branchId !== 'ALL'), use tenantContext.branchId
 * - If user IS at ALL view:
 *   - ADMIN/PLATFORM_ADMIN can specify branchId in request body
 *   - Validate target branch belongs to same tenant (or any tenant for PLATFORM_ADMIN)
 *   - If no branchId specified, return error asking to specify branch
 * - For non-ADMIN roles, always use tenantContext.branchId
 */
export async function resolveTargetBranchId(
  req: Request,
  options: {
    requireBranchId?: boolean; // If true, throw error when branchId is needed but not provided
    allowCrossTenant?: boolean; // If true, PLATFORM_ADMIN can target any tenant's branch
  } = {}
): Promise<TargetBranchResult> {
  const { requireBranchId = true, allowCrossTenant = false } = options;
  
  const ctx = req.tenantContext;
  if (!ctx) {
    throw new Error('Tenant context not available');
  }

  const { tenantId, branchId, role, userId } = ctx;
  const isPrivileged = role === 'ADMIN' || role === 'PLATFORM_ADMIN';
  const isAllView = branchId === 'ALL';

  // If not at ALL view, use the context branchId
  if (!isAllView) {
    if (!branchId || branchId === 'default-branch') {
      throw new Error('Branch context not available');
    }
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, tenantId: true, name: true, code: true, isActive: true }
    });
    if (!branch || branch.tenantId !== tenantId) {
      throw new Error('Branch not found or access denied');
    }
    return { branchId: branch.id, branch };
  }

  // At ALL view - need to determine target branch
  if (!isPrivileged) {
    throw new Error('Insufficient permissions to operate across branches');
  }

  const requestedBranchId = req.body.branchId as string | undefined;
  
  if (!requestedBranchId && requireBranchId) {
    throw new Error('BRANCH_REQUIRED: Vui lòng chỉ định chi nhánh mục tiêu (branchId) khi đang ở chế độ Tổng chi nhánh');
  }

  if (!requestedBranchId) {
    // Fallback to first active branch of tenant
    const fallbackBranch = await prisma.branch.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, tenantId: true, name: true, code: true, isActive: true }
    });
    if (!fallbackBranch) {
      throw new Error('No active branch found for tenant');
    }
    return { branchId: fallbackBranch.id, branch: fallbackBranch };
  }

  // Validate requested branch
  const where: any = { id: requestedBranchId, isActive: true };
  if (!allowCrossTenant || role !== 'PLATFORM_ADMIN') {
    where.tenantId = tenantId;
  }

  const branch = await prisma.branch.findFirst({
    where,
    select: { id: true, tenantId: true, name: true, code: true, isActive: true }
  });

  if (!branch) {
    throw new Error('BRANCH_NOT_FOUND: Chi nhánh mục tiêu không tồn tại hoặc không thuộc quyền quản lý');
  }

  return { branchId: branch.id, branch };
}

/**
 * Middleware wrapper to add resolved branchId to req.body for controllers
 */
export function withTargetBranch(options: { requireBranchId?: boolean } = {}) {
  return async (req: Request, res: any, next: any) => {
    try {
      const result = await resolveTargetBranchId(req, options);
      // Add resolved branchId to body for controller use
      req.body._resolvedBranchId = result.branchId;
      req.body._resolvedBranch = result.branch;
      next();
    } catch (err: any) {
      const statusCode = err.message?.startsWith('BRANCH_REQUIRED') ? 400 : 
                        err.message?.startsWith('BRANCH_NOT_FOUND') ? 404 : 
                        err.message?.startsWith('Insufficient') ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        errorCode: err.message?.split(':')[0] || 'BRANCH_RESOLVE_ERROR',
        message: err.message || 'Không xác định được chi nhánh mục tiêu',
      });
    }
  };
}

export default { resolveTargetBranchId, withTargetBranch };