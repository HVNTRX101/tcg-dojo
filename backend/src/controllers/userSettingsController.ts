import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * User Settings Controller
 * Handles user preferences and settings beyond notifications
 */

/**
 * Get user settings
 * GET /api/user/settings
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
};

/**
 * Update user settings
 * PUT /api/user/settings
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      // Notification preferences
      emailOnOrderUpdate,
      emailOnNewMessage,
      emailOnNewReview,
      emailOnNewFollower,
      emailOnPriceDrop,
      emailOnMarketingUpdates,
      notifyOnOrderUpdate,
      notifyOnNewMessage,
      notifyOnNewReview,
      notifyOnNewFollower,
      notifyOnPriceDrop,
      // Privacy settings
      profileIsPublic,
      showCollectionsPublicly,
      showReviewsPublicly,
      // Display preferences
      language,
      currency,
      timezone,
    } = req.body;

    // Build update data (only update provided fields)
    const updateData: any = {};

    // Notification preferences
    if (emailOnOrderUpdate !== undefined) updateData.emailOnOrderUpdate = emailOnOrderUpdate;
    if (emailOnNewMessage !== undefined) updateData.emailOnNewMessage = emailOnNewMessage;
    if (emailOnNewReview !== undefined) updateData.emailOnNewReview = emailOnNewReview;
    if (emailOnNewFollower !== undefined) updateData.emailOnNewFollower = emailOnNewFollower;
    if (emailOnPriceDrop !== undefined) updateData.emailOnPriceDrop = emailOnPriceDrop;
    if (emailOnMarketingUpdates !== undefined) updateData.emailOnMarketingUpdates = emailOnMarketingUpdates;
    if (notifyOnOrderUpdate !== undefined) updateData.notifyOnOrderUpdate = notifyOnOrderUpdate;
    if (notifyOnNewMessage !== undefined) updateData.notifyOnNewMessage = notifyOnNewMessage;
    if (notifyOnNewReview !== undefined) updateData.notifyOnNewReview = notifyOnNewReview;
    if (notifyOnNewFollower !== undefined) updateData.notifyOnNewFollower = notifyOnNewFollower;
    if (notifyOnPriceDrop !== undefined) updateData.notifyOnPriceDrop = notifyOnPriceDrop;

    // Privacy settings
    if (profileIsPublic !== undefined) updateData.profileIsPublic = profileIsPublic;
    if (showCollectionsPublicly !== undefined) updateData.showCollectionsPublicly = showCollectionsPublicly;
    if (showReviewsPublicly !== undefined) updateData.showReviewsPublicly = showReviewsPublicly;

    // Display preferences
    if (language !== undefined) updateData.language = language;
    if (currency !== undefined) updateData.currency = currency;
    if (timezone !== undefined) updateData.timezone = timezone;

    // Upsert settings
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    res.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
};

/**
 * Get privacy settings only
 * GET /api/user/settings/privacy
 */
export const getPrivacySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        profileIsPublic: true,
        showCollectionsPublicly: true,
        showReviewsPublicly: true,
      },
    });

    // Create default settings if they don't exist
    if (!settings) {
      const newSettings = await prisma.userSettings.create({
        data: { userId },
      });
      settings = {
        profileIsPublic: newSettings.profileIsPublic,
        showCollectionsPublicly: newSettings.showCollectionsPublicly,
        showReviewsPublicly: newSettings.showReviewsPublicly,
      };
    }

    res.json({ privacy: settings });
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ error: 'Failed to get privacy settings' });
  }
};

/**
 * Update privacy settings
 * PUT /api/user/settings/privacy
 */
export const updatePrivacySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      profileIsPublic,
      showCollectionsPublicly,
      showReviewsPublicly,
    } = req.body;

    const updateData: any = {};
    if (profileIsPublic !== undefined) updateData.profileIsPublic = profileIsPublic;
    if (showCollectionsPublicly !== undefined) updateData.showCollectionsPublicly = showCollectionsPublicly;
    if (showReviewsPublicly !== undefined) updateData.showReviewsPublicly = showReviewsPublicly;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
      select: {
        profileIsPublic: true,
        showCollectionsPublicly: true,
        showReviewsPublicly: true,
      },
    });

    res.json({
      message: 'Privacy settings updated successfully',
      privacy: settings,
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
};

/**
 * Get display preferences
 * GET /api/user/settings/display
 */
export const getDisplaySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        language: true,
        currency: true,
        timezone: true,
      },
    });

    // Create default settings if they don't exist
    if (!settings) {
      const newSettings = await prisma.userSettings.create({
        data: { userId },
      });
      settings = {
        language: newSettings.language,
        currency: newSettings.currency,
        timezone: newSettings.timezone,
      };
    }

    res.json({ display: settings });
  } catch (error) {
    console.error('Error getting display settings:', error);
    res.status(500).json({ error: 'Failed to get display settings' });
  }
};

/**
 * Update display preferences
 * PUT /api/user/settings/display
 */
export const updateDisplaySettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { language, currency, timezone } = req.body;

    const updateData: any = {};
    if (language !== undefined) updateData.language = language;
    if (currency !== undefined) updateData.currency = currency;
    if (timezone !== undefined) updateData.timezone = timezone;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
      select: {
        language: true,
        currency: true,
        timezone: true,
      },
    });

    res.json({
      message: 'Display settings updated successfully',
      display: settings,
    });
  } catch (error) {
    console.error('Error updating display settings:', error);
    res.status(500).json({ error: 'Failed to update display settings' });
  }
};
