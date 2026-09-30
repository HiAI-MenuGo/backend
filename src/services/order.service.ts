import { emitToBranch, SOCKET_EVENTS } from '../socket';

export interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  imageUrl?: string;
  status?: 'PENDING' | 'PREPARING' | 'DONE';
}

export type LiveOrderStatus = 'PENDING' | 'CONFIRMED' | 'DONE';

export interface LiveOrder {
  id: string;
  code: string;
  time: string;
  orderType: 'TAKEAWAY' | 'DINE_IN';
  status: LiveOrderStatus;
  items: OrderItemDetail[];
  note?: string;
  total: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod?: 'CASH' | 'VIETQR';
  customerName?: string;
  tableId?: string;
  tableName?: string;
  branchId: string;
  tenantId: string;
  countdownSeconds?: number;
  createdAt: string;
}

// Dữ liệu mẫu khởi tạo cho cửa hàng
let activeOrders: LiveOrder[] = [
  {
    id: 'ord-101',
    code: '#101',
    time: '11:42',
    orderType: 'DINE_IN',
    status: 'PENDING',
    tableId: 'tbl-02',
    tableName: 'Bàn 02',
    branchId: 'default-branch',
    tenantId: 'default-tenant',
    total: 125000,
    paymentStatus: 'UNPAID',
    customerName: 'Nguyễn Văn A',
    note: 'Ít đường • Không lấy ống hút nhựa',
    items: [
      { id: 'item-1', name: 'Trà Đào Cam Sả', quantity: 2, price: 45000, note: '50% đường | 50% đá' },
      { id: 'item-2', name: 'Cà Phê Muối', quantity: 1, price: 35000, note: 'Ít đá' },
    ],
    countdownSeconds: 420,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'ord-102',
    code: '#102',
    time: '11:48',
    orderType: 'DINE_IN',
    status: 'CONFIRMED',
    tableId: 'tbl-05',
    tableName: 'Bàn 05',
    branchId: 'default-branch',
    tenantId: 'default-tenant',
    total: 90000,
    paymentStatus: 'UNPAID',
    customerName: 'Trần Thị B',
    items: [
      { id: 'item-3', name: 'Matcha Latte Đá', quantity: 2, price: 45000, note: '70% đường' },
    ],
    countdownSeconds: 300,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'ord-103',
    code: '#103',
    time: '11:35',
    orderType: 'TAKEAWAY',
    status: 'DONE',
    branchId: 'default-branch',
    tenantId: 'default-tenant',
    total: 55000,
    paymentStatus: 'PAID',
    paymentMethod: 'VIETQR',
    customerName: 'Lê Hoàng C',
    items: [
      { id: 'item-4', name: 'Bạc Xỉu Sữa Tươi', quantity: 1, price: 35000 },
      { id: 'item-5', name: 'Bánh Croissant Bơ Tỏi', quantity: 1, price: 20000 },
    ],
    countdownSeconds: 0,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

let orderHistory: LiveOrder[] = [
  ...activeOrders.filter((o) => o.status === 'DONE'),
];

export class OrderService {
  static getActiveOrders(branchId: string = 'default-branch', view?: string): LiveOrder[] {
    return activeOrders.filter((o) => o.branchId === branchId);
  }

  static getOrderById(orderId: string, branchId: string = 'default-branch'): LiveOrder | undefined {
    return activeOrders.find((o) => o.id === orderId && o.branchId === branchId);
  }

  static updateOrderStatus(
    orderId: string,
    status: LiveOrderStatus,
    branchId: string = 'default-branch'
  ): LiveOrder {
    const order = activeOrders.find((o) => o.id === orderId && o.branchId === branchId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    order.status = status;
    if (status === 'DONE') {
      order.countdownSeconds = 0;
      if (!orderHistory.some((h) => h.id === order.id)) {
        orderHistory.unshift(order);
      }
    }

    // Phát tín hiệu Socket.IO đến các máy cùng chi nhánh
    emitToBranch(branchId, SOCKET_EVENTS.ORDER_UPDATED, {
      orderId: order.id,
      status: order.status,
      updatedAt: new Date().toISOString(),
      branchId,
    });

    return order;
  }

  static updateItemStatus(
    orderId: string,
    itemId: string,
    status: 'PENDING' | 'PREPARING' | 'DONE',
    branchId: string = 'default-branch'
  ) {
    const order = activeOrders.find((o) => o.id === orderId && o.branchId === branchId);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');

    item.status = status;

    emitToBranch(branchId, SOCKET_EVENTS.ORDER_ITEM_STATUS, {
      orderId,
      itemId,
      status,
      branchId,
    });

    return item;
  }

  static voidOrder(orderId: string, reason: string, branchId: string = 'default-branch'): LiveOrder {
    const index = activeOrders.findIndex((o) => o.id === orderId && o.branchId === branchId);
    if (index === -1) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const [voidedOrder] = activeOrders.splice(index, 1);

    emitToBranch(branchId, SOCKET_EVENTS.ORDER_VOIDED, {
      orderId: voidedOrder.id,
      reason,
      branchId,
      voidedAt: new Date().toISOString(),
    });

    return voidedOrder;
  }

  static createOrder(
    data: Omit<LiveOrder, 'id' | 'code' | 'time' | 'status' | 'createdAt'>,
    branchId: string = 'default-branch'
  ): LiveOrder {
    const newCode = `#${100 + activeOrders.length + orderHistory.length + 1}`;
    const newOrder: LiveOrder = {
      ...data,
      id: `ord-${Date.now()}`,
      code: newCode,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING',
      branchId: branchId || data.branchId || 'default-branch',
      tenantId: data.tenantId || 'default-tenant',
      createdAt: new Date().toISOString(),
      countdownSeconds: 600,
    };

    activeOrders.unshift(newOrder);

    // Phát tín hiệu có đơn mới cho KDS và Mobile
    emitToBranch(newOrder.branchId, SOCKET_EVENTS.ORDER_NEW, {
      orderId: newOrder.id,
      orderNumber: newOrder.code,
      tableId: newOrder.tableId,
      tableName: newOrder.tableName,
      totalAmount: newOrder.total,
      itemCount: newOrder.items.reduce((s, i) => s + i.quantity, 0),
      items: newOrder.items,
      createdAt: newOrder.createdAt,
    });

    return newOrder;
  }

  static getOrderHistory(
    branchId: string = 'default-branch',
    page: number = 1,
    limit: number = 20,
    search?: string,
    startDate?: string,
    endDate?: string
  ) {
    let list = [...orderHistory];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          (o.tableName && o.tableName.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = list.slice(startIndex, startIndex + limit);

    return {
      orders: paginatedOrders,
      total,
      page,
      totalPages,
    };
  }
}
