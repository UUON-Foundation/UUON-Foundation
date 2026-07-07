// ========================================================================
// INTEGRATION TESTS - UUON Billing API
// Task 8.1: Integration tests for all endpoints
// Run with: npm test
// ========================================================================

import { test } from "node:test";
import assert from "node:assert";

const BASE_URL = "http://localhost:8080";

// Helper function for API calls
async function apiCall(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

// Test suites
test("Health Check", async (t) => {
  const { status, data } = await apiCall("GET", "/health");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.status, "healthy");
});

test("Get Status", async (t) => {
  const { status, data } = await apiCall("GET", "/api/v1/status");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.version, "1.0.0");
});

test("List Packages", async (t) => {
  const { status, data } = await apiCall("GET", "/api/v1/packages");
  assert.strictEqual(status, 200);
  assert(Array.isArray(data.packages));
  assert(data.packages.length >= 3);
  assert.strictEqual(data.packages[0].name, "starter");
});

test("User Management", async (t) => {
  // Create user
  const createRes = await apiCall("POST", "/api/v1/users", {
    email: `test-${Date.now()}@uuon.io`
  });

  assert.strictEqual(createRes.status, 201);
  assert(createRes.data.user.id);
  const userId = createRes.data.user.id;

  // Get user
  const getRes = await apiCall("GET", `/api/v1/users/${userId}`);
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getRes.data.user.id, userId);

  // List users
  const listRes = await apiCall("GET", "/api/v1/users");
  assert.strictEqual(listRes.status, 200);
  assert(Array.isArray(listRes.data.users));
});

test("Buy Credits - Happy Path", async (t) => {
  // Create user
  const userRes = await apiCall("POST", "/api/v1/users", {
    email: `buyer-${Date.now()}@uuon.io`
  });
  const userId = userRes.data.user.id;

  // Get package
  const pkgRes = await apiCall("GET", "/api/v1/packages");
  const packageId = pkgRes.data.packages[0].id;

  // Buy credits
  const buyRes = await apiCall(
    "POST",
    "/api/v1/credits/buy",
    {
      user_id: userId,
      package_id: packageId
    },
    { "x-user-id": userId }
  );

  assert.strictEqual(buyRes.status, 201);
  assert(buyRes.data.user.credits_balance >= 100);
});

test("Buy Credits - Missing User ID", async (t) => {
  const userRes = await apiCall("POST", "/api/v1/users", {
    email: `test-${Date.now()}@uuon.io`
  });
  const userId = userRes.data.user.id;

  const pkgRes = await apiCall("GET", "/api/v1/packages");
  const packageId = pkgRes.data.packages[0].id;

  // No x-user-id header
  const buyRes = await apiCall("POST", "/api/v1/credits/buy", {
    user_id: userId,
    package_id: packageId
  });

  assert.strictEqual(buyRes.status, 400);
  assert.strictEqual(buyRes.data.code, "AUTH_MISSING_USER_ID");
});

test("Buy Credits - Invalid User ID Format", async (t) => {
  const pkgRes = await apiCall("GET", "/api/v1/packages");
  const packageId = pkgRes.data.packages[0].id;

  const buyRes = await apiCall(
    "POST",
    "/api/v1/credits/buy",
    {
      user_id: "invalid-uuid",
      package_id: packageId
    },
    { "x-user-id": "also-invalid" }
  );

  assert.strictEqual(buyRes.status, 400);
});

test("Get Balance", async (t) => {
  // Create user
  const userRes = await apiCall("POST", "/api/v1/users", {
    email: `balance-test-${Date.now()}@uuon.io`
  });
  const userId = userRes.data.user.id;

  // Get balance
  const balRes = await apiCall("GET", `/api/v1/credits/balance/${userId}`, null, {
    "x-user-id": userId
  });

  assert.strictEqual(balRes.status, 200);
  assert.strictEqual(balRes.data.balance.credits_balance, 0);
});

test("Credit Transfer - Happy Path", async (t) => {
  // Create 2 users
  const user1Res = await apiCall("POST", "/api/v1/users", {
    email: `sender-${Date.now()}@uuon.io`
  });
  const user1 = user1Res.data.user.id;

  const user2Res = await apiCall("POST", "/api/v1/users", {
    email: `recipient-${Date.now()}@uuon.io`
  });
  const user2 = user2Res.data.user.id;

  // Buy credits for user1
  const pkgRes = await apiCall("GET", "/api/v1/packages");
  const packageId = pkgRes.data.packages[0].id;

  await apiCall(
    "POST",
    "/api/v1/credits/buy",
    { user_id: user1, package_id: packageId },
    { "x-user-id": user1 }
  );

  // Transfer credits
  const transferRes = await apiCall(
    "POST",
    "/api/v1/credits/transfer",
    {
      from_user_id: user1,
      to_user_id: user2,
      amount: 50
    },
    { "x-user-id": user1 }
  );

  assert.strictEqual(transferRes.status, 201);
  assert.strictEqual(transferRes.data.status, "success");

  // Verify balances
  const bal1 = await apiCall("GET", `/api/v1/credits/balance/${user1}`, null, {
    "x-user-id": user1
  });
  const bal2 = await apiCall("GET", `/api/v1/credits/balance/${user2}`, null, {
    "x-user-id": user2
  });

  assert(bal1.data.balance.credits_balance >= 50); // 100 - 50
  assert.strictEqual(bal2.data.balance.credits_balance, 50);
});

test("Credit Transfer - Insufficient Balance", async (t) => {
  // Create users
  const user1Res = await apiCall("POST", "/api/v1/users", {
    email: `poor-${Date.now()}@uuon.io`
  });
  const user1 = user1Res.data.user.id;

  const user2Res = await apiCall("POST", "/api/v1/users", {
    email: `lucky-${Date.now()}@uuon.io`
  });
  const user2 = user2Res.data.user.id;

  // Try to transfer without buying
  const transferRes = await apiCall(
    "POST",
    "/api/v1/credits/transfer",
    {
      from_user_id: user1,
      to_user_id: user2,
      amount: 1000
    },
    { "x-user-id": user1 }
  );

  assert.strictEqual(transferRes.status, 400);
  assert.strictEqual(transferRes.data.error, "Insufficient credits");
});

test("Transaction History", async (t) => {
  // Create user and buy credits
  const userRes = await apiCall("POST", "/api/v1/users", {
    email: `history-${Date.now()}@uuon.io`
  });
  const userId = userRes.data.user.id;

  const pkgRes = await apiCall("GET", "/api/v1/packages");
  const packageId = pkgRes.data.packages[0].id;

  await apiCall(
    "POST",
    "/api/v1/credits/buy",
    { user_id: userId, package_id: packageId },
    { "x-user-id": userId }
  );

  // Get transaction history
  const histRes = await apiCall(
    "GET",
    `/api/v1/transactions/${userId}`,
    null,
    { "x-user-id": userId }
  );

  assert.strictEqual(histRes.status, 200);
  assert(Array.isArray(histRes.data.transactions));
  assert(histRes.data.transactions.length > 0);
  assert.strictEqual(histRes.data.transactions[0].type, "purchase");
});

test("Analytics", async (t) => {
  // Need at least one valid user ID for auth
  const userRes = await apiCall("POST", "/api/v1/users", {
    email: `analytics-${Date.now()}@uuon.io`
  });
  const userId = userRes.data.user.id;

  const analyticsRes = await apiCall("GET", "/api/v1/analytics", null, {
    "x-user-id": userId
  });

  assert.strictEqual(analyticsRes.status, 200);
  assert(typeof analyticsRes.data.analytics.total_users === "number");
  assert(typeof analyticsRes.data.analytics.total_credits_in_circulation === "number");
  assert(typeof analyticsRes.data.analytics.total_transactions === "number");
});

test("CORS Headers Present", async (t) => {
  const response = await fetch(`${BASE_URL}/health`);
  const corsHeader = response.headers.get("access-control-allow-origin");
  assert(corsHeader !== null);
});

console.log("✅ Integration tests completed");
