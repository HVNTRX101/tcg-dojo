import Bull, { Queue, Job } from 'bull';
import { isRedisConnected } from '../config/redis';
import prisma from '../config/database';
import { emitNewMessage, isUserOnline, emitNotificationToUser } from './websocket';
import { createNotification, NotificationTypes } from '../controllers/notificationController';
import { analyticsStore } from './analytics';

/**
 * Message Queue Service
 * Handles message persistence, offline delivery, and email notifications
 *
 * Note: Queues will be null if Redis is not available
 * The application will gracefully degrade to synchronous processing
 */

// Queue definitions (nullable for graceful degradation)
export let messageQueue: Queue | null = null;
export let notificationQueue: Queue | null = null;
export let emailQueue: Queue | null = null;

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Initialize queues only if Redis is available
const initializeQueues = () => {
  try {
    messageQueue = new Bull('messages', {
      redis: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    notificationQueue = new Bull('notifications', {
      redis: redisOptions,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      },
    });

    emailQueue = new Bull('emails', {
      redis: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    });

    console.log('✅ Message queues initialized with Redis');
    return true;
  } catch (error) {
    console.warn('⚠️  Redis queues unavailable - using synchronous processing');
    messageQueue = null;
    notificationQueue = null;
    emailQueue = null;
    return false;
  }
};

// Try to initialize queues
let queuesAvailable = initializeQueues();

// ============================================
// MESSAGE QUEUE JOBS
// ============================================

interface MessageJobData {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string;
}

/**
 * Process message delivery
 */
if (messageQueue) {
  const queue: Queue = messageQueue;
  queue.process(async (job: Job<MessageJobData>) => {
  const { messageId, conversationId, senderId, receiverId, content, attachments } = job.data;

  console.log(`📨 Processing message ${messageId} for user ${receiverId}`);

  const startTime = Date.now();

  try {
    // Get full message data
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if receiver is online
    const isOnline = isUserOnline(receiverId);

    if (isOnline) {
      // User is online, deliver via WebSocket
      emitNewMessage(conversationId, {
        ...message,
        attachments: message.attachments ? JSON.parse(message.attachments) : null,
      });
      console.log(`✅ Message ${messageId} delivered via WebSocket`);

      // Track successful online delivery
      const deliveryTime = Date.now() - startTime;
      analyticsStore.trackMessageDelivered(deliveryTime, true);
      analyticsStore.trackMessageReceived(receiverId);
    } else {
      // User is offline, create notification for later
      await createNotification(
        receiverId,
        NotificationTypes.NEW_MESSAGE,
        `New message from ${message.sender.name}`,
        content.substring(0, 100),
        `/messages/${conversationId}`,
        { messageId, conversationId, senderId }
      );

      // Queue email notification if user has email notifications enabled
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: receiverId },
      });

      if (userSettings?.emailOnNewMessage && emailQueue) {
        await emailQueue.add('new-message', {
          to: message.receiver.email,
          subject: `New message from ${message.sender.name}`,
          messagePreview: content.substring(0, 100),
          conversationLink: `/messages/${conversationId}`,
        });
      }

      console.log(`📧 Message ${messageId} queued for offline delivery`);

      // Track offline delivery
      const deliveryTime = Date.now() - startTime;
      analyticsStore.trackMessageDelivered(deliveryTime, false);
    }

    // Track queue processing time
    const processingTime = Date.now() - startTime;
    analyticsStore.trackQueueProcessing(processingTime, false);

    return { success: true, delivered: isOnline };
  } catch (error) {
    console.error(`Error processing message ${messageId}:`, error);
    // Track failed delivery
    analyticsStore.trackMessageFailed();
    analyticsStore.trackQueueProcessing(Date.now() - startTime, true);
    throw error;
  }
  });
}

// ============================================
// NOTIFICATION QUEUE JOBS
// ============================================

interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: any;
  sendEmail?: boolean;
}

/**
 * Process notification delivery
 */
if (notificationQueue) {
  const queue: Queue = notificationQueue;
  queue.process(async (job: Job<NotificationJobData>) => {
  const { userId, type, title, message, link, data, sendEmail } = job.data;

  console.log(`🔔 Processing notification for user ${userId}`);

  try {
    // Create notification in database
    const notification = await createNotification(userId, type, title, message, link, data);

    // Check if user is online for real-time delivery
    const isOnline = isUserOnline(userId);

    if (isOnline) {
      emitNotificationToUser(userId, notification);
      console.log(`✅ Notification delivered via WebSocket`);
    }

    // Send email if requested and user has email enabled
    if (sendEmail) {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      const emailEnabled = getEmailPreferenceForType(userSettings, type);

      if (emailEnabled) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (user && emailQueue) {
          await emailQueue.add('notification', {
            to: user.email,
            subject: title,
            message,
            link,
          });
        }
      }
    }

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error(`Error processing notification for ${userId}:`, error);
    throw error;
  }
  });
}

// ============================================
// EMAIL QUEUE JOBS
// ============================================

interface EmailJobData {
  to: string;
  subject: string;
  message?: string;
  messagePreview?: string;
  conversationLink?: string;
  link?: string;
  template?: string;
  data?: any;
}

/**
 * Process email sending
 */
if (emailQueue) {
  const queue: Queue = emailQueue;
  queue.process(async (job: Job<EmailJobData>) => {
  const { to, subject, template, data } = job.data;

  console.log(`📧 Sending email to ${to}: ${subject}`);

  try {
    // Integrate with email service
    const { sendEmail } = await import('./emailService');

    // Send email using the email service with template
    if (template && data) {
      await sendEmail(to, subject, template, data);
    } else {
      console.warn(`⚠️  Email job missing template or data. Skipping email to ${to}`);
      return { success: false, to, subject, reason: 'Missing template or data' };
    }

    return { success: true, to, subject };
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get email preference for notification type
 */
function getEmailPreferenceForType(settings: any, type: string): boolean {
  if (!settings) return true; // Default to enabled

  const preferenceMap: { [key: string]: string } = {
    ORDER_UPDATE: 'emailOnOrderUpdate',
    NEW_MESSAGE: 'emailOnNewMessage',
    NEW_REVIEW: 'emailOnNewReview',
    NEW_FOLLOWER: 'emailOnNewFollower',
    PRICE_DROP: 'emailOnPriceDrop',
    ORDER_SHIPPED: 'emailOnOrderUpdate',
    ORDER_DELIVERED: 'emailOnOrderUpdate',
  };

  const preference = preferenceMap[type];
  return preference ? settings[preference] : false;
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Queue a message for delivery (with graceful degradation)
 */
export const queueMessageDelivery = async (messageData: MessageJobData) => {
  if (!messageQueue || !queuesAvailable) {
    console.log('⚠️  Queue unavailable - processing message synchronously');
    // Process synchronously if queue is unavailable
    await processMessageSynchronously(messageData);
    return null;
  }

  try {
    const job = await messageQueue.add(messageData, {
      priority: 1, // High priority
      delay: 0, // Immediate delivery
    });
    console.log(`✅ Message ${messageData.messageId} queued for delivery`);
    return job;
  } catch (error) {
    console.error('Error queuing message, falling back to synchronous:', error);
    await processMessageSynchronously(messageData);
    return null;
  }
};

/**
 * Queue a notification for delivery (with graceful degradation)
 */
export const queueNotificationDelivery = async (notificationData: NotificationJobData) => {
  if (!notificationQueue || !queuesAvailable) {
    console.log('⚠️  Queue unavailable - processing notification synchronously');
    await processNotificationSynchronously(notificationData);
    return null;
  }

  try {
    const job = await notificationQueue.add(notificationData, {
      priority: notificationData.type === 'ORDER_UPDATE' ? 1 : 2,
      delay: 0,
    });
    console.log(`✅ Notification queued for user ${notificationData.userId}`);
    return job;
  } catch (error) {
    console.error('Error queuing notification, falling back to synchronous:', error);
    await processNotificationSynchronously(notificationData);
    return null;
  }
};

/**
 * Queue an email for sending (with graceful degradation)
 */
export const queueEmail = async (emailData: EmailJobData) => {
  if (!emailQueue || !queuesAvailable) {
    console.log(`⚠️  Queue unavailable - would send email to ${emailData.to} synchronously`);
    // In production, you would send the email synchronously here
    return null;
  }

  try {
    const job = await emailQueue.add(emailData, {
      priority: 3, // Lower priority than real-time notifications
      delay: 1000, // Small delay to batch similar emails
    });
    console.log(`✅ Email queued to ${emailData.to}`);
    return job;
  } catch (error) {
    console.error('Error queuing email:', error);
    return null;
  }
};

// ============================================
// SYNCHRONOUS PROCESSING FALLBACKS
// ============================================

/**
 * Process message synchronously when queue is unavailable
 */
async function processMessageSynchronously(data: MessageJobData) {
  const { receiverId, conversationId, content } = data;

  const isOnline = isUserOnline(receiverId);

  if (isOnline) {
    const message = await prisma.message.findUnique({
      where: { id: data.messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    if (message) {
      emitNewMessage(conversationId, {
        ...message,
        attachments: message.attachments ? JSON.parse(message.attachments) : null,
      });
    }
  } else {
    await createNotification(
      receiverId,
      NotificationTypes.NEW_MESSAGE,
      'New message',
      content.substring(0, 100),
      `/messages/${conversationId}`,
      { messageId: data.messageId, conversationId, senderId: data.senderId }
    );
  }
}

/**
 * Process notification synchronously when queue is unavailable
 */
async function processNotificationSynchronously(data: NotificationJobData) {
  const notification = await createNotification(
    data.userId,
    data.type,
    data.title,
    data.message,
    data.link,
    data.data
  );

  if (isUserOnline(data.userId)) {
    emitNotificationToUser(data.userId, notification);
  }
}

// ============================================
// QUEUE EVENTS & MONITORING
// ============================================

// Only set up event handlers if queues are available
if (messageQueue) {
  const queue: Queue = messageQueue;
  queue.on('completed', (job: any, result: any) => {
    console.log(`✅ Message job ${job.id} completed:`, result);
  });

  queue.on('failed', (job: any, error: any) => {
    console.error(`❌ Message job ${job?.id} failed:`, error.message);
  });

  queue.on('error', (error: any) => {
    // Silently handle queue errors - already logged during initialization
  });
}

if (notificationQueue) {
  const queue: Queue = notificationQueue;
  queue.on('completed', (job: any, result: any) => {
    console.log(`✅ Notification job ${job.id} completed`);
  });

  queue.on('failed', (job: any, error: any) => {
    console.error(`❌ Notification job ${job?.id} failed:`, error.message);
  });

  queue.on('error', (error: any) => {
    // Silently handle queue errors
  });
}

if (emailQueue) {
  const queue: Queue = emailQueue;
  queue.on('completed', (job: any, result: any) => {
    console.log(`✅ Email job ${job.id} completed`);
  });

  queue.on('failed', (job: any, error: any) => {
    console.error(`❌ Email job ${job?.id} failed:`, error.message);
  });

  queue.on('error', (error: any) => {
    // Silently handle queue errors
  });
}

// ============================================
// QUEUE STATISTICS
// ============================================

/**
 * Get queue statistics (returns null if queues unavailable)
 */
export const getQueueStats = async () => {
  if (!queuesAvailable || !messageQueue || !notificationQueue || !emailQueue) {
    return null;
  }

  try {
    const [messageStats, notificationStats, emailStats] = await Promise.all([
      messageQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
      emailQueue.getJobCounts(),
    ]);

    return {
      messages: messageStats,
      notifications: notificationStats,
      emails: emailStats,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Clean old completed jobs
 */
export const cleanQueues = async (olderThan: number = 24 * 3600 * 1000) => {
  if (!queuesAvailable || !messageQueue || !notificationQueue || !emailQueue) {
    return;
  }

  try {
    await Promise.all([
      messageQueue.clean(olderThan, 'completed'),
      notificationQueue.clean(olderThan, 'completed'),
      emailQueue.clean(olderThan, 'completed'),
    ]);
    console.log('🧹 Queues cleaned');
  } catch (error) {
    // Silently fail
  }
};

// Clean queues daily (only if available)
if (queuesAvailable) {
  setInterval(() => {
    cleanQueues();
  }, 24 * 3600 * 1000);

  // Update queue metrics every 30 seconds
  setInterval(async () => {
    try {
      const stats = await getQueueStats();
      if (stats) {
        analyticsStore.updateQueueMetrics(
          stats.messages.waiting || 0,
          stats.notifications.waiting || 0,
          stats.emails.waiting || 0
        );
      }
    } catch (error) {
      // Silently handle errors
    }
  }, 30 * 1000);

  console.log('📬 Message queue service initialized with Redis');
} else {
  console.log('📬 Message queue service initialized (synchronous mode - no Redis)');
}
