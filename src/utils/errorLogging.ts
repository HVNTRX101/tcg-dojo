/**
 * Centralized Error Logging Utility
 *
 * This module provides utilities for logging errors to external services
 * and tracking application errors in a consistent manner.
 */

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
  const shouldLog = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true';

  if (shouldLog) {
    // Example: Send to Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorData.message), {
    //     level: 'error',
    //     tags: {
    //       errorLevel: errorData.level,
    //     },
    //     extra: errorData,
    //   });
    // }

    // Example: Send to custom API endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // }).catch(err => console.error('Failed to log error:', err));

    // For now, just log to console in a structured way
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
  window.addEventListener('error', (event) => {
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
  window.addEventListener('unhandledrejection', (event) => {
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
