const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  success: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<any>) {
  try {
    const data = await fn();
    results.push({ name, success: true, details: data });
    console.log(`✅ PASS: ${name}`);
  } catch (err: any) {
    results.push({ name, success: false, error: err.message });
    console.error(`❌ FAIL: ${name} ->`, err.message);
  }
}

async function main() {
  console.log('🧪 Starting Member B End-to-End Automated Test Suite...\n');

  // 1. Health check
  await runTest('Health Check', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  // 2. Active Summary (Task B-004)
  await runTest('GET /api/sessions/active-summary', async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/active-summary?branchId=branch-01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || typeof json.data.pendingOrders !== 'number') {
      throw new Error('Invalid response structure');
    }
    return json.data;
  });

  // 3. Active Orders (Task B-006 & B-BE-002)
  await runTest('GET /api/orders/active', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/active?branchId=branch-01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Expected orders array');
    return { count: json.data.length };
  });

  // 4. Update Order Status to CONFIRMED (Task B-007)
  await runTest('PATCH /api/orders/:id/status (CONFIRMED)', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/ord-101/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data.status !== 'CONFIRMED') throw new Error(`Status mismatch: ${json.data.status}`);
    return json.data;
  });

  // 5. Update Order Status to DONE (BOM auto-deduction) (Task B-BE-002 & B-BE-005)
  await runTest('PATCH /api/orders/:id/status (DONE - Auto BOM deduct)', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/ord-101/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data.status !== 'DONE') throw new Error(`Status mismatch: ${json.data.status}`);
    return json.data;
  });

  // 6. Void Order (Task B-007 & B-BE-002)
  // 6. Void Order (Task B-007 & B-BE-002)
  await runTest('POST /api/orders/:id/void', async () => {
    // Lấy một đơn active hiện có hoặc tạo đơn mới để void
    const activeRes = await fetch(`${BASE_URL}/api/orders/active?branchId=branch-01`);
    const activeData = await activeRes.json();
    let targetOrderId = activeData.data?.[0]?.id;

    if (!targetOrderId) {
      // Nếu hết đơn active, tạo một đơn mới
      const newOrderRes = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: 'branch-01',
          customerName: 'Khách test void',
          items: [{ id: 'it-1', name: 'Trà Sữa', quantity: 1, price: 30000 }],
          total: 30000,
          paymentStatus: 'UNPAID',
          paymentMethod: 'CASH',
        }),
      });
      const newOrderData = await newOrderRes.json();
      targetOrderId = newOrderData.data.id;
    }

    const res = await fetch(`${BASE_URL}/api/orders/${targetOrderId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Khách hàng đổi ý muốn đổi món' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data.status !== 'CANCELLED') throw new Error(`Status mismatch: ${json.data.status}`);
    return json.data;
  });

  // 7. Order History (Task B-013 & B-BE-002)
  await runTest('GET /api/orders/history', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/history?branchId=branch-01&page=1&limit=10`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data.orders)) throw new Error('Expected orders array');
    return { total: json.data.total, page: json.data.page };
  });

  // 8. Pending Payment Sessions (Task B-008 & B-BE-003)
  await runTest('GET /api/sessions/pending-payment', async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/pending-payment?branchId=branch-01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Expected pending payment array');
    return { count: json.data.length };
  });

  // 9. Cash Payment (Task B-009 & B-BE-003)
  await runTest('POST /api/cashier/pay (CASH)', async () => {
    // Lấy một session đang chờ thanh toán
    const sessRes = await fetch(`${BASE_URL}/api/sessions/pending-payment?branchId=branch-01`);
    const sessData = await sessRes.json();
    let session = sessData.data?.[0];

    const targetSessionId = session ? session.sessionId : 'sess-test';
    const totalAmount = session ? session.total : 100000;
    const cashReceived = totalAmount + 25000;

    const res = await fetch(`${BASE_URL}/api/cashier/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: targetSessionId,
        method: 'CASH',
        cashReceived,
        customerId: 'cust-01',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || json.data.change !== 25000) {
      throw new Error(`Unexpected change calculation: ${json.data?.change}`);
    }
    return json.data;
  });

  // 10. Dynamic VietQR Generation (Task B-010 & B-BE-003)
  await runTest('POST /api/cashier/create-qr (VietQR Napas 247)', async () => {
    const res = await fetch(`${BASE_URL}/api/cashier/create-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess-dynamic-qr',
        amount: 90000,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.data.qrCodeUrl || !json.data.transactionRef) {
      throw new Error('Missing qrCodeUrl or transactionRef');
    }
    return { qrUrl: json.data.qrCodeUrl, ref: json.data.transactionRef };
  });

  // 11. VietQR Webhook Reconcile (Task B-010 & B-BE-003)
  await runTest('POST /api/cashier/webhook (SePay Webhook auto-confirm)', async () => {
    const res = await fetch(`${BASE_URL}/api/cashier/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionRef: 'ORDER_PENDING',
        amount: 90000,
        status: 'SUCCESS',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error('Webhook failed');
    return json.data;
  });

  // 12. Tables List (Task B-005 & B-BE-004)
  await runTest('GET /api/tables', async () => {
    const res = await fetch(`${BASE_URL}/api/tables?branchId=branch-01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Expected tables array');
    return { count: json.data.length };
  });

  // 13. Update Table Status (Task B-005 & B-BE-004)
  await runTest('PATCH /api/tables/:id/status (OCCUPIED)', async () => {
    const res = await fetch(`${BASE_URL}/api/tables/tbl-01/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OCCUPIED' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data.status !== 'OCCUPIED') throw new Error(`Status mismatch: ${json.data.status}`);
    return json.data;
  });

  // 14. Inventory List (Task B-012 & B-BE-005)
  await runTest('GET /api/ingredients', async () => {
    const res = await fetch(`${BASE_URL}/api/ingredients?branchId=branch-01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error('Expected ingredients array');
    return { count: json.data.length };
  });

  // 15. Adjust Inventory (Task B-012 & B-BE-005)
  await runTest('PATCH /api/ingredients/:id/adjust (ADD)', async () => {
    const res = await fetch(`${BASE_URL}/api/ingredients/ing-1/adjust`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adjustment: 500,
        reason: 'Nhập kho thêm cà phê hạt Robusta',
        type: 'ADD',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  });

  // 16. Customers Tra cứu (Task B-BE-006)
  await runTest('GET /api/customers?phone=0901234567', async () => {
    const res = await fetch(`${BASE_URL}/api/customers?phone=0901234567`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.data || !json.data.name) throw new Error('Expected customer object');
    return json.data;
  });

  // 17. Customers Cộng Điểm Loyalty (Task B-BE-006)
  await runTest('POST /api/customers/points', async () => {
    const res = await fetch(`${BASE_URL}/api/customers/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '0901234567',
        points: 25,
        reason: 'Tích điểm đơn thanh toán',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data;
  });

  // 18. Menu Sold Out Toggle (Task B-011)
  await runTest('PATCH /api/menu/items/:id/sold-out', async () => {
    const res = await fetch(`${BASE_URL}/api/menu/items/item-1/sold-out`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSoldOut: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.data.isSoldOut) throw new Error('Expected isSoldOut to be true');
    return json.data;
  });

  // 19. Socket.IO Handshake & Polling Protocol (Task B-BE-001)
  await runTest('Socket.IO Transport Handshake', async () => {
    const res = await fetch(`${BASE_URL}/socket.io/?EIO=4&transport=polling`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('sid')) throw new Error('Socket.IO handshake sid missing');
    return { response: text.substring(0, 40) + '...' };
  });

  console.log('\n=============================================');
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`📊 Test Summary: ${passed} PASSED / ${failed} FAILED (${results.length} total)`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
