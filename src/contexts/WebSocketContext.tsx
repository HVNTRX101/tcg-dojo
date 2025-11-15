import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { websocketService } from '../services/websocket.service';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface WebSocketContextValue {
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Map<string, Set<string>>; // conversationId -> Set of userIds
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  getUserStatus: (
    userId: string,
    callback: (data: { userId: string; status: string }) => void
  ) => void;
  getUsersStatus: (
    userIds: string[],
    callback: (statuses: Array<{ userId: string; status: string }>) => void
  ) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  onNewMessage?: (message: any) => void;
  onNewNotification?: (notification: any) => void;
  onOrderUpdate?: (order: any) => void;
  onMessageRead?: (data: { conversationId: string; messageIds: string[] }) => void;
  onMessageDeleted?: (data: { conversationId: string; messageId: string }) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationsReadAll?: () => void;
  onCommentNew?: (data: { entityType: string; entityId: string; comment: any }) => void;
}

export function WebSocketProvider({
  children,
  onNewMessage,
  onNewNotification,
  onOrderUpdate,
  onMessageRead,
  onMessageDeleted,
  onNotificationRead,
  onNotificationsReadAll,
  onCommentNew,
}: WebSocketProviderProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user) {
      websocketService.connect();

      // Set up event handlers
      websocketService.setEventHandlers({
        onConnect: () => {
          setIsConnected(true);
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onError: error => {
          console.error('WebSocket error:', error);
          toast.error('Connection error. Retrying...');
        },
        onNewMessage: message => {
          onNewMessage?.(message);
        },
        onNewNotification: notification => {
          onNewNotification?.(notification);

          // Show toast for new notification
          toast.info(notification.message || 'New notification', {
            description: notification.title,
          });
        },
        onOrderUpdate: order => {
          onOrderUpdate?.(order);

          // Show toast for order update
          toast.success('Order status updated', {
            description: `Order #${order.id} - ${order.status}`,
          });
        },
        onTypingStart: ({ conversationId, userId }) => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            if (!newMap.has(conversationId)) {
              newMap.set(conversationId, new Set());
            }
            newMap.get(conversationId)!.add(userId);
            return newMap;
          });
        },
        onTypingStop: ({ conversationId, userId }) => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            if (newMap.has(conversationId)) {
              newMap.get(conversationId)!.delete(userId);
              if (newMap.get(conversationId)!.size === 0) {
                newMap.delete(conversationId);
              }
            }
            return newMap;
          });
        },
        onUserStatusChanged: ({ userId, status }) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (status === 'online') {
              newSet.add(userId);
            } else {
              newSet.delete(userId);
            }
            return newSet;
          });
        },
        onMessageRead: data => {
          onMessageRead?.(data);
        },
        onMessageDeleted: data => {
          onMessageDeleted?.(data);
        },
        onNotificationRead: notificationId => {
          onNotificationRead?.(notificationId);
        },
        onNotificationsReadAll: () => {
          onNotificationsReadAll?.();
        },
        onCommentNew: data => {
          onCommentNew?.(data);
        },
      });

      // Cleanup on unmount or when user changes
      return () => {
        websocketService.disconnect();
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      };
    }
  }, [
    user,
    onNewMessage,
    onNewNotification,
    onOrderUpdate,
    onMessageRead,
    onMessageDeleted,
    onNotificationRead,
    onNotificationsReadAll,
    onCommentNew,
  ]);

  const joinConversation = useCallback((conversationId: string) => {
    websocketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    websocketService.leaveConversation(conversationId);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    websocketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    websocketService.stopTyping(conversationId);
  }, []);

  const getUserStatus = useCallback(
    (userId: string, callback: (data: { userId: string; status: string }) => void) => {
      websocketService.getUserStatus(userId, callback);
    },
    []
  );

  const getUsersStatus = useCallback(
    (
      userIds: string[],
      callback: (statuses: Array<{ userId: string; status: string }>) => void
    ) => {
      websocketService.getUsersStatus(userIds, callback);
    },
    []
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    websocketService.markNotificationRead(notificationId);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    websocketService.markAllNotificationsRead();
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    onlineUsers,
    typingUsers,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    getUserStatus,
    getUsersStatus,
    markNotificationRead,
    markAllNotificationsRead,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
