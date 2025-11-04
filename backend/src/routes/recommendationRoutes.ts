import { Router } from 'express';
import {
  getRelated,
  getSameSeller,
  getSameSet,
  getBoughtTogether,
  getPersonalized,
} from '../controllers/recommendationController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Personalized recommendations (authenticated users only)
router.get('/personalized', authenticate, asyncHandler(getPersonalized));

// Product-specific recommendations (public)
router.get('/products/:productId/related', asyncHandler(getRelated));
router.get('/products/:productId/same-seller', asyncHandler(getSameSeller));
router.get('/products/:productId/same-set', asyncHandler(getSameSet));
router.get('/products/:productId/bought-together', asyncHandler(getBoughtTogether));

export default router;
