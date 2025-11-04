import express from 'express';
import {
  registerSeller,
  getSellerProfile,
  updateSellerProfile,
  getSellerStats,
  getSellerProducts,
  getSellerOrders,
  getAllSellers,
  followSeller,
  unfollowSeller,
  getFollowedSellers,
} from '../controllers/sellerController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllSellers);
router.get('/:sellerId', getSellerProfile);

// Protected routes - require authentication
router.post('/register', authenticate, registerSeller);
router.put('/profile', authenticate, updateSellerProfile);
router.get('/dashboard/stats', authenticate, getSellerStats);
router.get('/dashboard/products', authenticate, getSellerProducts);
router.get('/dashboard/orders', authenticate, getSellerOrders);
router.post('/:sellerId/follow', authenticate, followSeller);
router.delete('/:sellerId/follow', authenticate, unfollowSeller);
router.get('/user/following', authenticate, getFollowedSellers);

export default router;
