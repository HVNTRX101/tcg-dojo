import { sendEmail } from './emailService';
import prisma from '../config/database';
import { config } from '../config/env';

/**
 * Email Notification Service
 * Handles sending email notifications based on user preferences
 */

// Map notification types to email preference fields
const notificationTypeToPreference: Record<string, keyof typeof defaultPreferences> = {
  ORDER_UPDATE: 'emailOnOrderUpdate',
  ORDER_SHIPPED: 'emailOnOrderUpdate',
  ORDER_DELIVERED: 'emailOnOrderUpdate',
  PAYMENT_SUCCESS: 'emailOnOrderUpdate',
  PAYMENT_FAILED: 'emailOnOrderUpdate',
  NEW_MESSAGE: 'emailOnNewMessage',
  NEW_REVIEW: 'emailOnNewReview',
  NEW_FOLLOWER: 'emailOnNewFollower',
  PRICE_DROP: 'emailOnPriceDrop',
  PRODUCT_RESTOCKED: 'emailOnPriceDrop',
  PRODUCT_LIKED: 'emailOnNewFollower', // Use follower preference for social interactions
  NEW_COMMENT: 'emailOnNewReview', // Use review preference for comments
  MENTION: 'emailOnNewMessage', // Use message preference for mentions
};

const defaultPreferences = {
  emailOnOrderUpdate: true,
  emailOnNewMessage: true,
  emailOnNewReview: true,
  emailOnNewFollower: true,
  emailOnPriceDrop: true,
};

/**
 * Check if user has email notifications enabled for a specific type
 */
const shouldSendEmail = async (userId: string, notificationType: string): Promise<boolean> => {
  try {
    // Get user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        emailOnOrderUpdate: true,
        emailOnNewMessage: true,
        emailOnNewReview: true,
        emailOnNewFollower: true,
        emailOnPriceDrop: true,
        emailOnMarketingUpdates: true,
      },
    });

    // If no settings exist, use defaults
    if (!settings) {
      const preferenceField = notificationTypeToPreference[notificationType];
      return preferenceField ? defaultPreferences[preferenceField] : false;
    }

    // Check the specific preference
    const preferenceField = notificationTypeToPreference[notificationType];
    if (!preferenceField) return false;

    return settings[preferenceField] ?? true;
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return false;
  }
};

/**
 * Get user email address
 */
const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isVerified: true },
    });

    // Only send emails to verified users
    if (!user || !user.isVerified) {
      return null;
    }

    return user.email;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

/**
 * Send email notification based on notification type
 */
export const sendEmailNotification = async (
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  link?: string,
  data?: any
): Promise<void> => {
  try {
    // Check if user wants email notifications for this type
    const shouldSend = await shouldSendEmail(userId, notificationType);
    if (!shouldSend) {
      console.log(`Email notification skipped for user ${userId} (preference disabled for ${notificationType})`);
      return;
    }

    // Get user email
    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      console.log(`Email notification skipped for user ${userId} (email not verified or not found)`);
      return;
    }

    // Get user name for personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const userName = user?.email.split('@')[0] || 'User';

    // Prepare email data based on notification type
    const emailData = {
      userName,
      title,
      message,
      link: link ? `${config.app.frontendUrl}${link}` : undefined,
      actionUrl: link ? `${config.app.frontendUrl}${link}` : undefined,
      year: new Date().getFullYear(),
      ...data,
    };

    // Send email based on notification type
    let emailSubject = title;
    let templateName = 'generic-notification';

    switch (notificationType) {
      case 'NEW_FOLLOWER':
        templateName = 'new-follower';
        emailSubject = `${data?.followerName || 'Someone'} started following you!`;
        break;

      case 'NEW_MESSAGE':
        templateName = 'new-message';
        emailSubject = `New message from ${data?.senderName || 'a user'}`;
        break;

      case 'NEW_REVIEW':
        templateName = 'new-review';
        emailSubject = data?.productName
          ? `New review on ${data.productName}`
          : 'You received a new review';
        break;

      case 'PRICE_DROP':
        templateName = 'price-drop';
        emailSubject = `Price drop alert: ${data?.productName || 'Product on your wishlist'}`;
        break;

      case 'PRODUCT_RESTOCKED':
        templateName = 'product-restocked';
        emailSubject = `Back in stock: ${data?.productName || 'Product on your wishlist'}`;
        break;

      case 'PRODUCT_LIKED':
        templateName = 'product-liked';
        emailSubject = `${data?.likerName || 'Someone'} liked your product`;
        break;

      case 'NEW_COMMENT':
        templateName = 'new-comment';
        emailSubject = `${data?.commenterName || 'Someone'} commented on your ${data?.commentContext || 'post'}`;
        break;

      case 'MENTION':
        templateName = 'mention';
        emailSubject = `${data?.mentionerName || 'Someone'} mentioned you`;
        break;

      default:
        // Use generic template for unknown types
        templateName = 'generic-notification';
        emailSubject = title;
    }

    // Send the email
    await sendEmail(userEmail, emailSubject, templateName, emailData);

    console.log(`✅ Email notification sent to ${userEmail} for ${notificationType}`);
  } catch (error: any) {
    // Log error but don't throw - email failures shouldn't break the app
    console.error(`Failed to send email notification for ${notificationType}:`, error.message);
  }
};

/**
 * Send bulk email notifications (e.g., marketing emails)
 */
export const sendBulkEmailNotification = async (
  userIds: string[],
  subject: string,
  templateName: string,
  data: Record<string, any>
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      // Check if user wants marketing emails
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { emailOnMarketingUpdates: true },
      });

      if (!settings?.emailOnMarketingUpdates) {
        continue; // Skip users who don't want marketing emails
      }

      const userEmail = await getUserEmail(userId);
      if (!userEmail) {
        failed++;
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const userName = user?.email.split('@')[0] || 'User';

      const emailData = {
        userName,
        year: new Date().getFullYear(),
        ...data,
      };

      await sendEmail(userEmail, subject, templateName, emailData);
      sent++;
    } catch (error) {
      console.error(`Failed to send bulk email to user ${userId}:`, error);
      failed++;
    }
  }

  console.log(`Bulk email sent: ${sent} successful, ${failed} failed`);
  return { sent, failed };
};

export default {
  sendEmailNotification,
  sendBulkEmailNotification,
};
