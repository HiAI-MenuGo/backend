import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { emitToBranch, emitToTable, SOCKET_EVENTS } from '../socket';
import { getTenantContext } from '../middlewares/tenantIsolation';

import { resolveTableScope } from '../utils/tableScope';

export interface TableItem {
  id: string;
  name: string;
  status: 'EMPTY' | 'OCCUPIED';
  branchId: string;
  customerCount?: number;
  scannedCustomerCount?: number;
  updatedAt: string;
}

let tables: TableItem[] = [
  { id: 'tbl-01', name: 'Bàn 01', status: 'EMPTY', branchId: 'default-branch', scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
  { id: 'tbl-02', name: 'Bàn 02', status: 'OCCUPIED', branchId: 'default-branch', customerCount: 3, scannedCustomerCount: 1, updatedAt: new Date().toISOString() },
  { id: 'tbl-03', name: 'Bàn 03', status: 'EMPTY', branchId: 'default-branch', scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
  { id: 'tbl-04', name: 'Bàn 04', status: 'EMPTY', branchId: 'default-branch', customerCount: 4, scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
  { id: 'tbl-05', name: 'Bàn 05', status: 'OCCUPIED', branchId: 'default-branch', customerCount: 2, scannedCustomerCount: 1, updatedAt: new Date().toISOString() },
  { id: 'tbl-06', name: 'Bàn 06', status: 'EMPTY', branchId: 'default-branch', scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
  { id: 'tbl-07', name: 'Bàn 07', status: 'EMPTY', branchId: 'default-branch', scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
  { id: 'tbl-08', name: 'Bàn 08', status: 'EMPTY', branchId: 'default-branch', scannedCustomerCount: 0, updatedAt: new Date().toISOString() },
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
          status: (t.status === 'RESERVED' ? 'OCCUPIED' : t.status) as 'EMPTY' | 'OCCUPIED',
          branchId: t.branchId,
          branchName: t.branch?.name,
          branchCode: t.branch?.code,
          customerCount: t.capacity,
          scannedCustomerCount: t.status === 'OCCUPIED' ? 1 : 0,
          updatedAt: t.updatedAt.toISOString(),
        }));
        return ApiResponse.success(res, formatted, 'Lấy danh sách bàn thành công');
      }

      // Fallback in-memory (dev): filter theo scope đã tính ở whereClause
      const fallbackBranch = (whereClause as any).branchId as string | undefined;
      const list = fallbackBranch ? tables.filter((t) => t.branchId === fallbackBranch) : tables;
      const listWithScanned = list.map(t => ({
        ...t,
        scannedCustomerCount: t.status === 'OCCUPIED' ? (t.scannedCustomerCount || 1) : 0,
      }));
      return ApiResponse.success(res, listWithScanned, 'Lấy danh sách bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_TABLES_ERROR', err.message, 500);
    }
  }

  /**
   * Chuyển trạng thái bàn sang OCCUPIED khi khách quét mã QR truy cập
   */
  static async occupyTableInternal(rawTableId: string, preferredBranchId?: string) {
    if (!rawTableId) return null;

    const scope = await resolveTableScope(rawTableId);
    const targetId = scope ? scope.tableId : rawTableId;
    const targetBranch = scope ? scope.branchId : (preferredBranchId || 'default-branch');

    let updatedTable: any = null;
    try {
      const dbTable = await prisma.table.update({
        where: { id: targetId },
        data: { status: 'OCCUPIED' },
      });
      updatedTable = {
        id: dbTable.id,
        name: dbTable.name,
        status: dbTable.status,
        branchId: dbTable.branchId,
        customerCount: dbTable.capacity,
        updatedAt: dbTable.updatedAt.toISOString(),
      };
    } catch {
      // Fallback in-memory
    }

    const table = tables.find((t) => t.id === targetId || t.id === rawTableId || t.name === rawTableId);
    if (table) {
      table.status = 'OCCUPIED';
      table.scannedCustomerCount = 1;
      table.updatedAt = new Date().toISOString();
      if (!updatedTable) {
        updatedTable = { ...table };
      }
    }

    if (!updatedTable) {
      updatedTable = { id: targetId, name: scope?.tableName || `Bàn ${targetId}`, status: 'OCCUPIED', branchId: targetBranch, scannedCustomerCount: 1, updatedAt: new Date().toISOString() };
    }

    emitToBranch(targetBranch, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
      tableId: targetId,
      status: 'OCCUPIED',
      scannedCustomerCount: 1,
      updatedAt: new Date().toISOString(),
    });

    return updatedTable;
  }

  /**
   * POST /api/tables/occupy (Public rate-limited)
   * Khách truy cập từ QR -> chuyển bàn sang trạng thái đang có khách
   */
  static async occupyTable(req: Request, res: Response) {
    try {
      const { tableId, branchId } = req.body;
      if (!tableId) {
        return ApiResponse.error(res, 'MISSING_TABLE_ID', 'Thiếu thông tin bàn', 400);
      }

      const result = await TableController.occupyTableInternal(tableId, branchId);
      return ApiResponse.success(res, result, 'Bàn đã chuyển sang trạng thái đang có khách');
    } catch (err: any) {
      return ApiResponse.error(res, 'OCCUPY_TABLE_ERROR', err.message, 500);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, branchId: bodyBranchId } = req.body;
      const { branchId, tenantId } = getTenantContext(req);
      const role = req.tenantContext?.role;
      const isPrivileged = role === 'ADMIN' || role === 'PLATFORM_ADMIN';

      if (!status || !['EMPTY', 'OCCUPIED'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái bàn không hợp lệ (chỉ hỗ trợ EMPTY hoặc OCCUPIED)', 400);
      }

      let updatedTable: any = null;
      let targetBranch = bodyBranchId || branchId;

      // 1. Tìm và cập nhật trong Prisma Database
      try {
        const whereClause: any = { id };
        if (tenantId) {
          whereClause.tenantId = tenantId;
        }
        if (!isPrivileged && branchId && branchId !== 'ALL' && branchId !== 'default-branch') {
          whereClause.branchId = branchId;
        }

        let owned = await prisma.table.findFirst({
          where: whereClause,
          select: { id: true, branchId: true },
        });

        // Nếu chưa thấy theo id, thử tìm theo name hoặc code
        if (!owned) {
          owned = await prisma.table.findFirst({
            where: {
              ...(tenantId ? { tenantId } : {}),
              OR: [{ name: id }, { code: id }],
            },
            select: { id: true, branchId: true },
          });
        }

        // Nếu vẫn chưa thấy và là admin, thử tìm chỉ theo id
        if (!owned && isPrivileged) {
          owned = await prisma.table.findFirst({
            where: { id },
            select: { id: true, branchId: true },
          });
        }

        if (owned) {
          const dbTable = await prisma.table.update({
            where: { id: owned.id },
            data: { status },
          });

          if (status === 'EMPTY') {
            try {
              await prisma.orderSession.updateMany({
                where: { tableId: owned.id, status: { in: ['OPEN', 'BILLING'] } },
                data: { status: 'CLOSED', closedAt: new Date() },
              });
            } catch {
              // ignore
            }
          }

          targetBranch = dbTable.branchId || targetBranch;
          updatedTable = {
            id: dbTable.id,
            name: dbTable.name,
            status: dbTable.status,
            branchId: dbTable.branchId,
            customerCount: dbTable.capacity,
            updatedAt: dbTable.updatedAt.toISOString(),
          };
        }
      } catch (dbErr) {
        // Fallback sang in-memory
      }

      // 2. Tra cứu & cập nhật trong in-memory (fallback dev hoặc seed mock)
      const memTable = tables.find((t) => t.id === id || t.name === id);
      if (memTable) {
        memTable.status = status;
        if (status === 'EMPTY') {
          memTable.scannedCustomerCount = 0;
        } else if (status === 'OCCUPIED') {
          memTable.scannedCustomerCount = memTable.scannedCustomerCount || 1;
        }
        memTable.updatedAt = new Date().toISOString();
        if (!updatedTable) {
          targetBranch = memTable.branchId || targetBranch;
          updatedTable = { ...memTable };
        }
      }

      // 3. Nếu cả DB và in-memory đều không tìm thấy
      if (!updatedTable) {
        return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn', 404);
      }

      // 4. Phát WebSocket cập nhật trạng thái bàn cho POS và Quản lý bàn
      emitToBranch(targetBranch || 'default-branch', SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: updatedTable.id,
        status,
        scannedCustomerCount: status === 'EMPTY' ? 0 : 1,
        updatedAt: new Date().toISOString(),
      });

      // Phát WebSocket cho phòng bàn (tất cả khách đang quét QR bàn đó) để đồng bộ và xóa cache
      emitToTable(updatedTable.id, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: updatedTable.id,
        status,
        scannedCustomerCount: status === 'EMPTY' ? 0 : 1,
        updatedAt: new Date().toISOString(),
      });

      if (status === 'EMPTY') {
        emitToTable(updatedTable.id, 'table:reset' as any, {
          tableId: updatedTable.id,
          status: 'EMPTY',
          updatedAt: new Date().toISOString(),
        });
      }

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

  /**
   * PATCH /api/tables/:id (ADMIN/MANAGER)
   * Cập nhật thông tin bàn (tên, sức chứa).
   * Tuyệt đối không cho phép đổi bàn qua chi nhánh khác để đảm bảo tính toàn vẹn dữ liệu chi nhánh.
   */
  static async updateTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, capacity, branchId: requestedBranchId } = req.body;
      const role = req.tenantContext?.role;

      if (role !== 'ADMIN' && role !== 'PLATFORM_ADMIN' && role !== 'MANAGER') {
        return ApiResponse.error(res, 'FORBIDDEN', 'Không có quyền cập nhật thông tin bàn', 403);
      }

      // Xoá bỏ / Chặn hoàn toàn tính năng đổi bàn qua chi nhánh khác ở Backend
      if (requestedBranchId) {
        return ApiResponse.error(
          res,
          'CANNOT_CHANGE_BRANCH',
          'Hệ thống không hỗ trợ đổi bàn sang chi nhánh khác. Bàn phải thuộc cố định một chi nhánh.',
          400
        );
      }

      let updatedTable: any = null;
      try {
        const updateData: any = {};
        if (name && typeof name === 'string') updateData.name = name.trim();
        if (capacity) updateData.capacity = Number(capacity);

        const dbTable = await prisma.table.update({
          where: { id },
          data: updateData,
          include: {
            branch: {
              select: { id: true, name: true, code: true },
            },
          },
        });

        updatedTable = {
          id: dbTable.id,
          name: dbTable.name,
          status: dbTable.status,
          branchId: dbTable.branchId,
          branchName: dbTable.branch?.name,
          branchCode: dbTable.branch?.code,
          customerCount: dbTable.capacity,
          updatedAt: dbTable.updatedAt.toISOString(),
        };
      } catch {
        // Fallback in-memory
      }

      const memTable = tables.find((t) => t.id === id || t.name === id);
      if (memTable) {
        if (name) memTable.name = name.trim();
        if (capacity) memTable.customerCount = Number(capacity);
        memTable.updatedAt = new Date().toISOString();
        if (!updatedTable) {
          updatedTable = { ...memTable };
        }
      }

      if (!updatedTable) {
        return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn', 404);
      }

      emitToBranch(updatedTable.branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: updatedTable.id,
        status: updatedTable.status,
        updatedAt: new Date().toISOString(),
      });

      return ApiResponse.success(res, updatedTable, 'Cập nhật thông tin bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_TABLE_ERROR', err.message, 500);
    }
  }
}
