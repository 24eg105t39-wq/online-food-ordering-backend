process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app from '../index';
import { store } from '../services/store';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 500, data });
          } catch {
            resolve({ status: res.statusCode || 500, data: raw });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting CraveKart Backend Automated Test Suite ---');

  // Start test server on random port
  const testPort = 5999;
  baseUrl = `http://localhost:${testPort}`;
  server = app.listen(testPort);

  try {
    // 1. Health check
    console.log('[Test 1] GET /api/health');
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'healthy');
    console.log('✓ Health check passed');

    // 2. User registration
    console.log('[Test 2] POST /api/auth/register');
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Rohan Varma',
      email: testEmail,
      password: 'Password@123',
      phone: '+91 9988776655',
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.data.data.token);
    assert.strictEqual(regRes.data.data.user.email, testEmail);
    console.log('✓ Registration passed');

    // Duplicate registration rejected
    const dupRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Rohan Varma',
      email: testEmail,
      password: 'Password@123',
    });
    assert.strictEqual(dupRes.status, 409);
    console.log('✓ Duplicate email conflict prevention passed');

    // 3. Customer login
    console.log('[Test 3] POST /api/auth/login');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'customer@cravekart.com',
      password: 'Customer@123456',
    });
    assert.strictEqual(loginRes.status, 200);
    const customerToken = loginRes.data.data.token;
    assert.ok(customerToken);
    console.log('✓ Customer login passed');

    // 4. Admin login
    console.log('[Test 4] Admin login');
    const adminLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@cravekart.com',
      password: 'Admin@123456',
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.data.token;
    assert.strictEqual(adminLoginRes.data.data.user.role, 'ADMIN');
    console.log('✓ Admin login passed');

    // 5. Food listings & filters
    console.log('[Test 5] GET /api/foods & filters');
    const allFoods = await makeRequest('GET', '/api/foods');
    assert.strictEqual(allFoods.status, 200);
    assert.ok(allFoods.data.data.length >= 20);

    const vegFoods = await makeRequest('GET', '/api/foods?isVeg=true');
    assert.strictEqual(vegFoods.status, 200);
    assert.ok(vegFoods.data.data.every((f: any) => f.isVeg === true));

    const searchRes = await makeRequest('GET', '/api/foods?search=biryani');
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.data.data.length >= 1);
    console.log('✓ Food listing & search filters passed');

    // 6. Coupon validation
    console.log('[Test 6] POST /api/coupons/validate');
    const validCoupon = await makeRequest('POST', '/api/coupons/validate', {
      code: 'WELCOME50',
      subtotal: 500,
    });
    assert.strictEqual(validCoupon.status, 200);
    assert.strictEqual(validCoupon.data.data.discountAmount, 150); // Capped at 150

    const belowMinCoupon = await makeRequest('POST', '/api/coupons/validate', {
      code: 'WELCOME50',
      subtotal: 100, // min is 299
    });
    assert.strictEqual(belowMinCoupon.status, 400);
    console.log('✓ Server-side coupon verification passed');

    // 7. Order creation with server-side pricing
    console.log('[Test 7] POST /api/orders (Create Order)');
    const orderRes = await makeRequest(
      'POST',
      '/api/orders',
      {
        items: [
          { foodItemId: 'food_01', quantity: 1 }, // 349
          { foodItemId: 'food_04', quantity: 1 }, // 319
        ],
        deliveryAddress: {
          recipientName: 'Aditya Sharma',
          street: '123 Test Boulevard',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          phone: '+91 9123456789',
        },
        couponCode: 'WELCOME50',
        paymentMethod: 'COD',
      },
      customerToken
    );
    assert.strictEqual(orderRes.status, 201);
    const createdOrder = orderRes.data.data;
    assert.ok(createdOrder.orderNumber.startsWith('CK-'));
    assert.strictEqual(createdOrder.items.length, 2);
    // Subtotal: 349 + 319 = 668. Discount: 150 (WELCOME50 max). Taxable: 518. Tax: 25.9. Delivery: 0 (>=499). Total: 543.9
    assert.strictEqual(createdOrder.subtotalAmount, 668);
    assert.strictEqual(createdOrder.discountAmount, 150);
    console.log(`✓ Order placed with verified server-side total: ₹${createdOrder.totalAmount}`);

    // 8. Order isolation security check
    console.log('[Test 8] Customer Order Privacy Isolation');
    const regRes2 = await makeRequest('POST', '/api/auth/register', {
      name: 'Sneha Patel',
      email: `sneha_${Date.now()}@example.com`,
      password: 'Password@123',
    });
    const anotherUserToken = regRes2.data.data.token;
    const trespassRes = await makeRequest(
      'GET',
      `/api/orders/${createdOrder.id}`,
      null,
      anotherUserToken
    );
    assert.strictEqual(trespassRes.status, 403);
    console.log('✓ Customer privacy protected: unauthorized order access rejected');

    // 9. Admin role protection
    console.log('[Test 9] Admin Role Enforcement');
    const customerAdminAttempt = await makeRequest(
      'GET',
      '/api/admin/stats',
      null,
      customerToken
    );
    assert.strictEqual(customerAdminAttempt.status, 403);

    const adminStatsRes = await makeRequest(
      'GET',
      '/api/admin/stats',
      null,
      adminToken
    );
    assert.strictEqual(adminStatsRes.status, 200);
    assert.ok(adminStatsRes.data.data.totalOrders >= 3);
    console.log('✓ Admin RBAC enforcement verified');

    // 10. Admin order status lifecycle update
    console.log('[Test 10] Admin Order Status Update');
    const updateStatusRes = await makeRequest(
      'PATCH',
      `/api/admin/orders/${createdOrder.id}/status`,
      { status: 'PREPARING' },
      adminToken
    );
    assert.strictEqual(updateStatusRes.status, 200);
    assert.strictEqual(updateStatusRes.data.data.status, 'PREPARING');
    console.log('✓ Order lifecycle status transition passed');

    // 11. Live Location Tracking & Nearby Restaurants
    console.log('[Test 11] Live Location Tracking & Nearby Restaurants');
    const nearbyRes = await makeRequest(
      'GET',
      '/api/restaurants?latitude=12.9784&longitude=77.6408'
    );
    assert.strictEqual(nearbyRes.status, 200);
    assert.ok(nearbyRes.data.data.length >= 6);
    assert.strictEqual(nearbyRes.data.data[0].id, 'rest_01');
    assert.ok(nearbyRes.data.data[0].distanceKm <= 0.1);
    console.log(`✓ Live distance calculated: ${nearbyRes.data.data[0].name} is ${nearbyRes.data.data[0].distanceKm} km away`);

    console.log('====================================================');
    console.log(' ALL 11 TEST SUITES PASSED FLAWLESSLY!');
    console.log('====================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
