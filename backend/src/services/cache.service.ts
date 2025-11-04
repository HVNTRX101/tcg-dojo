import { getRedisClient } from '../config/redis';
import type { Redis } from 'ioredis';

/**
 * Cache Service
 * Provides caching functionality with Redis
 */

export class CacheService {
  private redis: Redis | null;
  private defaultTTL: number = 3600; // 1 hour in seconds

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.redis?.status === 'ready';
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redis!.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const expirationTime = ttl || this.defaultTTL;

      await this.redis!.setex(key, expirationTime, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis!.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.redis!.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redis!.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.redis!.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      return await this.redis!.incrby(key, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redis!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Cache wrapper - Get from cache or execute function
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const tag of tags) {
      const deleted = await this.deletePattern(`*:${tag}:*`);
      totalDeleted += deleted;
    }

    return totalDeleted;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis!.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    if (!this.isAvailable()) {
      return {
        connected: false,
        keys: 0,
        memory: '0B',
      };
    }

    try {
      const dbSize = await this.redis!.dbsize();
      const info = await this.redis!.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        connected: true,
        keys: dbSize,
        memory,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        keys: 0,
        memory: '0B',
      };
    }
  }

  /**
   * Generate cache key
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * Cache Key Prefixes
 */
export const CacheKeys = {
  PRODUCT: 'product',
  PRODUCTS_LIST: 'products:list',
  PRODUCT_DETAILS: 'product:details',
  SELLER: 'seller',
  SELLER_PROFILE: 'seller:profile',
  SELLER_PRODUCTS: 'seller:products',
  CART: 'cart',
  USER: 'user',
  SEARCH: 'search',
  RECOMMENDATIONS: 'recommendations',
  ANALYTICS: 'analytics',
  REVIEWS: 'reviews',
  COLLECTION: 'collection',
  ORDER: 'order',
};

/**
 * Cache TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};
