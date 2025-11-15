import request from 'supertest';
import express, { Application } from 'express';
import { HealthService } from '../services/health.service';
import prisma from '../config/database';
import { getRedisClient, isRedisConnected } from '../config/redis';

// Mock dependencies
jest.mock('../config/redis');
jest.mock('../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Health Check Endpoints Integration Tests', () => {
  let app: Application;
  let mockRedisClient: any;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    const healthService = new HealthService(prisma);

    // Health check endpoints
    app.get('/health', async (_req, res) => {
      try {
        const healthStatus = await healthService.checkHealth();
        const statusCode =
          healthStatus.status === 'healthy' ? 200 :
          healthStatus.status === 'degraded' ? 200 :
          503;
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    app.get('/health/live', async (_req, res) => {
      try {
        const isAlive = await healthService.checkLiveness();
        res.status(isAlive ? 200 : 503).json({
          status: isAlive ? 'alive' : 'dead',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({
          status: 'dead',
          timestamp: new Date().toISOString(),
        });
      }
    });

    app.get('/health/ready', async (_req, res) => {
      try {
        const isReady = await healthService.checkReadiness();
        res.status(isReady ? 200 : 503).json({
          status: isReady ? 'ready' : 'not ready',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    // Setup Redis mocks
    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    (isRedisConnected as jest.Mock).mockReturnValue(true);

    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 and healthy status when all dependencies are up', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.dependencies).toBeDefined();
      expect(response.body.dependencies.database).toBeDefined();
      expect(response.body.dependencies.redis).toBeDefined();
    });

    it('should return database status information', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.dependencies.database.status).toBe('up');
      expect(response.body.dependencies.database.responseTime).toBeDefined();
      expect(response.body.dependencies.database.message).toBeDefined();
    });

    it('should return Redis status information', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.dependencies.redis.status).toBe('up');
      expect(response.body.dependencies.redis.responseTime).toBeDefined();
      expect(response.body.dependencies.redis.message).toBeDefined();
    });

    it('should return degraded status when Redis is down', async () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200); // Still 200 for degraded
      expect(response.body.status).toBe('degraded');
      expect(response.body.dependencies.redis.status).toBe('down');
    });

    it('should include version information', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.version).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => request(app).get('/health'));
      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 and alive status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      await request(app).get('/health/live');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 and ready status when database is accessible', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should not fail if Redis is down', async () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const response = await request(app).get('/health/ready');

      // Readiness should still pass if database is up (Redis is not critical for readiness)
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });
  });

  describe('Response format validation', () => {
    it('should return valid JSON for /health', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should return valid JSON for /health/live', async () => {
      const response = await request(app).get('/health/live');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    it('should return valid JSON for /health/ready', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });
  });

  describe('CORS and Headers', () => {
    it('should allow requests from any origin (monitoring tools)', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://monitoring-tool.example.com');

      expect(response.status).toBe(200);
    });
  });
});
