import { CacheService, cacheService, CacheKeys, CacheTTL } from '../cache.service';
import { getRedisClient } from '../../config/redis';
import Redis from 'ioredis-mock';

// Mock Redis module
jest.mock('../../config/redis');

describe('CacheService', () => {
  let mockRedis: any;
  let service: CacheService;

  beforeEach(() => {
    // Create a new Redis mock for each test
    mockRedis = new Redis();
    mockRedis.status = 'ready'; // Set status to ready
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

    // Create a fresh CacheService instance
    service = new CacheService();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up Redis mock
    if (mockRedis) {
      await mockRedis.flushall();
      mockRedis.disconnect();
    }
  });

  describe('isAvailable', () => {
    it('should return true when Redis is ready', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when Redis is not ready', () => {
      mockRedis.status = 'disconnected';
      expect(service.isAvailable()).toBe(false);
    });

    it('should return false when Redis client is null', () => {
      (getRedisClient as jest.Mock).mockReturnValue(null);
      const newService = new CacheService();
      expect(newService.isAvailable()).toBe(false);
    });
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const testData = { name: 'Test', value: 123 };
      await mockRedis.set('test:key', JSON.stringify(testData));

      const result = await service.get('test:key');
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      const result = await service.get('nonexistent:key');
      expect(result).toBeNull();
    });

    it('should return null when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.get('test:key');
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      await mockRedis.set('test:key', 'invalid-json{');
      const result = await service.get('test:key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', async () => {
      const testData = { name: 'Test', value: 123 };
      const result = await service.set('test:key', testData);

      expect(result).toBe(true);
      const cached = await mockRedis.get('test:key');
      expect(JSON.parse(cached)).toEqual(testData);
    });

    it('should set value with custom TTL', async () => {
      const testData = { name: 'Test' };
      await service.set('test:key', testData, 300);

      const ttl = await mockRedis.ttl('test:key');
      expect(ttl).toBeLessThanOrEqual(300);
      expect(ttl).toBeGreaterThan(0);
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.set('test:key', { data: 'test' });
      expect(result).toBe(false);
    });

    it('should handle serialization of complex objects', async () => {
      const complexData = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' },
        null: null,
      };

      await service.set('test:complex', complexData);
      const result = await service.get('test:complex');
      expect(result).toEqual(complexData);
    });
  });

  describe('delete', () => {
    it('should delete value from cache', async () => {
      await mockRedis.set('test:key', 'value');
      const result = await service.delete('test:key');

      expect(result).toBe(true);
      const cached = await mockRedis.get('test:key');
      expect(cached).toBeNull();
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.delete('test:key');
      expect(result).toBe(false);
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', async () => {
      await mockRedis.set('product:1', 'value1');
      await mockRedis.set('product:2', 'value2');
      await mockRedis.set('product:3', 'value3');
      await mockRedis.set('user:1', 'user1');

      const deleted = await service.deletePattern('product:*');

      expect(deleted).toBe(3);
      const remaining = await mockRedis.get('user:1');
      expect(remaining).toBe('user1');
    });

    it('should return 0 when no keys match pattern', async () => {
      const deleted = await service.deletePattern('nonexistent:*');
      expect(deleted).toBe(0);
    });

    it('should return 0 when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const deleted = await service.deletePattern('test:*');
      expect(deleted).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      await mockRedis.set('test:key', 'value');
      const exists = await service.exists('test:key');
      expect(exists).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      const exists = await service.exists('nonexistent:key');
      expect(exists).toBe(false);
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const exists = await service.exists('test:key');
      expect(exists).toBe(false);
    });
  });

  describe('ttl', () => {
    it('should return remaining TTL for a key', async () => {
      await mockRedis.setex('test:key', 300, 'value');
      const ttl = await service.ttl('test:key');
      expect(ttl).toBeLessThanOrEqual(300);
      expect(ttl).toBeGreaterThan(0);
    });

    it('should return -1 when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const ttl = await service.ttl('test:key');
      expect(ttl).toBe(-1);
    });
  });

  describe('increment', () => {
    it('should increment value by 1 by default', async () => {
      const result1 = await service.increment('counter');
      expect(result1).toBe(1);

      const result2 = await service.increment('counter');
      expect(result2).toBe(2);
    });

    it('should increment value by specified amount', async () => {
      const result = await service.increment('counter', 5);
      expect(result).toBe(5);

      const result2 = await service.increment('counter', 3);
      expect(result2).toBe(8);
    });

    it('should return 0 when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.increment('counter');
      expect(result).toBe(0);
    });
  });

  describe('expire', () => {
    it('should set expiration time for a key', async () => {
      await mockRedis.set('test:key', 'value');
      const result = await service.expire('test:key', 300);

      expect(result).toBe(true);
      const ttl = await mockRedis.ttl('test:key');
      expect(ttl).toBeLessThanOrEqual(300);
      expect(ttl).toBeGreaterThan(0);
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.expire('test:key', 300);
      expect(result).toBe(false);
    });
  });

  describe('wrap', () => {
    it('should return cached value if available', async () => {
      const cachedData = { name: 'Cached' };
      await service.set('test:key', cachedData);

      const fn = jest.fn().mockResolvedValue({ name: 'Fresh' });
      const result = await service.wrap('test:key', fn);

      expect(result).toEqual(cachedData);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result if not cached', async () => {
      const freshData = { name: 'Fresh' };
      const fn = jest.fn().mockResolvedValue(freshData);

      const result = await service.wrap('test:key', fn);

      expect(result).toEqual(freshData);
      expect(fn).toHaveBeenCalledTimes(1);

      const cached = await service.get('test:key');
      expect(cached).toEqual(freshData);
    });

    it('should use custom TTL when provided', async () => {
      const data = { name: 'Test' };
      const fn = jest.fn().mockResolvedValue(data);

      await service.wrap('test:key', fn, 600);

      const ttl = await mockRedis.ttl('test:key');
      expect(ttl).toBeLessThanOrEqual(600);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('invalidateTags', () => {
    it('should invalidate all keys matching tags', async () => {
      await mockRedis.set('cache:product:1', 'value1');
      await mockRedis.set('cache:product:2', 'value2');
      await mockRedis.set('cache:user:1', 'value3');

      const deleted = await service.invalidateTags(['product']);

      expect(deleted).toBeGreaterThan(0);
    });

    it('should invalidate multiple tags', async () => {
      await mockRedis.set('cache:product:1', 'value1');
      await mockRedis.set('cache:user:1', 'value2');

      const deleted = await service.invalidateTags(['product', 'user']);

      expect(deleted).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await mockRedis.set('key1', 'value1');
      await mockRedis.set('key2', 'value2');

      const result = await service.clear();

      expect(result).toBe(true);
      const keys = await mockRedis.keys('*');
      expect(keys).toHaveLength(0);
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.status = 'disconnected';
      const result = await service.clear();
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics when connected', async () => {
      await mockRedis.set('key1', 'value1');
      await mockRedis.set('key2', 'value2');

      const stats = await service.getStats();

      expect(stats.connected).toBe(true);
      expect(stats.keys).toBe(2);
      expect(stats.memory).toBeDefined();
    });

    it('should return default stats when not connected', async () => {
      mockRedis.status = 'disconnected';

      const stats = await service.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.keys).toBe(0);
      expect(stats.memory).toBe('0B');
    });
  });

  describe('generateKey', () => {
    it('should generate cache key from parts', () => {
      const key = service.generateKey('product', 'details', 123);
      expect(key).toBe('product:details:123');
    });

    it('should handle string and number parts', () => {
      const key = service.generateKey('user', 'abc', 456, 'xyz');
      expect(key).toBe('user:abc:456:xyz');
    });
  });

  describe('Cache Constants', () => {
    it('should have predefined cache keys', () => {
      expect(CacheKeys.PRODUCT).toBe('product');
      expect(CacheKeys.USER).toBe('user');
      expect(CacheKeys.SELLER).toBe('seller');
    });

    it('should have predefined TTL values', () => {
      expect(CacheTTL.SHORT).toBe(60);
      expect(CacheTTL.MEDIUM).toBe(300);
      expect(CacheTTL.LONG).toBe(1800);
      expect(CacheTTL.VERY_LONG).toBe(3600);
      expect(CacheTTL.DAY).toBe(86400);
      expect(CacheTTL.WEEK).toBe(604800);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(cacheService).toBeInstanceOf(CacheService);
    });
  });
});
