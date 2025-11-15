import webpush from 'web-push';
import prisma from '../config/database';
import { logger } from '../config/logger';

/**
 * Push Notification Service
 * Implements Web Push API for browser push notifications
 * https://developer.mozilla.org/en-US/docs/Web/API/Push_API
 */

// VAPID keys for Web Push (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@tcgdojo.com';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

class PushNotificationService {
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Web Push with VAPID keys
   */
  private initialize() {
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        this.isConfigured = true;
        logger.info('✅ Push notification service initialized');
      } catch (error) {
        logger.error('Failed to initialize push notifications:', error);
        this.isConfigured = false;
      }
    } else {
      logger.warn('⚠️ Push notifications not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
      this.isConfigured = false;
    }
  }

  /**
   * Generate VAPID keys (run once, store in environment)
   */
  static generateVapidKeys() {
    const keys = webpush.generateVAPIDKeys();
    logger.info('Generated VAPID keys:', keys);
    return keys;
  }

  /**
   * Get VAPID public key for client
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Check if push notifications are configured
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Subscribe a user to push notifications
   * Stores subscription in database
   */
  async subscribe(userId: string, subscription: PushSubscription): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Push notifications are not configured');
    }

    try {
      // Store subscription in database (you'll need to create this model)
      // For now, we'll use user settings
      await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          pushSubscription: JSON.stringify(subscription),
          pushEnabled: true,
        },
        update: {
          pushSubscription: JSON.stringify(subscription),
          pushEnabled: true,
        },
      });

      logger.info(`User ${userId} subscribed to push notifications`);
    } catch (error) {
      logger.error(`Failed to subscribe user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string): Promise<void> {
    try {
      await prisma.userSettings.update({
        where: { userId },
        data: {
          pushSubscription: null,
          pushEnabled: false,
        },
      });

      logger.info(`User ${userId} unsubscribed from push notifications`);
    } catch (error) {
      logger.error(`Failed to unsubscribe user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Push notifications not configured, skipping');
      return false;
    }

    try {
      // Get user's push subscription from database
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { pushSubscription: true, pushEnabled: true },
      });

      if (!settings?.pushEnabled || !settings?.pushSubscription) {
        logger.debug(`User ${userId} does not have push notifications enabled`);
        return false;
      }

      const subscription = JSON.parse(settings.pushSubscription as string);

      // Send push notification
      await webpush.sendNotification(subscription, JSON.stringify(payload));

      logger.info(`Push notification sent to user ${userId}`);
      return true;
    } catch (error: any) {
      // Handle subscription expiration
      if (error.statusCode === 410) {
        logger.warn(`Push subscription expired for user ${userId}, removing`);
        await this.unsubscribe(userId);
      } else {
        logger.error(`Failed to send push notification to user ${userId}:`, error);
      }
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    const promises = userIds.map(userId => this.sendToUser(userId, payload));
    await Promise.all(promises);
  }

  /**
   * Send push notification to all users with push enabled
   */
  async broadcast(payload: PushNotificationPayload): Promise<void> {
    try {
      const usersWithPush = await prisma.userSettings.findMany({
        where: {
          pushEnabled: true,
          pushSubscription: { not: null },
        },
        select: { userId: true },
      });

      const userIds = usersWithPush.map(u => u.userId);
      logger.info(`Broadcasting push notification to ${userIds.length} users`);

      await this.sendToUsers(userIds, payload);
    } catch (error) {
      logger.error('Failed to broadcast push notification:', error);
      throw error;
    }
  }

  /**
   * Helper: Send order update notification
   */
  async sendOrderUpdate(
    userId: string,
    orderId: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Order Update',
      body: message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `order-${orderId}`,
      data: {
        type: 'order_update',
        orderId,
        status,
      },
      actions: [
        {
          action: 'view',
          title: 'View Order',
        },
      ],
      requireInteraction: true,
    });
  }

  /**
   * Helper: Send new message notification
   */
  async sendNewMessage(
    userId: string,
    senderId: string,
    senderName: string,
    message: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: `New message from ${senderName}`,
      body: message.substring(0, 100),
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `message-${senderId}`,
      data: {
        type: 'new_message',
        senderId,
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
        },
        {
          action: 'view',
          title: 'View',
        },
      ],
    });
  }

  /**
   * Helper: Send price drop notification
   */
  async sendPriceDrop(
    userId: string,
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    await this.sendToUser(userId, {
      title: 'Price Drop Alert!',
      body: `${productName} is now $${newPrice} (${discount}% off!)`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `price-drop-${productId}`,
      data: {
        type: 'price_drop',
        productId,
        oldPrice,
        newPrice,
      },
      actions: [
        {
          action: 'view',
          title: 'View Product',
        },
      ],
      requireInteraction: true,
    });
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
