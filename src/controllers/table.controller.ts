import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { emitToBranch, SOCKET_EVENTS } from '../socket';
import { getTenantContext } from '../middlewares/tenantIsolation';

export interface TableItem {
  id: string;
  name: string;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED';
  branchId: string;
  currentSessionId?: string;
  customerCount?: number;
  totalAmount?: number;
  updatedAt: string;
}

let tables: TableItem[] = [
  { id: 'tbl-01', name: 'Bàn 01', status: 'EMPTY', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'tbl-02', name: 'Bàn 02', status: 'OCCUPIED', branchId: 'default-branch', currentSessionId: 'sess-02', customerCount: 3, totalAmount: 125000, updatedAt: new Date().toISOString() },
  { id: 'tbl-03', name: 'Bàn 03', status: 'EMPTY', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'tbl-04', name: 'Bàn 04', status: 'RESERVED', branchId: 'default-branch', customerCount: 4, updatedAt: new Date().toISOString() },
  { id: 'tbl-05', name: 'Bàn 05', status: 'OCCUPIED', branchId: 'default-branch', currentSessionId: 'sess-05', customerCount: 2, totalAmount: 90000, updatedAt: new Date().toISOString() },
  { id: 'tbl-06', name: 'Bàn 06', status: 'EMPTY', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'tbl-07', name: 'Bàn 07', status: 'EMPTY', branchId: 'default-branch', updatedAt: new Date().toISOString() },
  { id: 'tbl-08', name: 'Bàn 08', status: 'EMPTY', branchId: 'default-branch', updatedAt: new Date().toISOString() },
];

import prisma from '../utils/prisma';

export class TableController {
  static async getTables(req: Request, res: Response) {
    try {
      const { branchId, tenantId } = getTenantContext(req);
      const role = req.tenantContext!.role;
      const isPrivileged = role === 'ADMIN' || role === 'PLATFORM_ADMIN';
      const requested = (req.query.branchId as string) || (req.headers['x-branch-id'] as string);
      // Role thường khóa đúng branch của mình (bỏ qua x-branch-id: ALL mặc định của frontend).
      // ADMIN được xem all-branch hoặc branch chỉ định trong tenant (tenantId luôn AND nên branch
      // tenant khác trả rỗng, không leak).
      const whereClause: any = { tenantId };
      if (isPrivileged) {
        if (requested && requested !== 'ALL' && requested !== 'default-branch') {
          whereClause.branchId = requested;
        } else if (branchId && branchId !== 'ALL' && branchId !== 'default-branch') {
          whereClause.branchId = branchId;
        }
      } else {
        whereClause.branchId = branchId;
      }

      const dbTables = await prisma.table.findMany({
        where: whereClause,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ branchId: 'asc' }, { code: 'asc' }, { name: 'asc' }],
      });

      if (dbTables.length > 0) {
        const formatted = dbTables.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status as 'EMPTY' | 'OCCUPIED' | 'RESERVED',
          branchId: t.branchId,
          branchName: t.branch?.name,
          branchCode: t.branch?.code,
          customerCount: t.capacity,
          updatedAt: t.updatedAt.toISOString(),
        }));
        return ApiResponse.success(res, formatted, 'Lấy danh sách bàn thành công');
      }

      // Fallback in-memory (dev): filter theo scope đã tính ở whereClause
      const fallbackBranch = (whereClause as any).branchId as string | undefined;
      const list = fallbackBranch ? tables.filter((t) => t.branchId === fallbackBranch) : tables;
      return ApiResponse.success(res, list, 'Lấy danh sách bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_TABLES_ERROR', err.message, 500);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { branchId } = getTenantContext(req);

      if (!status || !['EMPTY', 'OCCUPIED', 'RESERVED'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái bàn không hợp lệ', 400);
      }

      let updatedTable: any = null;
      try {
        // Scope theo branch: chặn staff branch A đổi trạng thái bàn branch B
        const owned = await prisma.table.findFirst({ where: { id, branchId }, select: { id: true } });
        if (!owned) {
          return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn', 404);
        }
        const dbTable = await prisma.table.update({
          where: { id: owned.id },
          data: { status },
        });

        if (status === 'EMPTY') {
          try {
            await prisma.orderSession.updateMany({
              where: { tableId: id, status: 'OPEN' },
              data: { status: 'CLOSED', closedAt: new Date() },
            });
          } catch {
            // ignore
          }
        }

        updatedTable = {
          id: dbTable.id,
          name: dbTable.name,
          status: dbTable.status,
          branchId: dbTable.branchId,
          customerCount: dbTable.capacity,
          updatedAt: dbTable.updatedAt.toISOString(),
        };
      } catch (e) {
        // fallback memory
      }

      const table = tables.find((t) => t.id === id);
      if (table) {
        table.status = status;
        if (status === 'EMPTY') {
          table.currentSessionId = undefined;
          table.totalAmount = 0;
        }
        table.updatedAt = new Date().toISOString();
        if (!updatedTable) {
          updatedTable = { ...table };
        }
      }

      if (!updatedTable) {
        updatedTable = { id, name: `Bàn ${id}`, status, branchId, updatedAt: new Date().toISOString() };
      }

      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: id,
        status,
        updatedAt: new Date().toISOString(),
      });

      return ApiResponse.success(res, updatedTable, 'Cập nhật trạng thái bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_TABLE_STATUS_ERROR', err.message, 500);
    }
  }

  static async createTable(req: Request, res: Response) {
    try {
      const { name, capacity } = req.body;
      const { tenantId, branchId } = getTenantContext(req);

      if (!name) {
        return ApiResponse.error(res, 'MISSING_NAME', 'Tên bàn là bắt buộc', 400);
      }

      const role = req.tenantContext!.role;
      const requestedBranch = req.body.branchId as string | undefined;
      let targetBranchId = branchId;
      if (requestedBranch && requestedBranch !== branchId) {
        // Chỉ ADMIN được tạo bàn cho branch khác; đồng thời validate branch thuộc tenant
        if (role !== 'ADMIN' && role !== 'PLATFORM_ADMIN') {
          return ApiResponse.error(res, 'FORBIDDEN', 'Không có quyền tạo bàn cho chi nhánh khác', 403);
        }
        const branch = await prisma.branch.findFirst({
          where: { id: requestedBranch, tenantId, isActive: true },
        });
        if (!branch) {
          return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
        }
        targetBranchId = branch.id;
      }
      if (!targetBranchId || targetBranchId === 'ALL' || targetBranchId === 'default-branch') {
        const firstBranch = await prisma.branch.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (!firstBranch) {
          return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Quán chưa có chi nhánh hoạt động', 404);
        }
        targetBranchId = firstBranch.id;
      }

      try {
        const newDbTable = await prisma.table.create({
          data: {
            name,
            code: name,
            capacity: capacity ? Number(capacity) : 4,
            tenantId,
            branchId: targetBranchId,
            status: 'EMPTY',
          },
        });
        return ApiResponse.success(
          res,
          {
            id: newDbTable.id,
            name: newDbTable.name,
            status: newDbTable.status,
            branchId: newDbTable.branchId,
            customerCount: newDbTable.capacity,
            updatedAt: newDbTable.updatedAt.toISOString(),
          },
          'Tạo bàn thành công',
          201
        );
      } catch (err: any) {
        // Fallback memory
      }

      const newTable: TableItem = {
        id: `tbl-${Date.now()}`,
        name,
        status: 'EMPTY',
        branchId,
        customerCount: capacity ? Number(capacity) : 4,
        updatedAt: new Date().toISOString(),
      };
      tables.push(newTable);
      return ApiResponse.success(res, newTable, 'Tạo bàn thành công', 201);
    } catch (err: any) {
      return ApiResponse.error(res, 'CREATE_TABLE_ERROR', err.message, 500);
    }
  }
}
