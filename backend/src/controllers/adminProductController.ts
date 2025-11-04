import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '../services/adminLog.service';

const prisma = new PrismaClient();

/**
 * Get all products with filtering and pagination (admin view)
 * GET /api/admin/products
 */
export const getAllProducts = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      game,
      set,
      sellerId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    if (game) where.gameId = game;
    if (set) where.setId = set;
    if (sellerId) where.sellerId = sellerId;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { cardNumber: { contains: search } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          game: { select: { name: true } },
          set: { select: { name: true } },
          seller: {
            select: {
              businessName: true,
              rating: true,
              user: { select: { email: true } },
            },
          },
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

/**
 * Update product details (admin override)
 * PUT /api/admin/products/:productId
 */
export const updateProduct = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        game: true,
        set: true,
        seller: true,
        images: true,
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'PRODUCT_UPDATED',
      'PRODUCT',
      productId,
      { updatedFields: Object.keys(updateData) }
    );

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

/**
 * Delete product
 * DELETE /api/admin/products/:productId
 */
export const deleteProduct = async (req: any, res: Response) => {
  try {
    const { productId } = req.params;

    await prisma.product.delete({
      where: { id: productId },
    });

    // Log admin action
    await logAdminAction(req, 'PRODUCT_DELETED', 'PRODUCT', productId);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

/**
 * Get product statistics
 * GET /api/admin/products/stats
 */
export const getProductStats = async (req: any, res: Response) => {
  try {
    const [
      totalProducts,
      productsByGame,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.groupBy({
        by: ['gameId'],
        _count: { gameId: true },
      }),
      prisma.product.count({ where: { quantity: { lte: 5, gt: 0 } } }),
      prisma.product.count({ where: { quantity: 0 } }),
      prisma.product.aggregate({
        _sum: {
          price: true,
        },
      }),
    ]);

    // Get game names for the products by game
    const gameIds = productsByGame.map((g) => g.gameId);
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, name: true },
    });

    const gameMap = games.reduce((acc: any, game) => {
      acc[game.id] = game.name;
      return acc;
    }, {});

    res.json({
      totalProducts,
      productsByGame: productsByGame.map((g) => ({
        gameId: g.gameId,
        gameName: gameMap[g.gameId],
        count: g._count.gameId,
      })),
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue: totalInventoryValue._sum.price || 0,
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ error: 'Failed to fetch product statistics' });
  }
};

/**
 * Get pending reviews for moderation
 * GET /api/admin/reviews/pending
 */
export const getPendingReviews = async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { moderationStatus: 'PENDING' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          product: {
            select: { id: true, name: true },
          },
          seller: {
            select: { id: true, businessName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.review.count({ where: { moderationStatus: 'PENDING' } }),
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
};

/**
 * Approve a review
 * PUT /api/admin/reviews/:reviewId/approve
 */
export const approveReview = async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { moderationNotes } = req.body;

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'APPROVED',
        moderatedBy: req.user.userId,
        moderationNotes,
      },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    // Log admin action
    await logAdminAction(req, 'REVIEW_APPROVED', 'REVIEW', reviewId);

    res.json(review);
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: 'Failed to approve review' });
  }
};

/**
 * Reject a review
 * PUT /api/admin/reviews/:reviewId/reject
 */
export const rejectReview = async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { moderationNotes } = req.body;

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: 'REJECTED',
        moderatedBy: req.user.userId,
        moderationNotes,
      },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'REVIEW_REJECTED',
      'REVIEW',
      reviewId,
      { reason: moderationNotes }
    );

    res.json(review);
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ error: 'Failed to reject review' });
  }
};

/**
 * Get all reviews with filtering
 * GET /api/admin/reviews
 */
export const getAllReviews = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      moderationStatus,
      userId,
      productId,
      sellerId,
    } = req.query;

    const where: any = {};

    if (moderationStatus) where.moderationStatus = moderationStatus;
    if (userId) where.userId = userId;
    if (productId) where.productId = productId;
    if (sellerId) where.sellerId = sellerId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
          seller: { select: { id: true, businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

/**
 * Delete a review
 * DELETE /api/admin/reviews/:reviewId
 */
export const deleteReview = async (req: any, res: Response) => {
  try {
    const { reviewId } = req.params;

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Log admin action
    await logAdminAction(req, 'REVIEW_DELETED', 'REVIEW', reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};
