import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
} from '../controllers/orderController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from '../types';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/orders
 * @desc    Create order from cart
 * @access  Private
 */
router.post('/', validate(createOrderSchema), createOrder);

/**
 * @route   GET /api/orders
 * @desc    Get user order history
 * @access  Private
 */
router.get('/', getOrders);

/**
 * @route   GET /api/orders/admin/all
 * @desc    Get all orders (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', requireRole('ADMIN'), getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', getOrderById);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin)
 */
router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', validate(cancelOrderSchema), cancelOrder);

export default router;
