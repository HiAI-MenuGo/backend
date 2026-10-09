import { Request, Response } from 'express';
import ApiResponse from '../utils/response';
import { emitToBranch, SOCKET_EVENTS } from '../socket';

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
      const branchId = (req.query.branchId as string) || 'default-branch';
      const dbTables = await prisma.table.findMany({
        where: branchId && branchId !== 'default-branch' ? { branchId } : undefined,
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
      });

      if (dbTables.length > 0) {
        const formatted = dbTables.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status as 'EMPTY' | 'OCCUPIED' | 'RESERVED',
          branchId: t.branchId || branchId,
          customerCount: t.capacity,
          updatedAt: t.updatedAt.toISOString(),
        }));
        return ApiResponse.success(res, formatted, 'Lấy danh sách bàn thành công');
      }

      const list = tables.filter((t) => t.branchId === branchId);
      return ApiResponse.success(res, list, 'Lấy danh sách bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_TABLES_ERROR', err.message, 500);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      if (!status || !['EMPTY', 'OCCUPIED', 'RESERVED'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái bàn không hợp lệ', 400);
      }

      try {
        await prisma.table.update({
          where: { id },
          data: { status },
        });
      } catch (e) {
        // fallback memory
      }

      const table = tables.find((t) => t.id === id);
      if (table) {
        table.status = status;
        table.updatedAt = new Date().toISOString();
      }

      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: id,
        status,
        updatedAt: new Date().toISOString(),
      });

      return ApiResponse.success(res, { id, status }, 'Cập nhật trạng thái bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_TABLE_STATUS_ERROR', err.message, 500);
    }
  }
}
