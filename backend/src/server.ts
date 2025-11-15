// IMPORTANT: Sentry instrumentation must be imported first, before any other imports
// This ensures Sentry can capture all errors and performance data from the start
import './instrument';

import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './services/websocket';
import {
  securityHeaders,
  generalLimiter,
  authLimiter,
  adminLimiter,
  sanitizeInput,
  xssProtection,
  hppProtection,
  csrfProtection,
  sqlInjectionProtection,
  securityLogger,
} from './middleware/security';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import couponRoutes from './routes/couponRoutes';
import paymentRoutes from './routes/paymentRoutes';
import imageRoutes from './routes/imageRoutes';
import priceHistoryRoutes from './routes/priceHistoryRoutes';
import searchRoutes from './routes/searchRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import sellerRoutes from './routes/sellerRoutes';
import reviewRoutes from './routes/reviewRoutes';
import collectionRoutes from './routes/collectionRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import userSettingsRoutes from './routes/userSettingsRoutes';
import addressRoutes from './routes/addressRoutes';
import orderTrackingRoutes from './routes/orderTrackingRoutes';
import socialRoutes from './routes/socialRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import commentRoutes from './routes/commentRoutes';
import adminRoutes from './routes/adminRoutes';
import adminProductRoutes from './routes/adminProductRoutes';
import adminOrderRoutes from './routes/adminOrderRoutes';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes';
import sellerAnalyticsRoutes from './routes/sellerAnalyticsRoutes';
import healthRoutes from './routes/health.routes';
import prisma from './config/database';
import { initializeRedis, closeRedis } from './config/redis';
import { sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import { logger } from './config/logger';
import {
  httpLogger,
  requestContextMiddleware,
  errorLoggingMiddleware,
  performanceMonitoringMiddleware,
  setupDatabaseLogging,
} from './middleware/logging';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app: Application = express();
const httpServer = createServer(app);

// Sentry request handler (must be first middleware)
// Note: Sentry.init() is called in src/instrument.ts which is imported at the top of this file
app.use(sentryRequestHandler());

// Sentry tracing handler
app.use(sentryTracingHandler());

// Initialize Redis (optional - will gracefully degrade if unavailable)
try {
  initializeRedis();
} catch (error) {
  logger.warn('Redis initialization failed - caching disabled', { error });
}

// Initialize WebSocket server
const io = initializeWebSocket(httpServer);

// Setup database query logging
if (process.env.NODE_ENV !== 'production' || process.env.LOG_DB_QUERIES === 'true') {
  setupDatabaseLogging(prisma);
}

// Trust proxy - Important for rate limiting and security when behind load balancer/nginx
app.set('trust proxy', 1);

// Logging Middleware (Phase 5)
app.use(httpLogger); // HTTP request logging
app.use(requestContextMiddleware); // Request context enrichment
app.use(performanceMonitoringMiddleware); // Performance tracking

// Security Middleware (Phase 5)
app.use(securityHeaders); // Security headers (helmet with custom config)
app.use(securityLogger); // Log security-relevant events
app.use(sanitizeInput); // NoSQL injection protection
app.use(sqlInjectionProtection); // SQL injection prevention
app.use(xssProtection); // XSS protection
app.use(hppProtection); // HTTP parameter pollution protection
app.use(csrfProtection); // CSRF protection

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression for API responses
app.use(compression({
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
}));

// Stripe webhook route (needs raw body)
// Must be BEFORE express.json() middleware
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentRoutes
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check and monitoring routes (no rate limiting)
app.use(healthRoutes);

// Swagger API Documentation (no rate limiting for better DX)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TCG Marketplace API Documentation',
  customfavIcon: '/favicon.ico',
}));

// API spec JSON endpoint
app.get('/api-spec.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes); // Stricter rate limit for auth
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', orderTrackingRoutes); // Enhanced order tracking endpoints
app.use('/api/coupons', couponRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', imageRoutes); // Image routes (includes /api/products/:productId/images)
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user/settings', userSettingsRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/comments', commentRoutes);

// Phase 4: Admin & Analytics Routes (with admin rate limiter)
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin', adminLimiter, adminProductRoutes);
app.use('/api/admin', adminLimiter, adminOrderRoutes);
app.use('/api/admin/analytics', adminLimiter, adminAnalyticsRoutes);
app.use('/api/seller/analytics', sellerAnalyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error logging middleware
app.use(errorLoggingMiddleware);

// Sentry error handler (must be before other error handlers)
sentryErrorHandler(app);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    httpServer.listen(config.port, () => {
      logger.info('Server started', {
        port: config.port,
        environment: config.nodeEnv,
        nodeVersion: process.version,
      });

      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log(`🔌 WebSocket server ready at ws://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal - shutting down gracefully');
  console.log('\n🛑 Shutting down gracefully...');

  try {
    await prisma.$disconnect();
    await closeRedis();
    logger.info('Server shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal - shutting down gracefully');
  console.log('\n🛑 Shutting down gracefully...');

  try {
    await prisma.$disconnect();
    await closeRedis();
    logger.info('Server shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason,
    promise,
  });
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

export default app;
