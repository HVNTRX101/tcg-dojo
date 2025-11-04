import { Job } from 'bull';
import { getQueue, QueueName, addRepeatingJob } from '../config/queue';
import { prisma } from '../config/database';
import logger from '../config/logger';

/**
 * Cleanup Worker
 *
 * Handles scheduled cleanup tasks
 */

export interface CleanupJobData {
  type: 'expired-tokens' | 'old-notifications' | 'abandoned-carts' | 'temp-files' | 'old-logs';
}

/**
 * Clean expired password reset tokens
 */
async function cleanExpiredTokens(): Promise<void> {
  const result = await prisma.user.updateMany({
    where: {
      resetPasswordToken: {
        not: null,
      },
      resetPasswordExpires: {
        lt: new Date(),
      },
    },
    data: {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  logger.info('Expired tokens cleaned', { count: result.count });
}

/**
 * Clean old read notifications (older than 30 days)
 */
async function cleanOldNotifications(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  logger.info('Old notifications cleaned', { count: result.count });
}

/**
 * Clean abandoned carts (older than 7 days with no update)
 */
async function cleanAbandonedCarts(): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // First, delete cart items
  await prisma.cartItem.deleteMany({
    where: {
      cart: {
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
    },
  });

  // Then delete empty carts
  const result = await prisma.cart.deleteMany({
    where: {
      updatedAt: {
        lt: sevenDaysAgo,
      },
      items: {
        none: {},
      },
    },
  });

  logger.info('Abandoned carts cleaned', { count: result.count });
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
  const { type } = job.data;

  logger.info('Processing cleanup job', {
    jobId: job.id,
    type,
  });

  try {
    switch (type) {
      case 'expired-tokens':
        await cleanExpiredTokens();
        break;
      case 'old-notifications':
        await cleanOldNotifications();
        break;
      case 'abandoned-carts':
        await cleanAbandonedCarts();
        break;
      default:
        logger.warn('Unknown cleanup type', { type });
    }
  } catch (error: any) {
    logger.error('Failed to process cleanup', {
      jobId: job.id,
      error: error.message,
      type,
    });
    throw error;
  }
}

/**
 * Start cleanup worker
 */
export function startCleanupWorker(): void {
  const queue = getQueue(QueueName.CLEANUP);

  queue.process(1, processCleanupJob); // Process 1 job at a time

  logger.info('Cleanup worker started');
}

/**
 * Schedule cleanup jobs
 */
export async function scheduleCleanupJobs(): Promise<void> {
  // Clean expired tokens every hour
  await addRepeatingJob(
    QueueName.CLEANUP,
    { type: 'expired-tokens' },
    '0 * * * *'
  );

  // Clean old notifications daily at 3 AM
  await addRepeatingJob(
    QueueName.CLEANUP,
    { type: 'old-notifications' },
    '0 3 * * *'
  );

  // Clean abandoned carts daily at 4 AM
  await addRepeatingJob(
    QueueName.CLEANUP,
    { type: 'abandoned-carts' },
    '0 4 * * *'
  );

  logger.info('Cleanup jobs scheduled');
}
