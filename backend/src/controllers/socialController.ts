import { Request, Response } from 'express';
import prisma from '../config/database';
import { createNotification, NotificationTypes } from './notificationController';

/**
 * Social Features Controller
 * Handles activity feeds, product likes, and public profiles
 */

// ============================================
// ACTIVITY FEED
// ============================================

/**
 * Get activity feed for current user
 * GET /api/social/feed
 */
export const getActivityFeed = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get followed sellers
    const followedSellers = await prisma.follow.findMany({
      where: { userId },
      select: { sellerId: true },
    });

    const sellerIds = followedSellers.map((f) => f.sellerId);

    // Get activities from followed sellers
    const [activities, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where: {
          OR: [
            { userId: { in: sellerIds }, isPublic: true },
            { userId }, // User's own activities
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityFeed.count({
        where: {
          OR: [
            { userId: { in: sellerIds }, isPublic: true },
            { userId },
          ],
        },
      }),
    ]);

    // Parse metadata
    const formattedActivities = activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }));

    return res.json({
      data: formattedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    return res.status(500).json({ error: 'Failed to get activity feed' });
  }
};

/**
 * Get public activity feed (all public activities)
 * GET /api/social/feed/public
 */
export const getPublicActivityFeed = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where: { isPublic: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityFeed.count({
        where: { isPublic: true },
      }),
    ]);

    const formattedActivities = activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }));

    return res.json({
      data: formattedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting public activity feed:', error);
    return res.status(500).json({ error: 'Failed to get public activity feed' });
  }
};

// ============================================
// PRODUCT LIKES (FAVORITES)
// ============================================

/**
 * Like a product
 * POST /api/social/likes/:productId
 */
export const likeProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already liked
    const existingLike = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Product already liked' });
    }

    // Create like
    const like = await prisma.productLike.create({
      data: {
        userId,
        productId,
      },
    });

    // Create activity
    await prisma.activityFeed.create({
      data: {
        userId,
        activityType: 'PRODUCT_LIKED',
        title: `Liked ${product.name}`,
        entityType: 'PRODUCT',
        entityId: productId,
        isPublic: true,
      },
    });

    return res.status(201).json({
      message: 'Product liked successfully',
      data: like,
    });
  } catch (error) {
    console.error('Error liking product:', error);
    return res.status(500).json({ error: 'Failed to like product' });
  }
};

/**
 * Unlike a product
 * DELETE /api/social/likes/:productId
 */
export const unlikeProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Delete like
    const result = await prisma.productLike.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }

    return res.json({ message: 'Product unliked successfully' });
  } catch (error) {
    console.error('Error unliking product:', error);
    return res.status(500).json({ error: 'Failed to unlike product' });
  }
};

/**
 * Get user's liked products
 * GET /api/social/likes
 */
export const getLikedProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      prisma.productLike.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              game: true,
              set: true,
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productLike.count({ where: { userId } }),
    ]);

    return res.json({
      data: likes.map((like) => like.product),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting liked products:', error);
    return res.status(500).json({ error: 'Failed to get liked products' });
  }
};

/**
 * Check if product is liked by current user
 * GET /api/social/likes/:productId/check
 */
export const checkProductLiked = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    const like = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return res.json({ isLiked: !!like });
  } catch (error) {
    console.error('Error checking product like:', error);
    return res.status(500).json({ error: 'Failed to check product like' });
  }
};

// ============================================
// PUBLIC USER PROFILES
// ============================================

/**
 * Get public user profile
 * GET /api/social/profiles/:userId
 */
export const getPublicProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;

    // Get user with settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: false, // Never expose email
        createdAt: true,
        seller: {
          select: {
            id: true,
            businessName: true,
            description: true,
            logoUrl: true,
            rating: true,
            totalSales: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        settings: {
          select: {
            profileIsPublic: true,
            showCollectionsPublicly: true,
            showReviewsPublicly: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile is public
    if (!user.settings?.profileIsPublic) {
      return res.status(403).json({ error: 'Profile is private' });
    }

    // Get public collections if allowed
    let collections = null;
    if (user.settings?.showCollectionsPublicly) {
      collections = await prisma.collection.findMany({
        where: {
          userId,
          isPublic: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: {
            select: { items: true },
          },
        },
        take: 5,
      });
    }

    // Get public reviews if allowed
    let reviews = null;
    if (user.settings?.showReviewsPublicly) {
      reviews = await prisma.review.findMany({
        where: {
          userId,
          moderationStatus: 'APPROVED',
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    }

    // Get stats
    const stats = {
      totalReviews: await prisma.review.count({
        where: { userId, moderationStatus: 'APPROVED' },
      }),
      totalCollections: await prisma.collection.count({
        where: { userId, isPublic: true },
      }),
    };

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        memberSince: user.createdAt,
        seller: user.seller,
        collections,
        reviews,
        stats,
      },
    });
  } catch (error) {
    console.error('Error getting public profile:', error);
    return res.status(500).json({ error: 'Failed to get public profile' });
  }
};

/**
 * Get current user's profile
 * GET /api/social/profile/me
 */
export const getMyProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            businessName: true,
            description: true,
            logoUrl: true,
            rating: true,
            totalSales: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    const [totalOrders, totalReviews, totalCollections, totalLikes] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.review.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.productLike.count({ where: { userId } }),
    ]);

    return res.json({
      profile: {
        ...user,
        stats: {
          totalOrders,
          totalReviews,
          totalCollections,
          totalLikes,
        },
      },
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};

// ============================================
// SOCIAL SHARING
// ============================================

/**
 * Get sharing metadata for a product
 * GET /api/social/share/product/:productId
 */
export const getProductShareData = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        game: true,
        set: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/products/${productId}`;
    const imageUrl = product.images[0]?.url || product.imageUrl;

    return res.json({
      shareData: {
        url: shareUrl,
        title: `${product.name} - ${product.game.name}`,
        description: product.description || `${product.name} from ${product.set?.name || product.game.name}`,
        image: imageUrl,
        price: product.price,
      },
    });
  } catch (error) {
    console.error('Error getting product share data:', error);
    return res.status(500).json({ error: 'Failed to get share data' });
  }
};
