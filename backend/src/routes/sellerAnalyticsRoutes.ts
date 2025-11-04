import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as sellerAnalyticsController from '../controllers/sellerAnalyticsController';

const router = express.Router();

// All seller analytics routes require SELLER role
router.use(authenticate, authorize('SELLER'));

// ============================================
// SELLER ANALYTICS
// ============================================
router.get('/dashboard', sellerAnalyticsController.getSellerDashboard);
router.get('/sales', sellerAnalyticsController.getSellerSales);
router.get('/inventory', sellerAnalyticsController.getSellerInventory);
router.get('/top-products', sellerAnalyticsController.getSellerTopProducts);
router.get('/orders', sellerAnalyticsController.getSellerOrders);
router.get('/performance', sellerAnalyticsController.getSellerPerformance);

export default router;
