import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  getPrivacySettings,
  updatePrivacySettings,
  getDisplaySettings,
  updateDisplaySettings,
} from '../controllers/userSettingsController';

const router = Router();

/**
 * User Settings Routes
 * All routes require authentication
 */

// Get all settings
router.get('/', authenticate, getSettings);

// Update all settings
router.put('/', authenticate, updateSettings);

// Privacy settings
router.get('/privacy', authenticate, getPrivacySettings);
router.put('/privacy', authenticate, updatePrivacySettings);

// Display settings
router.get('/display', authenticate, getDisplaySettings);
router.put('/display', authenticate, updateDisplaySettings);

export default router;
