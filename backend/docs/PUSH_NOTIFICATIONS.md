# Push Notifications Setup Guide

## Overview

TCG Dojo supports Web Push notifications using the W3C Push API standard. This allows sending notifications to users even when they're not actively using the website.

## Architecture

- **Backend**: Web Push service using `web-push` library
- **Frontend**: Service Worker + Push API
- **Protocol**: VAPID (Voluntary Application Server Identification)

## Setup

### 1. Generate VAPID Keys

VAPID keys are required for Web Push. Generate them once:

```bash
# Using Node.js REPL
node
> const webpush = require('web-push');
> const vapidKeys = webpush.generateVAPIDKeys();
> console.log(vapidKeys);
```

### 2. Configure Environment Variables

Add to `.env`:

```env
# VAPID keys for Web Push
VAPID_PUBLIC_KEY=BNnOq... (your public key)
VAPID_PRIVATE_KEY=aBcD... (your private key)
VAPID_SUBJECT=mailto:support@tcgdojo.com
```

### 3. Update Database Schema

Add push subscription field to UserSettings model:

```prisma
model UserSettings {
  id               String   @id @default(uuid())
  userId           String   @unique
  pushEnabled      Boolean  @default(false)
  pushSubscription String?  // JSON string of push subscription
  // ... other fields
}
```

Run migration:
```bash
npx prisma migrate dev --name add_push_notifications
```

## Frontend Integration

### 1. Register Service Worker

In your main app file:

```typescript
import { pushNotificationClient } from './services/pushNotification.client';

// On app initialization
if (pushNotificationClient.isSupported()) {
  pushNotificationClient.registerServiceWorker();
}
```

### 2. Request Permission & Subscribe

```typescript
import { pushNotificationClient } from './services/pushNotification.client';

// In a component (e.g., settings page)
const handleEnablePush = async () => {
  try {
    await pushNotificationClient.subscribe();
    alert('Push notifications enabled!');
  } catch (error) {
    console.error('Failed to enable push notifications:', error);
    alert('Failed to enable push notifications');
  }
};
```

### 3. Unsubscribe

```typescript
const handleDisablePush = async () => {
  try {
    await pushNotificationClient.unsubscribe();
    alert('Push notifications disabled');
  } catch (error) {
    console.error('Failed to disable push notifications:', error);
  }
};
```

### 4. Check Subscription Status

```typescript
const checkPushStatus = async () => {
  const isSubscribed = await pushNotificationClient.isSubscribed();
  const permission = pushNotificationClient.getPermission();

  console.log('Subscribed:', isSubscribed);
  console.log('Permission:', permission);
};
```

## Backend Usage

### Send Notification to Single User

```typescript
import { pushNotificationService } from './services/pushNotification.service';

await pushNotificationService.sendToUser(userId, {
  title: 'New Order!',
  body: 'Your order #12345 has shipped',
  icon: '/icon-192x192.png',
  data: {
    orderId: '12345',
    type: 'order_update',
  },
  actions: [
    {
      action: 'view',
      title: 'View Order',
    },
  ],
});
```

### Send to Multiple Users

```typescript
await pushNotificationService.sendToUsers(
  ['user1', 'user2', 'user3'],
  {
    title: 'Flash Sale!',
    body: '50% off all Pokemon cards for the next hour',
  }
);
```

### Broadcast to All Users

```typescript
// Admin only
await pushNotificationService.broadcast({
  title: 'Maintenance Notice',
  body: 'Scheduled maintenance at 2 AM EST',
  requireInteraction: true,
});
```

### Helper Methods

```typescript
// Order update
await pushNotificationService.sendOrderUpdate(
  userId,
  orderId,
  'shipped',
  'Your order has shipped!'
);

// New message
await pushNotificationService.sendNewMessage(
  userId,
  senderId,
  'John Doe',
  'Hey, is this card still available?'
);

// Price drop alert
await pushNotificationService.sendPriceDrop(
  userId,
  productId,
  'Charizard VMAX',
  99.99,
  79.99
);
```

## API Endpoints

### Get VAPID Public Key
```
GET /api/push/public-key
```

### Subscribe to Push
```
POST /api/push/subscribe
Authorization: Bearer {token}

Body:
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### Unsubscribe
```
POST /api/push/unsubscribe
Authorization: Bearer {token}
```

### Send Test Notification
```
POST /api/push/test
Authorization: Bearer {token}
```

### Broadcast (Admin Only)
```
POST /api/push/broadcast
Authorization: Bearer {token}

Body:
{
  "title": "Announcement",
  "body": "Message to all users",
  "icon": "/icon.png"
}
```

## Notification Payload

Full notification options:

```typescript
interface PushNotificationPayload {
  title: string;              // Required
  body: string;               // Required
  icon?: string;              // Icon URL
  badge?: string;             // Badge icon (monochrome)
  image?: string;             // Large image
  data?: any;                 // Custom data
  tag?: string;               // Notification ID (replaces existing with same tag)
  requireInteraction?: boolean; // Keep notification visible
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}
```

## Service Worker Events

The service worker handles three main events:

### 1. Push Event
Triggered when notification is received:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, options);
});
```

### 2. Notification Click
Triggered when user clicks notification:
```javascript
self.addEventListener('notificationclick', (event) => {
  // Handle click based on notification type
  clients.openWindow(url);
});
```

### 3. Notification Close
Triggered when user dismisses notification:
```javascript
self.addEventListener('notificationclose', (event) => {
  // Track dismissal analytics
});
```

## Best Practices

### 1. Permission Timing
- Don't ask for permission immediately on page load
- Ask after user performs an action (e.g., "Notify me of price drops")
- Provide clear value proposition

### 2. Notification Content
- Keep titles short (< 50 characters)
- Keep body concise (< 100 characters)
- Use clear, actionable language
- Include relevant icons/images

### 3. Frequency
- Don't spam users
- Respect user preferences
- Group related notifications (use `tag`)

### 4. Error Handling
- Handle subscription expiration (410 status)
- Remove expired subscriptions from database
- Provide fallback for unsupported browsers

### 5. Testing
```typescript
// Test notification
await pushNotificationClient.sendTestNotification();

// Check browser support
if (!pushNotificationClient.isSupported()) {
  console.warn('Push notifications not supported');
}
```

## Troubleshooting

### Notifications Not Showing

1. **Check permission**: `Notification.permission === 'granted'`
2. **Check subscription**: Use DevTools > Application > Service Workers
3. **Check console**: Look for service worker errors
4. **Verify VAPID keys**: Ensure they're set in environment

### Subscription Fails

1. **HTTPS required**: Push API only works on HTTPS (except localhost)
2. **Service worker scope**: Must be served from root
3. **VAPID keys**: Ensure public key matches private key

### Notifications Not Clickable

1. **Check data property**: Ensure notification includes necessary data
2. **Service worker event**: Verify `notificationclick` handler
3. **Browser limitations**: Some browsers have restrictions

## Browser Support

- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari 16+ (macOS only)
- ❌ iOS Safari (not supported)

## Security Considerations

1. **VAPID Keys**: Keep private key secret (environment variable)
2. **Subscription Data**: Stored securely in database
3. **Authentication**: All endpoints require user authentication
4. **Rate Limiting**: Prevent notification spam
5. **User Consent**: Always get explicit permission

## Example Component

```typescript
import { useState, useEffect } from 'react';
import { pushNotificationClient } from '../services/pushNotification.client';

function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(pushNotificationClient.isSupported());
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const subscribed = await pushNotificationClient.isSubscribed();
    setIsSubscribed(subscribed);
  };

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await pushNotificationClient.unsubscribe();
        setIsSubscribed(false);
      } else {
        await pushNotificationClient.subscribe();
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Push notification toggle failed:', error);
    }
  };

  if (!isSupported) {
    return <p>Push notifications not supported</p>;
  }

  return (
    <button onClick={handleToggle}>
      {isSubscribed ? 'Disable' : 'Enable'} Push Notifications
    </button>
  );
}
```

## Analytics

Track notification metrics:
- Subscription rate
- Click-through rate
- Dismissal rate
- Permission denial rate

## Next Steps

1. Implement notification preferences (order updates, messages, etc.)
2. Add A/B testing for notification content
3. Implement notification scheduling
4. Add rich media support
5. Integrate with analytics platform
