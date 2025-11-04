import express from 'express';
import {
  createReview,
  getProductReviews,
  getSellerReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  moderateReview,
  getPendingReviews,
  getUserReviews,
} from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/seller/:sellerId', getSellerReviews);

// Protected routes - require authentication
router.post('/', authenticate, createReview);
router.put('/:reviewId', authenticate, updateReview);
router.delete('/:reviewId', authenticate, deleteReview);
router.post('/:reviewId/helpful', authenticate, markReviewHelpful);
router.get('/user/my-reviews', authenticate, getUserReviews);

// Admin routes
router.get('/moderate/pending', authenticate, getPendingReviews);
router.put('/:reviewId/moderate', authenticate, moderateReview);

export default router;
