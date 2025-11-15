import { test, expect } from '@playwright/test';

/**
 * Health Check E2E Tests
 * Verifies that all health check endpoints are working correctly
 */

test.describe('Health Check Endpoints', () => {
  test('should respond to basic health check', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('should respond to liveness probe', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health/live');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('alive');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('should respond to readiness probe', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health/ready');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ready');
  });

  test('should return metrics', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health/metrics');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeGreaterThan(0);
    expect(body.system).toBeDefined();
    expect(body.system.memory).toBeDefined();
  });

  test('should return Prometheus metrics', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health/metrics/prometheus');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('nodejs_heap_size_total_bytes');
    expect(body).toContain('process_uptime_seconds');
  });
});
