import { Job } from 'bull';
import { getQueue, QueueName } from '../config/queue';
import logger from '../config/logger';
import { sendEmail } from '../services/email.service';

/**
 * Email Worker
 *
 * Processes email sending jobs in the background
 */

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, html, text, context, attachments } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    to: Array.isArray(to) ? to.length : 1,
    subject,
  });

  try {
    await sendEmail({
      to,
      subject,
      template,
      html,
      text,
      context,
      attachments,
    });

    logger.info('Email sent successfully', {
      jobId: job.id,
      to,
    });
  } catch (error: any) {
    logger.error('Failed to send email', {
      jobId: job.id,
      error: error.message,
      to,
    });
    throw error; // Will trigger retry
  }
}

/**
 * Start email worker
 */
export function startEmailWorker(): void {
  const queue = getQueue(QueueName.EMAIL);

  queue.process(5, processEmailJob); // Process 5 jobs concurrently

  logger.info('Email worker started');
}

/**
 * Queue an email for sending
 */
export async function queueEmail(data: EmailJobData, priority?: number): Promise<string> {
  const queue = getQueue(QueueName.EMAIL);

  const job = await queue.add(data, {
    priority: priority || 3,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });

  return job.id?.toString() || '';
}

/**
 * Queue a welcome email
 */
export async function queueWelcomeEmail(
  email: string,
  name: string
): Promise<string> {
  return queueEmail({
    to: email,
    subject: 'Welcome to TCG Marketplace!',
    template: 'welcome',
    context: { name },
  }, 2); // High priority
}

/**
 * Queue an order confirmation email
 */
export async function queueOrderConfirmationEmail(
  email: string,
  orderData: any
): Promise<string> {
  return queueEmail({
    to: email,
    subject: `Order Confirmation #${orderData.orderNumber}`,
    template: 'order-confirmation',
    context: orderData,
  }, 1); // Critical priority
}

/**
 * Queue a password reset email
 */
export async function queuePasswordResetEmail(
  email: string,
  resetToken: string,
  name: string
): Promise<string> {
  return queueEmail({
    to: email,
    subject: 'Password Reset Request',
    template: 'password-reset',
    context: {
      name,
      resetToken,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
    },
  }, 2); // High priority
}

/**
 * Queue a shipping notification email
 */
export async function queueShippingNotificationEmail(
  email: string,
  shippingData: any
): Promise<string> {
  return queueEmail({
    to: email,
    subject: `Your order has shipped!`,
    template: 'shipping-notification',
    context: shippingData,
  }, 2); // High priority
}

/**
 * Queue a newsletter email
 */
export async function queueNewsletterEmail(
  recipients: string[],
  subject: string,
  content: string
): Promise<string[]> {
  // Split into batches to avoid overwhelming the queue
  const batchSize = 100;
  const jobIds: string[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    for (const email of batch) {
      const jobId = await queueEmail({
        to: email,
        subject,
        html: content,
      }, 4); // Low priority

      jobIds.push(jobId);
    }
  }

  return jobIds;
}
