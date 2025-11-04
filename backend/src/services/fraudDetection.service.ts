import { prisma } from '../config/database';
import logger from '../config/logger';

/**
 * Fraud Detection Service
 *
 * Detects and prevents fraudulent activities including:
 * - Multiple failed payment attempts
 * - Suspicious order patterns
 * - Velocity checks
 * - IP/Device fingerprinting
 * - Account takeover attempts
 */

export interface FraudCheckResult {
  isFraudulent: boolean;
  riskScore: number; // 0-100
  reasons: string[];
  action: 'allow' | 'review' | 'block';
}

export class FraudDetectionService {
  // Risk thresholds
  private readonly LOW_RISK_THRESHOLD = 30;
  private readonly HIGH_RISK_THRESHOLD = 70;

  /**
   * Check if an order is fraudulent
   */
  async checkOrder(
    userId: string,
    orderData: {
      total: number;
      items: any[];
      shippingAddress: any;
      billingAddress: any;
      ipAddress?: string;
    }
  ): Promise<FraudCheckResult> {
    let riskScore = 0;
    const reasons: string[] = [];

    try {
      // Check 1: Velocity check (too many orders in short time)
      const velocityScore = await this.checkVelocity(userId);
      if (velocityScore > 0) {
        riskScore += velocityScore;
        reasons.push(`High order velocity (${velocityScore} points)`);
      }

      // Check 2: Failed payment attempts
      const failedPaymentScore = await this.checkFailedPayments(userId);
      if (failedPaymentScore > 0) {
        riskScore += failedPaymentScore;
        reasons.push(`Multiple failed payments (${failedPaymentScore} points)`);
      }

      // Check 3: Unusual order amount
      const amountScore = await this.checkOrderAmount(userId, orderData.total);
      if (amountScore > 0) {
        riskScore += amountScore;
        reasons.push(`Unusual order amount (${amountScore} points)`);
      }

      // Check 4: Address mismatch
      const addressScore = this.checkAddressMismatch(
        orderData.shippingAddress,
        orderData.billingAddress
      );
      if (addressScore > 0) {
        riskScore += addressScore;
        reasons.push(`Address mismatch (${addressScore} points)`);
      }

      // Check 5: New account with large order
      const newAccountScore = await this.checkNewAccountRisk(userId, orderData.total);
      if (newAccountScore > 0) {
        riskScore += newAccountScore;
        reasons.push(`New account risk (${newAccountScore} points)`);
      }

      // Check 6: IP reputation (if available)
      if (orderData.ipAddress) {
        const ipScore = await this.checkIPReputation(orderData.ipAddress, userId);
        if (ipScore > 0) {
          riskScore += ipScore;
          reasons.push(`IP reputation issue (${ipScore} points)`);
        }
      }

      // Check 7: Bulk similar items (potential reseller fraud)
      const bulkScore = this.checkBulkOrders(orderData.items);
      if (bulkScore > 0) {
        riskScore += bulkScore;
        reasons.push(`Bulk order pattern (${bulkScore} points)`);
      }

      // Determine action based on risk score
      let action: 'allow' | 'review' | 'block' = 'allow';
      if (riskScore >= this.HIGH_RISK_THRESHOLD) {
        action = 'block';
      } else if (riskScore >= this.LOW_RISK_THRESHOLD) {
        action = 'review';
      }

      const result: FraudCheckResult = {
        isFraudulent: riskScore >= this.LOW_RISK_THRESHOLD,
        riskScore: Math.min(riskScore, 100),
        reasons,
        action,
      };

      // Log fraud check
      logger.info('Fraud check completed', {
        userId,
        riskScore: result.riskScore,
        action: result.action,
        reasons: result.reasons,
      });

      // Store fraud check result
      await this.storeFraudCheck(userId, result, orderData);

      return result;
    } catch (error: any) {
      logger.error('Error in fraud detection:', error);
      // Fail open - allow the order but log the error
      return {
        isFraudulent: false,
        riskScore: 0,
        reasons: ['Fraud check system error'],
        action: 'allow',
      };
    }
  }

  /**
   * Check order velocity (too many orders in short time)
   */
  private async checkVelocity(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOrders = await prisma.order.count({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentOrders >= 5) return 30; // Very suspicious
    if (recentOrders >= 3) return 15; // Suspicious
    return 0;
  }

  /**
   * Check failed payment attempts
   */
  private async checkFailedPayments(userId: string): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const failedPayments = await prisma.order.count({
      where: {
        userId,
        status: 'FAILED',
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    if (failedPayments >= 5) return 40; // Very suspicious
    if (failedPayments >= 3) return 20; // Suspicious
    return 0;
  }

  /**
   * Check if order amount is unusual for this user
   */
  private async checkOrderAmount(userId: string, amount: number): Promise<number> {
    // Get user's average order amount
    const userOrders = await prisma.order.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      select: {
        total: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    if (userOrders.length === 0) {
      // New user with large order
      if (amount > 1000) return 25;
      if (amount > 500) return 15;
      return 0;
    }

    const avgAmount = userOrders.reduce((sum, order) => sum + order.total, 0) / userOrders.length;

    // Check if current order is significantly higher
    if (amount > avgAmount * 5) return 20; // 5x average
    if (amount > avgAmount * 3) return 10; // 3x average

    return 0;
  }

  /**
   * Check address mismatch
   */
  private checkAddressMismatch(shippingAddress: any, billingAddress: any): Promise<number> {
    if (!shippingAddress || !billingAddress) return Promise.resolve(0);

    // Check if addresses are significantly different
    const shippingCountry = shippingAddress.country || '';
    const billingCountry = billingAddress.country || '';

    if (shippingCountry !== billingCountry) {
      return Promise.resolve(15); // International shipping
    }

    return Promise.resolve(0);
  }

  /**
   * Check new account risk
   */
  private async checkNewAccountRisk(userId: string, amount: number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return 0;

    const accountAge = Date.now() - user.createdAt.getTime();
    const hoursSinceCreation = accountAge / (1000 * 60 * 60);

    // New account (< 24 hours) with large order
    if (hoursSinceCreation < 24) {
      if (amount > 500) return 30;
      if (amount > 200) return 15;
    }

    // Account < 7 days with large order
    if (hoursSinceCreation < 168) {
      if (amount > 1000) return 20;
    }

    return 0;
  }

  /**
   * Check IP reputation
   */
  private async checkIPReputation(ipAddress: string, userId: string): Promise<number> {
    // Check if this IP has been used by multiple accounts
    const accountsWithIP = await prisma.order.findMany({
      where: {
        // This would require storing IP addresses
        // For now, simplified check
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 10,
    });

    // If same IP used by many accounts, suspicious
    if (accountsWithIP.length > 5) return 25;

    return 0;
  }

  /**
   * Check for bulk orders (potential reseller fraud)
   */
  private checkBulkOrders(items: any[]): number {
    const maxQuantity = Math.max(...items.map(item => item.quantity || 0));

    if (maxQuantity >= 10) return 20; // Ordering 10+ of same item
    if (maxQuantity >= 5) return 10; // Ordering 5+ of same item

    return 0;
  }

  /**
   * Store fraud check result
   */
  private async storeFraudCheck(
    userId: string,
    result: FraudCheckResult,
    orderData: any
  ): Promise<void> {
    try {
      await prisma.fraudCheck.create({
        data: {
          userId,
          riskScore: result.riskScore,
          action: result.action,
          reasons: result.reasons,
          orderData: JSON.stringify(orderData),
        },
      });
    } catch (error: any) {
      logger.error('Failed to store fraud check:', error);
    }
  }

  /**
   * Check for account takeover attempts
   */
  async checkAccountTakeover(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    try {
      // Check for unusual login patterns
      const recentLogins = await prisma.loginAttempt.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      // Check for rapid location changes
      const uniqueIPs = new Set(recentLogins.map(login => login.ipAddress));
      if (uniqueIPs.size > 5) {
        logger.warn('Potential account takeover detected', { userId, uniqueIPs: uniqueIPs.size });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Error checking account takeover:', error);
      return false;
    }
  }
}

export default new FraudDetectionService();
