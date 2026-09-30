/**
 * HiAI-MenuGo — Standard Socket.IO Events & Payloads
 * Based on TECHS.md and docs/B_Work_Flow.md
 */

export const SOCKET_EVENTS = {
  // Đơn hàng & Bếp
  ORDER_NEW: 'order:new',
  ORDER_UPDATED: 'order:updated',
  ORDER_VOIDED: 'order:voided',
  ORDER_ITEM_STATUS: 'order:item-status',

  // Bàn & Phiên
  TABLE_STATUS_CHANGED: 'table:status-changed',
  SESSION_UPDATED: 'session:updated',
  SESSION_CLOSED: 'session:closed',

  // Thanh toán
  PAYMENT_PENDING: 'payment:pending',
  PAYMENT_COMPLETED: 'payment:completed',

  // Thực đơn & Kho
  SOLD_OUT_UPDATED: 'sold_out:updated',
  INVENTORY_WARNING: 'inventory:warning',
  INVENTORY_UPDATED: 'inventory:updated',

  // Yêu cầu & Thông báo
  CALL_STAFF_REQUEST: 'call_staff:request',
  NOTIFICATION_NEW: 'notification:new',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// Payload interfaces
export interface OrderNewPayload {
  orderId: string;
  orderNumber: string;
  tableId?: string;
  tableName?: string;
  totalAmount: number;
  itemCount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    note?: string;
    modifiers?: Record<string, string>;
  }>;
  createdAt: string;
}

export interface OrderUpdatedPayload {
  orderId: string;
  status: 'PENDING' | 'PREPARING' | 'CONFIRMED' | 'READY' | 'DONE' | 'CANCELLED';
  updatedAt: string;
  branchId?: string;
}

export interface TableStatusChangedPayload {
  tableId: string;
  tableName?: string;
  status: 'EMPTY' | 'OCCUPIED' | 'RESERVED';
  branchId?: string;
  currentSessionId?: string;
}

export interface PaymentCompletedPayload {
  sessionId: string;
  tableId?: string;
  tableName?: string;
  amount: number;
  method: 'CASH' | 'VIETQR' | 'CARD';
  transactionRef?: string;
  completedAt: string;
}

export interface SoldOutUpdatedPayload {
  itemId: string;
  isSoldOut: boolean;
  branchId?: string;
}

export interface InventoryWarningPayload {
  ingredientId: string;
  name: string;
  currentStock: number;
  threshold: number;
  unit: string;
  branchId?: string;
}
