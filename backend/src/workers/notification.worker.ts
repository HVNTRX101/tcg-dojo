import { Job } from 'bull';
import { getQueue, QueueName } from '../config/queue';
import { prisma } from '../config/database';
import logger from '../config/logger';
import { emitToUser } from '../services/websocket.service';

/**
 * Notification Worker
 *
 * Processes notification creation and delivery in the background
 */

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

/**
 * Process notification job
 */
async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { userId, type, title, message, data, link } = job.data;

  logger.info('Processing notification job', {
    jobId: job.id,
    userId,
    type,
  });

  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
        link,
        read: false,
      },
    });

    // Send real-time notification via WebSocket
    emitToUser(userId, 'notification', {
      id: notification.id,
      type,
      title,
      message,
      data,
      link,
      createdAt: notification.createdAt,
    });

    logger.info('Notification created and sent', {
      jobId: job.id,
      notificationId: notification.id,
      userId,
    });
  } catch (error: any) {
    logger.error('Failed to process notification', {
      jobId: job.id,
      error: error.message,
      userId,
    });
    throw error;
  }
}

/**
 * Start notification worker
 */
export function startNotificationWorker(): void {
  const queue = getQueue(QueueName.NOTIFICATIONS);

  queue.process(10, processNotificationJob); // Process 10 notifications concurrently

  logger.info('Notification worker started');
}

/**
 * Queue a notification
 */
export async function queueNotification(
  data: NotificationJobData,
  priority?: number
): Promise<string> {
  const queue = getQueue(QueueName.NOTIFICATIONS);

  const job = await queue.add(data, {
    priority: priority || 3,
    attempts: 3,
  });

  return job.id?.toString() || '';
}

/**
 * Queue order notification
 */
export async function queueOrderNotification(
  userId: string,
  orderNumber: string,
  status: string
): Promise<string> {
  return queueNotification({
    userId,
    type: 'ORDER_UPDATE',
    title: 'Order Update',
    message: `Your order #${orderNumber} status has been updated to ${status}`,
    link: `/orders/${orderNumber}`,
    data: { orderNumber, status },
  }, 2); // High priority
}

/**
 * Queue price drop notification
 */
export async function queuePriceDropNotification(
  userId: string,
  productName: string,
  oldPrice: number,
  newPrice: number,
  productId: string
): Promise<string> {
  return queueNotification({
    userId,
    type: 'PRICE_DROP',
    title: 'Price Drop Alert',
    message: `${productName} is now $${newPrice} (was $${oldPrice})!`,
    link: `/products/${productId}`,
    data: { productId, productName, oldPrice, newPrice },
  }, 3);
}

/**
 * Queue low stock notification
 */
export async function queueLowStockNotification(
  sellerId: string,
  productName: string,
  quantity: number,
  productId: string
): Promise<string> {
  return queueNotification({
    userId: sellerId,
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: `${productName} has only ${quantity} units left`,
    link: `/seller/inventory/${productId}`,
    data: { productId, productName, quantity },
  }, 2); // High priority
}
