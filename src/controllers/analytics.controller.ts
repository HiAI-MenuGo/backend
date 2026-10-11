import { Request, Response } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

const flexibleDateSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    const match = val.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m}-${d}`;
    }
    return val;
  })
  .refine(
    (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
    { message: 'Định dạng ngày phải là YYYY-MM-DD hoặc DD-MM-YYYY' }
  );

export const overviewQuerySchema = z.object({
  query: z.object({
    branchId: z.string().optional(),
    date: flexibleDateSchema,
  }),
});

export const revenueQuerySchema = z.object({
  query: z.object({
    branchId: z.string().optional(),
    startDate: flexibleDateSchema,
    endDate: flexibleDateSchema,
  }),
});

export class AnalyticsController {
  /**
   * GET /api/analytics/overview
   * Lấy tổng quan KPIs, xu hướng doanh thu theo giờ và top món bán chạy.
   */
  static async getOverview(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      const date = req.query.date as string | undefined;
      const tenantId = req.user?.tenantId;

      const overview = await AnalyticsService.getOverview({
        branchId,
        date,
        tenantId,
      });

      return ApiResponse.success(res, overview, 'Lấy dữ liệu phân tích hoạt động kinh doanh thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      logger.error('Analytics getOverview error:', { error: err.message, stack: err.stack });
      return ApiResponse.error(res, 'FETCH_ANALYTICS_ERROR', 'Lỗi khi lấy dữ liệu phân tích', 500);
    }
  }

  /**
   * GET /api/analytics/revenue
   * Lấy báo cáo chi tiết doanh thu theo khoảng ngày.
   */
  static async getRevenueReport(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const tenantId = req.user?.tenantId;

      const report = await AnalyticsService.getRevenueReport({
        branchId,
        startDate,
        endDate,
        tenantId,
      });

      return ApiResponse.success(res, report, 'Lấy báo cáo doanh thu thành công');
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      logger.error('Analytics getRevenueReport error:', { error: err.message, stack: err.stack });
      return ApiResponse.error(res, 'FETCH_REVENUE_ERROR', 'Lỗi khi lấy báo cáo doanh thu', 500);
    }
  }

  /**
   * GET /api/analytics/revenue/export
   * Xuất báo cáo doanh thu ra file Excel (.xlsx) theo khoảng ngày.
   */
  static async exportRevenueExcel(req: Request, res: Response) {
    try {
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const tenantId = req.user?.tenantId;

      const report = await AnalyticsService.getRevenueReport({
        branchId,
        startDate,
        endDate,
        tenantId,
      });

      const buffer = await AnalyticsService.generateRevenueExcel(report);
      const filename = `Bao-cao-doanh-thu-${report.dateRange.startDate}_den_${report.dateRange.endDate}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.status(200).send(buffer);
    } catch (err: any) {
      if (err.errorCode === 'BRANCH_NOT_FOUND' || err.message === 'BRANCH_NOT_FOUND') {
        return ApiResponse.error(res, 'BRANCH_NOT_FOUND', 'Chi nhánh không tồn tại', 404);
      }
      logger.error('Analytics exportRevenueExcel error:', { error: err.message, stack: err.stack });
      return ApiResponse.error(res, 'EXPORT_REVENUE_ERROR', 'Lỗi khi xuất file Excel báo cáo doanh thu', 500);
    }
  }
}
