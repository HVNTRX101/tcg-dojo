import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { logger, httpLoggerStream } from '../config/logger';
import { setUser, addBreadcrumb, setContext } from '../config/sentry';

/**
 * Logging Middleware
 * HTTP request logging and context enrichment
 */

/**
 * Morgan HTTP logger middleware
 */
export const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: httpLoggerStream,
    skip: (req, res) => {
      // Skip health check logs in production
      if (process.env.NODE_ENV === 'production' && req.url === '/health') {
        return true;
      }
      return false;
    },
  }
);

/**
 * Request context middleware
 * Adds request context to logs and Sentry
 */
export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  (req as any).requestId = requestId;

  // Set request context for Sentry
  setContext('request', {
    id: requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Add breadcrumb to Sentry
  addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.url}`,
    level: 'info',
    data: {
      requestId,
      ip: req.ip,
    },
  });

  // Add user context if authenticated
  const userId = (req as any).userId;
  if (userId) {
    setUser({ id: userId });
    setContext('user', {
      id: userId,
      role: (req as any).userRole,
    });
  }

  // Log request
  logger.http('Incoming Request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: userId || 'anonymous',
  });

  // Track response time
  const startTime = Date.now();

  // Intercept response to log it
  const originalSend = res.send;
  res.send = function (data: any) {
    const responseTime = Date.now() - startTime;

    logger.http('Outgoing Response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: userId || 'anonymous',
    });

    // Warn on slow responses
    if (responseTime > 3000) {
      logger.warn('Slow Response Detected', {
        requestId,
        method: req.method,
        url: req.url,
        responseTime: `${responseTime}ms`,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Error logging middleware
 * Logs errors before sending response
 */
export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId;
  const userId = (req as any).userId;

  logger.error('Request Error', {
    requestId,
    userId: userId || 'anonymous',
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  next(error);
};

/**
 * Performance monitoring middleware
 * Tracks endpoint performance
 */
export const performanceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  // Intercept response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.url}`;

    logger.info('Endpoint Performance', {
      requestId,
      endpoint,
      duration: `${duration}ms`,
      statusCode: res.statusCode,
    });

    // Alert on very slow endpoints
    if (duration > 5000) {
      logger.error('Critical Performance Issue', {
        requestId,
        endpoint,
        duration: `${duration}ms`,
        message: 'Endpoint took longer than 5 seconds',
      });
    }
  });

  next();
};

/**
 * Audit log middleware for sensitive operations
 */
export const auditLogMiddleware = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const requestId = (req as any).requestId;

    logger.info('Audit Log', {
      requestId,
      action,
      userId: userId || 'anonymous',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: sanitizeForLogging(req.body),
      params: req.params,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    next();
  };
};

/**
 * Sanitize sensitive data before logging
 */
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordConfirm',
    'token',
    'refreshToken',
    'accessToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Database query logging middleware (for Prisma)
 */
export const setupDatabaseLogging = (prisma: any) => {
  prisma.$on('query', (e: any) => {
    const duration = e.duration;

    if (duration > 1000) {
      logger.warn('Slow Database Query', {
        query: e.query,
        params: e.params,
        duration: `${duration}ms`,
        target: e.target,
      });
    } else {
      logger.debug('Database Query', {
        query: e.query,
        duration: `${duration}ms`,
      });
    }
  });
};
