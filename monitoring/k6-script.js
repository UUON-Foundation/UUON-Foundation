import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const duration = new Trend('request_duration');
const requestCount = new Counter('requests');
const activeUsers = new Gauge('active_users');

// Test options
export const options = {
  stages: [
    // Warmup: 10 users for 30s
    { duration: '30s', target: 10, name: 'warmup' },
    // Ramp up: scale to 50 users over 1m
    { duration: '1m', target: 50, name: 'ramp-up' },
    // Stay at 50 users for 2m
    { duration: '2m', target: 50, name: 'sustained' },
    // Ramp down: back to 0 over 1m
    { duration: '1m', target: 0, name: 'ramp-down' },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.K6_TARGET_URL || 'http://localhost:5001';

export default function () {
  activeUsers.add(__VU);
  requestCount.add(1);

  // Test 1: Health Check
  group('Health', function () {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health check is healthy': (r) => r.json().status === 'healthy',
    });
    duration.add(res.timings.duration);
  });

  sleep(1);

  // Test 2: Create User
  group('User Management', function () {
    const email = `test-${Date.now()}-${Math.random()}@uuon.io`;
    const res = http.post(`${BASE_URL}/api/v1/users`, JSON.stringify({
      email: email,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
      'create user status is 201': (r) => r.status === 201,
      'user has ID': (r) => r.json().user && r.json().user.id,
    });

    if (res.status === 201) {
      const userId = res.json().user.id;

      // Test 3: Get Balance
      sleep(0.5);
      const balanceRes = http.get(`${BASE_URL}/api/v1/credits/balance/${userId}`, {
        headers: { 'x-user-id': userId },
      });

      check(balanceRes, {
        'get balance status is 200': (r) => r.status === 200,
        'balance is accessible': (r) => r.json().balance && r.json().balance.id === userId,
      });

      duration.add(balanceRes.timings.duration);

      // Test 4: Generate Proof
      sleep(0.5);
      const proofRes = http.post(`${BASE_URL}/api/v1/proofs/generate`, JSON.stringify({
        reasoning: 'Load test reasoning',
        user_id: userId,
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
      });

      check(proofRes, {
        'generate proof status is 201': (r) => r.status === 201,
        'proof generated': (r) => r.json().proof !== undefined,
      });

      duration.add(proofRes.timings.duration);

      // Test 5: Cache Hit
      sleep(0.5);
      const cachedProofRes = http.post(`${BASE_URL}/api/v1/proofs/generate`, JSON.stringify({
        reasoning: 'Load test reasoning',
        user_id: userId,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
      });

      check(cachedProofRes, {
        'cached proof is fast': (r) => r.timings.duration < 100,
        'cached flag is true': (r) => r.json().cached === true,
      });

      duration.add(cachedProofRes.timings.duration);
    } else {
      errorRate.add(1);
    }
  });

  // Test 6: List Packages
  group('Packages', function () {
    const res = http.get(`${BASE_URL}/api/v1/packages`);
    check(res, {
      'list packages status is 200': (r) => r.status === 200,
      'packages exist': (r) => r.json().packages && r.json().packages.length > 0,
    });
    duration.add(res.timings.duration);
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  let summary = '';
  const metrics = data.metrics;
  
  summary += '\n================================\n';
  summary += 'K6 LOAD TEST SUMMARY\n';
  summary += '================================\n\n';

  if (data.state.testRunDurationMs) {
    summary += `Total Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  }

  if (metrics.requests) {
    summary += `Total Requests: ${metrics.requests.values.count}\n`;
  }

  if (metrics.http_req_failed) {
    summary += `Failed Requests: ${metrics.http_req_failed.values.count}\n`;
  }

  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration.values;
    summary += `Average Response Time: ${duration.avg.toFixed(2)}ms\n`;
    summary += `P95 Response Time: ${duration['p(95)'].toFixed(2)}ms\n`;
    summary += `P99 Response Time: ${duration['p(99)'].toFixed(2)}ms\n`;
  }

  summary += '\n================================\n';
  
  return summary;
}
