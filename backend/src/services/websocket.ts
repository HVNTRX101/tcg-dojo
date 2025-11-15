import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyAccessToken } from '../utils/jwt';
import { config } from '../config/env';
import { createRedisAdapterClients } from '../config/redis';
import { analyticsStore } from './analytics';
import { initializeFileUploadService } from './fileUpload';
import { initializeWebRTCService, setupWebRTCEvents, handleUserDisconnect } from './webrtc';

/**
 * WebSocket Service
 * Handles real-time communication using Socket.io
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

// Store for online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Store for typing indicators
const typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds

let io: SocketIOServer;

/**
 * Initialize WebSocket server
 */
export const initializeWebSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Set up Redis adapter for multi-server scaling (optional, only if Redis is available)
  try {
    const { pubClient, subClient } = createRedisAdapterClients();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔴 Redis adapter enabled for Socket.io (multi-server ready)');
  } catch (error) {
    console.log('⚠️ Redis not available, using default in-memory adapter');
    // Continue without Redis adapter for development
  }

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from multiple sources (in order of preference):
      // 1. HttpOnly cookie (most secure)
      // 2. Auth handshake (backwards compatibility)
      // 3. Authorization header (backwards compatibility)
      let token: string | undefined;

      // Parse cookies from socket handshake
      const cookies = socket.handshake.headers.cookie;
      if (cookies) {
        const cookieObj: Record<string, string> = {};
        cookies.split(';').forEach(cookie => {
          const [key, value] = cookie.trim().split('=');
          cookieObj[key] = value;
        });
        token = cookieObj['accessToken'];
      }

      // Fallback to other methods
      if (!token) {
        token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.userEmail = payload.email;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Handle connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Track new connection in analytics
      analyticsStore.trackConnection(userId);
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Notify user's contacts that they're online
    emitUserStatus(userId, 'online');

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Setup WebRTC signaling events
    setupWebRTCEvents(socket, userId);

    // ============================================
    // MESSAGING EVENTS
    // ============================================

    /**
     * Join a conversation room
     */
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    /**
     * Leave a conversation room
     */
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    /**
     * Typing indicator start
     */
    socket.on('typing:start', (data: { conversationId: string }) => {
      const { conversationId } = data;

      // Add user to typing set
      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      typingUsers.get(conversationId)!.add(userId);

      // Track typing event in analytics
      analyticsStore.trackTypingEvent(userId);

      // Emit to others in conversation
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId,
      });
    });

    /**
     * Typing indicator stop
     */
    socket.on('typing:stop', (data: { conversationId: string }) => {
      const { conversationId } = data;

      // Remove user from typing set
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId)!.delete(userId);
        if (typingUsers.get(conversationId)!.size === 0) {
          typingUsers.delete(conversationId);
        }
      }

      // Emit to others in conversation
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId,
      });
    });

    /**
     * Request online users in conversation
     */
    socket.on('conversation:get-online-users', (conversationId: string, callback) => {
      const room = io.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      const onlineInConversation: string[] = [];

      if (room) {
        room.forEach((socketId) => {
          const sock = io.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (sock?.userId && sock.userId !== userId) {
            onlineInConversation.push(sock.userId);
          }
        });
      }

      callback(onlineInConversation);
    });

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================

    /**
     * Mark notification as read (broadcast to all user's devices)
     */
    socket.on('notification:read', (notificationId: string) => {
      socket.to(`user:${userId}`).emit('notification:read', notificationId);
    });

    /**
     * Mark all notifications as read
     */
    socket.on('notifications:read-all', () => {
      socket.to(`user:${userId}`).emit('notifications:read-all');
    });

    // ============================================
    // PRESENCE EVENTS
    // ============================================

    /**
     * Request user's online status
     */
    socket.on('user:get-status', (targetUserId: string, callback) => {
      const isOnline = onlineUsers.has(targetUserId);
      callback({ userId: targetUserId, status: isOnline ? 'online' : 'offline' });
    });

    /**
     * Get multiple users' status
     */
    socket.on('users:get-status', (userIds: string[], callback) => {
      const statuses = userIds.map((id) => ({
        userId: id,
        status: onlineUsers.has(id) ? 'online' : 'offline',
      }));
      callback(statuses);
    });

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userId} (socket: ${socket.id})`);

      // Remove from online users
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId)!.delete(socket.id);
        if (onlineUsers.get(userId)!.size === 0) {
          onlineUsers.delete(userId);
          // Track disconnection in analytics
          analyticsStore.trackDisconnection(userId);
          // Notify contacts that user is offline
          emitUserStatus(userId, 'offline');
        }
      }

      // Remove from typing indicators
      typingUsers.forEach((users, conversationId) => {
        if (users.has(userId)) {
          users.delete(userId);
          socket.to(`conversation:${conversationId}`).emit('typing:stop', {
            conversationId,
            userId,
          });
        }
      });

      // Handle WebRTC call disconnect
      handleUserDisconnect(userId);
    });

    // ============================================
    // ERROR HANDLING
    // ============================================

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('🔌 WebSocket server initialized');

  // Initialize file upload service with Socket.io
  initializeFileUploadService(io);

  // Initialize WebRTC signaling service
  initializeWebRTCService(io);

  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeWebSocket first.');
  }
  return io;
};

/**
 * Emit user online/offline status
 */
const emitUserStatus = (userId: string, status: 'online' | 'offline') => {
  // Broadcast to all connected users (they can filter based on their contacts)
  io.emit('user:status-changed', { userId, status });
};

// ============================================
// UTILITY FUNCTIONS FOR EMITTING EVENTS
// ============================================

/**
 * Send a new message notification to user
 */
export const emitNewMessage = (conversationId: string, message: any) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('message:new', message);
};

/**
 * Emit message read status update
 */
export const emitMessageRead = (conversationId: string, messageIds: string[]) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('messages:read', {
    conversationId,
    messageIds,
  });
};

/**
 * Emit message deleted event
 */
export const emitMessageDeleted = (conversationId: string, messageId: string) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('message:deleted', {
    conversationId,
    messageId,
  });
};

/**
 * Send notification to a specific user
 */
export const emitNotificationToUser = (userId: string, notification: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
};

/**
 * Emit order status update
 */
export const emitOrderUpdate = (userId: string, order: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('order:updated', order);
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = (): number => {
  return onlineUsers.size;
};

/**
 * Get all online user IDs
 */
export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

/**
 * Broadcast to all connected clients
 */
export const broadcastToAll = (event: string, data: any) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Send to specific user (all their connected devices)
 */
export const sendToUser = (userId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Alias for backward compatibility
export const emitToUser = sendToUser;

// ============================================
// SOCIAL & COMMENT EVENTS
// ============================================

/**
 * Emit new comment event to product/review/activity watchers
 */
export const emitNewComment = (
  entityType: 'product' | 'review' | 'activity',
  entityId: string,
  comment: any
) => {
  if (!io) return;
  io.to(`${entityType}:${entityId}`).emit('comment:new', {
    entityType,
    entityId,
    comment,
  });
};

/**
 * Emit comment updated event
 */
export const emitCommentUpdated = (commentId: string, comment: any) => {
  if (!io) return;
  io.emit('comment:updated', { commentId, comment });
};

/**
 * Emit comment deleted event
 */
export const emitCommentDeleted = (commentId: string) => {
  if (!io) return;
  io.emit('comment:deleted', { commentId });
};

/**
 * Emit comment liked event
 */
export const emitCommentLiked = (commentId: string, userId: string, likesCount: number) => {
  if (!io) return;
  io.emit('comment:liked', { commentId, userId, likesCount });
};

/**
 * Emit comment unliked event
 */
export const emitCommentUnliked = (commentId: string, userId: string, likesCount: number) => {
  if (!io) return;
  io.emit('comment:unliked', { commentId, userId, likesCount });
};

/**
 * Emit product liked event
 */
export const emitProductLiked = (productId: string, userId: string, likesCount: number) => {
  if (!io) return;
  io.to(`product:${productId}`).emit('product:liked', {
    productId,
    userId,
    likesCount,
  });
};

/**
 * Emit product unliked event
 */
export const emitProductUnliked = (productId: string, userId: string, likesCount: number) => {
  if (!io) return;
  io.to(`product:${productId}`).emit('product:unliked', {
    productId,
    userId,
    likesCount,
  });
};

/**
 * Emit new follower event to seller
 */
export const emitNewFollower = (sellerId: string, follower: any) => {
  if (!io) return;
  io.to(`user:${sellerId}`).emit('follower:new', follower);
};

/**
 * Emit activity feed update
 */
export const emitActivityFeedUpdate = (userId: string, activity: any) => {
  if (!io) return;
  // Emit to user and their followers
  io.to(`user:${userId}`).emit('activity:new', activity);
  io.to(`feed:${userId}`).emit('activity:new', activity);
};
