import { Router } from 'express';
import {
  searchProducts,
  getAutocomplete,
  getPopular,
  getTrending,
  getTrendingProductsController,
  logView,
  getAnalytics,
  getRecentlyViewed,
} from '../controllers/searchController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/products', asyncHandler(searchProducts));
router.get('/autocomplete', asyncHandler(getAutocomplete));
router.get('/popular', asyncHandler(getPopular));
router.get('/trending', asyncHandler(getTrending));
router.get('/trending-products', asyncHandler(getTrendingProductsController));

// Protected routes - require authentication
router.post('/log-view', authenticate, asyncHandler(logView));
router.get('/recently-viewed', authenticate, asyncHandler(getRecentlyViewed));

// Admin routes
router.get('/analytics', authenticate, asyncHandler(getAnalytics));

export default router;
