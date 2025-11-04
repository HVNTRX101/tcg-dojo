import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheTTL } from '../services/cache.service';

/**
 * Cache Middleware
 * Caches API responses in Redis
 */

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

/**
 * Cache middleware factory
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = CacheTTL.MEDIUM,
    keyGenerator = defaultKeyGenerator,
    condition = defaultCondition,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if caching should be applied
    if (!condition(req, res)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        // Set cache hit header
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        // Send cached response
        return res.json(cachedResponse);
      }

      // Cache miss - set header
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (body: any) {
        // Cache the response
        cacheService.set(cacheKey, body, ttl).catch((err) => {
          console.error('Failed to cache response:', err);
        });

        // Send response using original method
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const userId = (req as any).userId || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `api:${path}:${userId}:${query}`;
}

/**
 * Default caching condition
 */
function defaultCondition(req: Request, res: Response): boolean {
  // Don't cache if user explicitly requests fresh data
  if (req.headers['cache-control'] === 'no-cache') {
    return false;
  }

  return true;
}

/**
 * Product list cache middleware
 */
export const cacheProductList = cacheMiddleware({
  ttl: CacheTTL.MEDIUM,
  keyGenerator: (req) => {
    const query = JSON.stringify(req.query);
    return `products:list:${query}`;
  },
});

/**
 * Product details cache middleware
 */
export const cacheProductDetails = cacheMiddleware({
  ttl: CacheTTL.LONG,
  keyGenerator: (req) => {
    const productId = req.params.productId || req.params.id;
    return `product:details:${productId}`;
  },
});

/**
 * Seller profile cache middleware
 */
export const cacheSellerProfile = cacheMiddleware({
  ttl: CacheTTL.LONG,
  keyGenerator: (req) => {
    const sellerId = req.params.sellerId || req.params.id;
    return `seller:profile:${sellerId}`;
  },
});

/**
 * Search results cache middleware
 */
export const cacheSearchResults = cacheMiddleware({
  ttl: CacheTTL.SHORT,
  keyGenerator: (req) => {
    const query = JSON.stringify(req.query);
    return `search:${query}`;
  },
});

/**
 * Analytics cache middleware
 */
export const cacheAnalytics = cacheMiddleware({
  ttl: CacheTTL.VERY_LONG,
  keyGenerator: (req) => {
    const userId = (req as any).userId || 'public';
    const query = JSON.stringify(req.query);
    return `analytics:${userId}:${query}`;
  },
});

/**
 * Cache invalidation middleware
 * Invalidates cache when data is modified
 */
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override response methods
    const invalidate = async () => {
      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }
    };

    res.json = function (body: any) {
      invalidate().catch(console.error);
      return originalJson(body);
    };

    res.send = function (body: any) {
      invalidate().catch(console.error);
      return originalSend(body);
    };

    next();
  };
};

/**
 * Invalidate product cache
 */
export const invalidateProductCache = invalidateCache([
  'products:*',
  'product:*',
  'search:*',
  'recommendations:*',
]);

/**
 * Invalidate user cache
 */
export const invalidateUserCache = (userId: string) =>
  invalidateCache([`user:${userId}:*`, `cart:${userId}:*`]);

/**
 * Invalidate seller cache
 */
export const invalidateSellerCache = (sellerId: string) =>
  invalidateCache([`seller:${sellerId}:*`, `seller:products:${sellerId}:*`]);
