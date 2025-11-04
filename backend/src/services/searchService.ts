import prisma from '../config/database';

/**
 * Calculate Levenshtein distance for fuzzy matching
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Distance score (lower is more similar)
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
};

/**
 * Calculate relevance score for a product based on search query
 * @param product - Product to score
 * @param query - Search query
 * @returns Relevance score (higher is more relevant)
 */
const calculateRelevanceScore = (product: any, query: string): number => {
  const queryLower = query.toLowerCase();
  const nameLower = product.name.toLowerCase();
  const descriptionLower = (product.description || '').toLowerCase();
  const cardNumber = (product.cardNumber || '').toLowerCase();

  let score = 0;

  // Exact match in name (highest score)
  if (nameLower === queryLower) {
    score += 100;
  }

  // Name starts with query
  if (nameLower.startsWith(queryLower)) {
    score += 50;
  }

  // Name contains query
  if (nameLower.includes(queryLower)) {
    score += 30;
  }

  // Description contains query
  if (descriptionLower.includes(queryLower)) {
    score += 10;
  }

  // Card number matches
  if (cardNumber.includes(queryLower)) {
    score += 40;
  }

  // Fuzzy matching for typos (only if no exact match)
  if (score === 0) {
    const distance = levenshteinDistance(queryLower, nameLower);
    if (distance <= 3) {
      score += 20 - distance * 5;
    }
  }

  return score;
};

/**
 * Enhanced product search with relevance scoring and fuzzy matching
 * @param query - Search query
 * @param options - Search options
 */
export const enhancedProductSearch = async (
  query: string,
  options: {
    gameId?: string;
    setId?: string;
    condition?: string;
    finish?: string;
    minPrice?: number;
    maxPrice?: number;
    rarity?: string | string[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) => {
  const {
    gameId,
    setId,
    condition,
    finish,
    minPrice,
    maxPrice,
    rarity,
    page = 1,
    limit = 20,
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = options;

  // Build where clause
  const where: any = {
    quantity: { gt: 0 },
  };

  // Add text search conditions
  // Note: SQLite has limited case-insensitive support.
  // For production, consider switching to PostgreSQL for better search capabilities.
  if (query) {
    where.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
      { cardNumber: { contains: query } },
    ];
  }

  // Add filters
  if (gameId) where.gameId = gameId;
  if (setId) where.setId = setId;
  if (condition) where.condition = condition;
  if (finish) where.finish = finish;

  if (rarity) {
    if (Array.isArray(rarity)) {
      where.rarity = { in: rarity };
    } else {
      where.rarity = rarity;
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  // Fetch products
  const products = await prisma.product.findMany({
    where,
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

  // Calculate relevance scores if query is provided
  let scoredProducts = products.map((product) => ({
    ...product,
    relevanceScore: query ? calculateRelevanceScore(product, query) : 0,
  }));

  // Sort by relevance or other field
  if (sortBy === 'relevance' && query) {
    scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
  } else {
    scoredProducts.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a];
      const bVal = b[sortBy as keyof typeof b];
      if (aVal == null || bVal == null) return 0;
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  // Pagination
  const skip = (page - 1) * limit;
  const paginatedProducts = scoredProducts.slice(skip, skip + limit);

  return {
    products: paginatedProducts,
    pagination: {
      total: scoredProducts.length,
      page,
      limit,
      totalPages: Math.ceil(scoredProducts.length / limit),
    },
  };
};

/**
 * Search autocomplete/suggestions
 * @param query - Partial search query
 * @param limit - Maximum number of suggestions
 */
export const searchAutocomplete = async (query: string, limit = 10) => {
  if (!query || query.length < 2) {
    return [];
  }

  // Search in product names - Note: SQLite has limited case-insensitive support
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { cardNumber: { contains: query } }
      ],
      quantity: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      cardNumber: true,
      game: {
        select: {
          name: true,
        },
      },
      set: {
        select: {
          name: true,
        },
      },
    },
    take: limit,
  });

  // Format suggestions
  const suggestions = products.map((product) => ({
    id: product.id,
    name: product.name,
    cardNumber: product.cardNumber,
    game: product.game.name,
    set: product.set?.name || null,
    suggestion: `${product.name}${product.cardNumber ? ` (${product.cardNumber})` : ''} - ${product.game.name}`,
  }));

  return suggestions;
};

/**
 * Get search suggestions based on popular products and recent searches
 * @param limit - Maximum number of suggestions
 */
export const getPopularSearches = async (limit = 10) => {
  // Get most reviewed products as popular items
  const popularProducts = await prisma.product.findMany({
    where: {
      quantity: { gt: 0 },
    },
    include: {
      _count: {
        select: {
          reviews: true,
        },
      },
      game: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      reviews: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return popularProducts.map((product) => ({
    name: product.name,
    game: product.game.name,
    reviewCount: product._count.reviews,
  }));
};

/**
 * Get trending search terms (products with recent price drops or high activity)
 * @param limit - Maximum number of results
 */
export const getTrendingSearches = async (limit = 10) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get products with recent price drops
  const trendingProducts = await prisma.priceHistory.findMany({
    where: {
      changeType: 'DECREASE',
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          game: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      changePercentage: 'asc',
    },
    take: limit,
  });

  return trendingProducts.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    game: item.product.game.name,
    priceDropPercentage: item.changePercentage,
  }));
};

/**
 * Log search query for analytics
 * @param query - Search query
 * @param userId - User ID (optional)
 * @param filters - Applied filters
 * @param resultsCount - Number of results
 */
export const logSearch = async (
  query: string,
  userId: string | undefined,
  filters: any,
  resultsCount: number
) => {
  try {
    await prisma.searchLog.create({
      data: {
        userId,
        query,
        filters: filters ? JSON.stringify(filters) : null,
        resultsCount,
      },
    });
  } catch (error) {
    console.error('Failed to log search:', error);
    // Don't throw - analytics failure shouldn't break search
  }
};

/**
 * Get trending products based on recent views
 * @param limit - Maximum number of results
 */
export const getTrendingProducts = async (limit = 10) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get most viewed products in the last 7 days
  const trendingViews = await prisma.productView.groupBy({
    by: ['productId'],
    where: {
      viewedAt: {
        gte: sevenDaysAgo,
      },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: limit,
  });

  // Fetch product details
  const productIds = trendingViews.map((v) => v.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      quantity: { gt: 0 },
    },
    include: {
      game: true,
      set: true,
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  // Map products with view counts
  const productsWithViews = products.map((product) => {
    const viewData = trendingViews.find((v) => v.productId === product.id);
    return {
      ...product,
      viewCount: viewData?._count.productId || 0,
    };
  });

  // Sort by view count
  productsWithViews.sort((a, b) => b.viewCount - a.viewCount);

  return productsWithViews;
};

/**
 * Log product view for analytics
 * @param productId - Product ID
 * @param userId - User ID (optional)
 */
export const logProductView = async (
  productId: string,
  userId?: string
) => {
  try {
    await prisma.productView.create({
      data: {
        productId,
        userId,
      },
    });
  } catch (error) {
    console.error('Failed to log product view:', error);
    // Don't throw - analytics failure shouldn't break functionality
  }
};

/**
 * Get most searched terms
 * @param limit - Maximum number of results
 * @param days - Number of days to look back
 */
export const getTopSearches = async (limit = 10, days = 7) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const searches = await prisma.searchLog.groupBy({
    by: ['query'],
    where: {
      createdAt: {
        gte: daysAgo,
      },
      query: {
        not: '',
      },
    },
    _count: {
      query: true,
    },
    orderBy: {
      _count: {
        query: 'desc',
      },
    },
    take: limit,
  });

  return searches.map((s) => ({
    query: s.query,
    count: s._count.query,
  }));
};

/**
 * Get search analytics summary
 * @param days - Number of days to analyze
 */
export const getSearchAnalytics = async (days = 7) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const [totalSearches, uniqueQueries, avgResultsCount, topSearches] =
    await Promise.all([
      // Total searches
      prisma.searchLog.count({
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
      }),
      // Unique search queries
      prisma.searchLog.findMany({
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
        distinct: ['query'],
        select: {
          query: true,
        },
      }),
      // Average results count
      prisma.searchLog.aggregate({
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
        _avg: {
          resultsCount: true,
        },
      }),
      // Top searches
      getTopSearches(10, days),
    ]);

  // Calculate zero-result searches
  const zeroResultSearches = await prisma.searchLog.count({
    where: {
      createdAt: {
        gte: daysAgo,
      },
      resultsCount: 0,
    },
  });

  return {
    totalSearches,
    uniqueQueries: uniqueQueries.length,
    avgResultsCount: avgResultsCount._avg.resultsCount || 0,
    zeroResultSearches,
    zeroResultRate:
      totalSearches > 0 ? (zeroResultSearches / totalSearches) * 100 : 0,
    topSearches,
  };
};

/**
 * Get user's recently viewed products
 * @param userId - User ID
 * @param limit - Maximum number of results
 */
export const getRecentlyViewedProducts = async (
  userId: string,
  limit = 10
) => {
  const views = await prisma.productView.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    take: limit,
    distinct: ['productId'],
  });

  const productIds = views.map((v) => v.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      game: true,
      set: true,
      seller: {
        select: {
          id: true,
          businessName: true,
          rating: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  // Preserve the order from views
  const orderedProducts = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p) => p !== undefined);

  return orderedProducts;
};

export default {
  enhancedProductSearch,
  searchAutocomplete,
  getPopularSearches,
  getTrendingSearches,
  getTrendingProducts,
  logSearch,
  logProductView,
  getTopSearches,
  getSearchAnalytics,
  getRecentlyViewedProducts,
};
