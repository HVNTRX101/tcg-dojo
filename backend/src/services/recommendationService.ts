import prisma from '../config/database';

/**
 * Get related products based on game, set, rarity, and other attributes
 * @param productId - Product ID
 * @param limit - Maximum number of recommendations
 */
export const getRelatedProducts = async (productId: string, limit: number = 10) => {
  // Get the source product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      game: true,
      set: true,
    },
  });

  if (!product) {
    return [];
  }

  // Find similar products
  const relatedProducts = await prisma.product.findMany({
    where: {
      id: { not: productId }, // Exclude the source product
      gameId: product.gameId, // Same game
      quantity: { gt: 0 }, // In stock
      OR: [
        { setId: product.setId }, // Same set
        { rarity: product.rarity }, // Same rarity
        { finish: product.finish }, // Same finish
      ],
    },
    include: {
      game: {
        select: {
          id: true,
          name: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    take: limit * 2, // Get more to filter and sort
  });

  // Calculate similarity score for each product
  const scoredProducts = relatedProducts.map((relatedProduct) => {
    let score = 0;

    // Same set (highest priority)
    if (relatedProduct.setId === product.setId) {
      score += 50;
    }

    // Same rarity
    if (relatedProduct.rarity === product.rarity) {
      score += 30;
    }

    // Same finish
    if (relatedProduct.finish === product.finish) {
      score += 20;
    }

    // Similar price range (within 50%)
    const priceDiff = Math.abs(relatedProduct.price - product.price);
    const priceAvg = (relatedProduct.price + product.price) / 2;
    if (priceDiff / priceAvg < 0.5) {
      score += 15;
    }

    // Same condition
    if (relatedProduct.condition === product.condition) {
      score += 10;
    }

    // Seller rating boost
    if (relatedProduct.seller.isVerified) {
      score += 5;
    }

    return {
      ...relatedProduct,
      similarityScore: score,
    };
  });

  // Sort by similarity score and return top results
  return scoredProducts
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
};

/**
 * Get other products from the same seller
 * @param productId - Product ID
 * @param limit - Maximum number of products
 */
export const getProductsFromSameSeller = async (productId: string, limit: number = 10) => {
  // Get the source product
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return [];
  }

  // Find other products from the same seller
  const sellerProducts = await prisma.product.findMany({
    where: {
      sellerId: product.sellerId,
      id: { not: productId }, // Exclude the source product
      quantity: { gt: 0 }, // In stock
    },
    include: {
      game: {
        select: {
          id: true,
          name: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: [
      { gameId: product.gameId ? 'desc' : 'asc' }, // Prioritize same game
      { createdAt: 'desc' }, // Newer products first
    ],
    take: limit,
  });

  return sellerProducts;
};

/**
 * Get products from the same set
 * @param productId - Product ID
 * @param limit - Maximum number of products
 */
export const getProductsFromSameSet = async (productId: string, limit: number = 10) => {
  // Get the source product
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.setId) {
    return [];
  }

  // Find other products from the same set
  const setProducts = await prisma.product.findMany({
    where: {
      setId: product.setId,
      id: { not: productId }, // Exclude the source product
      quantity: { gt: 0 }, // In stock
    },
    include: {
      game: {
        select: {
          id: true,
          name: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: [
      { rarity: product.rarity ? 'desc' : 'asc' }, // Prioritize same rarity
      { price: 'asc' }, // Cheaper products first
    ],
    take: limit,
  });

  return setProducts;
};

/**
 * Get frequently bought together products
 * Based on products that appear together in orders
 * @param productId - Product ID
 * @param limit - Maximum number of recommendations
 */
export const getFrequentlyBoughtTogether = async (
  productId: string,
  limit: number = 10
) => {
  // Get orders that contain the source product
  const ordersWithProduct = await prisma.orderItem.findMany({
    where: {
      productId,
    },
    select: {
      orderId: true,
    },
  });

  const orderIds = ordersWithProduct.map((item) => item.orderId);

  if (orderIds.length === 0) {
    return [];
  }

  // Find other products in those orders
  const otherProductsInOrders = await prisma.orderItem.findMany({
    where: {
      orderId: { in: orderIds },
      productId: { not: productId }, // Exclude the source product
    },
    select: {
      productId: true,
    },
  });

  // Count occurrences
  const productCounts: { [key: string]: number } = {};
  otherProductsInOrders.forEach((item) => {
    productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
  });

  // Sort by frequency
  const sortedProductIds = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId);

  // Fetch product details
  const products = await prisma.product.findMany({
    where: {
      id: { in: sortedProductIds },
      quantity: { gt: 0 }, // In stock
    },
    include: {
      game: {
        select: {
          id: true,
          name: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  // Sort products based on frequency
  return products.sort((a, b) => {
    const aCount = productCounts[a.id] || 0;
    const bCount = productCounts[b.id] || 0;
    return bCount - aCount;
  });
};

/**
 * Get personalized recommendations for a user
 * Based on their order history and collection
 * @param userId - User ID
 * @param limit - Maximum number of recommendations
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  limit: number = 20
) => {
  // Get user's order history
  const userOrders = await prisma.order.findMany({
    where: {
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              gameId: true,
              setId: true,
              rarity: true,
              finish: true,
            },
          },
        },
      },
    },
  });

  // Aggregate preferences
  const gamePreferences: { [key: string]: number } = {};
  const setPreferences: { [key: string]: number } = {};
  const rarityPreferences: { [key: string]: number } = {};

  userOrders.forEach((order) => {
    order.items.forEach((item) => {
      const { gameId, setId, rarity } = item.product;

      gamePreferences[gameId] = (gamePreferences[gameId] || 0) + 1;
      if (setId) {
        setPreferences[setId] = (setPreferences[setId] || 0) + 1;
      }
      if (rarity) {
        rarityPreferences[rarity] = (rarityPreferences[rarity] || 0) + 1;
      }
    });
  });

  // Get top preferences
  const topGames = Object.entries(gamePreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([gameId]) => gameId);

  const topSets = Object.entries(setPreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([setId]) => setId);

  const topRarities = Object.entries(rarityPreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([rarity]) => rarity);

  if (topGames.length === 0) {
    // No order history, return popular products
    return await prisma.product.findMany({
      where: {
        quantity: { gt: 0 },
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
        set: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        seller: {
          select: {
            id: true,
            businessName: true,
            rating: true,
            isVerified: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  // Find products matching user preferences
  const recommendations = await prisma.product.findMany({
    where: {
      quantity: { gt: 0 },
      OR: [
        { gameId: { in: topGames } },
        { setId: { in: topSets } },
        { rarity: { in: topRarities } },
      ],
    },
    include: {
      game: {
        select: {
          id: true,
          name: true,
        },
      },
      set: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          isVerified: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    take: limit,
  });

  return recommendations;
};

export default {
  getRelatedProducts,
  getProductsFromSameSeller,
  getProductsFromSameSet,
  getFrequentlyBoughtTogether,
  getPersonalizedRecommendations,
};
