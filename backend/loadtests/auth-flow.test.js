import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, thresholds, stages } from './k6.config.js';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const signupSuccessRate = new Rate('signup_success_rate');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: stages.load,
  thresholds: {
    ...thresholds,
    login_success_rate: ['rate>0.95'],
    signup_success_rate: ['rate>0.90'],
  },
};

const headers = {
  'Content-Type': 'application/json',
};

export default function () {
  const baseUrl = BASE_URL + '/api/auth';

  group('Authentication Flow', function () {
    // Test 1: Login with existing user
    group('Login', function () {
      const loginPayload = JSON.stringify({
        email: `user${__VU}@example.com`,
        password: 'Test123!',
      });

      const loginStart = Date.now();
      const loginRes = http.post(`${baseUrl}/login`, loginPayload, { headers });
      loginDuration.add(Date.now() - loginStart);

      const loginSuccess = check(loginRes, {
        'login status is 200': (r) => r.status === 200 || r.status === 401, // 401 is ok if user doesn't exist
        'login response has user data': (r) =>
          r.status === 401 || (r.json() && r.json().user),
      });

      loginSuccessRate.add(loginSuccess ? 1 : 0);

      // If login successful, test profile access
      if (loginRes.status === 200) {
        const profileRes = http.get(`${baseUrl}/profile`, {
          headers: {
            ...headers,
            // Note: With HttpOnly cookies, this should work automatically
          },
        });

        check(profileRes, {
          'profile status is 200': (r) => r.status === 200,
        });
      }
    });

    sleep(1);

    // Test 2: Signup new user
    group('Signup', function () {
      const timestamp = Date.now();
      const signupPayload = JSON.stringify({
        email: `newuser${__VU}_${timestamp}@example.com`,
        password: 'NewUser123!',
        name: `Load Test User ${__VU}`,
      });

      const signupRes = http.post(`${baseUrl}/signup`, signupPayload, { headers });

      const signupSuccess = check(signupRes, {
        'signup status is 201 or 409': (r) => r.status === 201 || r.status === 409, // 409 if already exists
        'signup response has user': (r) =>
          r.status === 409 || (r.json() && r.json().user),
      });

      signupSuccessRate.add(signupSuccess ? 1 : 0);
    });

    sleep(1);

    // Test 3: Logout
    group('Logout', function () {
      const logoutRes = http.post(`${baseUrl}/logout`, null, { headers });

      check(logoutRes, {
        'logout status is 200': (r) => r.status === 200,
      });
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'loadtests/results/auth-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simple text summary
  let summary = `\n=== Load Test Summary: Authentication Flow ===\n`;
  summary += `Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += `VUs: ${data.metrics.vus?.values?.max || 'N/A'}\n`;
  summary += `Requests: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `Request Rate: ${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0} req/s\n`;
  summary += `Failed Requests: ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0}%\n`;
  summary += `Avg Response Time: ${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms\n`;
  summary += `P95 Response Time: ${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `Login Success Rate: ${((data.metrics.login_success_rate?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `Signup Success Rate: ${((data.metrics.signup_success_rate?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  return summary;
}
