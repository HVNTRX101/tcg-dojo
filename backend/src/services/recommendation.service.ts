import { prisma } from '../config/database';
import { CacheService } from './cache.service';
import logger from '../config/logger';

/**
 * Advanced Recommendation Engine
 *
 * Provides personalized product recommendations using multiple algorithms:
 * - Collaborative filtering
 * - Content-based filtering
 * - Trending products
 * - Similar products
 */

export class RecommendationService {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    const cacheKey = `recommendations:user:${userId}:${limit}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get user's order history
      const userOrders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  game: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Extract purchased product IDs and games
      const purchasedProductIds = new Set<string>();
      const purchasedGames = new Map<string, number>();

      userOrders.forEach(order => {
        order.items.forEach(item => {
          purchasedProductIds.add(item.productId);
          const gameId = item.product.gameId;
          purchasedGames.set(gameId, (purchasedGames.get(gameId) || 0) + 1);
        });
      });

      // Get top games user is interested in
      const topGames = Array.from(purchasedGames.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([gameId]) => gameId);

      // Collaborative filtering: Find similar users
      const similarUsers = await this.findSimilarUsers(userId, topGames);

      // Content-based: Get products from favorite games
      const gameBasedProducts = await prisma.product.findMany({
        where: {
          gameId: { in: topGames },
          id: { notIn: Array.from(purchasedProductIds) },
          quantity: { gt: 0 },
        },
        include: {
          game: true,
          seller: {
            select: {
              id: true,
              name: true,
              rating: true,
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
      });

      // Get products purchased by similar users
      const similarUserProducts = await this.getProductsFromSimilarUsers(
        similarUsers,
        Array.from(purchasedProductIds)
      );

      // Combine and score recommendations
      const recommendations = this.scoreAndRankRecommendations(
        gameBasedProducts,
        similarUserProducts,
        limit
      );

      // Cache for 30 minutes
      await this.cache.set(cacheKey, JSON.stringify(recommendations), 1800);

      return recommendations;
    } catch (error: any) {
      logger.error('Error generating personalized recommendations:', error);
      // Fallback to trending products
      return this.getTrendingProducts(limit);
    }
  }

  /**
   * Find users with similar purchase patterns
   */
  private async findSimilarUsers(
    userId: string,
    userGames: string[]
  ): Promise<string[]> {
    const similarUsers = await prisma.order.findMany({
      where: {
        userId: { not: userId },
        items: {
          some: {
            product: {
              gameId: { in: userGames },
            },
          },
        },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 10,
    });

    return similarUsers.map(order => order.userId);
  }

  /**
   * Get products purchased by similar users
   */
  private async getProductsFromSimilarUsers(
    userIds: string[],
    excludeProductIds: string[]
  ): Promise<any[]> {
    if (userIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: {
        orderItems: {
          some: {
            order: {
              userId: { in: userIds },
            },
          },
        },
        id: { notIn: excludeProductIds },
        quantity: { gt: 0 },
      },
      include: {
        game: true,
        seller: {
          select: {
            id: true,
            name: true,
            rating: true,
          },
        },
      },
      take: 20,
    });

    return products;
  }

  /**
   * Score and rank recommendations
   */
  private scoreAndRankRecommendations(
    gameBasedProducts: any[],
    similarUserProducts: any[],
    limit: number
  ): any[] {
    const productScores = new Map<string, { product: any; score: number }>();

    // Score game-based products (weight: 0.6)
    gameBasedProducts.forEach((product, index) => {
      const score = (20 - index) * 0.6;
      productScores.set(product.id, { product, score });
    });

    // Score similar user products (weight: 0.4)
    similarUserProducts.forEach((product, index) => {
      const score = (20 - index) * 0.4;
      const existing = productScores.get(product.id);
      if (existing) {
        existing.score += score;
      } else {
        productScores.set(product.id, { product, score });
      }
    });

    // Sort by score and return top N
    return Array.from(productScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);
  }

  /**
   * Get similar products based on attributes
   */
  async getSimilarProducts(productId: string, limit: number = 6): Promise<any[]> {
    const cacheKey = `recommendations:similar:${productId}:${limit}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { game: true },
      });

      if (!product) return [];

      // Find similar products
      const similar = await prisma.product.findMany({
        where: {
          id: { not: productId },
          gameId: product.gameId,
          setId: product.setId,
          quantity: { gt: 0 },
        },
        include: {
          game: true,
          seller: {
            select: {
              id: true,
              name: true,
              rating: true,
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      // Cache for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(similar), 3600);

      return similar;
    } catch (error: any) {
      logger.error('Error getting similar products:', error);
      return [];
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10): Promise<any[]> {
    const cacheKey = `recommendations:trending:${limit}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trending = await prisma.product.findMany({
        where: {
          quantity: { gt: 0 },
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          game: true,
          seller: {
            select: {
              id: true,
              name: true,
              rating: true,
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { orderItems: { _count: 'desc' } },
        ],
        take: limit,
      });

      // Cache for 15 minutes
      await this.cache.set(cacheKey, JSON.stringify(trending), 900);

      return trending;
    } catch (error: any) {
      logger.error('Error getting trending products:', error);
      return [];
    }
  }

  /**
   * Get recently viewed products for a user
   */
  async getRecentlyViewed(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // This would require a view tracking table
      // For now, return empty array
      return [];
    } catch (error: any) {
      logger.error('Error getting recently viewed:', error);
      return [];
    }
  }

  /**
   * Get "Frequently Bought Together" recommendations
   */
  async getFrequentlyBoughtTogether(productId: string): Promise<any[]> {
    const cacheKey = `recommendations:bought-together:${productId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Find orders containing this product
      const ordersWithProduct = await prisma.orderItem.findMany({
        where: { productId },
        select: { orderId: true },
        take: 100,
      });

      const orderIds = ordersWithProduct.map(item => item.orderId);

      if (orderIds.length === 0) return [];

      // Find other products in those orders
      const coOccurringProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          orderId: { in: orderIds },
          productId: { not: productId },
        },
        _count: {
          productId: true,
        },
        orderBy: {
          _count: {
            productId: 'desc',
          },
        },
        take: 5,
      });

      // Get product details
      const productIds = coOccurringProducts.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          quantity: { gt: 0 },
        },
        include: {
          game: true,
          seller: {
            select: {
              id: true,
              name: true,
              rating: true,
            },
          },
        },
      });

      // Cache for 2 hours
      await this.cache.set(cacheKey, JSON.stringify(products), 7200);

      return products;
    } catch (error: any) {
      logger.error('Error getting frequently bought together:', error);
      return [];
    }
  }
}

export default new RecommendationService();
