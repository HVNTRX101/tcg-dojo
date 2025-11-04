import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminProductController from '../controllers/adminProductController';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ============================================
// PRODUCT MANAGEMENT
// ============================================
router.get('/products', adminProductController.getAllProducts);
router.get('/products/stats', adminProductController.getProductStats);
router.put('/products/:productId', adminProductController.updateProduct);
router.delete('/products/:productId', adminProductController.deleteProduct);

// ============================================
// REVIEW MODERATION
// ============================================
router.get('/reviews', adminProductController.getAllReviews);
router.get('/reviews/pending', adminProductController.getPendingReviews);
router.put('/reviews/:reviewId/approve', adminProductController.approveReview);
router.put('/reviews/:reviewId/reject', adminProductController.rejectReview);
router.delete('/reviews/:reviewId', adminProductController.deleteReview);

export default router;
