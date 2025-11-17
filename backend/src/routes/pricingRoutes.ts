import { Router } from 'express';
import {
  getMultiSourcePrices,
  getTrendingCards,
  getCardPricing,
  getPricingHealth,
} from '../controllers/pricingController';
import { asyncHandler } from '../middleware/errorHandler';
import { getRedisClient } from '../config/redis';
import * as NodeCache from 'node-cache';
import { logger } from '../config/logger';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Cache middleware with Redis fallback to NodeCache
 * TTL: 5 minutes (300 seconds)
 */
const CACHE_TTL = 300; // 5 minutes in seconds
const nodeCache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 60 });

/**
 * Caching middleware
 * - Tries Redis first (if available)
 * - Falls back to NodeCache (in-memory)
 * - Caches based on request URL and query parameters
 */
const cacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate cache key from URL and query parameters
    const cacheKey = `pricing:${req.path}:${JSON.stringify(req.query)}`;
    const redisClient = getRedisClient();

    // Try Redis first
    if (redisClient) {
      try {
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
          logger.info('Cache hit (Redis)', { cacheKey });
          res.json(JSON.parse(cachedData));
          return;
        }
      } catch (redisError) {
        logger.warn('Redis cache read error, falling back to NodeCache', {
          error: redisError,
        });
      }
    }

    // Fall back to NodeCache
    const cachedData = nodeCache.get<string>(cacheKey);
    if (cachedData) {
      logger.info('Cache hit (NodeCache)', { cacheKey });
      res.json(JSON.parse(cachedData));
      return;
    }

    // No cache hit - intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      // Cache the response
      const dataString = JSON.stringify(data);

      // Try Redis first
      if (redisClient) {
        redisClient
          .setex(cacheKey, CACHE_TTL, dataString)
          .then(() => {
            logger.info('Response cached in Redis', { cacheKey });
          })
          .catch((error) => {
            logger.warn('Failed to cache in Redis, using NodeCache', { error });
            nodeCache.set(cacheKey, dataString);
          });
      } else {
        // Use NodeCache as fallback
        nodeCache.set(cacheKey, dataString);
        logger.info('Response cached in NodeCache', { cacheKey });
      }

      return originalJson(data);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error', { error });
    // Continue without caching on error
    next();
  }
};

/**
 * @swagger
 * /api/prices:
 *   get:
 *     summary: Get pricing data from multiple sources
 *     description: Fetches card pricing from Pokemon TCG API (TCGPlayer) and TCGdex (Cardmarket) in parallel
 *     tags:
 *       - Pricing
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query (optional, defaults to high-value cards)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Successful response with pricing data
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error or external API failure
 */
router.get('/', cacheMiddleware, asyncHandler(getMultiSourcePrices));

/**
 * @swagger
 * /api/prices/trending:
 *   get:
 *     summary: Get trending/high-value cards
 *     description: Fetches trending cards from multiple games
 *     tags:
 *       - Pricing
 *     parameters:
 *       - in: query
 *         name: games
 *         schema:
 *           type: string
 *           default: pokemon
 *         description: Comma-separated list of games (e.g., 'pokemon')
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Successful response with trending cards
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get('/trending', cacheMiddleware, asyncHandler(getTrendingCards));

/**
 * @swagger
 * /api/prices/card/{cardName}:
 *   get:
 *     summary: Get pricing for a specific card
 *     description: Fetches pricing data for a specific card by name
 *     tags:
 *       - Pricing
 *     parameters:
 *       - in: path
 *         name: cardName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the card
 *     responses:
 *       200:
 *         description: Successful response with card pricing
 *       404:
 *         description: Card not found
 *       500:
 *         description: Server error
 */
router.get('/card/:cardName', cacheMiddleware, asyncHandler(getCardPricing));

/**
 * @swagger
 * /api/prices/health:
 *   get:
 *     summary: Health check for pricing service
 *     description: Check if pricing service and external APIs are configured properly
 *     tags:
 *       - Pricing
 *     responses:
 *       200:
 *         description: Service is healthy
 *       500:
 *         description: Service health check failed
 */
router.get('/health', asyncHandler(getPricingHealth));

export default router;
