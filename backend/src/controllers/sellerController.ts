import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Register a new seller profile
 * POST /api/sellers/register
 */
export const registerSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      businessName,
      description,
      contactEmail,
      contactPhone,
      website,
      businessAddress,
      taxId,
    } = req.body;

    // Validate required fields
    if (!businessName) {
      res.status(400).json({ error: 'Business name is required' });
      return;
    }

    // Check if user already has a seller profile
    const existingSeller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (existingSeller) {
      res.status(400).json({ error: 'Seller profile already exists' });
      return;
    }

    // Create seller profile
    const seller = await prisma.seller.create({
      data: {
        userId,
        businessName,
        description,
        contactEmail,
        contactPhone,
        website,
        businessAddress: businessAddress ? JSON.stringify(businessAddress) : null,
        taxId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Seller profile created successfully',
      seller: {
        ...seller,
        businessAddress: seller.businessAddress
          ? JSON.parse(seller.businessAddress)
          : null,
      },
    });
  } catch (error) {
    console.error('Register seller error:', error);
    res.status(500).json({ error: 'Failed to register seller' });
  }
};

/**
 * Get seller profile
 * GET /api/sellers/:sellerId
 */
export const getSellerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.params;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        products: {
          where: { quantity: { gt: 0 } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { moderationStatus: 'APPROVED' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        followers: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller not found' });
      return;
    }

    // Parse JSON fields
    const sellerData = {
      ...seller,
      businessAddress: seller.businessAddress
        ? JSON.parse(seller.businessAddress)
        : null,
      followerCount: seller.followers.length,
      productCount: await prisma.product.count({
        where: { sellerId: seller.id },
      }),
    };

    res.json(sellerData);
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ error: 'Failed to fetch seller profile' });
  }
};

/**
 * Update seller profile
 * PUT /api/sellers/profile
 */
export const updateSellerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      businessName,
      description,
      logoUrl,
      bannerUrl,
      contactEmail,
      contactPhone,
      website,
      businessAddress,
      taxId,
    } = req.body;

    // Find seller by userId
    const seller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    // Update seller profile
    const updatedSeller = await prisma.seller.update({
      where: { id: seller.id },
      data: {
        businessName: businessName || seller.businessName,
        description: description !== undefined ? description : seller.description,
        logoUrl: logoUrl !== undefined ? logoUrl : seller.logoUrl,
        bannerUrl: bannerUrl !== undefined ? bannerUrl : seller.bannerUrl,
        contactEmail: contactEmail !== undefined ? contactEmail : seller.contactEmail,
        contactPhone: contactPhone !== undefined ? contactPhone : seller.contactPhone,
        website: website !== undefined ? website : seller.website,
        businessAddress: businessAddress
          ? JSON.stringify(businessAddress)
          : seller.businessAddress,
        taxId: taxId !== undefined ? taxId : seller.taxId,
      },
    });

    res.json({
      message: 'Seller profile updated successfully',
      seller: {
        ...updatedSeller,
        businessAddress: updatedSeller.businessAddress
          ? JSON.parse(updatedSeller.businessAddress)
          : null,
      },
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    res.status(500).json({ error: 'Failed to update seller profile' });
  }
};

/**
 * Get seller dashboard statistics
 * GET /api/sellers/dashboard/stats
 */
export const getSellerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    // Get statistics
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
      recentOrders,
    ] = await Promise.all([
      // Total products
      prisma.product.count({
        where: { sellerId: seller.id },
      }),
      // Active products (in stock)
      prisma.product.count({
        where: {
          sellerId: seller.id,
          quantity: { gt: 0 },
        },
      }),
      // Total orders
      prisma.orderItem.count({
        where: {
          product: {
            sellerId: seller.id,
          },
        },
      }),
      // Pending orders
      prisma.orderItem.count({
        where: {
          product: {
            sellerId: seller.id,
          },
          order: {
            status: 'PENDING',
          },
        },
      }),
      // Total revenue
      prisma.orderItem.aggregate({
        where: {
          product: {
            sellerId: seller.id,
          },
          order: {
            paymentStatus: 'COMPLETED',
          },
        },
        _sum: {
          price: true,
        },
      }),
      // Recent orders
      prisma.orderItem.findMany({
        where: {
          product: {
            sellerId: seller.id,
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    res.json({
      stats: {
        totalProducts,
        activeProducts,
        outOfStock: totalProducts - activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenue._sum.price || 0,
        rating: seller.rating,
        totalReviews: seller.totalReviews,
        followerCount: await prisma.follow.count({
          where: { sellerId: seller.id },
        }),
      },
      recentOrders,
    });
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({ error: 'Failed to fetch seller statistics' });
  }
};

/**
 * Get seller products
 * GET /api/sellers/products
 */
export const getSellerProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      sellerId: seller.id,
    };

    if (status === 'active') {
      where.quantity = { gt: 0 };
    } else if (status === 'out-of-stock') {
      where.quantity = 0;
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          game: true,
          set: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
};

/**
 * Get seller orders
 * GET /api/sellers/orders
 */
export const getSellerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      product: {
        sellerId: seller.id,
      },
    };

    if (status && status !== 'all') {
      where.order = {
        status: String(status).toUpperCase(),
      };
    }

    const [orderItems, total] = await Promise.all([
      prisma.orderItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
              total: true,
              status: true,
              paymentStatus: true,
              shippingAddress: true,
              trackingNumber: true,
              createdAt: true,
              updatedAt: true,
            },
          },
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
        },
      }),
      prisma.orderItem.count({ where }),
    ]);

    res.json({
      orders: orderItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ error: 'Failed to fetch seller orders' });
  }
};

/**
 * Get all sellers (public)
 * GET /api/sellers
 */
export const getAllSellers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, sort = 'rating' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'sales':
        orderBy = { totalSales: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { rating: 'desc' };
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
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
          _count: {
            select: {
              products: true,
              followers: true,
            },
          },
        },
      }),
      prisma.seller.count({ where }),
    ]);

    // Parse business addresses
    const sellersWithParsedData = sellers.map((seller) => ({
      ...seller,
      businessAddress: seller.businessAddress
        ? JSON.parse(seller.businessAddress)
        : null,
    }));

    res.json({
      sellers: sellersWithParsedData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all sellers error:', error);
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
};

/**
 * Follow a seller
 * POST /api/sellers/:sellerId/follow
 */
export const followSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sellerId } = req.params;

    // Check if seller exists
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller not found' });
      return;
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        userId_sellerId: {
          userId,
          sellerId,
        },
      },
    });

    if (existingFollow) {
      res.status(400).json({ error: 'Already following this seller' });
      return;
    }

    // Create follow
    await prisma.follow.create({
      data: {
        userId,
        sellerId,
      },
    });

    res.json({ message: 'Successfully followed seller' });
  } catch (error) {
    console.error('Follow seller error:', error);
    res.status(500).json({ error: 'Failed to follow seller' });
  }
};

/**
 * Unfollow a seller
 * DELETE /api/sellers/:sellerId/follow
 */
export const unfollowSeller = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sellerId } = req.params;

    // Delete follow
    await prisma.follow.deleteMany({
      where: {
        userId,
        sellerId,
      },
    });

    res.json({ message: 'Successfully unfollowed seller' });
  } catch (error) {
    console.error('Unfollow seller error:', error);
    res.status(500).json({ error: 'Failed to unfollow seller' });
  }
};

/**
 * Get sellers followed by user
 * GET /api/sellers/following
 */
export const getFollowedSellers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const follows = await prisma.follow.findMany({
      where: { userId },
      include: {
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                products: true,
                followers: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sellers = follows.map((follow) => ({
      ...follow.seller,
      businessAddress: follow.seller.businessAddress
        ? JSON.parse(follow.seller.businessAddress)
        : null,
    }));

    res.json({ sellers });
  } catch (error) {
    console.error('Get followed sellers error:', error);
    res.status(500).json({ error: 'Failed to fetch followed sellers' });
  }
};
