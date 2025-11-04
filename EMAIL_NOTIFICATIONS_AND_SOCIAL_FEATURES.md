# Email Notifications & Advanced Social Features Implementation

## Overview

This document details the implementation of email notifications and advanced social features for the TCG Marketplace application. These features significantly enhance user engagement and retention by providing timely notifications and fostering community interaction.

---

## Table of Contents

1. [Email Notification System](#email-notification-system)
2. [Commenting System](#commenting-system)
3. [User Mentions](#user-mentions)
4. [Real-time Updates (WebSocket)](#real-time-updates-websocket)
5. [Activity Feed Enhancements](#activity-feed-enhancements)
6. [Database Schema Changes](#database-schema-changes)
7. [API Endpoints](#api-endpoints)
8. [Configuration](#configuration)
9. [Testing](#testing)

---

## Email Notification System

### Features

The email notification system respects user preferences and sends beautiful, templated emails for various events.

#### Email Notification Types

1. **Social Notifications**
   - New follower
   - Product liked
   - Comment on products/reviews
   - Comment replies
   - User mentions

2. **Order Notifications** (Existing)
   - Order confirmation
   - Order shipped
   - Order delivered

3. **Price Alerts**
   - Price drops on wishlist items
   - Product restocked

4. **Messaging**
   - New messages

5. **Reviews**
   - New reviews on products

### Implementation

#### Email Notification Service

**Location:** `backend/src/services/emailNotificationService.ts`

**Key Functions:**

```typescript
sendEmailNotification(
  userId: string,
  notificationType: string,
  title: string,
  message: string,
  link?: string,
  data?: any
): Promise<void>
```

**Features:**
- Checks user email preferences before sending
- Only sends to verified email addresses
- Non-blocking async execution (doesn't break app on email failures)
- Maps notification types to email preference fields
- Supports custom data for each template

#### Email Templates

**Location:** `backend/src/templates/`

**Templates Available:**

| Template | File | Description |
|----------|------|-------------|
| Generic Notification | `generic-notification.hbs` | Fallback template for any notification |
| New Follower | `new-follower.hbs` | Someone started following you |
| New Message | `new-message.hbs` | New message from another user |
| New Review | `new-review.hbs` | Review on your product/seller profile |
| Price Drop | `price-drop.hbs` | Wishlist item price dropped |
| Product Restocked | `product-restocked.hbs` | Wishlist item back in stock |
| Product Liked | `product-liked.hbs` | Someone liked your product |
| New Comment | `new-comment.hbs` | Comment on your product/review/post |
| Mention | `mention.hbs` | You were mentioned in a comment |

**Template Features:**
- Consistent brand styling (green primary color: #10B981)
- Responsive design
- Call-to-action buttons
- Personalized content
- Links to relevant pages

#### User Preferences

Users can control which email notifications they receive via `UserSettings` model:

```typescript
{
  emailOnOrderUpdate: boolean       // Default: true
  emailOnNewMessage: boolean        // Default: true
  emailOnNewReview: boolean         // Default: true
  emailOnNewFollower: boolean       // Default: true
  emailOnPriceDrop: boolean         // Default: true
  emailOnMarketingUpdates: boolean  // Default: false
}
```

**API Endpoints:**
- `GET /api/notifications/preferences` - Get user's notification preferences
- `PUT /api/notifications/preferences` - Update notification preferences

### Integration

The email notification service is automatically triggered when creating in-app notifications:

```typescript
// In notificationController.ts
await createNotification(userId, type, title, message, link, data);
// Automatically triggers email notification if user preferences allow
```

---

## Commenting System

### Overview

A comprehensive commenting system that allows users to comment on:
- Products
- Reviews
- Activity feed posts

### Features

1. **Nested Comments/Replies**
   - Support for threaded discussions
   - Reply to specific comments
   - Unlimited nesting depth

2. **Comment Moderation**
   - Soft delete (content replaced with "[deleted]")
   - Edit tracking (isEdited flag, editedAt timestamp)
   - Admin can delete any comment

3. **Engagement**
   - Like/unlike comments
   - Like counter
   - Track who liked what

4. **User Mentions**
   - @username syntax in comments
   - Automatic mention detection
   - Notification for mentioned users

5. **Real-time Updates**
   - WebSocket events for new comments
   - Live comment updates
   - Real-time like counters

### Database Schema

#### Comment Model

```prisma
model Comment {
  id          String    @id @default(uuid())
  userId      String
  content     String

  // Polymorphic relations (only one should be set)
  productId   String?
  reviewId    String?
  activityId  String?

  // Thread support
  parentId    String?   // For nested comments/replies

  // Engagement
  likesCount  Int       @default(0)

  // Mentions (stored as JSON array of user IDs)
  mentions    String?   // JSON array: ["userId1", "userId2"]

  // Moderation
  isEdited    Boolean   @default(false)
  editedAt    DateTime?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  user        User
  product     Product?
  review      Review?
  activity    ActivityFeed?
  parent      Comment?
  replies     Comment[]
  likes       CommentLike[]
}

model CommentLike {
  id          String    @id @default(uuid())
  userId      String
  commentId   String
  createdAt   DateTime  @default(now())

  // Relations
  comment     Comment

  @@unique([userId, commentId])
}
```

### API Endpoints

#### Comments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/comments` | Create a comment | Yes |
| GET | `/api/comments` | Get comments (with filters) | No |
| GET | `/api/comments/:commentId` | Get single comment with replies | No |
| PUT | `/api/comments/:commentId` | Update comment | Yes (owner) |
| DELETE | `/api/comments/:commentId` | Delete comment | Yes (owner/admin) |
| POST | `/api/comments/:commentId/like` | Like a comment | Yes |
| DELETE | `/api/comments/:commentId/like` | Unlike a comment | Yes |

#### Create Comment

**POST** `/api/comments`

```json
{
  "content": "Great product! @username check this out",
  "productId": "uuid",      // Optional (one of productId/reviewId/activityId required)
  "reviewId": "uuid",       // Optional
  "activityId": "uuid",     // Optional
  "parentId": "uuid"        // Optional (for replies)
}
```

**Response:**
```json
{
  "message": "Comment created successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "content": "Great product! @username check this out",
    "productId": "uuid",
    "mentions": ["userId1"],
    "likesCount": 0,
    "repliesCount": 0,
    "isLikedByCurrentUser": false,
    "isEdited": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### Get Comments

**GET** `/api/comments?productId=uuid&page=1&limit=20`

Query parameters:
- `productId` - Filter by product
- `reviewId` - Filter by review
- `activityId` - Filter by activity
- `parentId` - Filter by parent comment (null for top-level)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

---

## User Mentions

### Features

- **@username syntax** in comments and messages
- Automatic mention detection and parsing
- Notification for mentioned users
- Email notification (if enabled)
- Real-time WebSocket notification

### Implementation

#### Mention Detection

```typescript
const extractMentions = (content: string): string[] => {
  const mentionPattern = /@(\w+)/g;
  const matches = content.match(mentionPattern);
  if (!matches) return [];

  return [...new Set(matches.map(m => m.substring(1)))];
};
```

#### Mention Storage

Mentions are stored as JSON array of user IDs in the `mentions` field:

```json
{
  "mentions": "[\"userId1\", \"userId2\", \"userId3\"]"
}
```

#### Mention Notifications

When a user is mentioned:
1. In-app notification created
2. Email sent (if user has `emailOnNewMessage` enabled)
3. WebSocket event emitted for real-time notification

---

## Real-time Updates (WebSocket)

### Overview

All social interactions emit WebSocket events for real-time user experience.

### WebSocket Events

#### Comment Events

| Event | Data | Description |
|-------|------|-------------|
| `comment:new` | `{ entityType, entityId, comment }` | New comment added |
| `comment:updated` | `{ commentId, comment }` | Comment edited |
| `comment:deleted` | `{ commentId }` | Comment deleted |
| `comment:liked` | `{ commentId, userId, likesCount }` | Comment liked |
| `comment:unliked` | `{ commentId, userId, likesCount }` | Comment unliked |

#### Social Events

| Event | Data | Description |
|-------|------|-------------|
| `product:liked` | `{ productId, userId, likesCount }` | Product liked |
| `product:unliked` | `{ productId, userId, likesCount }` | Product unliked |
| `follower:new` | `{ follower }` | New follower |
| `activity:new` | `{ activity }` | New activity feed entry |

#### Notification Events

| Event | Data | Description |
|-------|------|-------------|
| `notification:new` | `{ notification }` | New notification |
| `notification:read` | `{ notificationId }` | Notification marked as read |
| `notifications:read-all` | `{}` | All notifications marked as read |

### Client Usage Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for new comments
socket.on('comment:new', (data) => {
  console.log('New comment:', data);
  // Update UI to show new comment
});

// Listen for comment likes
socket.on('comment:liked', (data) => {
  console.log('Comment liked:', data);
  // Update like counter in UI
});

// Listen for notifications
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show notification toast
});

// Join a product page to receive real-time updates
socket.emit('join:conversation', productId);
```

---

## Activity Feed Enhancements

### New Activity Types

The activity feed now tracks these additional activities:

- `COMMENT_CREATED` - User commented on a product/review/post
- `COMMENT_LIKED` - User liked a comment
- `PRODUCT_LIKED` - User liked a product
- `REVIEW_CREATED` - User posted a review (existing)
- `PRODUCT_PURCHASED` - User purchased a product (existing)
- `COLLECTION_CREATED` - User created a collection (existing)
- `FOLLOWED_SELLER` - User followed a seller (existing)

### Activity Feed Creation

Activities are automatically created for relevant actions:

```typescript
await prisma.activityFeed.create({
  data: {
    userId,
    activityType: 'COMMENT_CREATED',
    title: 'commented on Pokemon Charizard',
    description: content.substring(0, 200),
    entityType: 'PRODUCT',
    entityId: productId,
    isPublic: true,
  },
});
```

---

## Database Schema Changes

### New Models

1. **Comment** - Comments on products, reviews, and activities
2. **CommentLike** - Like tracking for comments

### Modified Models

1. **User** - Added `comments` relation
2. **Product** - Added `comments` relation
3. **Review** - Added `comments` relation
4. **ActivityFeed** - Added `comments` relation

### Migration

Migration name: `20251103010729_add_comment_system`

To apply:
```bash
cd backend
npx prisma migrate deploy
```

---

## Configuration

### Environment Variables

Required email configuration in `.env`:

```env
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="TCG Marketplace <noreply@tcgmarketplace.com>"

# Frontend URL for email links
FRONTEND_URL=http://localhost:5173
```

### Email Service Setup

#### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated password
3. Use the app password as `EMAIL_PASSWORD` in `.env`

#### Development (Ethereal Email)

For testing emails in development without sending real emails:

```typescript
// The system automatically detects Ethereal in development
// and provides preview URLs in the console
```

---

## Testing

### Manual Testing

#### Test Email Notifications

1. **Create a comment:**
```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great product!",
    "productId": "product-uuid"
  }'
```

2. **Check console for email preview URL** (if using Ethereal)

3. **Verify email notification preferences:**
```bash
curl -X GET http://localhost:3000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Update preferences:**
```bash
curl -X PUT http://localhost:3000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOnNewComment": false
  }'
```

#### Test Comment System

1. **Create a comment:**
```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test comment @username",
    "productId": "product-uuid"
  }'
```

2. **Get comments:**
```bash
curl -X GET "http://localhost:3000/api/comments?productId=product-uuid"
```

3. **Like a comment:**
```bash
curl -X POST http://localhost:3000/api/comments/COMMENT_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Reply to a comment:**
```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a reply",
    "productId": "product-uuid",
    "parentId": "parent-comment-uuid"
  }'
```

### WebSocket Testing

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_TOKEN' }
});

// Test comment notifications
socket.on('comment:new', (data) => {
  console.log('Received new comment:', data);
});

// Create a comment and verify WebSocket event is received
```

---

## Notification Type Mapping

| Notification Type | Email Preference Field | Email Template | Description |
|-------------------|----------------------|----------------|-------------|
| `ORDER_UPDATE` | `emailOnOrderUpdate` | `generic-notification` | Order status changes |
| `ORDER_SHIPPED` | `emailOnOrderUpdate` | `order-shipped` | Order shipped |
| `ORDER_DELIVERED` | `emailOnOrderUpdate` | `order-delivered` | Order delivered |
| `PAYMENT_SUCCESS` | `emailOnOrderUpdate` | `generic-notification` | Payment successful |
| `PAYMENT_FAILED` | `emailOnOrderUpdate` | `generic-notification` | Payment failed |
| `NEW_MESSAGE` | `emailOnNewMessage` | `new-message` | New message received |
| `NEW_REVIEW` | `emailOnNewReview` | `new-review` | New review on product/seller |
| `NEW_FOLLOWER` | `emailOnNewFollower` | `new-follower` | New follower |
| `PRICE_DROP` | `emailOnPriceDrop` | `price-drop` | Wishlist item price dropped |
| `PRODUCT_RESTOCKED` | `emailOnPriceDrop` | `product-restocked` | Wishlist item restocked |
| `PRODUCT_LIKED` | `emailOnNewFollower` | `product-liked` | Someone liked your product |
| `NEW_COMMENT` | `emailOnNewReview` | `new-comment` | Comment on your content |
| `COMMENT_REPLY` | `emailOnNewReview` | `new-comment` | Reply to your comment |
| `COMMENT_LIKED` | `emailOnNewReview` | `generic-notification` | Someone liked your comment |
| `MENTION` | `emailOnNewMessage` | `mention` | You were mentioned |

---

## Future Enhancements

### Potential Features

1. **Comment Reactions**
   - Beyond likes: emoji reactions (👍 ❤️ 😂 🔥)
   - Reaction counters

2. **Rich Text Comments**
   - Markdown support
   - Image uploads in comments
   - Link previews

3. **Comment Moderation Tools**
   - Report inappropriate comments
   - Auto-moderation with AI
   - Moderator dashboard

4. **Email Digest**
   - Daily/weekly summary emails
   - Batch notifications instead of individual emails
   - Smart grouping of similar notifications

5. **Push Notifications**
   - Web push notifications
   - Mobile app notifications via FCM/APNS

6. **Advanced Mentions**
   - Mention suggestions (autocomplete)
   - Mention all (@everyone)
   - Mention specific roles

7. **Comment Analytics**
   - Most engaged posts
   - Comment sentiment analysis
   - User engagement metrics

---

## Troubleshooting

### Emails Not Sending

1. **Check email configuration in `.env`**
   ```bash
   # Verify SMTP settings
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

2. **Check console for email service status**
   ```
   ✅ Email service is ready to send messages
   ```
   or
   ```
   ❌ Email transporter verification failed: [error message]
   ```

3. **Test email configuration**
   ```typescript
   import { testEmailConfiguration } from './services/emailService';
   const isWorking = await testEmailConfiguration();
   ```

4. **Check user email preferences**
   - User must have email verified (`isVerified: true`)
   - User must have specific notification enabled

5. **Check logs for email sending**
   ```
   📧 Email sent to user@example.com: <message-id>
   ```
   or
   ```
   ❌ Failed to send email to user@example.com: [error]
   ```

### Comments Not Appearing

1. **Check if comment was created successfully**
   ```bash
   curl -X GET "http://localhost:3000/api/comments?productId=uuid"
   ```

2. **Verify authentication**
   - Comments require authentication for creation
   - Check JWT token validity

3. **Check WebSocket connection**
   ```javascript
   socket.on('connect', () => {
     console.log('WebSocket connected');
   });

   socket.on('connect_error', (error) => {
     console.error('Connection error:', error);
   });
   ```

### Mentions Not Working

1. **Check username format**
   - Must use `@username` format
   - Username must match exactly (case-sensitive in the database)

2. **Verify user exists**
   - The mentioned user must exist in the database
   - Username is stored in the `name` field

3. **Check notification creation**
   - Console should show: `✅ Email notification sent to...`

---

## Summary

### What Was Implemented

✅ **Email Notification System**
- Comprehensive email notification service
- 9 beautiful email templates
- User preference management
- Automatic integration with notification system

✅ **Commenting System**
- Comments on products, reviews, and activities
- Nested comments/replies
- Comment likes
- Edit and delete functionality
- Soft delete with moderation support

✅ **User Mentions**
- @username mention detection
- Automatic notification for mentions
- Support in comments and messages

✅ **Real-time Updates**
- WebSocket events for all social interactions
- Live comment updates
- Real-time like counters
- Instant notifications

✅ **Activity Feed**
- Enhanced with comment activities
- New activity types for engagement
- Real-time feed updates

✅ **Database Schema**
- New Comment and CommentLike models
- Proper relations and cascading deletes
- Migration applied successfully

### Files Created/Modified

**New Files:**
- `backend/src/services/emailNotificationService.ts`
- `backend/src/controllers/commentController.ts`
- `backend/src/routes/commentRoutes.ts`
- `backend/src/templates/generic-notification.hbs`
- `backend/src/templates/new-follower.hbs`
- `backend/src/templates/new-message.hbs`
- `backend/src/templates/new-review.hbs`
- `backend/src/templates/price-drop.hbs`
- `backend/src/templates/product-restocked.hbs`
- `backend/src/templates/product-liked.hbs`
- `backend/src/templates/new-comment.hbs`
- `backend/src/templates/mention.hbs`

**Modified Files:**
- `backend/prisma/schema.prisma` (Added Comment and CommentLike models)
- `backend/src/controllers/notificationController.ts` (Integrated email service, added notification types)
- `backend/src/services/websocket.ts` (Added social and comment events)
- `backend/src/server.ts` (Registered comment routes)

### Impact on User Retention

These features directly improve user retention through:

1. **Timely Email Notifications** - Keep users engaged even when offline
2. **Community Interaction** - Comments foster discussion and engagement
3. **Real-time Updates** - Instant feedback creates addictive user experience
4. **User Mentions** - Personal touches increase user connection
5. **Activity Feed** - Users see what their network is doing
6. **Customizable Preferences** - Users control their experience

---

**Documentation Version:** 1.0
**Last Updated:** 2025-11-03
**Author:** Claude Agent (Anthropic)
