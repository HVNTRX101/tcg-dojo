import { prisma } from '../config/database';
import logger from '../config/logger';
import { queueNotification } from '../workers/notification.worker';

/**
 * Loyalty & Rewards Program Service
 *
 * Manages:
 * - Points earning and redemption
 * - Tier levels (Bronze, Silver, Gold, Platinum)
 * - Special rewards and bonuses
 * - Referral rewards
 */

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export interface TierBenefits {
  name: string;
  pointsRequired: number;
  discountPercentage: number;
  freeShippingThreshold: number;
  pointsMultiplier: number;
  earlyAccessToSales: boolean;
  birthdayBonus: number;
}

export const TIER_BENEFITS: Record<LoyaltyTier, TierBenefits> = {
  [LoyaltyTier.BRONZE]: {
    name: 'Bronze',
    pointsRequired: 0,
    discountPercentage: 0,
    freeShippingThreshold: 100,
    pointsMultiplier: 1,
    earlyAccessToSales: false,
    birthdayBonus: 100,
  },
  [LoyaltyTier.SILVER]: {
    name: 'Silver',
    pointsRequired: 1000,
    discountPercentage: 5,
    freeShippingThreshold: 75,
    pointsMultiplier: 1.25,
    earlyAccessToSales: false,
    birthdayBonus: 250,
  },
  [LoyaltyTier.GOLD]: {
    name: 'Gold',
    pointsRequired: 5000,
    discountPercentage: 10,
    freeShippingThreshold: 50,
    pointsMultiplier: 1.5,
    earlyAccessToSales: true,
    birthdayBonus: 500,
  },
  [LoyaltyTier.PLATINUM]: {
    name: 'Platinum',
    pointsRequired: 15000,
    discountPercentage: 15,
    freeShippingThreshold: 0,
    pointsMultiplier: 2,
    earlyAccessToSales: true,
    birthdayBonus: 1000,
  },
};

// Points earning rates
const POINTS_PER_DOLLAR = 10;
const REFERRAL_REWARD = 500;
const REVIEW_REWARD = 50;
const POINTS_TO_DOLLAR = 100; // 100 points = $1

export class LoyaltyService {
  /**
   * Award points for a purchase
   */
  async awardPointsForPurchase(userId: string, orderTotal: number): Promise<number> {
    try {
      // Get user's tier
      const userLoyalty = await this.getUserLoyalty(userId);
      const tier = this.calculateTier(userLoyalty.totalPoints);
      const multiplier = TIER_BENEFITS[tier].pointsMultiplier;

      // Calculate points
      const basePoints = Math.floor(orderTotal * POINTS_PER_DOLLAR);
      const bonusPoints = Math.floor(basePoints * (multiplier - 1));
      const totalPoints = basePoints + bonusPoints;

      // Update loyalty account
      await prisma.loyaltyAccount.update({
        where: { userId },
        data: {
          currentPoints: {
            increment: totalPoints,
          },
          totalPoints: {
            increment: totalPoints,
          },
          lifetimeSpend: {
            increment: orderTotal,
          },
        },
      });

      // Create transaction record
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          points: totalPoints,
          description: `Earned ${totalPoints} points from purchase`,
          metadata: {
            orderTotal,
            basePoints,
            bonusPoints,
            multiplier,
          },
        },
      });

      // Check for tier upgrade
      await this.checkTierUpgrade(userId);

      // Notify user
      await queueNotification({
        userId,
        type: 'LOYALTY_POINTS_EARNED',
        title: 'Points Earned!',
        message: `You earned ${totalPoints} loyalty points!`,
        data: { points: totalPoints },
      });

      logger.info('Points awarded for purchase', {
        userId,
        points: totalPoints,
        orderTotal,
      });

      return totalPoints;
    } catch (error: any) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(userId: string, points: number): Promise<number> {
    try {
      const userLoyalty = await this.getUserLoyalty(userId);

      if (userLoyalty.currentPoints < points) {
        throw new Error('Insufficient points');
      }

      // Calculate discount amount
      const discountAmount = points / POINTS_TO_DOLLAR;

      // Deduct points
      await prisma.loyaltyAccount.update({
        where: { userId },
        data: {
          currentPoints: {
            decrement: points,
          },
        },
      });

      // Create transaction record
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'REDEEMED',
          points: -points,
          description: `Redeemed ${points} points for $${discountAmount.toFixed(2)} discount`,
          metadata: {
            discountAmount,
          },
        },
      });

      logger.info('Points redeemed', {
        userId,
        points,
        discountAmount,
      });

      return discountAmount;
    } catch (error: any) {
      logger.error('Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * Award points for writing a review
   */
  async awardPointsForReview(userId: string, productId: string): Promise<void> {
    try {
      await prisma.loyaltyAccount.update({
        where: { userId },
        data: {
          currentPoints: {
            increment: REVIEW_REWARD,
          },
          totalPoints: {
            increment: REVIEW_REWARD,
          },
        },
      });

      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          points: REVIEW_REWARD,
          description: `Earned ${REVIEW_REWARD} points for writing a review`,
          metadata: { productId },
        },
      });

      await queueNotification({
        userId,
        type: 'LOYALTY_POINTS_EARNED',
        title: 'Review Reward!',
        message: `You earned ${REVIEW_REWARD} points for your review!`,
        data: { points: REVIEW_REWARD },
      });

      logger.info('Points awarded for review', { userId, points: REVIEW_REWARD });
    } catch (error: any) {
      logger.error('Error awarding review points:', error);
    }
  }

  /**
   * Award referral bonus
   */
  async awardReferralBonus(referrerId: string, referredUserId: string): Promise<void> {
    try {
      // Award points to referrer
      await prisma.loyaltyAccount.update({
        where: { userId: referrerId },
        data: {
          currentPoints: {
            increment: REFERRAL_REWARD,
          },
          totalPoints: {
            increment: REFERRAL_REWARD,
          },
        },
      });

      await prisma.loyaltyTransaction.create({
        data: {
          userId: referrerId,
          type: 'EARNED',
          points: REFERRAL_REWARD,
          description: `Earned ${REFERRAL_REWARD} points for referring a friend`,
          metadata: { referredUserId },
        },
      });

      await queueNotification({
        userId: referrerId,
        type: 'LOYALTY_REFERRAL_BONUS',
        title: 'Referral Bonus!',
        message: `You earned ${REFERRAL_REWARD} points for referring a friend!`,
        data: { points: REFERRAL_REWARD },
      });

      logger.info('Referral bonus awarded', { referrerId, points: REFERRAL_REWARD });
    } catch (error: any) {
      logger.error('Error awarding referral bonus:', error);
    }
  }

  /**
   * Get user's loyalty account
   */
  async getUserLoyalty(userId: string): Promise<any> {
    let loyalty = await prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    // Create if doesn't exist
    if (!loyalty) {
      loyalty = await prisma.loyaltyAccount.create({
        data: {
          userId,
          currentPoints: 0,
          totalPoints: 0,
          lifetimeSpend: 0,
          tier: LoyaltyTier.BRONZE,
        },
      });
    }

    return loyalty;
  }

  /**
   * Calculate user's tier based on points
   */
  private calculateTier(totalPoints: number): LoyaltyTier {
    if (totalPoints >= TIER_BENEFITS.PLATINUM.pointsRequired) return LoyaltyTier.PLATINUM;
    if (totalPoints >= TIER_BENEFITS.GOLD.pointsRequired) return LoyaltyTier.GOLD;
    if (totalPoints >= TIER_BENEFITS.SILVER.pointsRequired) return LoyaltyTier.SILVER;
    return LoyaltyTier.BRONZE;
  }

  /**
   * Check and upgrade tier if eligible
   */
  private async checkTierUpgrade(userId: string): Promise<void> {
    try {
      const loyalty = await this.getUserLoyalty(userId);
      const newTier = this.calculateTier(loyalty.totalPoints);

      if (newTier !== loyalty.tier) {
        await prisma.loyaltyAccount.update({
          where: { userId },
          data: { tier: newTier },
        });

        await queueNotification({
          userId,
          type: 'LOYALTY_TIER_UPGRADE',
          title: 'Tier Upgrade!',
          message: `Congratulations! You've been upgraded to ${TIER_BENEFITS[newTier].name} tier!`,
          data: { newTier, benefits: TIER_BENEFITS[newTier] },
        });

        logger.info('User tier upgraded', { userId, newTier });
      }
    } catch (error: any) {
      logger.error('Error checking tier upgrade:', error);
    }
  }

  /**
   * Get loyalty transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<any[]> {
    return prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get tier benefits for a user
   */
  async getUserBenefits(userId: string): Promise<TierBenefits> {
    const loyalty = await this.getUserLoyalty(userId);
    return TIER_BENEFITS[loyalty.tier as LoyaltyTier];
  }

  /**
   * Calculate birthday bonus (called by scheduled job)
   */
  async awardBirthdayBonus(userId: string): Promise<void> {
    try {
      const loyalty = await this.getUserLoyalty(userId);
      const tier = loyalty.tier as LoyaltyTier;
      const bonus = TIER_BENEFITS[tier].birthdayBonus;

      await prisma.loyaltyAccount.update({
        where: { userId },
        data: {
          currentPoints: {
            increment: bonus,
          },
          totalPoints: {
            increment: bonus,
          },
        },
      });

      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          points: bonus,
          description: `Birthday bonus: ${bonus} points`,
          metadata: { occasion: 'birthday' },
        },
      });

      await queueNotification({
        userId,
        type: 'LOYALTY_BIRTHDAY_BONUS',
        title: 'Happy Birthday!',
        message: `Happy Birthday! We've added ${bonus} points to your account!`,
        data: { points: bonus },
      });

      logger.info('Birthday bonus awarded', { userId, points: bonus });
    } catch (error: any) {
      logger.error('Error awarding birthday bonus:', error);
    }
  }
}

export default new LoyaltyService();
