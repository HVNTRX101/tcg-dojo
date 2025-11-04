import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Service for real-time communication
 * Handles Socket.io client connection and event management
 */

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onNewMessage?: (message: any) => void;
  onNewNotification?: (notification: any) => void;
  onOrderUpdate?: (order: any) => void;
  onTypingStart?: (data: { conversationId: string; userId: string }) => void;
  onTypingStop?: (data: { conversationId: string; userId: string }) => void;
  onUserStatusChanged?: (data: { userId: string; status: 'online' | 'offline' }) => void;
  onMessageRead?: (data: { conversationId: string; messageIds: string[] }) => void;
  onMessageDeleted?: (data: { conversationId: string; messageId: string }) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationsReadAll?: () => void;
  onCommentNew?: (data: { entityType: string; entityId: string; comment: any }) => void;
  onCommentUpdated?: (data: { commentId: string; comment: any }) => void;
  onCommentDeleted?: (data: { commentId: string }) => void;
  onCommentLiked?: (data: { commentId: string; userId: string; likesCount: number }) => void;
  onCommentUnliked?: (data: { commentId: string; userId: string; likesCount: number }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: SocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionalDisconnect = false;

  /**
   * Initialize socket connection with authentication token
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.isIntentionalDisconnect = false;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  /**
   * Set up all socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.eventHandlers.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      this.eventHandlers.onDisconnect?.();
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }

      this.eventHandlers.onError?.(error);
    });

    // Message events
    this.socket.on('message:new', message => {
      this.eventHandlers.onNewMessage?.(message);
    });

    this.socket.on('messages:read', data => {
      this.eventHandlers.onMessageRead?.(data);
    });

    this.socket.on('message:deleted', data => {
      this.eventHandlers.onMessageDeleted?.(data);
    });

    // Typing events
    this.socket.on('typing:start', data => {
      this.eventHandlers.onTypingStart?.(data);
    });

    this.socket.on('typing:stop', data => {
      this.eventHandlers.onTypingStop?.(data);
    });

    // Notification events
    this.socket.on('notification:new', notification => {
      this.eventHandlers.onNewNotification?.(notification);
    });

    this.socket.on('notification:read', notificationId => {
      this.eventHandlers.onNotificationRead?.(notificationId);
    });

    this.socket.on('notifications:read-all', () => {
      this.eventHandlers.onNotificationsReadAll?.();
    });

    // Order events
    this.socket.on('order:updated', order => {
      this.eventHandlers.onOrderUpdate?.(order);
    });

    // Presence events
    this.socket.on('user:status-changed', data => {
      this.eventHandlers.onUserStatusChanged?.(data);
    });

    // Comment events
    this.socket.on('comment:new', data => {
      this.eventHandlers.onCommentNew?.(data);
    });

    this.socket.on('comment:updated', data => {
      this.eventHandlers.onCommentUpdated?.(data);
    });

    this.socket.on('comment:deleted', data => {
      this.eventHandlers.onCommentDeleted?.(data);
    });

    this.socket.on('comment:liked', data => {
      this.eventHandlers.onCommentLiked?.(data);
    });

    this.socket.on('comment:unliked', data => {
      this.eventHandlers.onCommentUnliked?.(data);
    });
  }

  /**
   * Register event handlers
   */
  setEventHandlers(handlers: SocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.isIntentionalDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('join:conversation', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave:conversation', conversationId);
  }

  /**
   * Send typing start indicator
   */
  startTyping(conversationId: string): void {
    this.socket?.emit('typing:start', { conversationId });
  }

  /**
   * Send typing stop indicator
   */
  stopTyping(conversationId: string): void {
    this.socket?.emit('typing:stop', { conversationId });
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): void {
    this.socket?.emit('notification:read', notificationId);
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead(): void {
    this.socket?.emit('notifications:read-all');
  }

  /**
   * Get user online status
   */
  getUserStatus(
    userId: string,
    callback: (data: { userId: string; status: string }) => void
  ): void {
    this.socket?.emit('user:get-status', userId, callback);
  }

  /**
   * Get multiple users' status
   */
  getUsersStatus(
    userIds: string[],
    callback: (statuses: Array<{ userId: string; status: string }>) => void
  ): void {
    this.socket?.emit('users:get-status', userIds, callback);
  }

  /**
   * Get online users in a conversation
   */
  getConversationOnlineUsers(conversationId: string, callback: (userIds: string[]) => void): void {
    this.socket?.emit('conversation:get-online-users', conversationId, callback);
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
