import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import ApiResponse from '../utils/response';
import logger from '../utils/logger';
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
      logger.error('zreport preview failed', { stack: error?.stack });
      return ApiResponse.error(res, 'PREVIEW_ERROR', 'Lỗi tính toán xem trước ca', 500);
    }
  }

  /** Alias spec: GET /api/z-report/shift-summary */
  static async getShiftSummary(req: Request, res: Response) {
    return ZReportController.getPreview(req, res);
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
      logger.error('zreport create failed', { stack: error?.stack });
      return ApiResponse.error(res, 'CREATE_ZREPORT_ERROR', 'Không thể tạo báo cáo chốt ca', 500);
    }
  }

  /** Alias spec: POST /api/z-report/close-shift */
  static async closeShift(req: Request, res: Response) {
    return ZReportController.createReport(req, res);
  }

  /**
   * GET /api/z-report/export?format=pdf|excel|csv&branchId=&startTime=
   * Xuất báo cáo ca native: excel = .xlsx (exceljs), pdf = .pdf (pdfkit),
   * csv giữ tương thích cũ.
   */
  static async exportReport(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const branchId = (req.query.branchId as string) || req.user?.branchId;
      if (!tenantId || !branchId) {
        return ApiResponse.error(res, 'MISSING_PARAMS', 'Thiếu thông tin chi nhánh', 400);
      }
      const format = String(req.query.format || 'excel').toLowerCase();
      const startTimeStr = req.query.startTime as string;
      const startTime = startTimeStr ? new Date(startTimeStr) : new Date(new Date().setHours(0, 0, 0, 0));
      const preview = await ZReportService.calculateShiftPreview(tenantId, branchId, startTime);
      const fileBase = `z-report-${branchId}-${new Date().toISOString().slice(0, 10)}`;
      const rows: Array<[string, number]> = [
        ['Doanh thu tien mat', preview.cashRevenue ?? 0],
        ['Doanh thu VietQR', preview.qrRevenue ?? 0],
        ['Doanh thu the', preview.cardRevenue ?? 0],
        ['Tong doanh thu', preview.totalRevenue ?? 0],
        ['So don hoan thanh', preview.orderCount ?? 0],
        ['So mon huy', preview.voidedCount ?? 0],
        ['Giam gia voucher', preview.totalDiscount ?? 0],
      ];

      if (format === 'excel' || format === 'xlsx') {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'HiAI-MenuGo';
        const ws = wb.addWorksheet('Z-Report');
        ws.columns = [
          { header: 'Chi tieu', key: 'label', width: 28 },
          { header: 'Gia tri', key: 'value', width: 20 },
        ];
        rows.forEach(([label, value]) => ws.addRow({ label, value }));
        ws.getRow(1).font = { bold: true };
        const buf = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.xlsx"`);
        return res.status(200).send(Buffer.from(buf));
      }

      if (format === 'pdf') {
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ size: [226, 600], margin: 12 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
        doc.fontSize(14).text('Z-REPORT', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(9);
        rows.forEach(([label, value]) => doc.text(`${label}: ${Number(value).toLocaleString('vi-VN')}`));
        doc.moveDown(0.5);
        doc.text(`Xuat luc: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
        doc.end();
        const pdf = await done;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);
        return res.status(200).send(pdf);
      }

      // CSV fallback tương thích cũ.
      const csv = '\uFEFF' + [['Chi tieu', 'Gia tri'], ...rows].map((r) => r.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.csv"`);
      return res.status(200).send(csv);
    } catch (error: any) {
      logger.error('zreport export failed', { stack: error?.stack });
      return ApiResponse.error(res, 'EXPORT_ERROR', 'Lỗi xuất báo cáo kết ca', 500);
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
      logger.error('zreport history failed', { stack: error?.stack });
      return ApiResponse.error(res, 'HISTORY_ERROR', 'Lỗi truy vấn lịch sử kết ca', 500);
    }
  }
}

export default ZReportController;
