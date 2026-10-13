import { OrderStatus, PaymentMethod, PaymentStatus, SessionStatus, TableStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { emitToBranch, emitToTable, emitToTenant, SOCKET_EVENTS } from '../../socket';
import logger from '../../utils/logger';

/**
 * Chốt thanh toán ví (MoMo/VNPay) sau khi IPN xác thực thành công:
 * PaymentTransaction PENDING -> PAID, đóng session, DONE các order, giải phóng bàn,
 * bắn socket cho thu ngân + QR khách (giống luồng VietQR/webhook hiện tại).
 */
export async function settleQrWalletPayment(opts: {
  referenceNo: string;
  gateway: 'MOMO' | 'VNPAY';
  gatewayTxnId?: string;
  paidAmount?: number;
  rawPayload?: any;
}): Promise<{ processed: boolean; sessionId?: string }> {
  const { referenceNo, gateway, gatewayTxnId, paidAmount, rawPayload } = opts;

  const paymentTx = await prisma.paymentTransaction.findFirst({
    where: { referenceNo, status: PaymentStatus.PENDING },
    include: { session: { include: { table: true, orders: true } } },
  });
  if (!paymentTx || !paymentTx.session) return { processed: false };
  if (paymentTx.session.status === SessionStatus.CLOSED) return { processed: true, sessionId: paymentTx.sessionId };

  const session = paymentTx.session;
  const branchId = session.branchId;
  const method = gateway === 'MOMO' ? PaymentMethod.MOMO : PaymentMethod.CARD;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: paymentTx.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          method,
          paymentGateway: gateway,
          receivedAmount: paidAmount ?? paymentTx.amount,
          metadata: JSON.stringify({
            gatewayTxnId: gatewayTxnId ?? null,
            raw: rawPayload ?? null,
          }).slice(0, 2000),
        },
      });
      await tx.orderSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.CLOSED, closedAt: new Date() },
      });
      await tx.order.updateMany({
        where: { sessionId: session.id, status: { not: OrderStatus.CANCELLED } },
        data: { status: OrderStatus.DONE },
      });
      if (session.tableId) {
        await tx.table.update({ where: { id: session.tableId }, data: { status: TableStatus.EMPTY } });
      }
    });
  } catch (err: any) {
    logger.error('settleQrWalletPayment error', { stack: err?.stack });
    throw err;
  }

  const completedAt = new Date().toISOString();
  const payPayload = {
    sessionId: session.id,
    tableId: session.tableId,
    tableName: (session as any).table?.name || `Bàn ${session.sessionCode}`,
    amount: paidAmount ?? paymentTx.amount,
    method,
    transactionRef: referenceNo,
    transactionId: paymentTx.id,
    completedAt,
  };
  emitToBranch(branchId, SOCKET_EVENTS.PAYMENT_COMPLETED, payPayload);
  emitToTenant(session.tenantId, SOCKET_EVENTS.PAYMENT_COMPLETED, payPayload);

  const tablePayload = {
    tableId: session.tableId,
    tableName: (session as any).table?.name || '',
    status: TableStatus.EMPTY,
    branchId,
  };
  emitToBranch(branchId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tablePayload);
  emitToTenant(session.tenantId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tablePayload);

  const sessPayload = { sessionId: session.id, status: SessionStatus.CLOSED, branchId };
  emitToBranch(branchId, SOCKET_EVENTS.SESSION_UPDATED, sessPayload);
  emitToTenant(session.tenantId, SOCKET_EVENTS.SESSION_UPDATED, sessPayload);

  if (session.tableId) {
    emitToTable(session.tableId, SOCKET_EVENTS.TABLE_STATUS_CHANGED, tablePayload);
    emitToTable(session.tableId, 'table:reset' as any, { tableId: session.tableId, status: TableStatus.EMPTY });
    emitToTable(session.tableId, SOCKET_EVENTS.PAYMENT_COMPLETED, payPayload);
    emitToTable(session.tableId, SOCKET_EVENTS.SESSION_UPDATED, sessPayload);
  }

  return { processed: true, sessionId: session.id };
}
