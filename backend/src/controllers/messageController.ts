import { Request, Response } from 'express';
import prisma from '../config/database';
import { emitNewMessage, emitMessageRead, emitMessageDeleted } from '../services/websocket';
import { queueMessageDelivery } from '../services/messageQueue';
import { analyticsStore } from '../services/analytics';

/**
 * Message Controller
 * Handles buyer-seller messaging functionality
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create a conversation between two users
 * Ensures user1Id is always the smaller ID for consistency
 */
const getOrCreateConversation = async (userId1: string, userId2: string) => {
  // Sort user IDs to ensure consistent ordering
  const [user1Id, user2Id] = [userId1, userId2].sort();

  // Check if conversation exists
  let conversation = await prisma.conversation.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id,
        user2Id,
      },
    },
  });

  // Create new conversation if it doesn't exist
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        user1Id,
        user2Id,
      },
    });
  }

  return conversation;
};

/**
 * Get the other user's ID in a conversation
 */
const getOtherUserId = (conversation: any, currentUserId: string): string => {
  return conversation.user1Id === currentUserId
    ? conversation.user2Id
    : conversation.user1Id;
};

/**
 * Get unread count for a user in a conversation
 */
const getUserUnreadCount = (conversation: any, userId: string): number => {
  return conversation.user1Id === userId
    ? conversation.user1UnreadCount
    : conversation.user2UnreadCount;
};

// ============================================
// CONTROLLERS
// ============================================

/**
 * Send a message
 * POST /api/messages
 */
export const sendMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const senderId = req.user!.userId;
    const { receiverId, content, attachments } = req.body;

    // Validation
    if (!receiverId || !content) {
      return res.status(400).json({
        error: 'receiverId and content are required',
      });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Cannot send message to self
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(senderId, receiverId);

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId,
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
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

    // Update conversation
    const updateData: any = {
      lastMessageAt: new Date(),
    };

    // Increment unread count for receiver
    if (conversation.user1Id === receiverId) {
      updateData.user1UnreadCount = { increment: 1 };
    } else {
      updateData.user2UnreadCount = { increment: 1 };
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
    });

    // Track message sent in analytics
    analyticsStore.trackMessageSent(senderId);

    // Queue message for delivery (handles online/offline delivery, notifications, emails)
    await queueMessageDelivery({
      messageId: message.id,
      conversationId: conversation.id,
      senderId,
      receiverId,
      content,
      attachments: attachments ? JSON.stringify(attachments) : undefined,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: {
        ...message,
        attachments: message.attachments ? JSON.parse(message.attachments) : null,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * Get all conversations for the current user
 * GET /api/messages/conversations
 */
export const getConversations = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get conversations where user is either user1 or user2
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          user2: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              isRead: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      }),
    ]);

    // Format conversations
    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      const unreadCount = getUserUnreadCount(conv, userId);
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        otherUser,
        lastMessage,
        unreadCount,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      };
    });

    return res.json({
      data: formattedConversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return res.status(500).json({ error: 'Failed to get conversations' });
  }
};

/**
 * Get messages in a conversation
 * GET /api/messages/conversations/:conversationId
 */
export const getConversationMessages = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Get conversation and verify user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is part of conversation
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: { conversationId },
      }),
    ]);

    // Format messages
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
      isMine: msg.senderId === userId,
    }));

    const otherUser = conversation.user1Id === userId ? conversation.user2 : conversation.user1;

    return res.json({
      conversation: {
        id: conversation.id,
        otherUser,
        createdAt: conversation.createdAt,
      },
      messages: formattedMessages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return res.status(500).json({ error: 'Failed to get messages' });
  }
};

/**
 * Mark messages as read
 * PUT /api/messages/conversations/:conversationId/read
 */
export const markAsRead = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;

    // Get conversation and verify user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is part of conversation
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get unread message IDs before updating
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      select: { id: true },
    });

    const messageIds = unreadMessages.map((m) => m.id);

    // Mark all unread messages from the other user as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Reset unread count for this user
    const updateData: any = {};
    if (conversation.user1Id === userId) {
      updateData.user1UnreadCount = 0;
    } else {
      updateData.user2UnreadCount = 0;
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    // Emit WebSocket event for read receipts
    if (messageIds.length > 0) {
      emitMessageRead(conversationId, messageIds);
    }

    return res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

/**
 * Get unread message count
 * GET /api/messages/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    // Get all conversations for user
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        user1Id: true,
        user2Id: true,
        user1UnreadCount: true,
        user2UnreadCount: true,
      },
    });

    // Sum up unread counts
    const totalUnread = conversations.reduce((sum, conv) => {
      return sum + (conv.user1Id === userId ? conv.user1UnreadCount : conv.user2UnreadCount);
    }, 0);

    return res.json({
      unreadCount: totalUnread,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
};

/**
 * Start a conversation with a user (seller)
 * POST /api/messages/start-conversation
 */
export const startConversation = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' });
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        email: true,
        seller: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot start conversation with self
    if (userId === otherUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(userId, otherUserId);

    return res.json({
      message: 'Conversation ready',
      data: {
        conversationId: conversation.id,
        otherUser,
      },
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    return res.status(500).json({ error: 'Failed to start conversation' });
  }
};

/**
 * Delete a message (soft delete - only for sender within 5 minutes)
 * DELETE /api/messages/:messageId
 */
export const deleteMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;

    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Can only delete within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ error: 'Can only delete messages within 5 minutes of sending' });
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId },
    });

    // Emit WebSocket event
    emitMessageDeleted(message.conversationId, messageId);

    return res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
};
