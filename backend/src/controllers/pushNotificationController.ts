import { Request, Response } from 'express';
import { pushNotificationService, PushSubscription } from '../services/pushNotification.service';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

/**
 * Get VAPID public key for client
 */
export const getPublicKey = async (req: Request, res: Response): Promise<void> => {
  const publicKey = pushNotificationService.getPublicKey();

  if (!publicKey) {
    throw new AppError('Push notifications are not configured', 503);
  }

  res.json({ publicKey });
};

/**
 * Subscribe to push notifications
 */
export const subscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const subscription: PushSubscription = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new AppError('Invalid push subscription', 400);
  }

  try {
    await pushNotificationService.subscribe(userId, subscription);
    res.json({ message: 'Successfully subscribed to push notifications' });
  } catch (error: any) {
    throw new AppError('Failed to subscribe to push notifications', 500);
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    await pushNotificationService.unsubscribe(userId);
    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error: any) {
    throw new AppError('Failed to unsubscribe from push notifications', 500);
  }
};

/**
 * Send test push notification (authenticated users only)
 */
export const sendTest = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    const sent = await pushNotificationService.sendToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from TCG Dojo!',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'test',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    });

    if (sent) {
      res.json({ message: 'Test notification sent successfully' });
    } else {
      res.json({ message: 'Push notifications not enabled for your account' });
    }
  } catch (error: any) {
    throw new AppError('Failed to send test notification', 500);
  }
};

/**
 * Broadcast notification to all users (admin only)
 */
export const broadcast = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, body, icon, data } = req.body;

  if (!title || !body) {
    throw new AppError('Title and body are required', 400);
  }

  try {
    await pushNotificationService.broadcast({
      title,
      body,
      icon: icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data,
    });

    res.json({ message: 'Broadcast notification sent successfully' });
  } catch (error: any) {
    throw new AppError('Failed to broadcast notification', 500);
  }
};

/**
 * Check if push notifications are enabled
 */
export const checkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const isEnabled = pushNotificationService.isEnabled();
  res.json({
    enabled: isEnabled,
    message: isEnabled
      ? 'Push notifications are enabled'
      : 'Push notifications are not configured',
  });
};
