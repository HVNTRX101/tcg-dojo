import * as Sentry from '@sentry/node';

/**
 * Sentry Error Tracking Configuration
 *
 * Note: Sentry initialization now happens in src/instrument.ts which is imported
 * first in server.ts. This file only exports middleware handlers and utility functions.
 */

/**
 * Sentry middleware for Express
 * These handlers provide automatic error tracking and performance monitoring for Express apps
 * Note: In Sentry v8+, use setupExpressErrorHandler instead of individual handlers
 */
export const sentryRequestHandler = () => {
  // In v8+, request handling is automatic with SDK init
  return (req: any, res: any, next: any) => next();
};

export const sentryTracingHandler = () => {
  // In v8+, tracing is automatic with performance integrations
  return (req: any, res: any, next: any) => next();
};

export const sentryErrorHandler = (app: any) => {
  // Use Sentry's express error handler for v8+
  Sentry.setupExpressErrorHandler(app);
};

/**
 * Capture exception manually
 */
export const captureException = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context
 */
export const setUser = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

/**
 * Clear user context
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Set custom tag
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Set custom context
 */
export const setContext = (name: string, context: { [key: string]: any }) => {
  Sentry.setContext(name, context);
};

/**
 * Start transaction for performance monitoring
 * Note: In Sentry v8+, use startSpan instead of startTransaction
 */
export const startTransaction = (name: string, op: string) => {
  // Deprecated in v8+, use startSpan instead
  return Sentry.startSpan({ name, op }, () => {});
};

/**
 * Flush pending events
 */
export const flush = async (timeout?: number) => {
  return await Sentry.flush(timeout);
};

/**
 * Sentry structured logger
 * Use these instead of console.log for better log tracking in Sentry
 *
 * Examples:
 * - logger.trace('Starting database connection', { database: 'users' });
 * - logger.debug(logger.fmt`Cache miss for user: ${userId}`);
 * - logger.info('Updated profile', { profileId: 345 });
 * - logger.warn('Rate limit reached', { endpoint: '/api/results/' });
 * - logger.error('Failed to process payment', { orderId: 'order_123' });
 * - logger.fatal('Database connection pool exhausted');
 */
export const logger = Sentry.logger;

/**
 * Start a span for performance tracking
 * Use for meaningful actions like API calls, database queries, etc.
 *
 * Example:
 * await Sentry.startSpan(
 *   { op: 'http.client', name: 'GET /api/users' },
 *   async (span) => {
 *     span?.setAttribute('userId', userId);
 *     return await fetchUserData(userId);
 *   }
 * );
 */
export const startSpan = Sentry.startSpan;

export default Sentry;
