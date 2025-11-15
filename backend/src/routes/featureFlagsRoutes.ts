import { Router } from 'express';
import {
  getAllFlags,
  getFlag,
  getMyFlags,
  checkFlag,
  createFlag,
  updateFlag,
  toggleFlag,
  deleteFlag,
  exportFlags,
  importFlags,
} from '../controllers/featureFlagsController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Feature Flags Routes
 */

// Public/User routes (require authentication)
router.get('/my-flags', authenticate, asyncHandler(getMyFlags));
router.get('/check/:flagKey', authenticate, asyncHandler(checkFlag));

// Admin routes (require admin role)
router.get('/', authenticate, authorize('ADMIN'), asyncHandler(getAllFlags));
router.get('/:flagKey', authenticate, authorize('ADMIN'), asyncHandler(getFlag));
router.post('/', authenticate, authorize('ADMIN'), asyncHandler(createFlag));
router.put('/:flagKey', authenticate, authorize('ADMIN'), asyncHandler(updateFlag));
router.patch('/:flagKey/toggle', authenticate, authorize('ADMIN'), asyncHandler(toggleFlag));
router.delete('/:flagKey', authenticate, authorize('ADMIN'), asyncHandler(deleteFlag));

// Import/Export (admin only)
router.get('/admin/export', authenticate, authorize('ADMIN'), asyncHandler(exportFlags));
router.post('/admin/import', authenticate, authorize('ADMIN'), asyncHandler(importFlags));

export default router;
