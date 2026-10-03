import { prisma } from '../utils/prisma';

export interface OverviewInput {
  branchId?: string;
  date?: string;
  tenantId?: string;
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

export class AnalyticsService {
  /**
   * Tính toán toàn bộ KPI và biểu đồ phân tích dựa trên dữ liệu thật từ Prisma.
   */
  static async getOverview(input: OverviewInput): Promise<AnalyticsOverview> {
    const branch = await resolveBranch(input.branchId, input.tenantId);

    // Tính mốc thời gian hôm nay và hôm qua theo ngày địa phương
    const now = new Date();
    const targetDateStr =
      input.date ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [y, m, d] = targetDateStr.split('-').map(Number);
    const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);

    const startOfYesterday = new Date(y, m - 1, d - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(y, m - 1, d - 1, 23, 59, 59, 999);

    // 1. Doanh thu từ OrderSession CLOSED hôm nay và hôm qua
    const [closedSessionsToday, closedSessionsYesterday] = await Promise.all([
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          status: 'CLOSED',
          openedAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          orders: true,
        },
      }),
      prisma.orderSession.findMany({
        where: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          status: 'CLOSED',
          openedAt: { gte: startOfYesterday, lte: endOfYesterday },
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

    // 2. Số lượng hóa đơn (Order không bị CANCELLED trong ngày)
    const orderCount = await prisma.order.count({
      where: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
    });

    const avgOrderValue = orderCount > 0 ? Math.round(revenueToday / orderCount) : 0;

    // 3. Tỷ lệ thanh toán VietQR trên các PaymentTransaction PAID
    const paidTransactions = await prisma.paymentTransaction.findMany({
      where: {
        status: 'PAID',
        session: {
          tenantId: branch.tenantId,
          branchId: branch.id,
        },
        createdAt: { gte: startOfDay, lte: endOfDay },
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
          branchId: branch.id,
          isActive: true,
          status: 'OCCUPIED',
        },
      }),
      prisma.table.count({
        where: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          isActive: true,
        },
      }),
    ]);

    // 5. Số món đang chờ bếp nấu (OrderItem PENDING / PREPARING thuộc Order chưa DONE/CANCELLED)
    const pendingKitchenCount = await prisma.orderItem.count({
      where: {
        order: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        status: { in: ['PENDING', 'PREPARING'] },
      },
    });

    // 6. Xu hướng doanh thu 8 khung giờ (08, 10, 12, 14, 16, 18, 20, 22h)
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
      const h = new Date(session.openedAt).getHours();
      const idx = getHourlySlotIndex(h);
      hourlyTrend[idx].revenue += session.finalAmount;
      hourlyTrend[idx].orders += session.orders?.length ?? 0;
    }

    // 7. Top 5 món bán chạy nhất trong ngày (chỉ tính món từ order không CANCELLED)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          tenantId: branch.tenantId,
          branchId: branch.id,
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
}
