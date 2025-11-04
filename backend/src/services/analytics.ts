/**
 * Analytics Service
 * Tracks WebSocket connections, message delivery, and queue performance
 */

interface ConnectionMetrics {
  totalConnections: number;
  totalDisconnections: number;
  currentOnlineUsers: number;
  peakOnlineUsers: number;
  peakOnlineUsersTime: Date | null;
  averageConnectionDuration: number;
}

interface MessageMetrics {
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesFailed: number;
  averageDeliveryTime: number;
  messagesDeliveredOnline: number;
  messagesDeliveredOffline: number;
}

interface QueueMetrics {
  messageQueueSize: number;
  notificationQueueSize: number;
  emailQueueSize: number;
  averageQueueProcessingTime: number;
  queueFailureRate: number;
}

interface UserSessionMetrics {
  userId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  duration?: number;
  messagesSent: number;
  messagesReceived: number;
  typingEvents: number;
}

// In-memory analytics store
class AnalyticsStore {
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    totalDisconnections: 0,
    currentOnlineUsers: 0,
    peakOnlineUsers: 0,
    peakOnlineUsersTime: null,
    averageConnectionDuration: 0,
  };

  private messageMetrics: MessageMetrics = {
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    totalMessagesFailed: 0,
    averageDeliveryTime: 0,
    messagesDeliveredOnline: 0,
    messagesDeliveredOffline: 0,
  };

  private queueMetrics: QueueMetrics = {
    messageQueueSize: 0,
    notificationQueueSize: 0,
    emailQueueSize: 0,
    averageQueueProcessingTime: 0,
    queueFailureRate: 0,
  };

  private userSessions: Map<string, UserSessionMetrics> = new Map();
  private deliveryTimes: number[] = [];
  private connectionDurations: number[] = [];
  private queueProcessingTimes: number[] = [];

  // ============================================
  // CONNECTION TRACKING
  // ============================================

  trackConnection(userId: string) {
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.currentOnlineUsers++;

    // Update peak online users
    if (this.connectionMetrics.currentOnlineUsers > this.connectionMetrics.peakOnlineUsers) {
      this.connectionMetrics.peakOnlineUsers = this.connectionMetrics.currentOnlineUsers;
      this.connectionMetrics.peakOnlineUsersTime = new Date();
    }

    // Create user session
    this.userSessions.set(userId, {
      userId,
      connectedAt: new Date(),
      messagesSent: 0,
      messagesReceived: 0,
      typingEvents: 0,
    });

    console.log(`📊 User ${userId} connected. Online users: ${this.connectionMetrics.currentOnlineUsers}`);
  }

  trackDisconnection(userId: string) {
    this.connectionMetrics.totalDisconnections++;
    this.connectionMetrics.currentOnlineUsers--;

    // Update user session
    const session = this.userSessions.get(userId);
    if (session) {
      const duration = Date.now() - session.connectedAt.getTime();
      session.disconnectedAt = new Date();
      session.duration = duration;

      // Track connection duration
      this.connectionDurations.push(duration);
      if (this.connectionDurations.length > 1000) {
        this.connectionDurations.shift(); // Keep last 1000
      }

      // Update average
      this.connectionMetrics.averageConnectionDuration =
        this.connectionDurations.reduce((a, b) => a + b, 0) / this.connectionDurations.length;

      console.log(`📊 User ${userId} disconnected. Session duration: ${(duration / 1000).toFixed(2)}s`);
    }
  }

  // ============================================
  // MESSAGE TRACKING
  // ============================================

  trackMessageSent(userId: string) {
    this.messageMetrics.totalMessagesSent++;

    const session = this.userSessions.get(userId);
    if (session) {
      session.messagesSent++;
    }
  }

  trackMessageDelivered(deliveryTimeMs: number, deliveredOnline: boolean) {
    this.messageMetrics.totalMessagesDelivered++;

    if (deliveredOnline) {
      this.messageMetrics.messagesDeliveredOnline++;
    } else {
      this.messageMetrics.messagesDeliveredOffline++;
    }

    // Track delivery time
    this.deliveryTimes.push(deliveryTimeMs);
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes.shift(); // Keep last 1000
    }

    // Update average
    this.messageMetrics.averageDeliveryTime =
      this.deliveryTimes.reduce((a, b) => a + b, 0) / this.deliveryTimes.length;
  }

  trackMessageFailed() {
    this.messageMetrics.totalMessagesFailed++;
  }

  trackMessageReceived(userId: string) {
    const session = this.userSessions.get(userId);
    if (session) {
      session.messagesReceived++;
    }
  }

  trackTypingEvent(userId: string) {
    const session = this.userSessions.get(userId);
    if (session) {
      session.typingEvents++;
    }
  }

  // ============================================
  // QUEUE TRACKING
  // ============================================

  updateQueueMetrics(
    messageQueueSize: number,
    notificationQueueSize: number,
    emailQueueSize: number
  ) {
    this.queueMetrics.messageQueueSize = messageQueueSize;
    this.queueMetrics.notificationQueueSize = notificationQueueSize;
    this.queueMetrics.emailQueueSize = emailQueueSize;
  }

  trackQueueProcessing(processingTimeMs: number, failed: boolean = false) {
    if (!failed) {
      this.queueProcessingTimes.push(processingTimeMs);
      if (this.queueProcessingTimes.length > 1000) {
        this.queueProcessingTimes.shift();
      }

      this.queueMetrics.averageQueueProcessingTime =
        this.queueProcessingTimes.reduce((a, b) => a + b, 0) / this.queueProcessingTimes.length;
    }

    // Calculate failure rate
    const totalProcessed = this.messageMetrics.totalMessagesDelivered + this.messageMetrics.totalMessagesFailed;
    this.queueMetrics.queueFailureRate = totalProcessed > 0
      ? this.messageMetrics.totalMessagesFailed / totalProcessed
      : 0;
  }

  // ============================================
  // METRICS RETRIEVAL
  // ============================================

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  getMessageMetrics(): MessageMetrics {
    return { ...this.messageMetrics };
  }

  getQueueMetrics(): QueueMetrics {
    return { ...this.queueMetrics };
  }

  getUserSessionMetrics(userId: string): UserSessionMetrics | null {
    return this.userSessions.get(userId) || null;
  }

  getAllActiveUserSessions(): UserSessionMetrics[] {
    return Array.from(this.userSessions.values()).filter(s => !s.disconnectedAt);
  }

  getRecentDisconnectedSessions(limit: number = 10): UserSessionMetrics[] {
    return Array.from(this.userSessions.values())
      .filter(s => s.disconnectedAt)
      .sort((a, b) => (b.disconnectedAt?.getTime() || 0) - (a.disconnectedAt?.getTime() || 0))
      .slice(0, limit);
  }

  getAllMetrics() {
    return {
      connections: this.getConnectionMetrics(),
      messages: this.getMessageMetrics(),
      queues: this.getQueueMetrics(),
      activeSessions: this.getAllActiveUserSessions().length,
      recentSessions: this.getRecentDisconnectedSessions(5),
    };
  }

  // ============================================
  // CLEANUP
  // ============================================

  cleanupOldSessions(olderThanMs: number = 24 * 3600 * 1000) {
    const cutoffTime = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [userId, session] of this.userSessions.entries()) {
      if (session.disconnectedAt && session.disconnectedAt.getTime() < cutoffTime) {
        this.userSessions.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old user sessions`);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  getDetailedStatistics() {
    const connectionMetrics = this.getConnectionMetrics();
    const messageMetrics = this.getMessageMetrics();
    const queueMetrics = this.getQueueMetrics();

    // Calculate success rates
    const totalMessages = messageMetrics.totalMessagesDelivered + messageMetrics.totalMessagesFailed;
    const messageSuccessRate = totalMessages > 0
      ? (messageMetrics.totalMessagesDelivered / totalMessages) * 100
      : 100;

    const onlineDeliveryRate = messageMetrics.totalMessagesDelivered > 0
      ? (messageMetrics.messagesDeliveredOnline / messageMetrics.totalMessagesDelivered) * 100
      : 0;

    // Calculate average session metrics
    const activeSessions = this.getAllActiveUserSessions();
    const avgMessagesPerSession = activeSessions.length > 0
      ? activeSessions.reduce((sum, s) => sum + s.messagesSent + s.messagesReceived, 0) / activeSessions.length
      : 0;

    return {
      overview: {
        currentOnlineUsers: connectionMetrics.currentOnlineUsers,
        peakOnlineUsers: connectionMetrics.peakOnlineUsers,
        peakOnlineUsersTime: connectionMetrics.peakOnlineUsersTime,
        totalConnections: connectionMetrics.totalConnections,
        totalDisconnections: connectionMetrics.totalDisconnections,
        averageConnectionDuration: `${(connectionMetrics.averageConnectionDuration / 1000).toFixed(2)}s`,
      },
      messages: {
        totalSent: messageMetrics.totalMessagesSent,
        totalDelivered: messageMetrics.totalMessagesDelivered,
        totalFailed: messageMetrics.totalMessagesFailed,
        successRate: `${messageSuccessRate.toFixed(2)}%`,
        averageDeliveryTime: `${messageMetrics.averageDeliveryTime.toFixed(2)}ms`,
        onlineDeliveryRate: `${onlineDeliveryRate.toFixed(2)}%`,
        offlineDeliveryCount: messageMetrics.messagesDeliveredOffline,
      },
      queues: {
        messageQueue: queueMetrics.messageQueueSize,
        notificationQueue: queueMetrics.notificationQueueSize,
        emailQueue: queueMetrics.emailQueueSize,
        averageProcessingTime: `${queueMetrics.averageQueueProcessingTime.toFixed(2)}ms`,
        failureRate: `${(queueMetrics.queueFailureRate * 100).toFixed(2)}%`,
      },
      sessions: {
        activeCount: activeSessions.length,
        averageMessagesPerSession: avgMessagesPerSession.toFixed(2),
        totalTrackedSessions: this.userSessions.size,
      },
    };
  }
}

// Singleton instance
export const analyticsStore = new AnalyticsStore();

// Cleanup old sessions every hour
setInterval(() => {
  analyticsStore.cleanupOldSessions();
}, 3600 * 1000);

// Log statistics every 5 minutes
setInterval(() => {
  const stats = analyticsStore.getDetailedStatistics();
  console.log('📊 Analytics Summary:', JSON.stringify(stats, null, 2));
}, 5 * 60 * 1000);

console.log('📊 Analytics service initialized');

export default analyticsStore;
