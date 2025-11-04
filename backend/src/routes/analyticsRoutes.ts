import express from 'express';
import { authenticate } from '../middleware/auth';
import * as analyticsController from '../controllers/analyticsController';

const router = express.Router();

/**
 * Analytics Routes
 * Provides real-time metrics for WebSocket connections and message queues
 *
 * All routes require authentication
 * Note: In production, consider adding admin-only authorization
 */

// Get all analytics metrics
router.get('/', authenticate, analyticsController.getAllMetrics);

// Get connection metrics
router.get('/connections', authenticate, analyticsController.getConnectionMetrics);

// Get message metrics
router.get('/messages', authenticate, analyticsController.getMessageMetrics);

// Get queue metrics
router.get('/queues', authenticate, analyticsController.getQueueMetrics);

// Get active user sessions
router.get('/sessions/active', authenticate, analyticsController.getActiveSessions);

// Get recent disconnected sessions
router.get('/sessions/recent', authenticate, analyticsController.getRecentSessions);

// Get detailed statistics summary
router.get('/statistics', authenticate, analyticsController.getDetailedStatistics);

// Get specific user session
router.get('/sessions/:userId', authenticate, analyticsController.getUserSession);

export default router;
