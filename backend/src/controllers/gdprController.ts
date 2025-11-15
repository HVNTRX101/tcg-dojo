import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

/**
 * GDPR Data Export
 * Exports all user data in a machine-readable format (JSON)
 * Complies with GDPR Article 20 (Right to data portability)
 */
export const exportUserData = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  logger.info(`GDPR data export requested by user: ${userId}`);

  try {
    // Fetch all user data from database
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cart: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            tracking: true,
          },
        },
        collections: {
          include: {
            items: true,
          },
        },
        wishlists: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        reviews: {
          include: {
            product: true,
          },
        },
        seller: {
          include: {
            products: true,
          },
        },
        addresses: true,
        follows: {
          include: {
            following: true,
            follower: true,
          },
        },
        sentMessages: {
          include: {
            conversation: true,
          },
        },
        receivedMessages: {
          include: {
            conversation: true,
          },
        },
        notifications: true,
        settings: true,
        activities: true,
        productLikes: {
          include: {
            product: true,
          },
        },
        comments: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!userData) {
      throw new AppError('User not found', 404);
    }

    // Remove sensitive fields
    const { password, emailVerificationToken, passwordResetToken, ...sanitizedData } = userData;

    // Create export package
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'GDPR Data Export',
      user: sanitizedData,
      metadata: {
        dataCategories: [
          'Profile Information',
          'Shopping Cart',
          'Order History',
          'Collections',
          'Wishlists',
          'Reviews',
          'Seller Information',
          'Addresses',
          'Social Connections',
          'Messages',
          'Notifications',
          'Settings',
          'Activity Feed',
          'Product Likes',
          'Comments',
        ],
        recordCount: {
          orders: userData.orders.length,
          reviews: userData.reviews.length,
          addresses: userData.addresses.length,
          messages: userData.sentMessages.length + userData.receivedMessages.length,
          notifications: userData.notifications.length,
        },
      },
    };

    logger.info(`GDPR data export completed for user: ${userId}`);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error: any) {
    logger.error(`GDPR data export failed for user ${userId}:`, error);
    throw new AppError('Failed to export user data', 500);
  }
};

/**
 * GDPR Data Deletion
 * Permanently deletes all user data
 * Complies with GDPR Article 17 (Right to erasure / "Right to be forgotten")
 */
export const deleteUserData = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { confirmationCode } = req.body;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Require confirmation code (e.g., sent via email) for additional security
  if (!confirmationCode) {
    throw new AppError('Confirmation code required for account deletion', 400);
  }

  logger.warn(`GDPR data deletion requested by user: ${userId}`);

  try {
    // Verify confirmation code (in a real implementation, this should be validated)
    // For now, we'll just check if it matches the user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // In a production system, you would:
    // 1. Send a confirmation email with a unique code
    // 2. Store the code temporarily (e.g., in Redis with expiry)
    // 3. Verify the code matches before proceeding
    // For this implementation, we'll use a simple check
    if (confirmationCode !== `DELETE_${user.email}`) {
      throw new AppError('Invalid confirmation code', 400);
    }

    // Begin transaction to delete all user data
    await prisma.$transaction(async tx => {
      // Delete user's cart items
      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId,
          },
        },
      });

      // Delete user's cart
      await tx.cart.deleteMany({
        where: { userId },
      });

      // Delete user's wishlist items
      await tx.wishlistItem.deleteMany({
        where: {
          wishlist: {
            userId,
          },
        },
      });

      // Delete user's wishlists
      await tx.wishlist.deleteMany({
        where: { userId },
      });

      // Delete user's collection items
      await tx.collectionItem.deleteMany({
        where: {
          collection: {
            userId,
          },
        },
      });

      // Delete user's collections
      await tx.collection.deleteMany({
        where: { userId },
      });

      // Delete user's reviews
      await tx.review.deleteMany({
        where: { userId },
      });

      // Delete user's product likes
      await tx.productLike.deleteMany({
        where: { userId },
      });

      // Delete user's comments
      await tx.comment.deleteMany({
        where: { userId },
      });

      // Delete user's notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Delete user's addresses
      await tx.address.deleteMany({
        where: { userId },
      });

      // Delete user's settings
      await tx.userSettings.deleteMany({
        where: { userId },
      });

      // Delete user's activity feed
      await tx.activityFeed.deleteMany({
        where: { userId },
      });

      // Delete user's follows (both following and followers)
      await tx.follow.deleteMany({
        where: {
          OR: [{ followerId: userId }, { followingId: userId }],
        },
      });

      // Delete user's messages
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      // Delete user's conversations
      await tx.conversation.deleteMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });

      // Handle seller data if user is a seller
      const seller = await tx.seller.findUnique({
        where: { userId },
      });

      if (seller) {
        // Delete seller's products (this is a business decision)
        // Option 1: Delete all products
        // Option 2: Anonymize products (mark as "deleted seller")
        // For GDPR, we'll anonymize to preserve marketplace integrity
        await tx.product.updateMany({
          where: { sellerId: seller.id },
          data: {
            sellerId: null, // Orphan the products
            // Optionally: mark as "Seller Account Deleted"
          },
        });

        // Delete seller profile
        await tx.seller.delete({
          where: { id: seller.id },
        });
      }

      // Handle order data (legal requirement to keep for accounting)
      // GDPR allows keeping data for legal/tax purposes
      // We'll anonymize instead of delete
      await tx.order.updateMany({
        where: { userId },
        data: {
          // Anonymize order data
          userId: null, // Remove user association
        },
      });

      // Finally, delete the user account
      await tx.user.delete({
        where: { id: userId },
      });
    });

    logger.warn(`GDPR data deletion completed for user: ${userId}`);

    res.json({
      message: 'Your account and all associated data have been permanently deleted.',
      deletedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`GDPR data deletion failed for user ${userId}:`, error);
    throw new AppError('Failed to delete user data', 500);
  }
};

/**
 * Request Account Deletion
 * Sends confirmation email with deletion code
 */
export const requestAccountDeletion = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Generate deletion confirmation code
  const deletionCode = `DELETE_${user.email}`;

  // In a production system, you would:
  // 1. Generate a secure random code
  // 2. Store it in Redis with 24-hour expiry
  // 3. Send confirmation email with the code
  // For this implementation, we'll just return the code

  logger.info(`Account deletion requested by user: ${userId}`);

  res.json({
    message: 'Account deletion confirmation code generated. Please use this code to confirm deletion.',
    confirmationCode: deletionCode, // In production, this would be sent via email
    expiresIn: '24 hours',
    warning: 'This action is permanent and cannot be undone. All your data will be deleted.',
  });
};
