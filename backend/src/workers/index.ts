/**
 * Workers Index
 *
 * Centralized worker initialization and management
 */

import logger from '../config/logger';
import { gracefulShutdown } from '../config/queue';
import { startEmailWorker } from './email.worker';
import { startAnalyticsWorker, scheduleDailyAnalytics } from './analytics.worker';
import { startImageProcessingWorker } from './imageProcessing.worker';
import { startNotificationWorker } from './notification.worker';
import { startCleanupWorker, scheduleCleanupJobs } from './cleanup.worker';

/**
 * Start all workers
 */
export async function startAllWorkers(): Promise<void> {
  logger.info('Starting all workers...');

  try {
    // Start individual workers
    startEmailWorker();
    startAnalyticsWorker();
    startImageProcessingWorker();
    startNotificationWorker();
    startCleanupWorker();

    // Schedule recurring jobs
    await scheduleDailyAnalytics();
    await scheduleCleanupJobs();

    logger.info('All workers started successfully');
  } catch (error: any) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

/**
 * Stop all workers gracefully
 */
export async function stopAllWorkers(): Promise<void> {
  logger.info('Stopping all workers...');

  try {
    await gracefulShutdown();
    logger.info('All workers stopped successfully');
  } catch (error: any) {
    logger.error('Error stopping workers:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers...');
  await stopAllWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers...');
  await stopAllWorkers();
  process.exit(0);
});
