import path from 'path';
import fs from 'fs';
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
   * csv giữ tương thích cũ. Hỗ trợ đầy đủ tiếng Việt có dấu, nhúng font Unicode và branding nhà hàng.
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
      
      const [preview, tenant, branch] = await Promise.all([
        ZReportService.calculateShiftPreview(tenantId, branchId, startTime),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { branding: true },
        }),
        prisma.branch.findUnique({
          where: { id: branchId },
        }),
      ]);

      const restaurantName = tenant?.name || 'HiAI-MenuGo';
      const branchName = branch?.name || '';
      const branchAddress = branch?.address || '';
      const fileBase = `z-report-${branchId}-${new Date().toISOString().slice(0, 10)}`;

      const rows: Array<[string, number]> = [
        ['Doanh thu tiền mặt', preview.cashRevenue ?? 0],
        ['Doanh thu VietQR', preview.qrRevenue ?? 0],
        ['Doanh thu thẻ', preview.cardRevenue ?? 0],
        ['Tổng doanh thu', preview.totalRevenue ?? 0],
        ['Số đơn hoàn thành', preview.orderCount ?? 0],
        ['Số món hủy', preview.voidedCount ?? 0],
        ['Giảm giá voucher', preview.totalDiscount ?? 0],
      ];

      if (format === 'excel' || format === 'xlsx') {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        wb.creator = restaurantName;
        const ws = wb.addWorksheet('Báo Cáo Kết Ca');
        ws.columns = [
          { header: 'Chỉ tiêu', key: 'label', width: 28 },
          { header: 'Giá trị', key: 'value', width: 22 },
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

        // Fetch branding logo nếu có URL hợp lệ (timeout 5s, fallback text cũ nếu lỗi)
        let logoBuffer: Buffer | null = null;
        const logoUrl = tenant?.branding?.logoUrl;
        if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://'))) {
          try {
            const logoRes = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
            if (logoRes.ok) {
              const arrayBuf = await logoRes.arrayBuffer();
              logoBuffer = Buffer.from(arrayBuf);
            }
          } catch (logoErr: any) {
            logger.warn(`[ZReport] Logo fetch failed, fallback to text: ${logoErr?.message}`);
          }
        }

        // Đăng ký font DejaVu Sans tiếng Việt
        const fontRegularPath = path.resolve(process.cwd(), 'assets/fonts/DejaVuSans.ttf');
        const fontBoldPath = path.resolve(process.cwd(), 'assets/fonts/DejaVuSans-Bold.ttf');
        const hasUnicodeFont = fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath);

        if (hasUnicodeFont) {
          doc.registerFont('DejaVuSans', fontRegularPath);
          doc.registerFont('DejaVuSans-Bold', fontBoldPath);
          doc.font('DejaVuSans');
        }

        // Vẽ logo góc trái header (fit ~40x40, giữ tỉ lệ)
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, 12, 12, { fit: [40, 40] });
          } catch (imgErr: any) {
            logger.warn(`[ZReport] PDF doc.image error, fallback to text: ${imgErr?.message}`);
            logoBuffer = null;
          }
        }

        // Header nhà hàng & chi nhánh
        if (hasUnicodeFont) {
          doc.font('DejaVuSans-Bold').fontSize(11).text(restaurantName, { align: 'center' });
          if (branchName) {
            doc.font('DejaVuSans').fontSize(8).text(branchName, { align: 'center' });
          }
          if (branchAddress) {
            doc.font('DejaVuSans').fontSize(7).text(branchAddress, { align: 'center' });
          }
          if (logoBuffer && doc.y < 56) {
            doc.y = 56;
          }
          doc.moveDown(0.3);
          doc.font('DejaVuSans-Bold').fontSize(10).text('BÁO CÁO KẾT CA (Z-REPORT)', { align: 'center' });
          doc.font('DejaVuSans').fontSize(7).text('----------------------------------------------------', { align: 'center' });
          doc.moveDown(0.4);

          // Nội dung báo cáo
          rows.forEach(([label, value]) => {
            const formattedVal = Number(value).toLocaleString('vi-VN');
            if (label === 'Tổng doanh thu') {
              doc.moveDown(0.2);
              doc.font('DejaVuSans-Bold').fontSize(9).text(`${label}: ${formattedVal} đ`);
              doc.font('DejaVuSans').fontSize(8);
              doc.moveDown(0.2);
            } else {
              const unit = label.includes('Số') ? '' : ' đ';
              doc.font('DejaVuSans').fontSize(8).text(`${label}: ${formattedVal}${unit}`);
            }
          });

          doc.moveDown(0.4);
          doc.font('DejaVuSans').fontSize(7).text('----------------------------------------------------', { align: 'center' });
          doc.fontSize(7).text(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
        } else {
          doc.fontSize(14).text('Z-REPORT', { align: 'center' });
          doc.moveDown(0.5);
          doc.fontSize(9);
          rows.forEach(([label, value]) => doc.text(`${label}: ${Number(value).toLocaleString('vi-VN')}`));
          doc.moveDown(0.5);
          doc.text(`Xuat luc: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
        }

        doc.end();
        const pdf = await done;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);
        return res.status(200).send(pdf);
      }

      // CSV fallback tương thích cũ.
      const csv = '\uFEFF' + [['Chỉ tiêu', 'Giá trị'], ...rows].map((r) => r.join(',')).join('\n');
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
