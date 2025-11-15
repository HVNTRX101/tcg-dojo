import { Request, Response, NextFunction } from 'express';
import * as metrics from '../config/metrics';
import { monitorMetrics } from '../config/alerting';
import { logger } from '../config/logger';
import os from 'os';

/**
 * Monitoring Middleware
 * Collect metrics and trigger alerts based on application behavior
 */

/**
 * Middleware to collect HTTP metrics
 */
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record HTTP request duration
    metrics.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    // Increment HTTP request counter
    metrics.httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Track errors
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      metrics.httpErrorTotal.inc({
        method,
        route,
        status_code: statusCode,
        error_type: statusCode.startsWith('4') ? 'client_error' : 'server_error',
      });
    }
  });

  next();
};

/**
 * Middleware to monitor system health and trigger alerts
 */
export const healthMonitoringMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Collect system metrics periodically (not on every request)
    if (Math.random() < 0.01) { // 1% of requests
      const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
      const cpuUsage = getCpuUsage();
      const diskUsage = await getDiskUsage();

      await monitorMetrics({
        memoryUsage,
        cpuUsage,
        diskUsage,
      });
    }
  } catch (error) {
    logger.error('Health monitoring error:', error);
  }

  next();
};

/**
 * Get CPU usage percentage
 */
const getCpuUsage = (): number => {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle / total);

  return Math.round(usage * 100) / 100;
};

/**
 * Get disk usage percentage
 */
const getDiskUsage = async (): Promise<number> => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('df -h / | tail -1').toString();
    const usageMatch = output.match(/(\d+)%/);
    return usageMatch ? parseInt(usageMatch[1]) : 0;
  } catch (error) {
    logger.error('Failed to get disk usage:', error);
    return 0;
  }
};

/**
 * Middleware to track database metrics
 */
export const trackDatabaseQuery = (operation: string, table: string, duration: number) => {
  metrics.databaseQueryDuration.observe({ operation, table }, duration);

  // Log slow queries
  if (duration > 1000) {
    logger.warn('Slow database query detected', {
      operation,
      table,
      duration: `${duration}ms`,
    });
  }
};

/**
 * Middleware to track cache operations
 */
export const trackCacheOperation = (operation: 'get' | 'set' | 'delete', cacheType: string, hit: boolean, duration: number) => {
  // Track hit/miss
  if (operation === 'get') {
    if (hit) {
      metrics.cacheHitTotal.inc({ cache_type: cacheType });
    } else {
      metrics.cacheMissTotal.inc({ cache_type: cacheType });
    }
  }

  // Track operation duration
  metrics.cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);
};

/**
 * Middleware to track authentication attempts
 */
export const trackAuthAttempt = (result: 'success' | 'failure', method: string = 'local') => {
  metrics.authAttempts.inc({ result, method });

  if (result === 'success') {
    metrics.authTokensIssued.inc({ type: 'access' });
  }
};

/**
 * Middleware to track business events
 */
export const trackOrderCreated = (status: string, value: number) => {
  metrics.orderCreated.inc({ status });
  metrics.orderValue.observe({ status }, value);
};

export const trackUserRegistration = (type: 'buyer' | 'seller' = 'buyer') => {
  metrics.userRegistrations.inc({ type });
};

export const trackPaymentTransaction = (status: 'success' | 'failure', provider: string) => {
  metrics.paymentTransactions.inc({ status, provider });
};

/**
 * Middleware to track rate limiting
 */
export const trackRateLimitExceeded = (endpoint: string, userType: string = 'anonymous') => {
  metrics.rateLimitExceeded.inc({ endpoint, user_type: userType });

  logger.warn('Rate limit exceeded', {
    endpoint,
    userType,
  });
};

/**
 * Middleware to track background jobs
 */
export const trackJobProcessed = (jobType: string, status: 'completed' | 'failed', duration: number) => {
  metrics.jobsProcessed.inc({ job_type: jobType, status });
  metrics.jobDuration.observe({ job_type: jobType }, duration);
};

/**
 * Error rate calculator
 * Calculates error rate over the last minute
 */
class ErrorRateCalculator {
  private errorCounts: { timestamp: number; count: number }[] = [];
  private totalCounts: { timestamp: number; count: number }[] = [];
  private windowMs = 60000; // 1 minute

  addError() {
    this.errorCounts.push({ timestamp: Date.now(), count: 1 });
    this.cleanup();
  }

  addRequest() {
    this.totalCounts.push({ timestamp: Date.now(), count: 1 });
    this.cleanup();
  }

  private cleanup() {
    const now = Date.now();
    this.errorCounts = this.errorCounts.filter(e => now - e.timestamp < this.windowMs);
    this.totalCounts = this.totalCounts.filter(e => now - e.timestamp < this.windowMs);
  }

  getErrorRate(): number {
    this.cleanup();
    const totalErrors = this.errorCounts.length;
    const totalRequests = this.totalCounts.length;

    if (totalRequests === 0) return 0;
    return (totalErrors / totalRequests) * 100;
  }
}

export const errorRateCalculator = new ErrorRateCalculator();

/**
 * Middleware to monitor error rates
 */
export const errorRateMonitoringMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  errorRateCalculator.addRequest();

  res.on('finish', async () => {
    if (res.statusCode >= 500) {
      errorRateCalculator.addError();

      // Check error rate and trigger alert if needed
      const errorRate = errorRateCalculator.getErrorRate();
      await monitorMetrics({ errorRate });
    }
  });

  next();
};

/**
 * Response time tracker
 */
class ResponseTimeTracker {
  private responseTimes: { timestamp: number; duration: number }[] = [];
  private windowMs = 60000; // 1 minute

  addResponseTime(duration: number) {
    this.responseTimes.push({ timestamp: Date.now(), duration });
    this.cleanup();
  }

  private cleanup() {
    const now = Date.now();
    this.responseTimes = this.responseTimes.filter(r => now - r.timestamp < this.windowMs);
  }

  getAverageResponseTime(): number {
    this.cleanup();
    if (this.responseTimes.length === 0) return 0;

    const sum = this.responseTimes.reduce((acc, r) => acc + r.duration, 0);
    return sum / this.responseTimes.length;
  }
}

export const responseTimeTracker = new ResponseTimeTracker();

/**
 * Middleware to monitor response times
 */
export const responseTimeMonitoringMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;
    responseTimeTracker.addResponseTime(duration);

    // Check average response time and trigger alert if needed
    const avgResponseTime = responseTimeTracker.getAverageResponseTime();
    await monitorMetrics({ avgResponseTime });
  });

  next();
};

export default {
  httpMetricsMiddleware,
  healthMonitoringMiddleware,
  errorRateMonitoringMiddleware,
  responseTimeMonitoringMiddleware,
  trackDatabaseQuery,
  trackCacheOperation,
  trackAuthAttempt,
  trackOrderCreated,
  trackUserRegistration,
  trackPaymentTransaction,
  trackRateLimitExceeded,
  trackJobProcessed,
};
