import { Request, Response } from 'express';
import prisma from '../config/database';
import { emitNotificationToUser } from '../services/websocket';
import { sendEmailNotification } from '../services/emailNotificationService';

/**
 * Notification Controller
 * Handles in-app notification functionality
 */

// ============================================
// NOTIFICATION TYPES
// ============================================
export const NotificationTypes = {
  ORDER_UPDATE: 'ORDER_UPDATE',
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_REVIEW: 'NEW_REVIEW',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  PRICE_DROP: 'PRICE_DROP',
  PRODUCT_RESTOCKED: 'PRODUCT_RESTOCKED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PRODUCT_LIKED: 'PRODUCT_LIKED',
  NEW_COMMENT: 'NEW_COMMENT',
  COMMENT_REPLY: 'COMMENT_REPLY',
  COMMENT_LIKED: 'COMMENT_LIKED',
  MENTION: 'MENTION',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a notification for a user
 * This is a utility function that can be called from other controllers
 */
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string,
  data?: any
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        data: data ? JSON.stringify(data) : null,
      },
    });

    // Emit WebSocket event for real-time notification delivery
    emitNotificationToUser(userId, {
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    });

    // Send email notification if user preferences allow (async, non-blocking)
    sendEmailNotification(userId, type, title, message, link, data).catch((error) => {
      console.error('Failed to send email notification:', error);
      // Don't throw - email failures shouldn't break the notification system
    });

    // TODO: Send push notification if user has enabled it

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// ============================================
// CONTROLLERS
// ============================================

/**
 * Get all notifications for the current user
 * GET /api/notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    const whereCondition: any = { userId };
    if (unreadOnly) {
      whereCondition.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: whereCondition,
      }),
    ]);

    // Parse JSON data
    const formattedNotifications = notifications.map((notif) => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null,
    }));

    return res.json({
      data: formattedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({ error: 'Failed to get notifications' });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return res.json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:notificationId/read
 */
export const markAsRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    // Get notification and verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.json({
      message: 'Notification marked as read',
      data: {
        ...updatedNotification,
        data: updatedNotification.data ? JSON.parse(updatedNotification.data) : null,
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:notificationId
 */
export const deleteNotification = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    // Get notification and verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * Delete all read notifications
 * DELETE /api/notifications/read
 */
export const deleteAllRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    return res.json({
      message: 'Read notifications deleted successfully',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    return res.status(500).json({ error: 'Failed to delete read notifications' });
  }
};

/**
 * Get notification preferences (from UserSettings)
 * GET /api/notifications/preferences
 */
export const getPreferences = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        emailOnOrderUpdate: true,
        emailOnNewMessage: true,
        emailOnNewReview: true,
        emailOnNewFollower: true,
        emailOnPriceDrop: true,
        emailOnMarketingUpdates: true,
        notifyOnOrderUpdate: true,
        notifyOnNewMessage: true,
        notifyOnNewReview: true,
        notifyOnNewFollower: true,
        notifyOnPriceDrop: true,
      },
    });

    // Create default settings if they don't exist
    if (!settings) {
      const newSettings = await prisma.userSettings.create({
        data: { userId },
      });
      settings = {
        emailOnOrderUpdate: newSettings.emailOnOrderUpdate,
        emailOnNewMessage: newSettings.emailOnNewMessage,
        emailOnNewReview: newSettings.emailOnNewReview,
        emailOnNewFollower: newSettings.emailOnNewFollower,
        emailOnPriceDrop: newSettings.emailOnPriceDrop,
        emailOnMarketingUpdates: newSettings.emailOnMarketingUpdates,
        notifyOnOrderUpdate: newSettings.notifyOnOrderUpdate,
        notifyOnNewMessage: newSettings.notifyOnNewMessage,
        notifyOnNewReview: newSettings.notifyOnNewReview,
        notifyOnNewFollower: newSettings.notifyOnNewFollower,
        notifyOnPriceDrop: newSettings.notifyOnPriceDrop,
      };
    }

    return res.json({ preferences: settings });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return res.status(500).json({ error: 'Failed to get notification preferences' });
  }
};

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
export const updatePreferences = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const {
      emailOnOrderUpdate,
      emailOnNewMessage,
      emailOnNewReview,
      emailOnNewFollower,
      emailOnPriceDrop,
      emailOnMarketingUpdates,
      notifyOnOrderUpdate,
      notifyOnNewMessage,
      notifyOnNewReview,
      notifyOnNewFollower,
      notifyOnPriceDrop,
    } = req.body;

    // Build update data object (only update provided fields)
    const updateData: any = {};
    if (emailOnOrderUpdate !== undefined) updateData.emailOnOrderUpdate = emailOnOrderUpdate;
    if (emailOnNewMessage !== undefined) updateData.emailOnNewMessage = emailOnNewMessage;
    if (emailOnNewReview !== undefined) updateData.emailOnNewReview = emailOnNewReview;
    if (emailOnNewFollower !== undefined) updateData.emailOnNewFollower = emailOnNewFollower;
    if (emailOnPriceDrop !== undefined) updateData.emailOnPriceDrop = emailOnPriceDrop;
    if (emailOnMarketingUpdates !== undefined) updateData.emailOnMarketingUpdates = emailOnMarketingUpdates;
    if (notifyOnOrderUpdate !== undefined) updateData.notifyOnOrderUpdate = notifyOnOrderUpdate;
    if (notifyOnNewMessage !== undefined) updateData.notifyOnNewMessage = notifyOnNewMessage;
    if (notifyOnNewReview !== undefined) updateData.notifyOnNewReview = notifyOnNewReview;
    if (notifyOnNewFollower !== undefined) updateData.notifyOnNewFollower = notifyOnNewFollower;
    if (notifyOnPriceDrop !== undefined) updateData.notifyOnPriceDrop = notifyOnPriceDrop;

    // Upsert settings
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    return res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        emailOnOrderUpdate: settings.emailOnOrderUpdate,
        emailOnNewMessage: settings.emailOnNewMessage,
        emailOnNewReview: settings.emailOnNewReview,
        emailOnNewFollower: settings.emailOnNewFollower,
        emailOnPriceDrop: settings.emailOnPriceDrop,
        emailOnMarketingUpdates: settings.emailOnMarketingUpdates,
        notifyOnOrderUpdate: settings.notifyOnOrderUpdate,
        notifyOnNewMessage: settings.notifyOnNewMessage,
        notifyOnNewReview: settings.notifyOnNewReview,
        notifyOnNewFollower: settings.notifyOnNewFollower,
        notifyOnPriceDrop: settings.notifyOnPriceDrop,
      },
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};
