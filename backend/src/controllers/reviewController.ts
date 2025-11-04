import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Create a review for a product or seller
 * POST /api/reviews
 */
export const createReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { productId, sellerId, rating, comment, images } = req.body;

    // Validate that at least one target (product or seller) is provided
    if (!productId && !sellerId) {
      res.status(400).json({
        error: 'Either productId or sellerId must be provided',
      });
      return;
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Check if user has already reviewed this product/seller
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        ...(productId && { productId }),
        ...(sellerId && { sellerId }),
      },
    });

    if (existingReview) {
      res.status(400).json({
        error: 'You have already reviewed this item',
      });
      return;
    }

    // Check for verified purchase if reviewing a product
    let isVerifiedPurchase = false;
    let orderId = null;

    if (productId) {
      const purchase = await prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            userId,
            paymentStatus: 'COMPLETED',
          },
        },
        select: {
          orderId: true,
        },
      });

      if (purchase) {
        isVerifiedPurchase = true;
        orderId = purchase.orderId;
      }
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        sellerId,
        orderId,
        rating,
        comment,
        isVerifiedPurchase,
        images: images ? JSON.stringify(images) : null,
        moderationStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update product or seller rating asynchronously
    if (productId) {
      updateProductRating(productId);
    }
    if (sellerId) {
      updateSellerRating(sellerId);
    }

    return res.status(201).json({
      message: 'Review created successfully',
      review: {
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      },
    });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
};

/**
 * Get reviews for a product
 * GET /api/reviews/product/:productId
 */
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      sort = 'recent',
      verifiedOnly = 'false',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      productId,
      moderationStatus: 'APPROVED',
    };

    if (verifiedOnly === 'true') {
      where.isVerifiedPurchase = true;
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest':
        orderBy = { rating: 'asc' };
        break;
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [reviews, total, ratingStats] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
      // Get rating distribution
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          productId,
          moderationStatus: 'APPROVED',
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    // Parse images
    const reviewsWithParsedImages = reviews.map((review) => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : null,
    }));

    // Calculate rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingStats.forEach((stat) => {
      ratingDistribution[stat.rating as keyof typeof ratingDistribution] =
        stat._count.rating;
    });

    // Calculate average rating
    const totalRatings = Object.values(ratingDistribution).reduce(
      (sum, count) => sum + count,
      0
    );
    const weightedSum = Object.entries(ratingDistribution).reduce(
      (sum, [rating, count]) => sum + Number(rating) * count,
      0
    );
    const averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

    return res.json({
      reviews: reviewsWithParsedImages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      stats: {
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews: totalRatings,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
};

/**
 * Get reviews for a seller
 * GET /api/reviews/seller/:sellerId
 */
export const getSellerReviews = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest':
        orderBy = { rating: 'asc' };
        break;
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const where = {
      sellerId,
      moderationStatus: 'APPROVED',
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    // Parse images
    const reviewsWithParsedImages = reviews.map((review) => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : null,
    }));

    return res.json({
      reviews: reviewsWithParsedImages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch seller reviews' });
  }
};

/**
 * Update a review
 * PUT /api/reviews/:reviewId
 */
export const updateReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;
    const { rating, comment, images } = req.body;

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    // Check if user owns the review
    if (review.userId !== userId) {
      res.status(403).json({ error: 'Not authorized to update this review' });
      return;
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
      return;
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating || review.rating,
        comment: comment !== undefined ? comment : review.comment,
        images: images ? JSON.stringify(images) : review.images,
        moderationStatus: 'PENDING', // Reset moderation status on edit
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update ratings if rating changed
    if (rating && rating !== review.rating) {
      if (review.productId) {
        updateProductRating(review.productId);
      }
      if (review.sellerId) {
        updateSellerRating(review.sellerId);
      }
    }

    return res.json({
      message: 'Review updated successfully',
      review: {
        ...updatedReview,
        images: updatedReview.images ? JSON.parse(updatedReview.images) : null,
      },
    });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:reviewId
 */
export const deleteReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    // Check if user owns the review or is an admin
    if (review.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized to delete this review' });
      return;
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Update ratings
    if (review.productId) {
      updateProductRating(review.productId);
    }
    if (review.sellerId) {
      updateSellerRating(review.sellerId);
    }

    return res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
};

/**
 * Mark review as helpful
 * POST /api/reviews/:reviewId/helpful
 */
export const markReviewHelpful = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reviewId } = req.params;

    // Update helpful count
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    return res.json({
      message: 'Review marked as helpful',
      helpfulCount: review.helpfulCount,
    });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    return res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
};

/**
 * Moderate a review (Admin only)
 * PUT /api/reviews/:reviewId/moderate
 */
export const moderateReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { reviewId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Must be PENDING, APPROVED, or REJECTED',
      });
      return;
    }

    // Update review
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: status,
        moderatedBy: userId,
        moderationNotes: notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      message: 'Review moderated successfully',
      review: {
        ...review,
        images: review.images ? JSON.parse(review.images) : null,
      },
    });
  } catch (error) {
    console.error('Moderate review error:', error);
    return res.status(500).json({ error: 'Failed to moderate review' });
  }
};

/**
 * Get pending reviews for moderation (Admin only)
 * GET /api/reviews/moderate/pending
 */
export const getPendingReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          moderationStatus: 'PENDING',
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: {
          moderationStatus: 'PENDING',
        },
      }),
    ]);

    // Parse images
    const reviewsWithParsedImages = reviews.map((review) => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : null,
    }));

    return res.json({
      reviews: reviewsWithParsedImages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
};

/**
 * Get user's reviews
 * GET /api/reviews/user/my-reviews
 */
export const getUserReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          seller: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    // Parse images
    const reviewsWithParsedImages = reviews.map((review) => ({
      ...review,
      images: review.images ? JSON.parse(review.images) : null,
    }));

    return res.json({
      reviews: reviewsWithParsedImages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
};

// Helper function to update product rating
async function updateProductRating(productId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        moderationStatus: 'APPROVED',
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) return;

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    // Note: Product model doesn't have a rating field yet, you may need to add it
    // await prisma.product.update({
    //   where: { id: productId },
    //   data: { rating: averageRating },
    // });
  } catch (error) {
    console.error('Update product rating error:', error);
  }
}

// Helper function to update seller rating
async function updateSellerRating(sellerId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        sellerId,
        moderationStatus: 'APPROVED',
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) return;

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        rating: averageRating,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error('Update seller rating error:', error);
  }
}
