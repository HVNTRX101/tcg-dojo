import { Router } from 'express';
import {
  getPerformanceStats,
  getSlowQueries,
  getConnectionStats,
  getTableStats,
  clearMetrics,
  getDatabaseHealthReport,
} from '../controllers/databaseMonitoringController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Database Monitoring Routes
 * All routes require authentication and admin role
 */

// Health report (comprehensive overview)
router.get('/health', authenticate, authorize('ADMIN'), asyncHandler(getDatabaseHealthReport));

// Query performance statistics
router.get('/performance', authenticate, authorize('ADMIN'), asyncHandler(getPerformanceStats));

// Recent slow queries
router.get('/slow-queries', authenticate, authorize('ADMIN'), asyncHandler(getSlowQueries));

// Database connection statistics
router.get('/connections', authenticate, authorize('ADMIN'), asyncHandler(getConnectionStats));

// Table statistics
router.get('/tables', authenticate, authorize('ADMIN'), asyncHandler(getTableStats));

// Clear metrics (admin only)
router.delete('/metrics', authenticate, authorize('ADMIN'), asyncHandler(clearMetrics));

export default router;
