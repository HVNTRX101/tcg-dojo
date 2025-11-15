import { HealthService } from '../health.service';
import { PrismaClient } from '@prisma/client';
import { getRedisClient, isRedisConnected } from '../../config/redis';

// Mock Redis module
jest.mock('../../config/redis');

describe('HealthService', () => {
  let healthService: HealthService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedisClient: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      $queryRaw: jest.fn(),
    } as any;

    // Create mock Redis client
    mockRedisClient = {
      ping: jest.fn(),
    };

    healthService = new HealthService(mockPrisma);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all dependencies are up', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock Redis success
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.dependencies.database.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.environment).toBeDefined();
    });

    it('should return unhealthy status when database is down', async () => {
      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      // Mock Redis success
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.database.status).toBe('down');
      expect(result.dependencies.database.error).toBe('Database connection failed');
      expect(result.dependencies.redis.status).toBe('up');
    });

    it('should return degraded status when Redis is down', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock Redis failure
      (getRedisClient as jest.Mock).mockReturnValue(null);
      (isRedisConnected as jest.Mock).mockReturnValue(false);

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('down');
    });

    it('should return degraded status when database is slow', async () => {
      // Mock slow database response
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 1100))
      );

      // Mock Redis success
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.database.status).toBe('degraded');
      expect(result.dependencies.database.responseTime).toBeGreaterThan(1000);
      expect(result.dependencies.database.message).toBe('Database responding slowly');
    });

    it('should return degraded status when Redis is slow', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock slow Redis response
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('PONG'), 600))
      );

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.redis.status).toBe('degraded');
      expect(result.dependencies.redis.responseTime).toBeGreaterThan(500);
      expect(result.dependencies.redis.message).toBe('Redis responding slowly');
    });

    it('should handle Redis ping returning unexpected response', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock Redis unexpected response
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('UNEXPECTED');

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.redis.status).toBe('degraded');
      expect(result.dependencies.redis.message).toBe('Redis ping returned unexpected response');
    });

    it('should handle Redis ping throwing error', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock Redis error
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockRejectedValue(new Error('Redis error'));

      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.redis.status).toBe('down');
      expect(result.dependencies.redis.error).toBe('Redis error');
    });

    it('should include response times for successful checks', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Mock Redis success
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
      (isRedisConnected as jest.Mock).mockReturnValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthService.checkHealth();

      expect(result.dependencies.database.responseTime).toBeDefined();
      expect(result.dependencies.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.redis.responseTime).toBeDefined();
      expect(result.dependencies.redis.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkLiveness', () => {
    it('should return true when service is alive', async () => {
      const result = await healthService.checkLiveness();
      expect(result).toBe(true);
    });
  });

  describe('checkReadiness', () => {
    it('should return true when database is accessible', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await healthService.checkReadiness();
      expect(result).toBe(true);
    });

    it('should return false when database is down', async () => {
      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await healthService.checkReadiness();
      expect(result).toBe(false);
    });

    it('should return true even when database is slow', async () => {
      // Mock slow database (but still accessible)
      mockPrisma.$queryRaw.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ '?column?': 1 }]), 1100))
      );

      const result = await healthService.checkReadiness();
      expect(result).toBe(true);
    });
  });
});
