import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markAsRead,
  getUnreadCount,
  startConversation,
  deleteMessage,
} from '../controllers/messageController';

const router = Router();

/**
 * Message Routes
 * All routes require authentication
 */

// Send a message
router.post('/', authenticate, sendMessage);

// Start or get conversation with another user
router.post('/start-conversation', authenticate, startConversation);

// Get all conversations
router.get('/conversations', authenticate, getConversations);

// Get messages in a conversation
router.get('/conversations/:conversationId', authenticate, getConversationMessages);

// Mark conversation messages as read
router.put('/conversations/:conversationId/read', authenticate, markAsRead);

// Get total unread message count
router.get('/unread-count', authenticate, getUnreadCount);

// Delete a message
router.delete('/:messageId', authenticate, deleteMessage);

export default router;
