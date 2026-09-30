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

export class TableController {
  static getTables(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || 'default-branch';
      const list = tables.filter((t) => t.branchId === branchId);
      return ApiResponse.success(res, list, 'Lấy danh sách bàn thành công');
    } catch (err: any) {
      return ApiResponse.error(res, 'FETCH_TABLES_ERROR', err.message, 500);
    }
  }

  static updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = (req.query.branchId as string) || (req.body.branchId as string) || 'default-branch';

      if (!status || !['EMPTY', 'OCCUPIED', 'RESERVED'].includes(status)) {
        return ApiResponse.error(res, 'INVALID_STATUS', 'Trạng thái bàn không hợp lệ', 400);
      }

      const table = tables.find((t) => t.id === id && t.branchId === branchId);
      if (!table) {
        return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Không tìm thấy bàn', 404);
      }

      table.status = status;
      table.updatedAt = new Date().toISOString();
      if (status === 'EMPTY') {
        table.currentSessionId = undefined;
        table.customerCount = undefined;
        table.totalAmount = undefined;
      }

      // Phát realtime cho toàn chi nhánh
      emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, {
        tableId: table.id,
        tableName: table.name,
        status: table.status,
        currentSessionId: table.currentSessionId,
        branchId,
      });

      return ApiResponse.success(res, table, `Cập nhật trạng thái bàn thành ${status}`);
    } catch (err: any) {
      return ApiResponse.error(res, 'UPDATE_TABLE_ERROR', err.message, 500);
    }
  }
}
