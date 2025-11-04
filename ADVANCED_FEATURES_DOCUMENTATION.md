# Advanced WebSocket Features - Complete Documentation

## Overview
This document covers all advanced features implemented on top of the base WebSocket real-time communication system, including Redis scaling, message queuing, analytics tracking, file upload progress, and WebRTC voice/video calling.

---

## Table of Contents
1. [Redis Adapter for Multi-Server Scaling](#1-redis-adapter-for-multi-server-scaling)
2. [Message Queue for Offline Delivery](#2-message-queue-for-offline-delivery)
3. [Analytics Tracking](#3-analytics-tracking)
4. [File Upload Progress](#4-file-upload-progress)
5. [WebRTC Voice/Video Calls](#5-webrtc-voicevideo-calls)
6. [Testing Guide](#testing-guide)
7. [Production Deployment](#production-deployment)

---

## 1. Redis Adapter for Multi-Server Scaling

### Overview
The Redis adapter enables horizontal scaling by allowing multiple Socket.io server instances to communicate with each other through Redis pub/sub.

### Implementation
**File:** `backend/src/config/redis.ts`

```typescript
// Creates pub/sub Redis clients for Socket.io adapter
export const createRedisAdapterClients = () => {
  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();
  return { pubClient, subClient };
};
```

**File:** `backend/src/services/websocket.ts`

```typescript
// Automatic Redis adapter integration (fallback to in-memory if Redis unavailable)
try {
  const { pubClient, subClient } = createRedisAdapterClients();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('🔴 Redis adapter enabled for Socket.io (multi-server ready)');
} catch (error) {
  console.log('⚠️ Redis not available, using default in-memory adapter');
}
```

### Configuration
Set these environment variables in `.env`:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password  # Optional
REDIS_DB=0
```

### Benefits
- ✅ Horizontal scaling across multiple servers
- ✅ Load balancing with any number of instances
- ✅ Automatic failover to in-memory if Redis unavailable
- ✅ Zero configuration changes needed for single-server deployments

### Testing
```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start multiple server instances
PORT=3000 npm start &
PORT=3001 npm start &

# Connect clients to different ports - they can still communicate
```

---

## 2. Message Queue for Offline Delivery

### Overview
Bull queue system with Redis for persistent message delivery, handling online/offline users, notifications, and email queuing.

### Architecture
**File:** `backend/src/services/messageQueue.ts`

Three separate queues:
1. **Message Queue**: Handles message delivery (online/offline)
2. **Notification Queue**: Manages notification delivery and email triggers
3. **Email Queue**: Processes email sending

### Message Delivery Flow

```
User sends message
    ↓
Message saved to database
    ↓
Message queued for delivery
    ↓
├─ User ONLINE → Deliver via WebSocket immediately
│  └─ Track delivery metrics
│
└─ User OFFLINE → Create notification + Queue email (if enabled)
   └─ Deliver when user comes online
```

### Features
- **Automatic retry** with exponential backoff (3 attempts)
- **Offline delivery** - messages queued until user reconnects
- **Email notifications** - respects user email preferences
- **Delivery tracking** - monitors success/failure rates
- **Queue statistics** - real-time metrics on queue performance

### API Endpoints
```typescript
GET /api/analytics/queues  // Get queue statistics
```

Response:
```json
{
  "messageQueueSize": 5,
  "notificationQueueSize": 12,
  "emailQueueSize": 3,
  "averageProcessingTime": 45.2,
  "queueFailureRate": 0.02
}
```

### Configuration
```typescript
// Default job options (in messageQueue.ts)
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s retry delays
  },
  removeOnComplete: true,  // Auto-cleanup completed jobs
  removeOnFail: false      // Keep failed jobs for debugging
}
```

### Monitoring
The queue emits events for monitoring:
```typescript
messageQueue.on('completed', (job, result) => {
  console.log(`✅ Message job ${job.id} completed`);
});

messageQueue.on('failed', (job, error) => {
  console.error(`❌ Message job ${job?.id} failed`);
});
```

---

## 3. Analytics Tracking

### Overview
Comprehensive real-time analytics system tracking WebSocket connections, message delivery, queue performance, and user sessions.

### Metrics Tracked

#### Connection Metrics
- Total connections/disconnections
- Current online users
- Peak online users (with timestamp)
- Average connection duration

#### Message Metrics
- Total messages sent/delivered/failed
- Average delivery time
- Online vs offline delivery rate
- Message success rate

#### Queue Metrics
- Queue sizes (messages, notifications, emails)
- Average processing time
- Failure rates
- Processing statistics

#### User Session Metrics
- Connection/disconnection times
- Session duration
- Messages sent/received per session
- Typing events count

### Implementation
**File:** `backend/src/services/analytics.ts`

```typescript
// Track connection
analyticsStore.trackConnection(userId);

// Track message
analyticsStore.trackMessageSent(userId);
analyticsStore.trackMessageDelivered(deliveryTimeMs, wasOnline);

// Track typing
analyticsStore.trackTypingEvent(userId);
```

### API Endpoints

#### Get All Metrics
```http
GET /api/analytics
Authorization: Bearer <token>
```

Response:
```json
{
  "timestamp": "2025-11-03T12:34:56.789Z",
  "metrics": {
    "connections": {
      "totalConnections": 1523,
      "currentOnlineUsers": 45,
      "peakOnlineUsers": 127,
      "averageConnectionDuration": 1847500
    },
    "messages": {
      "totalMessagesSent": 3456,
      "totalMessagesDelivered": 3401,
      "messagesDeliveredOnline": 2987,
      "averageDeliveryTime": 45.2
    }
  }
}
```

#### Get Detailed Statistics
```http
GET /api/analytics/statistics
```

#### Get Active Sessions
```http
GET /api/analytics/sessions/active
```

#### Get User Session
```http
GET /api/analytics/sessions/:userId
```

### Automatic Reporting
Analytics are logged every 5 minutes to the console and can be exported to monitoring systems like Datadog, New Relic, or Prometheus.

---

## 4. File Upload Progress

### Overview
Real-time file upload progress tracking with WebSocket updates for image uploads.

### Implementation
**File:** `backend/src/services/fileUpload.ts`

**File:** `backend/src/controllers/imageController.ts`

### Upload Flow

```
Client initiates upload
    ↓
Server creates upload session
    ↓
Client receives upload ID
    ↓
Server processes file
    ↓
├─ upload:progress (0-100%)
├─ upload:processing (optimizing, etc.)
└─ upload:complete (URL returned)
    OR
    upload:error (if failed)
```

### WebSocket Events

#### Client → Server
None required. Upload progress is tracked automatically via REST API.

#### Server → Client

##### Upload Progress
```javascript
socket.on('upload:progress', (data) => {
  console.log(data);
  // {
  //   uploadId: "upload-123",
  //   filename: "product-image.jpg",
  //   progress: 75,
  //   uploadedBytes: 750000,
  //   totalBytes: 1000000,
  //   status: "uploading"
  // }
});
```

##### Upload Complete
```javascript
socket.on('upload:complete', (data) => {
  console.log(data);
  // {
  //   uploadId: "upload-123",
  //   filename: "product-image.jpg",
  //   url: "https://cdn.cloudinary.com/...",
  //   duration: 1234
  // }
});
```

##### Upload Error
```javascript
socket.on('upload:error', (data) => {
  console.error(data);
  // {
  //   uploadId: "upload-123",
  //   filename: "product-image.jpg",
  //   error: "File too large"
  // }
});
```

### REST API Integration

#### Upload Single Image
```http
POST /api/products/:productId/images
Content-Type: multipart/form-data

Response:
{
  "message": "Image uploaded successfully",
  "image": { ... },
  "uploadId": "upload-123"  // Use to track progress
}
```

#### Upload Multiple Images
```http
POST /api/products/:productId/images/bulk
Content-Type: multipart/form-data

Response:
{
  "message": "5 image(s) uploaded successfully",
  "images": [ ... ],
  "uploadIds": ["upload-123", "upload-124", ...]
}
```

### Client Example

```typescript
// React component example
function ImageUploader() {
  const [uploadProgress, setUploadProgress] = useState({});

  useEffect(() => {
    // Listen for upload progress
    socket.on('upload:progress', ({ uploadId, progress }) => {
      setUploadProgress(prev => ({ ...prev, [uploadId]: progress }));
    });

    socket.on('upload:complete', ({ uploadId, url }) => {
      console.log('Upload complete:', url);
      // Update UI with the uploaded image
    });

    return () => {
      socket.off('upload:progress');
      socket.off('upload:complete');
    };
  }, []);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/products/123/images', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` }
    });

    const { uploadId } = await response.json();
    // Progress updates will arrive via WebSocket
  };

  return (
    <div>
      {Object.entries(uploadProgress).map(([id, progress]) => (
        <ProgressBar key={id} value={progress} />
      ))}
    </div>
  );
}
```

---

## 5. WebRTC Voice/Video Calls

### Overview
Complete WebRTC signaling server for peer-to-peer voice and video calls between users.

### Architecture

WebRTC requires a signaling server to exchange connection information between peers. Our implementation provides:
- Call initiation and answering
- ICE candidate exchange
- Call rejection and ending
- Automatic cleanup on disconnect

### Implementation
**File:** `backend/src/services/webrtc.ts`

### Call Flow

```
Caller                    Server                    Callee
  │                         │                         │
  │──call:initiate─────────>│                         │
  │  (with SDP offer)        │                         │
  │                         │──call:incoming────────>│
  │<─call:initiated─────────│  (with SDP offer)       │
  │                         │                         │
  │                         │<─call:answer───────────│
  │<─call:answered──────────│  (with SDP answer)      │
  │  (with SDP answer)       │                         │
  │                         │                         │
  │──call:ice-candidate────>│──call:ice-candidate──>│
  │<─call:ice-candidate─────│<─call:ice-candidate────│
  │                         │                         │
  │                         │                         │
  │  [ P2P Media Connection Established ]            │
  │<=============VOICE/VIDEO DATA===================>│
  │                         │                         │
  │──call:end──────────────>│──call:ended──────────>│
```

### WebSocket Events

#### Client → Server

##### Initiate Call
```javascript
socket.emit('call:initiate', {
  targetUserId: "user-456",
  type: "video",  // or "voice"
  offer: sdpOffer  // RTCSessionDescription
});

// Callback
socket.on('call:initiated', ({ callId }) => {
  console.log('Call initiated:', callId);
});
```

##### Answer Call
```javascript
socket.emit('call:answer', {
  callId: "call-123",
  answer: sdpAnswer  // RTCSessionDescription
});
```

##### Reject Call
```javascript
socket.emit('call:reject', {
  callId: "call-123"
});
```

##### End Call
```javascript
socket.emit('call:end', {
  callId: "call-123"
});
```

##### Send ICE Candidate
```javascript
socket.emit('call:ice-candidate', {
  callId: "call-123",
  candidate: iceCandidate  // RTCIceCandidate
});
```

##### Get Active Call
```javascript
socket.emit('call:get-active', (callSession) => {
  if (callSession) {
    console.log('Active call:', callSession);
  }
});
```

#### Server → Client

##### Incoming Call
```javascript
socket.on('call:incoming', ({ callId, callerId, type, offer }) => {
  // Show incoming call UI
  showIncomingCallDialog(callerId, type);
  // Use offer to set up peer connection
});
```

##### Call Answered
```javascript
socket.on('call:answered', ({ callId, answer }) => {
  // Set remote description with answer
  peerConnection.setRemoteDescription(answer);
});
```

##### Call Rejected
```javascript
socket.on('call:rejected', ({ callId }) => {
  // Handle rejection
  showNotification('Call was rejected');
});
```

##### Call Ended
```javascript
socket.on('call:ended', ({ callId, reason }) => {
  // Clean up peer connection
  peerConnection.close();
  endCallUI();
});
```

##### ICE Candidate
```javascript
socket.on('call:ice-candidate', ({ callId, candidate }) => {
  // Add ICE candidate to peer connection
  peerConnection.addIceCandidate(candidate);
});
```

##### Call Error
```javascript
socket.on('call:error', ({ error }) => {
  console.error('Call error:', error);
});
```

### Client Implementation Example

```typescript
// WebRTC Call Manager
class WebRTCCallManager {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream;

  constructor(private socket: Socket) {
    this.setupSocketListeners();
  }

  // Initiate a video call
  async initiateCall(targetUserId: string, isVideo: boolean) {
    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo
    });

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('call:ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      // Display remote video/audio
      remoteVideoElement.srcObject = event.streams[0];
    };

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('call:initiate', {
      targetUserId,
      type: isVideo ? 'video' : 'voice',
      offer
    });
  }

  // Answer incoming call
  async answerCall(callId: string, offer: RTCSessionDescriptionInit) {
    this.currentCallId = callId;

    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Add tracks and set up event handlers (same as above)

    // Set remote description
    await this.peerConnection.setRemoteDescription(offer);

    // Create and send answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('call:answer', { callId, answer });
  }

  // End call
  endCall() {
    this.socket.emit('call:end', { callId: this.currentCallId });
    this.cleanup();
  }

  private setupSocketListeners() {
    this.socket.on('call:incoming', ({ callId, callerId, type, offer }) => {
      // Show incoming call UI
      showIncomingCallDialog(callerId, type, () => {
        this.answerCall(callId, offer);
      });
    });

    this.socket.on('call:answered', ({ answer }) => {
      this.peerConnection.setRemoteDescription(answer);
    });

    this.socket.on('call:ice-candidate', ({ candidate }) => {
      this.peerConnection.addIceCandidate(candidate);
    });

    this.socket.on('call:ended', () => {
      this.cleanup();
    });
  }

  private cleanup() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
  }
}
```

### Call Statistics

```typescript
import { getCallStatistics } from './services/webrtc';

const stats = getCallStatistics();
console.log(stats);
// {
//   totalActiveCalls: 5,
//   totalRingingCalls: 2,
//   voiceCalls: 3,
//   videoCalls: 2,
//   averageCallDuration: 45000  // ms
// }
```

### Features
- ✅ Voice and video calls
- ✅ Call waiting and rejection
- ✅ ICE candidate exchange
- ✅ Automatic cleanup on disconnect
- ✅ Multi-device support (call on any connected device)
- ✅ Call statistics and monitoring

### Limitations
- Peer-to-peer only (no group calls in this implementation)
- Requires STUN/TURN servers for NAT traversal
- No call recording
- No screen sharing (can be added)

---

## Testing Guide

### Prerequisites
```bash
# Install Redis
docker run -d -p 6379:6379 redis:alpine

# Install dependencies
cd backend
npm install
```

### Test Redis Adapter
```bash
# Terminal 1
PORT=3000 npm start

# Terminal 2
PORT=3001 npm start

# Connect clients to different ports
# Send message from port 3000 client
# Verify receipt on port 3001 client
```

### Test Message Queue
```bash
# Start server
npm start

# Send message to offline user
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": "user-123", "content": "Test message"}'

# Check queue stats
curl http://localhost:3000/api/analytics/queues \
  -H "Authorization: Bearer <token>"

# User comes online → message delivered automatically
```

### Test Analytics
```bash
# Get all metrics
curl http://localhost:3000/api/analytics \
  -H "Authorization: Bearer <token>"

# Get connection metrics
curl http://localhost:3000/api/analytics/connections \
  -H "Authorization: Bearer <token>"

# Get detailed statistics
curl http://localhost:3000/api/analytics/statistics \
  -H "Authorization: Bearer <token>"
```

### Test File Upload Progress
```bash
# Upload image (WebSocket connected)
curl -X POST http://localhost:3000/api/products/123/images \
  -H "Authorization: Bearer <token>" \
  -F "image=@test-image.jpg"

# Watch WebSocket for upload:progress events
# upload:progress { progress: 50, ... }
# upload:processing
# upload:complete { url: "..." }
```

### Test WebRTC
```javascript
// Browser Console - User 1
const socket1 = io('http://localhost:3000', { auth: { token: token1 } });
socket1.emit('call:initiate', {
  targetUserId: 'user-2',
  type: 'video',
  offer: { /* SDP offer */ }
});

// Browser Console - User 2
const socket2 = io('http://localhost:3000', { auth: { token: token2 } });
socket2.on('call:incoming', ({ callId, offer }) => {
  console.log('Incoming call!', callId);
  socket2.emit('call:answer', {
    callId,
    answer: { /* SDP answer */ }
  });
});
```

---

## Production Deployment

### Environment Variables
```bash
# Redis Configuration
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# For scaling, use Redis cluster
REDIS_CLUSTER=true
```

### Scaling Strategy

#### Horizontal Scaling
```bash
# Deploy multiple instances behind load balancer
# NGINX configuration example

upstream socketio_nodes {
    ip_hash;  # Required for WebSocket
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    listen 80;

    location /socket.io/ {
        proxy_pass http://socketio_nodes;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Monitoring

#### Key Metrics to Monitor
- WebSocket connection count
- Message delivery success rate
- Queue sizes (alert if >1000)
- Average delivery time
- Redis connection status
- Server CPU/memory usage

#### Logging
All services log to console. Configure log aggregation:
```bash
# Example with Docker
docker logs -f backend-1 | grep "📊\|❌\|⚠️"
```

#### Health Checks
```bash
# Server health
curl http://localhost:3000/health

# Redis health
redis-cli ping

# Queue health
curl http://localhost:3000/api/analytics/queues
```

### Performance Optimization

#### Redis
```bash
# Increase max connections
redis-cli CONFIG SET maxclients 10000

# Enable persistence
redis-cli CONFIG SET save "900 1 300 10"
```

#### Bull Queues
```typescript
// Adjust concurrency in messageQueue.ts
messageQueue.process(5, async (job) => { // Process 5 jobs concurrently
  // ...
});
```

#### WebSocket
```typescript
// Adjust ping timeout in websocket.ts
io = new SocketIOServer(server, {
  pingTimeout: 60000,  // 60 seconds
  pingInterval: 25000,  // 25 seconds
});
```

---

## Troubleshooting

### Redis Connection Issues
```
Error: Redis connection refused
```
**Solution:** Ensure Redis is running and accessible
```bash
docker ps  # Check if Redis container is running
redis-cli ping  # Test connection
```

### Queue Not Processing
```
Messages stuck in queue
```
**Solution:** Check queue worker status
```typescript
const stats = await messageQueue.getJobCounts();
console.log(stats);  // Check active, waiting, failed counts
```

### WebRTC Connection Failed
```
ICE connection failed
```
**Solution:** Configure TURN server for NAT traversal
```typescript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
});
```

### High Memory Usage
```
Server memory increasing over time
```
**Solution:** Check for memory leaks in analytics/queue cleanup
```typescript
// Verify cleanup intervals are running
analyticsStore.cleanupOldSessions();
cleanQueues();
```

---

## Summary

All advanced features are now production-ready:

✅ **Redis Adapter** - Multi-server scaling with automatic fallback
✅ **Message Queue** - Reliable offline delivery with retry logic
✅ **Analytics** - Comprehensive real-time metrics and monitoring
✅ **File Upload** - Real-time progress tracking for image uploads
✅ **WebRTC** - Full voice/video calling with signaling server

### Next Steps
1. Deploy Redis cluster for production
2. Configure monitoring dashboards
3. Set up log aggregation
4. Implement rate limiting for API endpoints
5. Add admin dashboard for analytics visualization
6. Configure TURN servers for WebRTC NAT traversal
7. Implement call recording (optional)
8. Add screen sharing for video calls (optional)

---

**Documentation Complete!** 🎉

For questions or issues, refer to:
- [WebSocket Documentation](./WEBSOCKET_DOCUMENTATION.md)
- [Phase 3 Documentation](./PHASE_3_COMPLETE.md)
- [Development Analysis](./DEVELOPMENT_ANALYSIS.md)
