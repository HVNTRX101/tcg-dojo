# WebSocket Real-Time Communication - Documentation

## Overview
The application now features a complete WebSocket implementation using Socket.io for real-time messaging, notifications, typing indicators, and online presence tracking.

## Connection

### Client Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN' // Required for authentication
  },
  path: '/socket.io/',
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Authentication
- WebSocket connections require JWT authentication
- Token can be provided via `auth.token` or `Authorization` header
- Invalid tokens will result in connection rejection

---

## Events Reference

### 1. Messaging Events

#### **Client → Server Events**

##### Join Conversation
```javascript
socket.emit('join:conversation', conversationId);
```
- Join a conversation room to receive real-time messages
- Required before receiving messages for that conversation

##### Leave Conversation
```javascript
socket.emit('leave:conversation', conversationId);
```
- Leave a conversation room
- Stop receiving real-time updates for that conversation

##### Start Typing
```javascript
socket.emit('typing:start', {
  conversationId: 'conversation-id-here'
});
```
- Notify other participants that you're typing
- Automatically broadcasts to other users in the conversation

##### Stop Typing
```javascript
socket.emit('typing:stop', {
  conversationId: 'conversation-id-here'
});
```
- Notify other participants that you stopped typing

##### Get Online Users in Conversation
```javascript
socket.emit('conversation:get-online-users', conversationId, (onlineUserIds) => {
  console.log('Online users:', onlineUserIds);
});
```
- Request list of currently online users in a conversation
- Callback receives array of user IDs

#### **Server → Client Events**

##### New Message
```javascript
socket.on('message:new', (message) => {
  console.log('New message:', message);
  // message: { id, conversationId, senderId, content, sender: {...}, ... }
});
```
- Emitted when a new message is sent in a conversation you've joined
- Automatically emitted to all participants in the conversation

##### Messages Read
```javascript
socket.on('messages:read', (data) => {
  console.log('Messages read:', data);
  // data: { conversationId, messageIds: [...] }
});
```
- Emitted when messages are marked as read
- Update UI to show read receipts

##### Message Deleted
```javascript
socket.on('message:deleted', (data) => {
  console.log('Message deleted:', data);
  // data: { conversationId, messageId }
});
```
- Emitted when a message is deleted
- Remove message from UI

##### Typing Indicators
```javascript
// User started typing
socket.on('typing:start', (data) => {
  console.log('User typing:', data);
  // data: { conversationId, userId }
});

// User stopped typing
socket.on('typing:stop', (data) => {
  console.log('User stopped typing:', data);
  // data: { conversationId, userId }
});
```
- Real-time typing indicators
- Shows when other users are composing messages

---

### 2. Notification Events

#### **Client → Server Events**

##### Mark Notification as Read
```javascript
socket.emit('notification:read', notificationId);
```
- Mark a notification as read
- Broadcasts to all user's connected devices

##### Mark All Notifications as Read
```javascript
socket.emit('notifications:read-all');
```
- Mark all notifications as read
- Broadcasts to all user's connected devices

#### **Server → Client Events**

##### New Notification
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // notification: { id, type, title, message, link, data, ... }
});
```
- Emitted when a new notification is created for the user
- Includes all notification details

##### Notification Read (from other device)
```javascript
socket.on('notification:read', (notificationId) => {
  // Mark notification as read in UI
});
```
- Emitted when notification is read on another device
- Sync read status across devices

##### All Notifications Read (from other device)
```javascript
socket.on('notifications:read-all', () => {
  // Mark all notifications as read in UI
});
```
- Emitted when all notifications are read on another device

---

### 3. Presence/Online Status Events

#### **Client → Server Events**

##### Get User Status
```javascript
socket.emit('user:get-status', targetUserId, (status) => {
  console.log('User status:', status);
  // status: { userId, status: 'online' | 'offline' }
});
```
- Check if a specific user is online
- Callback receives user status

##### Get Multiple Users Status
```javascript
socket.emit('users:get-status', [userId1, userId2, userId3], (statuses) => {
  console.log('Users statuses:', statuses);
  // statuses: [{ userId, status }, ...]
});
```
- Check online status of multiple users at once

#### **Server → Client Events**

##### User Status Changed
```javascript
socket.on('user:status-changed', (data) => {
  console.log('User status changed:', data);
  // data: { userId, status: 'online' | 'offline' }
});
```
- Broadcasted when any user goes online or offline
- Frontend should filter based on relevant contacts/conversations

---

## Complete Client Example

### React/TypeScript Integration

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket Hook
function useWebSocket(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socketInstance = io('http://localhost:3000', {
      auth: { token },
      path: '/socket.io/',
    });

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  return { socket, isConnected };
}

// Message Component
function MessageScreen({ conversationId, token }: Props) {
  const { socket, isConnected } = useWebSocket(token);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join conversation
    socket.emit('join:conversation', conversationId);

    // Get online users
    socket.emit('conversation:get-online-users', conversationId, (users) => {
      setOnlineUsers(users);
    });

    // Listen for new messages
    socket.on('message:new', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('typing:start', ({ userId }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    });

    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Listen for read receipts
    socket.on('messages:read', ({ messageIds }) => {
      setMessages(prev => prev.map(msg =>
        messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
      ));
    });

    // Listen for deleted messages
    socket.on('message:deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });

    // Cleanup
    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('messages:read');
      socket.off('message:deleted');
    };
  }, [socket, conversationId]);

  const handleTyping = (isTyping: boolean) => {
    if (!socket) return;

    if (isTyping) {
      socket.emit('typing:start', { conversationId });
    } else {
      socket.emit('typing:stop', { conversationId });
    }
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Online: {onlineUsers.length} users</div>
      {typingUsers.size > 0 && <div>Someone is typing...</div>}
      {/* Message UI */}
    </div>
  );
}

// Notification Component
function NotificationCenter({ token }: Props) {
  const { socket } = useWebSocket(token);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Listen for new notifications
    socket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png',
        });
      }
    });

    // Listen for read events from other devices
    socket.on('notification:read', (notificationId) => {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    socket.on('notifications:read-all', () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notifications:read-all');
    };
  }, [socket]);

  const markAsRead = (notificationId: string) => {
    if (!socket) return;
    socket.emit('notification:read', notificationId);
  };

  return (
    <div>
      <div>Unread: {unreadCount}</div>
      {/* Notification list UI */}
    </div>
  );
}
```

---

## Backend Utilities

The WebSocket service provides utility functions for emitting events from server-side code:

```typescript
import {
  emitNewMessage,
  emitMessageRead,
  emitMessageDeleted,
  emitNotificationToUser,
  emitOrderUpdate,
  sendToUser,
  broadcastToAll,
  isUserOnline,
  getOnlineUsersCount,
} from './services/websocket';

// Send message notification
emitNewMessage(conversationId, messageData);

// Send notification to user
emitNotificationToUser(userId, notificationData);

// Check if user is online
const online = isUserOnline(userId);

// Send custom event to user
sendToUser(userId, 'custom:event', data);

// Broadcast to all connected users
broadcastToAll('announcement', data);
```

---

## Event Summary Table

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join:conversation` | Client → Server | Join a conversation room |
| `leave:conversation` | Client → Server | Leave a conversation room |
| `typing:start` | Bidirectional | Typing indicator started |
| `typing:stop` | Bidirectional | Typing indicator stopped |
| `message:new` | Server → Client | New message received |
| `messages:read` | Server → Client | Messages marked as read |
| `message:deleted` | Server → Client | Message was deleted |
| `notification:new` | Server → Client | New notification |
| `notification:read` | Bidirectional | Notification marked as read |
| `notifications:read-all` | Bidirectional | All notifications read |
| `user:status-changed` | Server → Client | User online/offline status changed |
| `user:get-status` | Client → Server | Request user status |
| `users:get-status` | Client → Server | Request multiple users' status |
| `conversation:get-online-users` | Client → Server | Get online users in conversation |

---

## Security Considerations

### Implemented
1. **JWT Authentication**: All connections require valid JWT tokens
2. **User Rooms**: Each user has a private room (`user:${userId}`) for personal notifications
3. **Conversation Rooms**: Users must join conversation rooms to receive messages
4. **Authorization**: Server verifies user permissions before joining rooms

### Best Practices
1. **Validate User Access**: Always verify user has permission to join conversation/room
2. **Rate Limiting**: Consider implementing rate limits for typing indicators
3. **Token Refresh**: Implement token refresh mechanism for long-lived connections
4. **Disconnect Handling**: Properly clean up on disconnect

---

## Performance Considerations

### Current Implementation
- ✅ Efficient room-based messaging
- ✅ Automatic cleanup on disconnect
- ✅ Typing indicator debouncing recommended client-side
- ✅ Selective event listening (users only receive relevant events)

### Recommendations for Scale
1. **Redis Adapter**: For horizontal scaling across multiple servers
   ```bash
   npm install @socket.io/redis-adapter redis
   ```

2. **Rate Limiting**: Implement per-user rate limits for events

3. **Message Queue**: For critical notifications, use a queue (Bull/RabbitMQ)

4. **Monitoring**: Track connection count, event frequency, errors

---

## Testing WebSocket Connection

### Using Postman/Insomnia
1. Create new WebSocket request
2. URL: `ws://localhost:3000/socket.io/?EIO=4&transport=websocket`
3. Add auth token in connection headers

### Using Browser Console
```javascript
// In browser console
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_TOKEN_HERE' }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('message:new', msg => console.log('New message:', msg));

// Join a conversation
socket.emit('join:conversation', 'conversation-id');

// Test typing
socket.emit('typing:start', { conversationId: 'conversation-id' });
```

### Using Socket.io Client Tools
- Socket.io Admin UI: https://admin.socket.io/
- Socket.io Client: Browser extension for testing

---

## Troubleshooting

### Connection Issues

**Problem**: Connection refused or timeout
- **Solution**: Ensure server is running on correct port
- **Solution**: Check CORS settings match your frontend origin
- **Solution**: Verify JWT token is valid and not expired

**Problem**: Authentication error
- **Solution**: Check token is passed correctly in `auth.token` or headers
- **Solution**: Verify token format (should be just the token, not "Bearer TOKEN")

**Problem**: Not receiving events
- **Solution**: Ensure you've joined the correct room (`join:conversation`)
- **Solution**: Check event listener is registered before event is emitted
- **Solution**: Verify user has permission to access the conversation

### Debugging

Enable Socket.io debugging:
```javascript
localStorage.debug = 'socket.io-client:socket';
```

Server-side debugging is already enabled with console.log statements.

---

## Migration from Polling

If you were previously using HTTP polling for real-time updates:

### Before (Polling)
```javascript
// Poll every 5 seconds
setInterval(async () => {
  const response = await fetch('/api/messages/unread-count');
  const { unreadCount } = await response.json();
  updateUI(unreadCount);
}, 5000);
```

### After (WebSocket)
```javascript
// Real-time updates
socket.on('message:new', (message) => {
  updateUI(message);
});
```

**Benefits**:
- ⚡ Instant updates (no delay)
- 💰 Reduced server load (no constant polling)
- 🔋 Lower battery usage on mobile
- 📊 Real-time presence and typing indicators

---

## Future Enhancements

### Planned Features
1. **Voice/Video Calling**: WebRTC integration
2. **File Sharing**: Real-time file upload progress
3. **Screen Sharing**: For customer support
4. **Group Conversations**: Multi-user chat rooms
5. **Message Reactions**: Real-time emoji reactions
6. **Voice Messages**: Audio message streaming

### Infrastructure
1. **Redis Adapter**: For multi-server deployments
2. **Message Persistence**: Store messages in queue before delivery
3. **Offline Support**: Queue messages for offline users
4. **Analytics**: Track connection metrics and engagement

---

## Support

For issues or questions about WebSocket implementation:
1. Check server logs for connection/authentication errors
2. Use browser DevTools Network tab to inspect WebSocket frames
3. Enable Socket.io debug mode for detailed logging
4. Review this documentation for correct event usage

---

**WebSocket Integration Complete!** 🎉

Your application now features enterprise-grade real-time communication with:
- ✅ Real-time messaging with delivery confirmation
- ✅ Typing indicators and online presence
- ✅ Instant notification delivery
- ✅ Multi-device synchronization
- ✅ Secure JWT authentication
- ✅ Room-based message broadcasting
