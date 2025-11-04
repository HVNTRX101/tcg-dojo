import { Router } from 'express';
import {
  createPaymentIntent,
  getPaymentStatus,
  handleWebhook,
  processRefund,
  getConfig,
} from '../controllers/paymentController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/payments/config
 * @desc    Get Stripe publishable key
 * @access  Public
 */
router.get('/config', getConfig);

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create payment intent for an order
 * @access  Private
 */
router.post('/create-intent', authenticate, createPaymentIntent);

/**
 * @route   GET /api/payments/status/:paymentIntentId
 * @desc    Get payment status
 * @access  Private
 */
router.get('/status/:paymentIntentId', authenticate, getPaymentStatus);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (Stripe only)
 * @note    This route is handled specially in server.ts to accept raw body
 */
router.post('/webhook', handleWebhook);

/**
 * @route   POST /api/payments/refund
 * @desc    Process refund for an order
 * @access  Private (Admin)
 */
router.post('/refund', authenticate, requireRole('ADMIN'), processRefund);

export default router;
