import prisma from '../config/database';

export interface PriceChange {
  productId: string;
  newPrice: number;
  oldPrice: number;
  changeType: 'INCREASE' | 'DECREASE' | 'INITIAL';
  changePercentage: number;
}

/**
 * Record initial price for a new product
 * @param productId - Product ID
 * @param price - Initial price
 */
export const recordInitialPrice = async (
  productId: string,
  price: number
): Promise<void> => {
  await prisma.priceHistory.create({
    data: {
      productId,
      price,
      previousPrice: null,
      changeType: 'INITIAL',
      changePercentage: null,
    },
  });
};

/**
 * Record a price change
 * @param productId - Product ID
 * @param newPrice - New price
 * @param oldPrice - Old price
 */
export const recordPriceChange = async (
  productId: string,
  newPrice: number,
  oldPrice: number
): Promise<PriceChange> => {
  // Calculate change percentage
  const changePercentage = ((newPrice - oldPrice) / oldPrice) * 100;
  const changeType = newPrice > oldPrice ? 'INCREASE' : 'DECREASE';

  // Create price history record
  await prisma.priceHistory.create({
    data: {
      productId,
      price: newPrice,
      previousPrice: oldPrice,
      changeType,
      changePercentage,
    },
  });

  return {
    productId,
    newPrice,
    oldPrice,
    changeType,
    changePercentage,
  };
};

/**
 * Get price history for a product
 * @param productId - Product ID
 * @param limit - Maximum number of records to return
 */
export const getPriceHistory = async (
  productId: string,
  limit: number = 50
) => {
  return await prisma.priceHistory.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

/**
 * Get price trends for a product
 * @param productId - Product ID
 */
export const getPriceTrends = async (productId: string) => {
  const history = await getPriceHistory(productId, 100);

  if (history.length === 0) {
    return {
      currentPrice: null,
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      totalChanges: 0,
      increases: 0,
      decreases: 0,
    };
  }

  const prices = history.map((h) => h.price);
  const currentPrice = prices[0];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const increases = history.filter((h) => h.changeType === 'INCREASE').length;
  const decreases = history.filter((h) => h.changeType === 'DECREASE').length;

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    totalChanges: history.length - 1, // Exclude initial price
    increases,
    decreases,
  };
};

/**
 * Get products with recent price drops
 * @param days - Number of days to look back
 * @param limit - Maximum number of products to return
 */
export const getRecentPriceDrops = async (days: number = 7, limit: number = 20) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const priceDrops = await prisma.priceHistory.findMany({
    where: {
      changeType: 'DECREASE',
      createdAt: {
        gte: since,
      },
    },
    include: {
      product: {
        include: {
          game: true,
          set: true,
          seller: {
            select: {
              id: true,
              businessName: true,
              rating: true,
              isVerified: true,
            },
          },
        },
      },
    },
    orderBy: {
      changePercentage: 'asc', // Most negative first (biggest drops)
    },
    take: limit,
  });

  return priceDrops.map((drop) => ({
    product: drop.product,
    priceChange: {
      oldPrice: drop.previousPrice,
      newPrice: drop.price,
      changePercentage: drop.changePercentage,
      changedAt: drop.createdAt,
    },
  }));
};

/**
 * Get price comparison across sellers for similar products
 * @param productName - Product name to search for
 * @param gameId - Game ID
 * @param setId - Set ID (optional)
 */
export const getPriceComparison = async (
  productName: string,
  gameId: string,
  setId?: string
) => {
  const where: any = {
    name: {
      contains: productName,
    },
    gameId,
    quantity: {
      gt: 0,
    },
  };

  if (setId) {
    where.setId = setId;
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      priceHistory: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      price: 'asc',
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    currentPrice: product.price,
    condition: product.condition,
    finish: product.finish,
    seller: product.seller,
    lastPriceChange: product.priceHistory[0] || null,
  }));
};

/**
 * Get price alert recommendations
 * Returns products that might be good deals based on price history
 * @param limit - Maximum number of recommendations
 */
export const getPriceAlertRecommendations = async (limit: number = 20) => {
  // Get all price history records from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Find products where current price is significantly lower than average
  const priceHistory = await prisma.priceHistory.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      product: {
        include: {
          game: true,
          set: true,
          seller: {
            select: {
              id: true,
              businessName: true,
              rating: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  // Group by product
  const productPrices: { [key: string]: number[] } = {};
  const productData: { [key: string]: any } = {};

  priceHistory.forEach((record) => {
    if (!productPrices[record.productId]) {
      productPrices[record.productId] = [];
      productData[record.productId] = record.product;
    }
    productPrices[record.productId].push(record.price);
  });

  // Calculate average and find products below average
  const recommendations = Object.entries(productPrices)
    .map(([productId, prices]) => {
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;
      const current = prices[prices.length - 1];
      const percentBelowAverage = ((average - current) / average) * 100;

      return {
        product: productData[productId],
        currentPrice: current,
        averagePrice: average,
        percentBelowAverage,
      };
    })
    .filter((item) => item.percentBelowAverage > 10) // At least 10% below average
    .sort((a, b) => b.percentBelowAverage - a.percentBelowAverage)
    .slice(0, limit);

  return recommendations;
};

export default {
  recordInitialPrice,
  recordPriceChange,
  getPriceHistory,
  getPriceTrends,
  getRecentPriceDrops,
  getPriceComparison,
  getPriceAlertRecommendations,
};
