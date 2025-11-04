import { Router } from 'express';
import {
  getProductPriceHistory,
  getProductPriceTrends,
  getProductsWithPriceDrops,
  compareProductPrices,
  getPriceRecommendations,
} from '../controllers/priceHistoryController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Get products with recent price drops
router.get('/price-drops', asyncHandler(getProductsWithPriceDrops));

// Get price comparison for similar products
router.get('/compare', asyncHandler(compareProductPrices));

// Get price alert recommendations
router.get('/recommendations', asyncHandler(getPriceRecommendations));

// Get price history for a specific product
router.get('/products/:productId/price-history', asyncHandler(getProductPriceHistory));

// Get price trends for a specific product
router.get('/products/:productId/price-trends', asyncHandler(getProductPriceTrends));

export default router;
