import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminOrderController from '../controllers/adminOrderController';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ============================================
// ORDER MANAGEMENT
// ============================================
router.get('/orders', adminOrderController.getAllOrders);
router.get('/orders/stats', adminOrderController.getOrderStats);
router.get('/orders/:orderId', adminOrderController.getOrderById);
router.put('/orders/:orderId/status', adminOrderController.updateOrderStatus);
router.put('/orders/:orderId/payment-status', adminOrderController.updatePaymentStatus);
router.post('/orders/:orderId/refund', adminOrderController.refundOrder);

export default router;
