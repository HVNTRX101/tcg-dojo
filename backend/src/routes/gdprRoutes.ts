import { Router } from 'express';
import {
  exportUserData,
  deleteUserData,
  requestAccountDeletion,
} from '../controllers/gdprController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GDPR Compliance Routes
 * All routes require authentication
 */

// Data export (Article 20 - Right to data portability)
router.get('/export', authenticate, asyncHandler(exportUserData));

// Request account deletion (sends confirmation code)
router.post('/delete/request', authenticate, asyncHandler(requestAccountDeletion));

// Confirm and execute account deletion (Article 17 - Right to erasure)
router.delete('/delete/confirm', authenticate, asyncHandler(deleteUserData));

export default router;
