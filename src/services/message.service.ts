import { apiClient } from './api';

/**
 * Message Service
 * Handles messaging API calls
 */

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string;
  lastMessage?: Message;
  participant?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  unreadCount?: number;
}

export interface SendMessagePayload {
  conversationId?: string;
  receiverId?: string;
  content: string;
}

export interface StartConversationPayload {
  otherUserId: string;
}

export const messageService = {
  /**
   * Get all conversations
   */
  getConversations: async (): Promise<Conversation[]> => {
    return apiClient.get<Conversation[]>('/messages/conversations');
  },

  /**
   * Get messages in a conversation
   */
  getConversationMessages: async (conversationId: string): Promise<Message[]> => {
    return apiClient.get<Message[]>(`/messages/conversations/${conversationId}`);
  },

  /**
   * Send a message
   */
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    return apiClient.post<Message>('/messages', payload);
  },

  /**
   * Start or get conversation with another user
   */
  startConversation: async (payload: StartConversationPayload): Promise<Conversation> => {
    return apiClient.post<Conversation>('/messages/start-conversation', payload);
  },

  /**
   * Mark conversation messages as read
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    return apiClient.put<void>(`/messages/conversations/${conversationId}/read`);
  },

  /**
   * Get total unread message count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    return apiClient.get<{ count: number }>('/messages/unread-count');
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    return apiClient.delete<void>(`/messages/${messageId}`);
  },
};
