/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import {
  enhancedProductSearch,
  searchAutocomplete,
  getPopularSearches,
  getTrendingSearches,
  getTrendingProducts,
  logSearch,
  logProductView,
  getSearchAnalytics,
  getRecentlyViewedProducts,
} from '../services/searchService';

/**
 * Enhanced product search
 * GET /api/search/products
 */
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  const {
    q: query = '',
    gameId,
    setId,
    condition,
    finish,
    minPrice,
    maxPrice,
    rarity,
    page = '1',
    limit = '20',
    sortBy = 'relevance',
    sortOrder = 'desc',
  } = req.query;

  const searchOptions = {
    gameId: gameId as string,
    setId: setId as string,
    condition: condition as string,
    finish: finish as string,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    rarity: rarity
      ? Array.isArray(rarity)
        ? (rarity as string[])
        : (rarity as string)
      : undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
  };

  const results = await enhancedProductSearch(query as string, searchOptions);

  // Log search for analytics
  const userId = req.user?.userId;
  logSearch(query as string, userId, searchOptions, results.pagination.total);

  res.json({
    query: query || null,
    ...results,
  });
};

/**
 * Search autocomplete
 * GET /api/search/autocomplete
 */
export const getAutocomplete = async (req: Request, res: Response): Promise<void> => {
  const { q: query = '', limit = '10' } = req.query;

  const suggestions = await searchAutocomplete(query as string, parseInt(limit as string));

  res.json({
    query,
    suggestions: suggestions || [],
    count: suggestions ? suggestions.length : 0,
  });
};

/**
 * Get popular searches
 * GET /api/search/popular
 */
export const getPopular = async (req: Request, res: Response): Promise<void> => {
  const { limit = '10' } = req.query;

  const popular = await getPopularSearches(parseInt(limit as string));

  res.json({
    popular,
    count: popular.length,
  });
};

/**
 * Get trending searches
 * GET /api/search/trending
 */
export const getTrending = async (req: Request, res: Response): Promise<void> => {
  const { limit = '10' } = req.query;

  const trending = await getTrendingSearches(parseInt(limit as string));

  res.json({
    trending,
    count: trending.length,
  });
};

/**
 * Get trending products (most viewed)
 * GET /api/search/trending-products
 */
export const getTrendingProductsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { limit = '10' } = req.query;

  const products = await getTrendingProducts(parseInt(limit as string));

  res.json({
    products,
    count: products.length,
  });
};

/**
 * Log product view
 * POST /api/search/log-view
 */
export const logView = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.body;
  const userId = req.user?.userId;

  if (!productId) {
    res.status(400).json({ error: 'Product ID is required' });
    return;
  }

  await logProductView(productId, userId);

  res.json({ message: 'View logged successfully' });
};

/**
 * Get search analytics (Admin only)
 * GET /api/search/analytics
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  const userRole = req.user?.role;

  if (userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const { days = '7' } = req.query;

  const analytics = await getSearchAnalytics(parseInt(days as string));

  res.json(analytics);
};

/**
 * Get recently viewed products for user
 * GET /api/search/recently-viewed
 */
export const getRecentlyViewed = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { limit = '10' } = req.query;

  const products = await getRecentlyViewedProducts(
    userId,
    parseInt(limit as string)
  );

  res.json({
    products,
    count: products.length,
  });
};
