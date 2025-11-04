import { Request, Response } from 'express';
import {
  getPriceHistory,
  getPriceTrends,
  getRecentPriceDrops,
  getPriceComparison,
  getPriceAlertRecommendations,
} from '../services/priceHistoryService';
import { AppError } from '../middleware/errorHandler';

/**
 * Get price history for a product
 * GET /api/products/:productId/price-history
 */
export const getProductPriceHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { productId } = req.params;
  const { limit = '50' } = req.query;

  const history = await getPriceHistory(productId, parseInt(limit as string));

  res.json({
    productId,
    history,
    count: history.length,
  });
};

/**
 * Get price trends for a product
 * GET /api/products/:productId/price-trends
 */
export const getProductPriceTrends = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { productId } = req.params;

  const trends = await getPriceTrends(productId);

  res.json({
    productId,
    trends,
  });
};

/**
 * Get products with recent price drops
 * GET /api/price-history/price-drops
 */
export const getProductsWithPriceDrops = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { days = '7', limit = '20' } = req.query;

  const priceDrops = await getRecentPriceDrops(
    parseInt(days as string),
    parseInt(limit as string)
  );

  res.json({
    priceDrops,
    count: priceDrops.length,
  });
};

/**
 * Get price comparison for similar products
 * GET /api/price-history/compare
 */
export const compareProductPrices = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { productName, gameId, setId } = req.query;

  if (!productName || !gameId) {
    throw new AppError('productName and gameId are required', 400);
  }

  const comparison = await getPriceComparison(
    productName as string,
    gameId as string,
    setId as string | undefined
  );

  res.json({
    query: {
      productName,
      gameId,
      setId: setId || null,
    },
    results: comparison,
    count: comparison.length,
  });
};

/**
 * Get price alert recommendations
 * GET /api/price-history/recommendations
 */
export const getPriceRecommendations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { limit = '20' } = req.query;

  const recommendations = await getPriceAlertRecommendations(parseInt(limit as string));

  res.json({
    recommendations,
    count: recommendations.length,
  });
};
