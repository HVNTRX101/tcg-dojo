import { Job } from 'bull';
import { getQueue, QueueName, addRepeatingJob } from '../config/queue';
import { prisma } from '../config/database';
import logger from '../config/logger';

/**
 * Analytics Worker
 *
 * Processes analytics aggregation jobs in the background
 */

export interface AnalyticsJobData {
  type: 'sales' | 'user-behavior' | 'inventory' | 'revenue' | 'seller-performance';
  date?: Date;
  sellerId?: string;
}

/**
 * Aggregate sales analytics
 */
async function aggregateSalesAnalytics(date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get orders for the day
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'COMPLETED',
    },
    include: {
      items: true,
    },
  });

  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0);

  // Upsert analytics record
  await prisma.salesAnalytics.upsert({
    where: {
      date_period: {
        date: startOfDay,
        period: 'DAILY',
      },
    },
    create: {
      date: startOfDay,
      period: 'DAILY',
      totalOrders,
      totalRevenue,
      avgOrderValue,
      totalItemsSold: totalItems,
    },
    update: {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      totalItemsSold: totalItems,
    },
  });

  logger.info('Sales analytics aggregated', {
    date: startOfDay,
    totalOrders,
    totalRevenue,
  });
}

/**
 * Aggregate user behavior analytics
 */
async function aggregateUserBehaviorAnalytics(date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get active users (users who placed orders or added to cart)
  const activeUsers = await prisma.user.count({
    where: {
      OR: [
        {
          orders: {
            some: {
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
        },
        {
          cart: {
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      ],
    },
  });

  // Get new registrations
  const newRegistrations = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Get bounce rate (users who viewed products but didn't add to cart)
  // This would need tracking implementation
  const bounceRate = 0; // Placeholder

  // Upsert analytics record
  await prisma.userBehaviorAnalytics.upsert({
    where: {
      date_period: {
        date: startOfDay,
        period: 'DAILY',
      },
    },
    create: {
      date: startOfDay,
      period: 'DAILY',
      activeUsers,
      newRegistrations,
      avgSessionDuration: 0, // Would need tracking
      bounceRate,
      conversionRate: 0, // Would calculate from cart to order ratio
    },
    update: {
      activeUsers,
      newRegistrations,
    },
  });

  logger.info('User behavior analytics aggregated', {
    date: startOfDay,
    activeUsers,
    newRegistrations,
  });
}

/**
 * Aggregate inventory analytics
 */
async function aggregateInventoryAnalytics(date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // Get total products
  const totalProducts = await prisma.product.count();

  // Get low stock products (quantity < 10)
  const lowStockProducts = await prisma.product.count({
    where: {
      quantity: {
        lt: 10,
      },
    },
  });

  // Get out of stock products
  const outOfStockProducts = await prisma.product.count({
    where: {
      quantity: 0,
    },
  });

  // Calculate total inventory value
  const products = await prisma.product.findMany({
    select: {
      price: true,
      quantity: true,
    },
  });

  const totalInventoryValue = products.reduce(
    (sum, p) => sum + (p.price * p.quantity),
    0
  );

  // Upsert analytics record
  await prisma.inventoryAnalytics.upsert({
    where: {
      date_period: {
        date: startOfDay,
        period: 'DAILY',
      },
    },
    create: {
      date: startOfDay,
      period: 'DAILY',
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
    },
    update: {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
    },
  });

  logger.info('Inventory analytics aggregated', {
    date: startOfDay,
    totalProducts,
    lowStockProducts,
  });
}

/**
 * Process analytics job
 */
async function processAnalyticsJob(job: Job<AnalyticsJobData>): Promise<void> {
  const { type, date = new Date() } = job.data;

  logger.info('Processing analytics job', {
    jobId: job.id,
    type,
    date,
  });

  try {
    switch (type) {
      case 'sales':
        await aggregateSalesAnalytics(date);
        break;
      case 'user-behavior':
        await aggregateUserBehaviorAnalytics(date);
        break;
      case 'inventory':
        await aggregateInventoryAnalytics(date);
        break;
      default:
        logger.warn('Unknown analytics type', { type });
    }
  } catch (error: any) {
    logger.error('Failed to process analytics', {
      jobId: job.id,
      error: error.message,
      type,
    });
    throw error;
  }
}

/**
 * Start analytics worker
 */
export function startAnalyticsWorker(): void {
  const queue = getQueue(QueueName.ANALYTICS);

  queue.process(2, processAnalyticsJob); // Process 2 jobs concurrently

  logger.info('Analytics worker started');
}

/**
 * Schedule daily analytics jobs
 */
export async function scheduleDailyAnalytics(): Promise<void> {
  // Run at 1 AM every day
  await addRepeatingJob(
    QueueName.ANALYTICS,
    { type: 'sales' },
    '0 1 * * *'
  );

  await addRepeatingJob(
    QueueName.ANALYTICS,
    { type: 'user-behavior' },
    '0 1 * * *'
  );

  await addRepeatingJob(
    QueueName.ANALYTICS,
    { type: 'inventory' },
    '0 1 * * *'
  );

  logger.info('Daily analytics jobs scheduled');
}

/**
 * Trigger manual analytics aggregation
 */
export async function triggerAnalytics(
  type: AnalyticsJobData['type'],
  date?: Date
): Promise<string> {
  const queue = getQueue(QueueName.ANALYTICS);

  const job = await queue.add({
    type,
    date: date || new Date(),
  });

  return job.id?.toString() || '';
}
