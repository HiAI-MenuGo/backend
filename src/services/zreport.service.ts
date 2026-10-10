import prisma from '../utils/prisma';

export interface CreateZReportInput {
  tenantId: string;
  branchId: string;
  userId: string;
  shiftName: string;
  startTime: Date;
  endTime?: Date;
  openingCash: number;
  actualCash: number;
  note?: string;
}

export class ZReportService {
  /**
   * Tính toán số liệu ca làm việc hiện tại trước khi chốt
   */
  static async calculateShiftPreview(tenantId: string, branchId: string, startTime: Date, endTime: Date = new Date()) {
    // 1. Lấy tất cả giao dịch thanh toán trong khoảng thời gian của branch
    const sessions = await prisma.orderSession.findMany({
      where: {
        tenantId,
        branchId,
        openedAt: { gte: startTime, lte: endTime },
        status: 'CLOSED',
      },
      include: {
        transactions: {
          where: { status: 'PAID' },
        },
        orders: true,
      },
    });

    let cashRevenue = 0;
    let qrRevenue = 0;
    const cardRevenue = 0;
    let totalDiscount = 0;
    let orderCount = 0;

    for (const s of sessions) {
      totalDiscount += s.discountAmount;
      orderCount += s.orders.length;
      for (const t of s.transactions) {
        if (t.method === 'CASH') cashRevenue += t.amount;
        else if (t.method === 'VIETQR') qrRevenue += t.amount;
      }
    }

    const totalRevenue = cashRevenue + qrRevenue;

    // Đếm số đơn bị hủy trong ca
    const voidedCount = await prisma.order.count({
      where: {
        tenantId,
        branchId,
        createdAt: { gte: startTime, lte: endTime },
        status: 'CANCELLED',
      },
    });

    return {
      startTime,
      endTime,
      cashRevenue,
      qrRevenue,
      cardRevenue,
      totalDiscount,
      totalRevenue,
      orderCount,
      voidedCount,
    };
  }

  /**
   * Tạo bản ghi Z-Report chính thức và lưu vào database
   */
  static async createZReport(input: CreateZReportInput) {
    const endTime = input.endTime || new Date();
    const stats = await this.calculateShiftPreview(
      input.tenantId,
      input.branchId,
      input.startTime,
      endTime
    );

    const expectedCash = input.openingCash + stats.cashRevenue;
    const discrepancy = input.actualCash - expectedCash;

    const report = await prisma.zReport.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        userId: input.userId,
        shiftName: input.shiftName,
        startTime: input.startTime,
        endTime,
        openingCash: input.openingCash,
        cashRevenue: stats.cashRevenue,
        qrRevenue: stats.qrRevenue,
        cardRevenue: stats.cardRevenue,
        totalDiscount: stats.totalDiscount,
        totalRevenue: stats.totalRevenue,
        orderCount: stats.orderCount,
        voidedCount: stats.voidedCount,
        actualCash: input.actualCash,
        discrepancy,
        note: input.note,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return report;
  }
}

export default ZReportService;
