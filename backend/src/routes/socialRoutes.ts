import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getActivityFeed,
  getPublicActivityFeed,
  likeProduct,
  unlikeProduct,
  getLikedProducts,
  checkProductLiked,
  getPublicProfile,
  getMyProfile,
  getProductShareData,
} from '../controllers/socialController';

const router = Router();

/**
 * Social Features Routes
 */

// ============================================
// ACTIVITY FEED
// ============================================

// Get user's personalized activity feed (requires auth)
router.get('/feed', authenticate, getActivityFeed);

// Get public activity feed (no auth required)
router.get('/feed/public', getPublicActivityFeed);

// ============================================
// PRODUCT LIKES (FAVORITES)
// ============================================

// Get user's liked products
router.get('/likes', authenticate, getLikedProducts);

// Check if product is liked
router.get('/likes/:productId/check', authenticate, checkProductLiked);

// Like a product
router.post('/likes/:productId', authenticate, likeProduct);

// Unlike a product
router.delete('/likes/:productId', authenticate, unlikeProduct);

// ============================================
// PUBLIC PROFILES
// ============================================

// Get current user's profile
router.get('/profile/me', authenticate, getMyProfile);

// Get public user profile
router.get('/profiles/:userId', getPublicProfile);

// ============================================
// SOCIAL SHARING
// ============================================

// Get sharing metadata for a product
router.get('/share/product/:productId', getProductShareData);

export default router;
