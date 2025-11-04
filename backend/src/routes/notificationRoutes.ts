import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController';

const router = Router();

/**
 * Notification Routes
 * All routes require authentication
 */

// Get all notifications
router.get('/', authenticate, getNotifications);

// Get unread notification count
router.get('/unread-count', authenticate, getUnreadCount);

// Get notification preferences
router.get('/preferences', authenticate, getPreferences);

// Update notification preferences
router.put('/preferences', authenticate, updatePreferences);

// Mark all notifications as read
router.put('/read-all', authenticate, markAllAsRead);

// Mark single notification as read
router.put('/:notificationId/read', authenticate, markAsRead);

// Delete all read notifications
router.delete('/read', authenticate, deleteAllRead);

// Delete a notification
router.delete('/:notificationId', authenticate, deleteNotification);

export default router;
