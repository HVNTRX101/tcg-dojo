import { prisma } from '../config/database';
import logger from '../config/logger';
import { queueNewsletterEmail } from '../workers/email.worker';

/**
 * Newsletter Service
 *
 * Manages:
 * - Newsletter subscriptions
 * - Email campaigns
 * - Subscriber management
 * - Unsubscribe handling
 */

export interface NewsletterCampaign {
  id?: string;
  subject: string;
  content: string;
  template?: string;
  scheduledFor?: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT';
}

export class NewsletterService {
  /**
   * Subscribe user to newsletter
   */
  async subscribe(email: string, name?: string): Promise<void> {
    try {
      // Check if already subscribed
      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email },
      });

      if (existing) {
        if (existing.status === 'UNSUBSCRIBED') {
          // Resubscribe
          await prisma.newsletterSubscriber.update({
            where: { email },
            data: {
              status: 'ACTIVE',
              unsubscribedAt: null,
            },
          });
          logger.info('User resubscribed to newsletter', { email });
        } else {
          logger.info('User already subscribed', { email });
          return;
        }
      } else {
        // New subscription
        await prisma.newsletterSubscriber.create({
          data: {
            email,
            name,
            status: 'ACTIVE',
          },
        });
        logger.info('New newsletter subscription', { email });
      }

      // Send welcome email
      await this.sendWelcomeEmail(email, name);
    } catch (error: any) {
      logger.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from newsletter
   */
  async unsubscribe(email: string, reason?: string): Promise<void> {
    try {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
          unsubscribeReason: reason,
        },
      });

      logger.info('User unsubscribed from newsletter', { email, reason });
    } catch (error: any) {
      logger.error('Error unsubscribing from newsletter:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new subscriber
   */
  private async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    try {
      const welcomeContent = `
        <h1>Welcome to TCG Marketplace Newsletter!</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for subscribing to our newsletter! You'll now receive:</p>
        <ul>
          <li>Exclusive deals and promotions</li>
          <li>New product announcements</li>
          <li>TCG collecting tips and guides</li>
          <li>Community highlights</li>
        </ul>
        <p>Stay tuned for exciting updates!</p>
      `;

      await queueNewsletterEmail([email], 'Welcome to TCG Marketplace!', welcomeContent);
    } catch (error: any) {
      logger.error('Error sending welcome email:', error);
    }
  }

  /**
   * Create newsletter campaign
   */
  async createCampaign(campaign: NewsletterCampaign): Promise<string> {
    try {
      const newCampaign = await prisma.newsletterCampaign.create({
        data: {
          subject: campaign.subject,
          content: campaign.content,
          template: campaign.template,
          scheduledFor: campaign.scheduledFor,
          status: campaign.status || 'DRAFT',
        },
      });

      logger.info('Newsletter campaign created', { campaignId: newCampaign.id });

      return newCampaign.id;
    } catch (error: any) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Send newsletter campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    try {
      // Get campaign
      const campaign = await prisma.newsletterCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'SENT') {
        throw new Error('Campaign already sent');
      }

      // Update status to sending
      await prisma.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: 'SENDING' },
      });

      // Get active subscribers
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true },
      });

      const emails = subscribers.map(sub => sub.email);

      logger.info('Sending newsletter campaign', {
        campaignId,
        recipientCount: emails.length,
      });

      // Queue emails
      await queueNewsletterEmail(emails, campaign.subject, campaign.content);

      // Update campaign status
      await prisma.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          recipientCount: emails.length,
        },
      });

      logger.info('Newsletter campaign sent', {
        campaignId,
        recipientCount: emails.length,
      });
    } catch (error: any) {
      logger.error('Error sending campaign:', error);

      // Update campaign status to failed
      await prisma.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: 'DRAFT' }, // Reset to draft
      });

      throw error;
    }
  }

  /**
   * Get subscriber count
   */
  async getSubscriberCount(): Promise<number> {
    return prisma.newsletterSubscriber.count({
      where: { status: 'ACTIVE' },
    });
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<any> {
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // In a real implementation, track opens and clicks
    return {
      campaignId: campaign.id,
      subject: campaign.subject,
      status: campaign.status,
      recipientCount: campaign.recipientCount || 0,
      sentAt: campaign.sentAt,
      // These would require tracking implementation
      openRate: 0,
      clickRate: 0,
    };
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(limit: number = 50): Promise<any[]> {
    return prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Send product announcement newsletter
   */
  async sendProductAnnouncement(
    productName: string,
    productId: string,
    imageUrl: string,
    price: number
  ): Promise<void> {
    try {
      const content = `
        <h1>New Product Available!</h1>
        <img src="${imageUrl}" alt="${productName}" style="max-width: 400px; margin: 20px 0;" />
        <h2>${productName}</h2>
        <p style="font-size: 24px; color: #2563eb; font-weight: bold;">$${price.toFixed(2)}</p>
        <a href="${process.env.FRONTEND_URL}/products/${productId}"
           style="display: inline-block; background-color: #2563eb; color: white;
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;
                  font-weight: bold; margin-top: 20px;">
          View Product
        </a>
      `;

      const campaignId = await this.createCampaign({
        subject: `New Arrival: ${productName}`,
        content,
        status: 'DRAFT',
      });

      await this.sendCampaign(campaignId);
    } catch (error: any) {
      logger.error('Error sending product announcement:', error);
    }
  }

  /**
   * Send promotional campaign
   */
  async sendPromotion(
    title: string,
    description: string,
    discountCode?: string,
    discountPercent?: number
  ): Promise<void> {
    try {
      let content = `
        <h1>${title}</h1>
        <p>${description}</p>
      `;

      if (discountCode && discountPercent) {
        content += `
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Use code: <code style="font-size: 24px; color: #2563eb;">${discountCode}</code></h2>
            <p style="font-size: 18px;">Get ${discountPercent}% off your next purchase!</p>
          </div>
        `;
      }

      content += `
        <a href="${process.env.FRONTEND_URL}/products"
           style="display: inline-block; background-color: #2563eb; color: white;
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;
                  font-weight: bold; margin-top: 20px;">
          Shop Now
        </a>
      `;

      const campaignId = await this.createCampaign({
        subject: title,
        content,
        status: 'DRAFT',
      });

      await this.sendCampaign(campaignId);
    } catch (error: any) {
      logger.error('Error sending promotion:', error);
    }
  }
}

export default new NewsletterService();
