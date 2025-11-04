import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getSalesAnalytics,
  getInventoryAnalytics,
} from '../services/analytics.service';

const prisma = new PrismaClient();

/**
 * Get seller dashboard overview
 * GET /api/seller/analytics/dashboard
 */
export const getSellerDashboard = async (req: any, res: Response) => {
  try {
    // Get seller ID from user
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get orders for this seller's products
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalOrders,
      ordersLast30Days,
      totalRevenue,
      revenueLast30Days,
      totalReviews,
      averageRating,
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId: seller.id } }),
      prisma.product.count({ where: { sellerId: seller.id, quantity: { gt: 0 } } }),
      prisma.product.count({ where: { sellerId: seller.id, quantity: { lte: 5, gt: 0 } } }),

      // Orders
      prisma.orderItem.count({
        where: { product: { sellerId: seller.id } },
      }),
      prisma.orderItem.count({
        where: {
          product: { sellerId: seller.id },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Revenue
      prisma.orderItem.aggregate({
        where: {
          product: { sellerId: seller.id },
          order: { paymentStatus: 'COMPLETED' },
        },
        _sum: { price: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          product: { sellerId: seller.id },
          order: { paymentStatus: 'COMPLETED' },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { price: true },
      }),

      // Reviews
      prisma.review.count({
        where: { sellerId: seller.id },
      }),
      prisma.review.aggregate({
        where: { sellerId: seller.id },
        _avg: { rating: true },
      }),
    ]);

    res.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: totalProducts - activeProducts,
      },
      orders: {
        total: totalOrders,
        last30Days: ordersLast30Days,
      },
      revenue: {
        total: totalRevenue._sum.price || 0,
        last30Days: revenueLast30Days._sum.price || 0,
      },
      reviews: {
        total: totalReviews,
        averageRating: averageRating._avg.rating || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching seller dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch seller dashboard' });
  }
};

/**
 * Get seller sales analytics
 * GET /api/seller/analytics/sales
 */
export const getSellerSales = async (req: any, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'DAILY',
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    // Get seller ID
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const analytics = await getSalesAnalytics(
      new Date(startDate),
      new Date(endDate),
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      seller.id
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching seller sales analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
};

/**
 * Get seller inventory analytics
 * GET /api/seller/analytics/inventory
 */
export const getSellerInventory = async (req: any, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'DAILY',
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    // Get seller ID
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const analytics = await getInventoryAnalytics(
      new Date(startDate),
      new Date(endDate),
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      seller.id
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching seller inventory analytics:', error);
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
};

/**
 * Get seller top products
 * GET /api/seller/analytics/top-products
 */
export const getSellerTopProducts = async (req: any, res: Response) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    // Get seller ID
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const where: any = {
      product: { sellerId: seller.id },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where,
      _sum: {
        quantity: true,
        price: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: Number(limit),
    });

    // Get product details
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        game: { select: { name: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    const productMap = products.reduce((acc: any, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const result = topProducts.map((item) => ({
      product: productMap[item.productId],
      quantitySold: item._sum.quantity,
      revenue: item._sum.price,
      orderCount: item._count.productId,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching seller top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
};

/**
 * Get seller orders
 * GET /api/seller/analytics/orders
 */
export const getSellerOrders = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = req.query;

    // Get seller ID
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const where: any = {
      items: {
        some: {
          product: {
            sellerId: seller.id,
          },
        },
      },
    };

    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            where: {
              product: {
                sellerId: seller.id,
              },
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Get seller performance metrics
 * GET /api/seller/analytics/performance
 */
export const getSellerPerformance = async (req: any, res: Response) => {
  try {
    // Get seller ID
    const seller = await prisma.seller.findUnique({
      where: { userId: req.user.userId },
    });

    if (!seller) {
      res.status(404).json({ error: 'Seller profile not found' });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      ordersLast30Days,
      ordersLast7Days,
      revenueLast30Days,
      revenueLast7Days,
      newReviewsLast30Days,
      averageRating,
      totalFollowers,
      newFollowersLast30Days,
    ] = await Promise.all([
      prisma.orderItem.count({
        where: {
          product: { sellerId: seller.id },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.orderItem.count({
        where: {
          product: { sellerId: seller.id },
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      prisma.orderItem.aggregate({
        where: {
          product: { sellerId: seller.id },
          order: { paymentStatus: 'COMPLETED' },
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { price: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          product: { sellerId: seller.id },
          order: { paymentStatus: 'COMPLETED' },
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: { price: true },
      }),

      prisma.review.count({
        where: {
          sellerId: seller.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.review.aggregate({
        where: { sellerId: seller.id },
        _avg: { rating: true },
      }),

      prisma.follow.count({ where: { sellerId: seller.id } }),
      prisma.follow.count({
        where: {
          sellerId: seller.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    res.json({
      orders: {
        last30Days: ordersLast30Days,
        last7Days: ordersLast7Days,
      },
      revenue: {
        last30Days: revenueLast30Days._sum.price || 0,
        last7Days: revenueLast7Days._sum.price || 0,
      },
      reviews: {
        newLast30Days: newReviewsLast30Days,
        averageRating: averageRating._avg.rating || 0,
      },
      followers: {
        total: totalFollowers,
        newLast30Days: newFollowersLast30Days,
      },
    });
  } catch (error) {
    console.error('Error fetching seller performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};
