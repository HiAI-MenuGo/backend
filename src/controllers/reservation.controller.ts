import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import ApiResponse from '../utils/response';
import { getTenantContext } from '../middlewares/tenantIsolation';

export const getReservations = async (req: Request, res: Response) => {
  try {
    const { tenantId, branchId, role } = req.tenantContext!;
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        ...(role !== 'ADMIN' && role !== 'PLATFORM_ADMIN' ? { branchId } : {}),
      },
      include: {
        branch: { select: { name: true, code: true } },
        table: { select: { code: true, name: true } },
      },
      orderBy: { reservationAt: 'desc' },
    });
    return ApiResponse.success(res, reservations, 'Lấy danh sách đặt bàn thành công');
  } catch (err: any) {
    return ApiResponse.error(res, 'FETCH_RESERVATIONS_ERROR', err.message, 500);
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const { tenantId, branchId } = getTenantContext(req);
    const { tableId, customerName, phone, guestsCount, reservationAt, branchId: bodyBranch } = req.body;

    // Staff thường chỉ được đặt cho branch mình; ADMIN được chọn branch trong tenant
    let targetBranch = branchId;
    const role = req.tenantContext!.role;
    if (bodyBranch && bodyBranch !== branchId) {
      if (role !== 'ADMIN' && role !== 'PLATFORM_ADMIN') {
        return ApiResponse.error(res, 'FORBIDDEN', 'Không có quyền đặt bàn cho chi nhánh khác', 403);
      }
      const branch = await prisma.branch.findFirst({ where: { id: bodyBranch, tenantId } });
      if (!branch) {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      targetBranch = branch.id;
    }

    if (tableId) {
      const table = await prisma.table.findFirst({ where: { id: tableId, tenantId, branchId: targetBranch } });
      if (!table) {
        return ApiResponse.error(res, 'TABLE_NOT_FOUND', 'Bàn không tồn tại trong chi nhánh', 404);
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        tenantId,
        branchId: targetBranch,
        tableId: tableId || null,
        customerName,
        phone,
        guestsCount: guestsCount || 2,
        reservationAt: reservationAt ? new Date(reservationAt) : new Date(),
        status: 'PENDING',
      },
      include: {
        branch: { select: { name: true, code: true } },
        table: { select: { code: true, name: true } },
      },
    });
    return ApiResponse.success(res, reservation, 'Tạo đặt bàn thành công', 201);
  } catch (err: any) {
    return ApiResponse.error(res, 'CREATE_RESERVATION_ERROR', err.message, 500);
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const { status, note } = req.body;

    const owned = await prisma.reservation.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) {
      return ApiResponse.error(res, 'RESERVATION_NOT_FOUND', 'Không tìm thấy đặt bàn', 404);
    }
    const reservation = await prisma.reservation.update({
      where: { id: owned.id },
      data: { ...(status !== undefined ? { status } : {}), ...(note !== undefined ? { note } : {}) },
      include: {
        branch: { select: { name: true, code: true } },
        table: { select: { code: true, name: true } },
      },
    });
    return ApiResponse.success(res, reservation, 'Cập nhật đặt bàn thành công');
  } catch (err: any) {
    return ApiResponse.error(res, 'UPDATE_RESERVATION_ERROR', err.message, 500);
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const owned = await prisma.reservation.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) {
      return ApiResponse.error(res, 'RESERVATION_NOT_FOUND', 'Không tìm thấy đặt bàn', 404);
    }
    await prisma.reservation.delete({ where: { id: owned.id } });
    return ApiResponse.success(res, { deleted: true }, 'Xóa đặt bàn thành công');
  } catch (err: any) {
    return ApiResponse.error(res, 'DELETE_RESERVATION_ERROR', err.message, 500);
  }
};
