import { Request, Response } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';

export const overviewQuerySchema = z.object({
  query: z.object({
    branchId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD').optional(),
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
}
