import { Router } from 'express';
import {
  getPublicKey,
  subscribe,
  unsubscribe,
  sendTest,
  broadcast,
  checkStatus,
} from '../controllers/pushNotificationController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Push Notification Routes
 */

// Public routes
router.get('/status', asyncHandler(checkStatus));
router.get('/public-key', asyncHandler(getPublicKey));

// User routes (require authentication)
router.post('/subscribe', authenticate, asyncHandler(subscribe));
router.post('/unsubscribe', authenticate, asyncHandler(unsubscribe));
router.post('/test', authenticate, asyncHandler(sendTest));

// Admin routes
router.post('/broadcast', authenticate, authorize('ADMIN'), asyncHandler(broadcast));

export default router;
