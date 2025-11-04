import Bull, { Queue, Job, JobOptions } from 'bull';
import { redisClient } from './redis';
import logger from './logger';

/**
 * Queue Configuration
 *
 * Provides centralized queue management for background jobs
 */

// Queue names
export enum QueueName {
  EMAIL = 'email-queue',
  IMAGE_PROCESSING = 'image-processing-queue',
  ANALYTICS = 'analytics-queue',
  NOTIFICATIONS = 'notification-queue',
  REPORTS = 'reports-queue',
  DATA_EXPORT = 'data-export-queue',
  CLEANUP = 'cleanup-queue',
}

// Job priorities
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

// Default job options
const defaultJobOptions: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
};

// Redis connection config for Bull
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Queue instances
const queues: Map<QueueName, Queue> = new Map();

/**
 * Create or get a queue instance
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Bull(name, {
      redis: redisConfig,
      defaultJobOptions,
    });

    // Event handlers
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, {
        jobId: job.id,
        error: error.message,
        data: job.data,
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} in queue ${name} stalled`, {
        jobId: job.id,
      });
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue ${name} completed`, {
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      });
    });

    queues.set(name, queue);
  }

  return queues.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T = any>(
  queueName: QueueName,
  data: T,
  options?: JobOptions
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  const job = await queue.add(data, options);

  logger.info(`Job added to ${queueName}:`, {
    jobId: job.id,
    data,
  });

  return job;
}

/**
 * Add a delayed job to a queue
 */
export async function addDelayedJob<T = any>(
  queueName: QueueName,
  data: T,
  delay: number,
  options?: JobOptions
): Promise<Job<T>> {
  return addJob(queueName, data, {
    ...options,
    delay,
  });
}

/**
 * Add a repeating job to a queue
 */
export async function addRepeatingJob<T = any>(
  queueName: QueueName,
  data: T,
  cron: string,
  options?: JobOptions
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  const job = await queue.add(data, {
    ...options,
    repeat: {
      cron,
    },
  });

  logger.info(`Repeating job added to ${queueName}:`, {
    jobId: job.id,
    cron,
  });

  return job;
}

/**
 * Get job by ID
 */
export async function getJob(
  queueName: QueueName,
  jobId: string
): Promise<Job | null> {
  const queue = getQueue(queueName);
  return queue.getJob(jobId);
}

/**
 * Remove a job from queue
 */
export async function removeJob(
  queueName: QueueName,
  jobId: string
): Promise<void> {
  const job = await getJob(queueName, jobId);
  if (job) {
    await job.remove();
    logger.info(`Job ${jobId} removed from ${queueName}`);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: QueueName) {
  const queue = getQueue(queueName);

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get all queue statistics
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.values(QueueName).map(name => getQueueStats(name as QueueName))
  );
  return stats;
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
  logger.info(`Queue ${queueName} paused`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
  logger.info(`Queue ${queueName} resumed`);
}

/**
 * Clean old jobs from queue
 */
export async function cleanQueue(
  queueName: QueueName,
  grace: number = 24 * 60 * 60 * 1000, // 24 hours default
  status?: 'completed' | 'failed'
): Promise<void> {
  const queue = getQueue(queueName);
  await queue.clean(grace, status);
  logger.info(`Queue ${queueName} cleaned`, { grace, status });
}

/**
 * Empty a queue (remove all jobs)
 */
export async function emptyQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.empty();
  logger.info(`Queue ${queueName} emptied`);
}

/**
 * Close all queues
 */
export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queues...');

  const closePromises = Array.from(queues.values()).map(queue => queue.close());
  await Promise.all(closePromises);

  queues.clear();
  logger.info('All queues closed');
}

/**
 * Graceful shutdown
 */
export async function gracefulShutdown(): Promise<void> {
  logger.info('Initiating graceful shutdown of queues...');

  // Pause all queues
  await Promise.all(
    Array.from(queues.keys()).map(name => pauseQueue(name))
  );

  // Wait for active jobs to complete (max 30 seconds)
  const timeout = 30000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const stats = await getAllQueueStats();
    const activeJobs = stats.reduce((sum, stat) => sum + stat.active, 0);

    if (activeJobs === 0) {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close all queues
  await closeAllQueues();

  logger.info('Queue graceful shutdown completed');
}

// Export queue instances for direct access if needed
export { queues };
