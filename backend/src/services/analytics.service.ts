import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Aggregate sales analytics for a given date and period
 */
export const aggregateSalesAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const startDate = getStartDate(date, period);
  const endDate = getEndDate(date, period);

  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // If sellerId is provided, filter by seller
  if (sellerId) {
    where.items = {
      some: {
        product: {
          sellerId,
        },
      },
    };
  }

  const [
    orders,
    totalRevenue,
    statusBreakdown,
    completedPayments,
    refundedAmount,
    newCustomers,
    topProduct,
  ] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        ...where,
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.order.aggregate({
      where: {
        ...where,
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        ...where,
        paymentStatus: 'REFUNDED',
      },
      _sum: { total: true },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    // Get most sold product
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: where,
      },
      _sum: { quantity: true },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 1,
    }),
  ]);

  // Calculate metrics
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  const averageOrderValue = totalOrders > 0 ? (totalRevenue._sum.total || 0) / totalOrders : 0;

  const statusCounts = statusBreakdown.reduce((acc: any, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});

  // Count unique customers (returning vs new)
  const uniqueUserIds = [...new Set(orders.map((o) => o.userId))];
  const returningCustomers = uniqueUserIds.length - newCustomers;

  return {
    date,
    period,
    totalOrders,
    totalRevenue: totalRevenue._sum.total || 0,
    totalItems,
    averageOrderValue,
    pendingOrders: statusCounts.PENDING || 0,
    processingOrders: statusCounts.PROCESSING || 0,
    shippedOrders: statusCounts.SHIPPED || 0,
    deliveredOrders: statusCounts.DELIVERED || 0,
    cancelledOrders: statusCounts.CANCELLED || 0,
    completedPayments: completedPayments._sum.total || 0,
    refundedAmount: refundedAmount._sum.total || 0,
    newCustomers,
    returningCustomers: Math.max(0, returningCustomers),
    topProductId: topProduct[0]?.productId || null,
    topProductSales: topProduct[0]?._sum.quantity || 0,
    sellerId: sellerId || null,
  };
};

/**
 * Aggregate user behavior analytics
 */
export const aggregateUserBehaviorAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
) => {
  const startDate = getStartDate(date, period);
  const endDate = getEndDate(date, period);

  const [
    totalUsers,
    newRegistrations,
    productViews,
    searchLogs,
    reviewsCreated,
    messagesExchanged,
    newFollows,
    productsLiked,
    cartItems,
    orders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.productView.count({
      where: {
        viewedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.searchLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.review.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.follow.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.productLike.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.cartItem.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  // Calculate conversion rates
  const cartConversionRate = cartItems > 0 ? (orders / cartItems) * 100 : 0;
  const checkoutAbandonmentRate = 100 - cartConversionRate;

  return {
    date,
    period,
    totalUsers,
    activeUsers: 0, // Would need session tracking
    newRegistrations,
    totalSessions: 0, // Would need session tracking
    averageSessionDuration: 0, // Would need session tracking
    productViews,
    productSearches: searchLogs,
    productsAddedToCart: cartItems,
    productsLiked,
    cartConversionRate,
    checkoutAbandonmentRate,
    reviewsCreated,
    messagesExchanged,
    newFollows,
  };
};

/**
 * Aggregate inventory analytics
 */
export const aggregateInventoryAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const startDate = getStartDate(date, period);
  const endDate = getEndDate(date, period);

  const where: any = {};
  if (sellerId) where.sellerId = sellerId;

  const [
    totalProducts,
    totalInventory,
    lowStockProducts,
    outOfStockProducts,
    newProductsAdded,
    totalInventoryValue,
  ] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where,
      _sum: { quantity: true },
    }),
    prisma.product.count({
      where: {
        ...where,
        quantity: { lte: 5, gt: 0 },
      },
    }),
    prisma.product.count({
      where: {
        ...where,
        quantity: 0,
      },
    }),
    prisma.product.count({
      where: {
        ...where,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.product.aggregate({
      where,
      _sum: { price: true },
    }),
  ]);

  return {
    date,
    period,
    totalProducts,
    totalInventory: totalInventory._sum.quantity || 0,
    lowStockProducts,
    outOfStockProducts,
    newProductsAdded,
    productsRemoved: 0, // Would need deletion tracking
    totalInventoryValue: totalInventoryValue._sum.price || 0,
    sellerId: sellerId || null,
  };
};

/**
 * Save or update sales analytics
 */
export const saveSalesAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const analytics = await aggregateSalesAnalytics(date, period, sellerId);

  const whereClause: any = {
    date_period_sellerId: {
      date,
      period,
      sellerId: sellerId !== undefined ? sellerId : null,
    },
  };

  return prisma.salesAnalytics.upsert({
    where: whereClause,
    update: analytics,
    create: analytics,
  });
};

/**
 * Save or update user behavior analytics
 */
export const saveUserBehaviorAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
) => {
  const analytics = await aggregateUserBehaviorAnalytics(date, period);

  return prisma.userBehaviorAnalytics.upsert({
    where: {
      date_period: {
        date,
        period,
      },
    },
    update: analytics,
    create: analytics,
  });
};

/**
 * Save or update inventory analytics
 */
export const saveInventoryAnalytics = async (
  date: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const analytics = await aggregateInventoryAnalytics(date, period, sellerId);

  const whereClause: any = {
    date_period_sellerId: {
      date,
      period,
      sellerId: sellerId !== undefined ? sellerId : null,
    },
  };

  return prisma.inventoryAnalytics.upsert({
    where: whereClause,
    update: analytics,
    create: analytics,
  });
};

/**
 * Get sales analytics within a date range
 */
export const getSalesAnalytics = async (
  startDate: Date,
  endDate: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const where: any = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    period,
  };

  if (sellerId) where.sellerId = sellerId;

  return prisma.salesAnalytics.findMany({
    where,
    orderBy: { date: 'asc' },
  });
};

/**
 * Get user behavior analytics within a date range
 */
export const getUserBehaviorAnalytics = async (
  startDate: Date,
  endDate: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
) => {
  return prisma.userBehaviorAnalytics.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      period,
    },
    orderBy: { date: 'asc' },
  });
};

/**
 * Get inventory analytics within a date range
 */
export const getInventoryAnalytics = async (
  startDate: Date,
  endDate: Date,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  sellerId?: string
) => {
  const where: any = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    period,
  };

  if (sellerId) where.sellerId = sellerId;

  return prisma.inventoryAnalytics.findMany({
    where,
    orderBy: { date: 'asc' },
  });
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStartDate(date: Date, period: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (period === 'DAILY') {
    return d;
  } else if (period === 'WEEKLY') {
    const day = d.getDay();
    d.setDate(d.getDate() - day); // Start of week (Sunday)
    return d;
  } else {
    // MONTHLY
    d.setDate(1); // First day of month
    return d;
  }
}

function getEndDate(date: Date, period: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);

  if (period === 'DAILY') {
    return d;
  } else if (period === 'WEEKLY') {
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day)); // End of week (Saturday)
    return d;
  } else {
    // MONTHLY
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // Last day of month
    return d;
  }
}
