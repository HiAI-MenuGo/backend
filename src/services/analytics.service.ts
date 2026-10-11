import { prisma } from '../utils/prisma';

/**
 * ==========================================
 * TIMEZONE HELPERS - GMT+7 (Asia/Ho_Chi_Minh)
 * ==========================================
 * All date boundaries for reporting/analytics must use GMT+7
 * to match business hours in Vietnam.
 */

export interface OverviewInput {
  branchId?: string;
  date?: string;
  tenantId?: string;
}

/**
 * Parse YYYY-MM-DD string as GMT+7 date and return start of day (00:00:00.000 GMT+7)
 */
function getGMT7StartOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Create date in GMT+7 by constructing local components
  // Since process.env.TZ = 'Asia/Ho_Chi_Minh', new Date(y, m-1, d) will be GMT+7
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Parse YYYY-MM-DD string as GMT+7 date and return end of day (23:59:59.999 GMT+7)
 */
function getGMT7EndOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/**
 * Get today's date string in GMT+7 (YYYY-MM-DD)
 */
function getGMT7TodayString(): string {
  const now = new Date();
  // With TZ=Asia/Ho_Chi_Minh, getFullYear/getMonth/getDate return GMT+7 values
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get yesterday's date string in GMT+7 (YYYY-MM-DD)
 */
function getGMT7YesterdayString(): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
}

/**
 * Get hour in GMT+7 from a Date (stored as UTC in DB)
 */
function getGMT7Hour(date: Date): number {
  const gmt7 = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return gmt7.getHours();
}

/**
 * Get date string (YYYY-MM-DD) in GMT+7 from a Date (stored as UTC in DB)
 */
function getGMT7DateString(date: Date): string {
  const gmt7 = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return `${gmt7.getFullYear()}-${String(gmt7.getMonth() + 1).padStart(2, '0')}-${String(gmt7.getDate()).padStart(2, '0')}`;
}

function getHourlySlotIndex(hour: number): number {
  if (hour < 9) return 0; // 08:00
  if (hour < 11) return 1; // 10:00
  if (hour < 13) return 2; // 12:00
  if (hour < 15) return 3; // 14:00
  if (hour < 17) return 4; // 16:00
  if (hour < 19) return 5; // 18:00
  if (hour < 21) return 6; // 20:00
  return 7; // 22:00
}

export interface HourlyTrendPoint {
  time: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  name: string;
  soldCount: number;
  revenue: number;
  category: string;
}

export interface RevenueReportInput {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  tenantId?: string;
}

export interface RevenueDailyItem {
  date: string;
  orders: number;
  revenue: number;
  cash: number;
  vietqr: number;
  discount: number;
}

export interface RevenueReportData {
  branch: {
    id: string;
    name: string;
    code: string;
  };
  tenantName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    previousRevenue: number;
    growthPercent: number;
    orderCount: number;
    avgOrderValue: number;
    cashRevenue: number;
    qrRevenue: number;
    totalDiscount: number;
  };
  dailyTrend: RevenueDailyItem[];
  paymentBreakdown: Array<{
    method: string;
    label: string;
    amount: number;
    percentage: number;
  }>;
  topItems: TopSellingItem[];
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    count: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderCode: string;
    tableName: string;
    createdAt: string;
    totalAmount: number;
    paymentMethod: string;
    status: string;
  }>;
}

export interface AnalyticsOverview {
  branch: {
    id: string;
    name: string;
    code: string;
  };
  date: string;
  kpis: {
    revenue: {
      today: number;
      yesterday: number;
      growthPercent: number;
    };
    orders: {
      count: number;
      avgOrderValue: number;
    };
    vietqr: {
      sharePercent: number;
      totalAmount: number;
    };
    tables: {
      occupied: number;
      total: number;
      pendingKitchen: number;
    };
  };
  hourlyTrend: HourlyTrendPoint[];
  topItems: TopSellingItem[];
}

/**
 * Phân giải branchId và tenantId từ CSDL.
 * Chặn IDOR: đối chiếu tenantId của token người dùng.
 */
async function resolveBranch(branchId?: string, userTenantId?: string) {
  if (branchId === 'ALL') {
    let tenant = null;
    if (userTenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: userTenantId },
      });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst();
    }
    const tenantId = tenant?.id || userTenantId || 'tenant-default';
    return {
      id: 'ALL',
      tenantId: tenantId,
      name: 'Tổng chi nhánh (Toàn công ty)',
      code: 'ALL',
      address: 'Toàn hệ thống',
      phone: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  let branch = null;

  if (branchId && branchId !== 'default-branch') {
    branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
  }

  if (!branch && (!branchId || branchId === 'default-branch')) {
    branch = await prisma.branch.findFirst({
      where: {
        isActive: true,
        ...(userTenantId ? { tenantId: userTenantId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!branch) {
    const err = new Error('BRANCH_NOT_FOUND');
    (err as any).statusCode = 404;
    (err as any).errorCode = 'BRANCH_NOT_FOUND';
    throw err;
  }

  if (userTenantId && branch.tenantId !== userTenantId) {
    const err = new Error('BRANCH_NOT_FOUND');
    (err as any).statusCode = 404;
    (err as any).errorCode = 'BRANCH_NOT_FOUND';
    throw err;
  }

  return branch;
}

export class AnalyticsService {
  /**
   * Tính toán toàn bộ KPI và biểu đồ phân tích dựa trên dữ liệu thật từ Prisma.
   */
  static async getOverview(input: OverviewInput): Promise<AnalyticsOverview> {
    const branch = await resolveBranch(input.branchId, input.tenantId);

    // Tính mốc thời gian hôm nay và hôm qua theo GMT+7 (Asia/Ho_Chi_Minh)
    const targetDateStr = input.date || getGMT7TodayString();
    const yesterdayDateStr = getGMT7YesterdayString();

    const startOfDay = getGMT7StartOfDay(targetDateStr);
    const endOfDay = getGMT7EndOfDay(targetDateStr);
    const startOfYesterday = getGMT7StartOfDay(yesterdayDateStr);
    const endOfYesterday = getGMT7EndOfDay(yesterdayDateStr);

    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    // 1. Doanh thu từ OrderSession CLOSED hôm nay và hôm qua (lọc theo closedAt, fallback openedAt)
    const [closedSessionsToday, closedSessionsYesterday] = await Promise.all([
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          status: 'CLOSED',
          OR: [
            { closedAt: { gte: startOfDay, lte: endOfDay } },
            { closedAt: null, openedAt: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        include: {
          orders: true,
        },
      }),
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          status: 'CLOSED',
          OR: [
            { closedAt: { gte: startOfYesterday, lte: endOfYesterday } },
            { closedAt: null, openedAt: { gte: startOfYesterday, lte: endOfYesterday } },
          ],
        },
        select: {
          finalAmount: true,
        },
      }),
    ]);

    const revenueToday = closedSessionsToday.reduce((sum, s) => sum + s.finalAmount, 0);
    const revenueYesterday = closedSessionsYesterday.reduce((sum, s) => sum + s.finalAmount, 0);

    let revenueGrowth = 0;
    if (revenueYesterday > 0) {
      revenueGrowth = Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 1000) / 10;
    } else if (revenueToday > 0) {
      revenueGrowth = 100;
    }

    // 2. Số lượng hóa đơn (Order không bị CANCELLED trong ngày theo createdAt)
    const orderCount = await prisma.order.count({
      where: {
        tenantId: branch.tenantId,
        ...branchFilter,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
    });

    const avgOrderValue = orderCount > 0 ? Math.round(revenueToday / orderCount) : 0;

    // 3. Tỷ lệ thanh toán VietQR trên các PaymentTransaction PAID (lọc theo paidAt, fallback createdAt)
    const paidTransactions = await prisma.paymentTransaction.findMany({
      where: {
        status: 'PAID',
        session: {
          tenantId: branch.tenantId,
          ...branchFilter,
        },
        OR: [
          { paidAt: { gte: startOfDay, lte: endOfDay } },
          { paidAt: null, createdAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
      select: {
        amount: true,
        method: true,
      },
    });

    const totalPaidAmount = paidTransactions.reduce((acc, t) => acc + t.amount, 0);
    const vietqrPaidAmount = paidTransactions
      .filter((t) => t.method === 'VIETQR')
      .reduce((acc, t) => acc + t.amount, 0);
    const qrShare = totalPaidAmount > 0 ? Math.round((vietqrPaidAmount / totalPaidAmount) * 1000) / 10 : 0;

    // 4. Bàn đang mở (OCCUPIED / tổng ACTIVE)
    const [occupiedTables, totalActiveTables] = await Promise.all([
      prisma.table.count({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          isActive: true,
          status: 'OCCUPIED',
        },
      }),
      prisma.table.count({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          isActive: true,
        },
      }),
    ]);

    // 5. Số món đang chờ bếp nấu (OrderItem PENDING / PREPARING thuộc Order chưa DONE/CANCELLED)
    const pendingKitchenCount = await prisma.orderItem.count({
      where: {
        order: {
          tenantId: branch.tenantId,
          ...branchFilter,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        status: { in: ['PENDING', 'PREPARING'] },
      },
    });

    // 6. Xu hướng doanh thu 8 khung giờ (08, 10, 12, 14, 16, 18, 20, 22h theo closedAt fallback openedAt)
    const hourlyTrend: HourlyTrendPoint[] = [
      { time: '08:00', revenue: 0, orders: 0 },
      { time: '10:00', revenue: 0, orders: 0 },
      { time: '12:00', revenue: 0, orders: 0 },
      { time: '14:00', revenue: 0, orders: 0 },
      { time: '16:00', revenue: 0, orders: 0 },
      { time: '18:00', revenue: 0, orders: 0 },
      { time: '20:00', revenue: 0, orders: 0 },
      { time: '22:00', revenue: 0, orders: 0 },
    ];

    for (const session of closedSessionsToday) {
      const timestamp = session.closedAt || session.openedAt;
      const h = getGMT7Hour(timestamp);
      const idx = getHourlySlotIndex(h);
      hourlyTrend[idx].revenue += session.finalAmount;
      hourlyTrend[idx].orders += session.orders?.length ?? 0;
    }

    // 7. Top 5 món bán chạy nhất trong ngày (loại cả order CANCELLED và OrderItem CANCELLED lẻ)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        status: { not: 'CANCELLED' },
        order: {
          tenantId: branch.tenantId,
          ...branchFilter,
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    const itemMap = new Map<string, TopSellingItem>();
    for (const it of orderItems) {
      const existing = itemMap.get(it.menuItemId);
      if (!existing) {
        itemMap.set(it.menuItemId, {
          name: it.menuItem?.name || it.itemName,
          category: it.menuItem?.category?.name || 'Khác',
          soldCount: it.quantity,
          revenue: it.totalPrice,
        });
      } else {
        existing.soldCount += it.quantity;
        existing.revenue += it.totalPrice;
      }
    }

    const topItems: TopSellingItem[] = Array.from(itemMap.values())
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
      },
      date: targetDateStr,
      kpis: {
        revenue: {
          today: revenueToday,
          yesterday: revenueYesterday,
          growthPercent: revenueGrowth,
        },
        orders: {
          count: orderCount,
          avgOrderValue,
        },
        vietqr: {
          sharePercent: qrShare,
          totalAmount: vietqrPaidAmount,
        },
        tables: {
          occupied: occupiedTables,
          total: totalActiveTables,
          pendingKitchen: pendingKitchenCount,
        },
      },
      hourlyTrend,
      topItems,
    };
  }

  /**
   * Tính toán báo cáo doanh thu theo khoảng ngày, bao gồm KPI, xu hướng hàng ngày,
   * phân bổ phương thức thanh toán, top món và danh sách đơn hàng.
   */
  static async getRevenueReport(input: RevenueReportInput): Promise<RevenueReportData> {
    const branch = await resolveBranch(input.branchId, input.tenantId);

    // Sử dụng GMT+7 cho tất cả ranh giới ngày
    const todayStr = getGMT7TodayString();

    let startDateStr: string;
    let endDateStr: string;

    if (input.startDate) {
      startDateStr = input.startDate;
    } else {
      // Mặc định 30 ngày trước (bao gồm hôm nay)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    }

    if (input.endDate) {
      endDateStr = input.endDate;
    } else {
      endDateStr = todayStr;
    }

    const startOfDay = getGMT7StartOfDay(startDateStr);
    const endOfDay = getGMT7EndOfDay(endDateStr);

    // Tính khoảng thời gian so sánh (kỳ trước)
    const periodMs = endOfDay.getTime() - startOfDay.getTime();
    const prevStartOfDay = new Date(startOfDay.getTime() - periodMs);
    const prevEndOfDay = new Date(startOfDay.getTime() - 1);

    const branchFilter = branch.id !== 'ALL' ? { branchId: branch.id } : {};

    const [closedSessions, prevSessions, tenant] = await Promise.all([
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          status: 'CLOSED',
          OR: [
            { closedAt: { gte: startOfDay, lte: endOfDay } },
            { closedAt: null, openedAt: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' } },
            include: {
              items: {
                where: { status: { not: 'CANCELLED' } },
                include: {
                  menuItem: {
                    include: { category: true },
                  },
                },
              },
            },
          },
          transactions: {
            where: { status: 'PAID' },
          },
          table: {
            select: { name: true },
          },
        },
        orderBy: { closedAt: 'desc' },
      }),
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          ...branchFilter,
          status: 'CLOSED',
          OR: [
            { closedAt: { gte: prevStartOfDay, lte: prevEndOfDay } },
            { closedAt: null, openedAt: { gte: prevStartOfDay, lte: prevEndOfDay } },
          ],
        },
        select: { finalAmount: true },
      }),
      prisma.tenant.findUnique({
        where: { id: branch.tenantId },
        select: { name: true },
      }),
    ]);

    let totalRevenue = 0;
    let cashRevenue = 0;
    let qrRevenue = 0;
    let totalDiscount = 0;
    let orderCount = 0;

    const dailyMap = new Map<string, RevenueDailyItem>();
    // Initialize daily map for each day in range (GMT+7)
    const startCursor = getGMT7StartOfDay(startDateStr);
    const endCursor = getGMT7StartOfDay(endDateStr);
    const cursor = new Date(startCursor);
    while (cursor <= endCursor) {
      const dStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      dailyMap.set(dStr, {
        date: dStr,
        orders: 0,
        revenue: 0,
        cash: 0,
        vietqr: 0,
        discount: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const itemMap = new Map<string, TopSellingItem>();
    const catMap = new Map<string, { revenue: number; count: number }>();
    const recentOrders: Array<{
      id: string;
      orderCode: string;
      tableName: string;
      createdAt: string;
      totalAmount: number;
      paymentMethod: string;
      status: string;
    }> = [];

    for (const session of closedSessions) {
      const sTimestamp = session.closedAt || session.openedAt;
      const sDateStr = getGMT7DateString(sTimestamp);
      const dayItem = dailyMap.get(sDateStr);

      totalRevenue += session.finalAmount;
      totalDiscount += session.discountAmount;
      orderCount += session.orders.length;

      if (dayItem) {
        dayItem.revenue += session.finalAmount;
        dayItem.discount += session.discountAmount;
        dayItem.orders += session.orders.length;
      }

      let primaryMethod = 'CASH';
      if (session.transactions && session.transactions.length > 0) {
        for (const tx of session.transactions) {
          if (tx.method === 'VIETQR') {
            qrRevenue += tx.amount;
            if (dayItem) dayItem.vietqr += tx.amount;
            primaryMethod = 'VIETQR';
          } else {
            cashRevenue += tx.amount;
            if (dayItem) dayItem.cash += tx.amount;
            primaryMethod = 'CASH';
          }
        }
      } else {
        cashRevenue += session.finalAmount;
        if (dayItem) dayItem.cash += session.finalAmount;
        primaryMethod = 'CASH';
      }

      for (const ord of session.orders) {
        recentOrders.push({
          id: ord.id,
          orderCode: ord.orderCode,
          tableName: session.table?.name || 'Mang về',
          createdAt: ord.createdAt.toISOString(),
          totalAmount: ord.totalAmount,
          paymentMethod: primaryMethod,
          status: ord.status,
        });

        for (const it of ord.items) {
          const catName = it.menuItem?.category?.name || 'Khác';
          const exItem = itemMap.get(it.menuItemId);
          if (!exItem) {
            itemMap.set(it.menuItemId, {
              name: it.menuItem?.name || it.itemName,
              category: catName,
              soldCount: it.quantity,
              revenue: it.totalPrice,
            });
          } else {
            exItem.soldCount += it.quantity;
            exItem.revenue += it.totalPrice;
          }

          const exCat = catMap.get(catName);
          if (!exCat) {
            catMap.set(catName, { revenue: it.totalPrice, count: it.quantity });
          } else {
            exCat.revenue += it.totalPrice;
            exCat.count += it.quantity;
          }
        }
      }
    }

    const prevRevenue = prevSessions.reduce((sum, s) => sum + s.finalAmount, 0);
    let growthPercent = 0;
    if (prevRevenue > 0) {
      growthPercent = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10;
    } else if (totalRevenue > 0) {
      growthPercent = 100;
    }

    const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const totalPayments = cashRevenue + qrRevenue || totalRevenue || 1;

    const paymentBreakdown = [
      {
        method: 'VIETQR',
        label: 'VietQR / Chuyển khoản',
        amount: qrRevenue,
        percentage: Math.round((qrRevenue / totalPayments) * 1000) / 10,
      },
      {
        method: 'CASH',
        label: 'Tiền mặt',
        amount: cashRevenue,
        percentage: Math.round((cashRevenue / totalPayments) * 1000) / 10,
      },
    ];

    const topItems: TopSellingItem[] = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, val]) => ({
        category,
        revenue: val.revenue,
        count: val.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
      },
      tenantName: tenant?.name || 'HiAI-MenuGo Restaurant',
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
      summary: {
        totalRevenue,
        previousRevenue: prevRevenue,
        growthPercent,
        orderCount,
        avgOrderValue,
        cashRevenue,
        qrRevenue,
        totalDiscount,
      },
      dailyTrend: Array.from(dailyMap.values()),
      paymentBreakdown,
      topItems,
      categoryBreakdown,
      recentOrders: recentOrders.slice(0, 100),
    };
  }

  /**
   * Xuất báo cáo doanh thu ra file Excel (.xlsx) với định dạng chuyên nghiệp,
   * bao gồm các bảng thống kê chỉ số, bảng doanh thu theo ngày, danh sách đơn hàng và top món.
   */
  static async generateRevenueExcel(report: RevenueReportData): Promise<Buffer> {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HiAI MenuGo';
    wb.created = new Date();

    const emeraldFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00A389' },
    };
    const headerFont: any = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const totalFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F7F4' },
    };
    const totalFont: any = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FF007A65' },
    };

    // Sheet 1: Doanh Thu Theo Ngày
    const ws1 = wb.addWorksheet('Doanh Thu Theo Ngày');
    ws1.views = [{ showGridLines: true }];

    ws1.mergeCells('A1:H1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = 'BÁO CÁO DOANH THU KINH DOANH';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF00A389' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 30;

    ws1.mergeCells('A2:H2');
    const infoCell1 = ws1.getCell('A2');
    infoCell1.value = `Nhà hàng: ${report.tenantName} | Chi nhánh: ${report.branch.name} (${report.branch.code})`;
    infoCell1.font = { name: 'Arial', size: 11, italic: true };
    infoCell1.alignment = { horizontal: 'center' };

    ws1.mergeCells('A3:H3');
    const infoCell2 = ws1.getCell('A3');
    infoCell2.value = `Khoảng ngày: Từ ${report.dateRange.startDate} đến ${report.dateRange.endDate}`;
    infoCell2.font = { name: 'Arial', size: 11, bold: true };
    infoCell2.alignment = { horizontal: 'center' };

    ws1.mergeCells('A4:H4');
    const infoCell3 = ws1.getCell('A4');
    infoCell3.value = `Thời điểm xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;
    infoCell3.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
    infoCell3.alignment = { horizontal: 'center' };

    ws1.addRow([]);
    const kpiHeader = ws1.addRow(['CHỈ TIÊU TỔNG HỢP', 'GIÁ TRỊ']);
    kpiHeader.font = { bold: true };
    ws1.addRow(['Tổng doanh thu thực nhận', report.summary.totalRevenue]);
    ws1.addRow(['Doanh thu thanh toán VietQR', report.summary.qrRevenue]);
    ws1.addRow(['Doanh thu tiền mặt', report.summary.cashRevenue]);
    ws1.addRow(['Tổng số đơn hoàn thành', report.summary.orderCount]);
    ws1.addRow(['Giá trị đơn trung bình (AOV)', report.summary.avgOrderValue]);
    ws1.addRow(['Tổng giảm giá / Voucher', report.summary.totalDiscount]);

    for (let r = 7; r <= 12; r++) {
      ws1.getCell(`B${r}`).numFmt = '#,##0';
    }

    ws1.addRow([]);
    ws1.addRow(['CHI TIẾT DOANH THU TỪNG NGÀY']);
    ws1.getCell('A14').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };

    const headersDaily = ['STT', 'Ngày', 'Số đơn', 'Tiền mặt (đ)', 'VietQR (đ)', 'Giảm giá (đ)', 'Tổng doanh thu (đ)'];
    const headerRowDaily = ws1.addRow(headersDaily);
    headerRowDaily.height = 25;
    headerRowDaily.eachCell((cell) => {
      cell.fill = emeraldFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let stt = 1;
    let sumOrders = 0;
    let sumCash = 0;
    let sumQr = 0;
    let sumDiscount = 0;
    let sumRevenue = 0;

    for (const d of report.dailyTrend) {
      sumOrders += d.orders;
      sumCash += d.cash;
      sumQr += d.vietqr;
      sumDiscount += d.discount;
      sumRevenue += d.revenue;

      const row = ws1.addRow([
        stt++,
        d.date,
        d.orders,
        d.cash,
        d.vietqr,
        d.discount,
        d.revenue,
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).numFmt = '#,##0';
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).numFmt = '#,##0';
      row.getCell(7).numFmt = '#,##0';
    }

    const totalRow = ws1.addRow([
      '',
      'TỔNG CỘNG',
      sumOrders,
      sumCash,
      sumQr,
      sumDiscount,
      sumRevenue,
    ]);
    totalRow.height = 24;
    totalRow.eachCell((cell) => {
      cell.fill = totalFill;
      cell.font = totalFont;
      cell.numFmt = '#,##0';
    });
    totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

    // Sheet 2: Danh Sách Đơn Hàng
    const ws2 = wb.addWorksheet('Danh Sách Đơn Hàng');
    ws2.views = [{ showGridLines: true }];
    const headersOrders = ['STT', 'Mã đơn', 'Bàn / Khách', 'Thời gian', 'Phương thức', 'Trạng thái', 'Tổng tiền (đ)'];
    const headerRowOrders = ws2.addRow(headersOrders);
    headerRowOrders.height = 24;
    headerRowOrders.eachCell((cell) => {
      cell.fill = emeraldFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let oIdx = 1;
    for (const ord of report.recentOrders) {
      const row = ws2.addRow([
        oIdx++,
        ord.orderCode,
        ord.tableName,
        new Date(ord.createdAt).toLocaleString('vi-VN'),
        ord.paymentMethod === 'VIETQR' ? 'VietQR' : 'Tiền mặt',
        ord.status === 'DONE' ? 'Hoàn thành' : ord.status,
        ord.totalAmount,
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).numFmt = '#,##0';
    }

    // Sheet 3: Top Món Bán Chạy
    const ws3 = wb.addWorksheet('Top Món Bán Chạy');
    ws3.views = [{ showGridLines: true }];
    const headersTop = ['Xếp hạng', 'Tên món ăn / đồ uống', 'Danh mục', 'Số lượng bán', 'Doanh thu (đ)'];
    const headerRowTop = ws3.addRow(headersTop);
    headerRowTop.height = 24;
    headerRowTop.eachCell((cell) => {
      cell.fill = emeraldFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let tIdx = 1;
    for (const it of report.topItems) {
      const row = ws3.addRow([
        `#${tIdx++}`,
        it.name,
        it.category,
        it.soldCount,
        it.revenue,
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
    }

    [ws1, ws2, ws3].forEach((ws) => {
      ws.columns.forEach((column: any) => {
        let maxLen = 14;
        column.eachCell?.({ includeEmpty: false }, (cell: any) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = Math.min(val.length + 3, 40);
        });
        column.width = maxLen;
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
