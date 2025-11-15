import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { createCloudWatchTransport, getCloudWatchConfig } from './cloudwatch';

/**
 * Winston Logger Configuration
 * Comprehensive logging with file rotation and multiple transports
 * Now includes CloudWatch integration for centralized logging
 */

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Log directory
const logDir = path.join(process.cwd(), 'logs');

// Create transports
const transports: winston.transport[] = [];

// Console transport (development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

// File transport for errors
transports.push(
  new DailyRotateFile({
    level: 'error',
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    ),
  })
);

// File transport for combined logs
transports.push(
  new DailyRotateFile({
    dirname: logDir,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    ),
  })
);

// File transport for HTTP requests
transports.push(
  new DailyRotateFile({
    level: 'http',
    dirname: logDir,
    filename: 'http-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      json()
    ),
  })
);

// CloudWatch transport (if enabled)
const cloudWatchConfig = getCloudWatchConfig();
const cloudWatchTransport = createCloudWatchTransport(cloudWatchConfig);
if (cloudWatchTransport) {
  transports.push(cloudWatchTransport);
  console.log('CloudWatch logging enabled');
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: winston.config.npm.levels,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// Stream for Morgan HTTP logger
export const httpLoggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Structured logging helpers
 */

export const logRequest = (req: any) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.userId,
  });
};

export const logResponse = (req: any, res: any, responseTime: number) => {
  logger.http('HTTP Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.userId,
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logDatabaseQuery = (query: string, duration: number) => {
  if (duration > 1000) {
    logger.warn('Slow Database Query', {
      query,
      duration: `${duration}ms`,
    });
  } else {
    logger.debug('Database Query', {
      query,
      duration: `${duration}ms`,
    });
  }
};

export const logCacheOperation = (operation: string, key: string, hit: boolean) => {
  logger.debug('Cache Operation', {
    operation,
    key,
    hit,
  });
};

export const logBusinessEvent = (event: string, data: any) => {
  logger.info('Business Event', {
    event,
    ...data,
  });
};

/**
 * Performance monitoring
 */
export const createPerformanceTimer = (operation: string) => {
  const start = Date.now();

  return {
    end: (metadata?: any) => {
      const duration = Date.now() - start;
      logger.info('Performance Metric', {
        operation,
        duration: `${duration}ms`,
        ...metadata,
      });

      if (duration > 5000) {
        logger.warn('Slow Operation Detected', {
          operation,
          duration: `${duration}ms`,
          ...metadata,
        });
      }
    },
  };
};

export default logger;
