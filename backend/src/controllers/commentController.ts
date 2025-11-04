import { Request, Response } from 'express';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import {
  emitToUser,
  emitNewComment,
  emitCommentUpdated,
  emitCommentDeleted,
  emitCommentLiked,
  emitCommentUnliked,
} from '../services/websocket';

/**
 * Comment Controller
 * Handles commenting functionality for products, reviews, and activity feed
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract mentions from comment content
 * Looks for @username patterns
 */
const extractMentions = (content: string): string[] => {
  const mentionPattern = /@(\w+)/g;
  const matches = content.match(mentionPattern);
  if (!matches) return [];

  // Remove @ and get unique mentions
  return [...new Set(matches.map(m => m.substring(1)))];
};

/**
 * Get user IDs from usernames
 */
const getUserIdsByUsernames = async (usernames: string[]): Promise<string[]> => {
  if (usernames.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      name: { in: usernames }
    },
    select: { id: true }
  });

  return users.map(u => u.id);
};

/**
 * Create mention notifications for users mentioned in a comment
 */
const createMentionNotifications = async (
  comment: any,
  mentionedUserIds: string[],
  authorName: string,
  contextType: string,
  contextName?: string
) => {
  for (const userId of mentionedUserIds) {
    // Don't notify the author if they mention themselves
    if (userId === comment.userId) continue;

    await createNotification(
      userId,
      'MENTION',
      `${authorName} mentioned you`,
      `${authorName} mentioned you in a comment on ${contextName || contextType}`,
      `/comments/${comment.id}`,
      {
        commentId: comment.id,
        mentionerName: authorName,
        mentionContext: contextType,
        commentPreview: comment.content.substring(0, 100)
      }
    );
  }
};

// ============================================
// COMMENT CRUD OPERATIONS
// ============================================

/**
 * Create a comment
 * POST /api/comments
 */
export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { content, productId, reviewId, activityId, parentId } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    // Must specify at least one target (product, review, or activity)
    if (!productId && !reviewId && !activityId) {
      res.status(400).json({ error: 'Must specify productId, reviewId, or activityId' });
      return;
    }

    // Extract mentions
    const mentionUsernames = extractMentions(content);
    const mentionedUserIds = await getUserIdsByUsernames(mentionUsernames);

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        userId,
        content,
        productId: productId || null,
        reviewId: reviewId || null,
        activityId: activityId || null,
        parentId: parentId || null,
        mentions: mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        likes: true,
      },
    });

    // Get author info
    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create activity feed entry
    let activityTitle = 'commented on a post';
    let entityType = '';
    let entityId = '';
    let contextName = '';

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, sellerId: true },
      });
      activityTitle = `commented on ${product?.name}`;
      entityType = 'PRODUCT';
      entityId = productId;
      contextName = product?.name || 'a product';

      // Notify product owner
      if (product?.sellerId && product.sellerId !== userId) {
        await createNotification(
          product.sellerId,
          'NEW_COMMENT',
          'New comment on your product',
          `${author?.name} commented on your product`,
          `/products/${productId}`,
          {
            commentId: comment.id,
            commenterName: author?.name,
            productName: product.name,
            commentContext: 'product',
            commentPreview: content.substring(0, 100),
          }
        );
      }
    } else if (reviewId) {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        select: { userId: true },
      });
      activityTitle = 'commented on a review';
      entityType = 'REVIEW';
      entityId = reviewId;
      contextName = 'a review';

      // Notify review author
      if (review?.userId && review.userId !== userId) {
        await createNotification(
          review.userId,
          'NEW_COMMENT',
          'New comment on your review',
          `${author?.name} commented on your review`,
          `/reviews/${reviewId}`,
          {
            commentId: comment.id,
            commenterName: author?.name,
            commentContext: 'review',
            commentPreview: content.substring(0, 100),
          }
        );
      }
    } else if (activityId) {
      const activity = await prisma.activityFeed.findUnique({
        where: { id: activityId },
        select: { userId: true, title: true },
      });
      activityTitle = `commented on "${activity?.title}"`;
      entityType = 'ACTIVITY';
      entityId = activityId;
      contextName = activity?.title || 'an activity';

      // Notify activity author
      if (activity?.userId && activity.userId !== userId) {
        await createNotification(
          activity.userId,
          'NEW_COMMENT',
          'New comment on your activity',
          `${author?.name} commented on your post`,
          `/activities/${activityId}`,
          {
            commentId: comment.id,
            commenterName: author?.name,
            commentContext: 'activity',
            commentPreview: content.substring(0, 100),
          }
        );
      }
    }

    // Create activity feed entry for the comment
    await prisma.activityFeed.create({
      data: {
        userId,
        activityType: 'COMMENT_CREATED',
        title: activityTitle,
        description: content.substring(0, 200),
        entityType,
        entityId,
        isPublic: true,
      },
    });

    // Notify parent comment author if this is a reply
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== userId) {
        await createNotification(
          parentComment.userId,
          'NEW_COMMENT',
          'New reply to your comment',
          `${author?.name} replied to your comment`,
          `/comments/${comment.id}`,
          {
            commentId: comment.id,
            commenterName: author?.name,
            commentContext: 'comment',
            commentPreview: content.substring(0, 100),
          }
        );
      }
    }

    // Create mention notifications
    await createMentionNotifications(
      comment,
      mentionedUserIds,
      author?.name || 'Someone',
      entityType,
      contextName
    );

    // Emit WebSocket event for real-time updates
    if (productId) {
      emitNewComment('product', productId, comment);
    } else if (reviewId) {
      emitNewComment('review', reviewId, comment);
    } else if (activityId) {
      emitNewComment('activity', activityId, comment);
    }

    res.status(201).json({
      message: 'Comment created successfully',
      data: {
        ...comment,
        mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
        likesCount: comment.likesCount,
        isLikedByCurrentUser: false,
        repliesCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

/**
 * Get comments for a specific entity (product, review, or activity)
 * GET /api/comments?productId=xxx or ?reviewId=xxx or ?activityId=xxx
 */
export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { productId, reviewId, activityId, parentId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build where condition
    const whereCondition: any = { isDeleted: false };
    if (productId) whereCondition.productId = productId as string;
    if (reviewId) whereCondition.reviewId = reviewId as string;
    if (activityId) whereCondition.activityId = activityId as string;
    if (parentId !== undefined) {
      whereCondition.parentId = parentId === 'null' ? null : (parentId as string);
    } else {
      // By default, only get top-level comments (no parent)
      whereCondition.parentId = null;
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          likes: userId ? {
            where: { userId },
          } : false,
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: whereCondition }),
    ]);

    // Format comments
    const formattedComments = comments.map((comment) => ({
      ...comment,
      mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
      isLikedByCurrentUser: userId && Array.isArray(comment.likes) ? comment.likes.length > 0 : false,
      likesCount: comment._count?.likes || 0,
      repliesCount: comment._count?.replies || 0,
      likes: undefined,
      _count: undefined,
    }));

    res.json({
      data: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

/**
 * Get a single comment by ID with replies
 * GET /api/comments/:commentId
 */
export const getComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: { likes: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        likes: userId ? {
          where: { userId },
        } : false,
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.isDeleted) {
      res.status(404).json({ error: 'Comment has been deleted' });
      return;
    }

    const formattedComment = {
      ...comment,
      mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
      isLikedByCurrentUser: userId && Array.isArray(comment.likes) ? comment.likes.length > 0 : false,
      likesCount: comment._count?.likes || 0,
      repliesCount: comment._count?.replies || 0,
      replies: comment.replies?.map(reply => ({
        ...reply,
        mentions: reply.mentions ? JSON.parse(reply.mentions) : [],
        likesCount: reply._count?.likes || 0,
      })),
      likes: undefined,
      _count: undefined,
    };

    res.json({ data: formattedComment });
  } catch (error) {
    console.error('Error getting comment:', error);
    res.status(500).json({ error: 'Failed to get comment' });
  }
};

/**
 * Update a comment
 * PUT /api/comments/:commentId
 */
export const updateComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    // Get existing comment and verify ownership
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (existingComment.userId !== userId) {
      res.status(403).json({ error: 'You can only edit your own comments' });
      return;
    }

    if (existingComment.isDeleted) {
      res.status(400).json({ error: 'Cannot edit a deleted comment' });
      return;
    }

    // Extract new mentions
    const mentionUsernames = extractMentions(content);
    const mentionedUserIds = await getUserIdsByUsernames(mentionUsernames);

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        mentions: mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            replies: true,
            likes: true,
          },
        },
      },
    });

    // Emit WebSocket event
    emitCommentUpdated(commentId, updatedComment);

    res.json({
      message: 'Comment updated successfully',
      data: {
        ...updatedComment,
        mentions: updatedComment.mentions ? JSON.parse(updatedComment.mentions) : [],
        likesCount: updatedComment._count?.likes || 0,
        repliesCount: updatedComment._count?.replies || 0,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

/**
 * Delete a comment (soft delete)
 * DELETE /api/comments/:commentId
 */
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { commentId } = req.params;

    // Get comment and verify ownership or admin
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'You can only delete your own comments' });
      return;
    }

    // Soft delete
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[deleted]',
      },
    });

    // Emit WebSocket event
    emitCommentDeleted(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

/**
 * Like a comment
 * POST /api/comments/:commentId/like
 */
export const likeComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { commentId } = req.params;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!comment || comment.isDeleted) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      res.status(400).json({ error: 'Comment already liked' });
      return;
    }

    // Create like
    await prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    });

    // Increment like count
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        likesCount: {
          increment: 1,
        },
      },
    });

    // Notify comment author
    if (comment.userId !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      await createNotification(
        comment.userId,
        'COMMENT_LIKED',
        'Someone liked your comment',
        `${liker?.name} liked your comment`,
        `/comments/${commentId}`,
        {
          commentId,
          likerName: liker?.name,
        }
      );
    }

    // Emit WebSocket event
    emitCommentLiked(commentId, userId, updatedComment.likesCount);

    res.json({
      message: 'Comment liked successfully',
      data: {
        likesCount: updatedComment.likesCount,
      },
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

/**
 * Unlike a comment
 * DELETE /api/comments/:commentId/like
 */
export const unlikeComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { commentId } = req.params;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Check if liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (!existingLike) {
      res.status(400).json({ error: 'Comment not liked' });
      return;
    }

    // Delete like
    await prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    // Decrement like count
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        likesCount: {
          decrement: 1,
        },
      },
    });

    // Emit WebSocket event
    emitCommentUnliked(commentId, userId, updatedComment.likesCount);

    res.json({
      message: 'Comment unliked successfully',
      data: {
        likesCount: updatedComment.likesCount,
      },
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
};

export default {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
};
