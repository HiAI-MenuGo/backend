import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import ZReportService from '../services/zreport.service';

export class ZReportController {
  /**
   * GET /api/z-report/preview
   * Xem trước số liệu ca làm việc trước khi thực hiện chốt
   */
  static async getPreview(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      const startTimeStr = req.query.startTime as string;

      if (!tenantId || !branchId) {
        return ApiResponse.error(res, 'MISSING_PARAMS', 'Thiếu thông tin chi nhánh', 400);
      }

      const startTime = startTimeStr ? new Date(startTimeStr) : new Date(new Date().setHours(0, 0, 0, 0));
      const preview = await ZReportService.calculateShiftPreview(tenantId, branchId, startTime);

      return ApiResponse.success(res, preview, 'Số liệu xem trước ca làm việc');
    } catch (error: any) {
      return ApiResponse.error(res, 'PREVIEW_ERROR', error.message || 'Lỗi tính toán xem trước ca', 500);
    }
  }

  /**
   * POST /api/z-report
   * Thực hiện chốt ca làm việc và lưu Z-Report
   */
  static async createReport(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const branchId = req.body.branchId || req.user?.branchId;
      const { shiftName, startTime, openingCash = 0, actualCash = 0, note } = req.body;

      if (!tenantId || !userId || !branchId || !shiftName || !startTime) {
        return ApiResponse.error(
          res,
          'MISSING_FIELDS',
          'Vui lòng điền đủ tên ca, thời gian bắt đầu và số tiền thực tế',
          400
        );
      }

      const report = await ZReportService.createZReport({
        tenantId,
        branchId,
        userId,
        shiftName,
        startTime: new Date(startTime),
        openingCash: Number(openingCash),
        actualCash: Number(actualCash),
        note,
      });

      return ApiResponse.success(res, report, 'Chốt ca làm việc thành công', 201);
    } catch (error: any) {
      return ApiResponse.error(res, 'CREATE_ZREPORT_ERROR', error.message || 'Không thể tạo báo cáo chốt ca', 500);
    }
  }

  /**
   * GET /api/z-report/history
   * Lịch sử các báo cáo Z-Report đã chốt
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId;

      if (!tenantId) {
        return ApiResponse.error(res, 'UNAUTHORIZED', 'Thiếu thông tin tenant', 401);
      }

      const where: any = { tenantId };
      if (branchId) where.branchId = branchId;

      const reports = await prisma.zReport.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return ApiResponse.success(res, reports, 'Lịch sử báo cáo kết ca');
    } catch (error: any) {
      return ApiResponse.error(res, 'HISTORY_ERROR', error.message || 'Lỗi truy vấn lịch sử kết ca', 500);
    }
  }
}

export default ZReportController;
