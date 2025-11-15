/**
 * k6 Load Testing Configuration
 * https://k6.io/docs/
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const VUS = parseInt(__ENV.VUS) || 10; // Virtual Users
export const DURATION = __ENV.DURATION || '30s';

// Test thresholds (fail test if not met)
export const thresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
  http_req_failed: ['rate<0.01'], // Error rate < 1%
  http_reqs: ['rate>10'], // Min 10 requests/second
};

// Stages for gradual ramp-up/down
export const stages = {
  smoke: [
    { duration: '30s', target: 1 }, // Smoke test with 1 user
  ],
  load: [
    { duration: '1m', target: 20 }, // Ramp up to 20 users
    { duration: '3m', target: 20 }, // Stay at 20 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  stress: [
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  spike: [
    { duration: '10s', target: 100 }, // Quick ramp to 100 users
    { duration: '1m', target: 100 }, // Stay at 100 users
    { duration: '10s', target: 0 }, // Quick ramp down
  ],
};

// Test credentials
export const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'LoadTest123!',
};

export const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'Admin123!',
};
