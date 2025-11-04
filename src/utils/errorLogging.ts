/**
 * Centralized Error Logging Utility
 *
 * This module provides utilities for logging errors to external services
 * and tracking application errors in a consistent manner.
 */

import * as Sentry from '@sentry/react';

export interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  level: 'root' | 'route' | 'component' | 'api';
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ApiErrorLogData extends Omit<ErrorLogData, 'componentStack'> {
  endpoint: string;
  method: string;
  statusCode?: number;
  requestData?: any;
  responseData?: any;
}

/**
 * Log error to external error tracking service
 *
 * In production, this would integrate with services like:
 * - Sentry
 * - LogRocket
 * - Datadog
 * - New Relic
 * - Bugsnag
 */
export function logErrorToService(errorData: ErrorLogData): void {
  // Only log in production or if explicitly enabled
  const shouldLog = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true';

  if (shouldLog) {
    // Send to Sentry
    if (import.meta.env.VITE_SENTRY_DSN) {
      // Sanitize error data before sending
      const sanitizedData = sanitizeErrorData(errorData);

      // Create error object with stack trace if available
      const error = new Error(sanitizedData.message);
      if (sanitizedData.stack) {
        error.stack = sanitizedData.stack;
      }

      // Capture exception with Sentry
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          errorLevel: sanitizedData.level,
          url: sanitizedData.url,
        },
        contexts: {
          errorDetails: {
            timestamp: sanitizedData.timestamp,
            userAgent: sanitizedData.userAgent,
            componentStack: sanitizedData.componentStack,
          },
        },
        extra: {
          metadata: sanitizedData.metadata,
        },
        user: sanitizedData.userId ? { id: sanitizedData.userId } : undefined,
      });
    }

    // Also log to console in a structured way
    console.error('Error logged to service:', errorData);
  } else {
    // In development, just log to console
    console.error('Development error:', errorData);
  }
}

/**
 * Log API errors with additional context
 */
export function logApiError(
  error: Error,
  endpoint: string,
  method: string,
  options?: {
    statusCode?: number;
    requestData?: any;
    responseData?: any;
    metadata?: Record<string, any>;
  }
): void {
  const errorData: ApiErrorLogData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    level: 'api',
    endpoint,
    method,
    statusCode: options?.statusCode,
    requestData: options?.requestData,
    responseData: options?.responseData,
    metadata: options?.metadata,
  };

  logErrorToService(errorData);
}

/**
 * Log component-level errors
 */
export function logComponentError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName?: string
): void {
  const errorData: ErrorLogData = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    level: 'component',
    metadata: {
      componentName,
    },
  };

  logErrorToService(errorData);
}

/**
 * Create a global error handler for uncaught errors
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  window.addEventListener('error', event => {
    const errorData: ErrorLogData = {
      message: event.message,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: 'root',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    };

    logErrorToService(errorData);
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    const errorData: ErrorLogData = {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: 'root',
      metadata: {
        type: 'unhandledRejection',
        reason: event.reason,
      },
    };

    logErrorToService(errorData);
  });
}

/**
 * Sanitize error data to remove sensitive information
 */
export function sanitizeErrorData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'];

  if (typeof data === 'object') {
    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeErrorData(sanitized[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data: data ? sanitizeErrorData(data) : undefined,
    });
  }
}

/**
 * Set custom tag for error filtering
 */
export function setTag(key: string, value: string): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setTag(key, value);
  }
}

/**
 * Set custom context for errors
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setContext(name, sanitizeErrorData(context));
  }
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
