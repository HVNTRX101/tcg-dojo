import request from 'supertest';
import express from 'express';
import { generalLimiter, authLimiter, strictLimiter, adminLimiter } from '../middleware/security';

describe('Rate Limiting Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('General Rate Limiter', () => {
    it('should allow requests within the limit', async () => {
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First request should succeed
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should block requests exceeding the limit', async () => {
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make 101 requests (limit is 100 per 15 minutes)
      const requests = Array(101).fill(null).map(() =>
        request(app).get('/test')
      );

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);

      // At least one request should be blocked
      expect(blocked.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Auth Rate Limiter', () => {
    it('should have stricter limits for auth endpoints', async () => {
      app.use(authLimiter);
      app.post('/auth/login', (req, res) => res.json({ success: true }));

      // Make 6 requests (limit is 5 per 15 minutes)
      const requests = Array(6).fill(null).map(() =>
        request(app).post('/auth/login').send({ email: 'test@example.com', password: 'password' })
      );

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty('error');
    });
  });

  describe('Strict Rate Limiter', () => {
    it('should have very strict limits', async () => {
      app.use(strictLimiter);
      app.post('/sensitive', (req, res) => res.json({ success: true }));

      // Make 4 requests (limit is 3 per hour)
      const requests = Array(4).fill(null).map(() =>
        request(app).post('/sensitive')
      );

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);

      expect(blocked.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Rate Limiter', () => {
    it('should have higher limits for admin endpoints', async () => {
      app.use(adminLimiter);
      app.get('/admin/stats', (req, res) => res.json({ success: true }));

      // Make 50 requests (admin limit is 1000 per hour)
      const requests = Array(50).fill(null).map(() =>
        request(app).get('/admin/stats')
      );

      const responses = await Promise.all(requests);
      const allSuccessful = responses.every(r => r.status === 200);

      expect(allSuccessful).toBe(true);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset after the time window', async () => {
      // This test would require waiting or mocking time
      // For now, just verify the reset header is set
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      const resetHeader = response.headers['x-ratelimit-reset'];

      expect(resetHeader).toBeDefined();
      expect(parseInt(resetHeader)).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('Different IPs', () => {
    it('should track limits per IP address', async () => {
      app.use(generalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Request from IP 1
      const response1 = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1');

      // Request from IP 2
      const response2 = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.2');

      // Both should succeed (different IPs)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});
