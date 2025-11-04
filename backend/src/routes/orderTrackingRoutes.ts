import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getOrderTracking,
  getStatusHistory,
  updateStatus,
  setTrackingNumber,
  getMyOrders,
  getOrderStats,
} from '../controllers/orderTrackingController';

const router = Router();

/**
 * Order Tracking Routes
 * All routes require authentication
 */

// Get user's orders with filtering
router.get('/my-orders', authenticate, getMyOrders);

// Get order statistics
router.get('/stats', authenticate, getOrderStats);

// Get order with full tracking information
router.get('/:orderId/tracking', authenticate, getOrderTracking);

// Get order status history
router.get('/:orderId/history', authenticate, getStatusHistory);

// Update order status (seller/admin)
router.put('/:orderId/status', authenticate, updateStatus);

// Add tracking number (seller/admin)
router.put('/:orderId/tracking-number', authenticate, setTrackingNumber);

export default router;
