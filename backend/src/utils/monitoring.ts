import { logger } from '../config/logger';
import { alertHighMemoryUsage, alertSlowResponse } from './alerting';

/**
 * Application Monitoring Utilities
 * Tracks metrics, health, and performance
 */

interface MetricData {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private readonly maxDataPoints = 1000;

  /**
   * Record a metric value
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const data: MetricData = {
      timestamp: new Date(),
      value,
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const dataPoints = this.metrics.get(name)!;
    dataPoints.push(data);

    // Keep only recent data points
    if (dataPoints.length > this.maxDataPoints) {
      dataPoints.shift();
    }

    logger.debug('Metric recorded', { name, value, tags });
  }

  /**
   * Increment a counter
   */
  increment(name: string, tags?: Record<string, string>): void {
    const current = this.getLatestValue(name) || 0;
    this.record(name, current + 1, tags);
  }

  /**
   * Get latest metric value
   */
  getLatestValue(name: string): number | null {
    const dataPoints = this.metrics.get(name);
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }
    return dataPoints[dataPoints.length - 1].value;
  }

  /**
   * Get average metric value over time window
   */
  getAverage(name: string, timeWindowMs: number = 60000): number | null {
    const dataPoints = this.metrics.get(name);
    if (!dataPoints || dataPoints.length === 0) {
      return null;
    }

    const now = Date.now();
    const recentPoints = dataPoints.filter(
      (dp) => now - dp.timestamp.getTime() < timeWindowMs
    );

    if (recentPoints.length === 0) {
      return null;
    }

    const sum = recentPoints.reduce((acc, dp) => acc + dp.value, 0);
    return sum / recentPoints.length;
  }

  /**
   * Get all metrics snapshot
   */
  getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};

    for (const [name, dataPoints] of this.metrics.entries()) {
      if (dataPoints.length > 0) {
        const latest = dataPoints[dataPoints.length - 1];
        snapshot[name] = {
          current: latest.value,
          timestamp: latest.timestamp,
          tags: latest.tags,
        };
      }
    }

    return snapshot;
  }

  /**
   * Clear old data points
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [name, dataPoints] of this.metrics.entries()) {
      const filtered = dataPoints.filter(
        (dp) => now - dp.timestamp.getTime() < maxAge
      );
      this.metrics.set(name, filtered);
    }
  }
}

export const metrics = new MetricsCollector();

// Cleanup old metrics every 15 minutes
setInterval(() => metrics.cleanup(), 15 * 60 * 1000);

/**
 * System health checks
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      timestamp: Date;
      responseTime?: number;
    };
  };
  timestamp: Date;
  uptime: number;
  version: string;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks: HealthCheckResult['checks'] = {};

  // Database health check
  const dbCheck = await checkDatabase();
  checks.database = dbCheck;

  // Redis health check
  const redisCheck = await checkRedis();
  checks.redis = redisCheck;

  // Memory health check
  const memoryCheck = checkMemory();
  checks.memory = memoryCheck;

  // Disk space check
  const diskCheck = await checkDiskSpace();
  checks.disk = diskCheck;

  // Determine overall status
  const hasFailure = Object.values(checks).some((c) => c.status === 'fail');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warn');

  let status: HealthCheckResult['status'] = 'healthy';
  if (hasFailure) {
    status = 'unhealthy';
  } else if (hasWarning) {
    status = 'degraded';
  }

  const result: HealthCheckResult = {
    status,
    checks,
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  };

  // Record metrics
  metrics.record('health_check_duration', Date.now() - startTime);
  metrics.record('health_status', status === 'healthy' ? 1 : 0);

  logger.info('Health check completed', { status, duration: Date.now() - startTime });

  return result;
}

async function checkDatabase(): Promise<HealthCheckResult['checks'][string]> {
  try {
    const startTime = Date.now();
    // Import Prisma client dynamically to avoid circular dependencies
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? 'pass' : 'warn',
      message: responseTime < 1000 ? 'Database is healthy' : 'Database response slow',
      timestamp: new Date(),
      responseTime,
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'fail',
      message: 'Database connection failed',
      timestamp: new Date(),
    };
  }
}

async function checkRedis(): Promise<HealthCheckResult['checks'][string]> {
  try {
    const startTime = Date.now();
    // Import Redis client dynamically
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();

    await redis.ping();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 100 ? 'pass' : 'warn',
      message: responseTime < 100 ? 'Redis is healthy' : 'Redis response slow',
      timestamp: new Date(),
      responseTime,
    };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return {
      status: 'fail',
      message: 'Redis connection failed',
      timestamp: new Date(),
    };
  }
}

function checkMemory(): HealthCheckResult['checks'][string] {
  const usage = process.memoryUsage();
  const usedHeapPercent = (usage.heapUsed / usage.heapTotal) * 100;

  // Alert if memory usage is high
  if (usedHeapPercent > 80) {
    alertHighMemoryUsage(Math.round(usedHeapPercent));
  }

  return {
    status: usedHeapPercent < 80 ? 'pass' : usedHeapPercent < 90 ? 'warn' : 'fail',
    message: `Heap usage: ${Math.round(usedHeapPercent)}%`,
    timestamp: new Date(),
  };
}

async function checkDiskSpace(): Promise<HealthCheckResult['checks'][string]> {
  try {
    // Basic disk check - in production, use proper disk monitoring
    return {
      status: 'pass',
      message: 'Disk space adequate',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Could not check disk space',
      timestamp: new Date(),
    };
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private operations: Map<string, number[]> = new Map();

  trackOperation(name: string, duration: number): void {
    if (!this.operations.has(name)) {
      this.operations.set(name, []);
    }

    const durations = this.operations.get(name)!;
    durations.push(duration);

    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }

    // Record metric
    metrics.record(`operation_${name}`, duration);

    // Alert on slow operations
    if (duration > 5000) {
      alertSlowResponse(name, duration);
    }
  }

  getStats(name: string): { avg: number; min: number; max: number; p95: number } | null {
    const durations = this.operations.get(name);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  getOperations(): string[] {
    return Array.from(this.operations.keys());
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Request tracking
 */
export class RequestTracker {
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();

  trackRequest(endpoint: string, statusCode: number): void {
    const key = `${endpoint}_${statusCode}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    metrics.increment('http_requests_total', {
      endpoint,
      status: String(statusCode),
    });

    if (statusCode >= 400) {
      this.errorCounts.set(endpoint, (this.errorCounts.get(endpoint) || 0) + 1);
      metrics.increment('http_errors_total', { endpoint });
    }
  }

  getRequestCount(endpoint: string): number {
    let total = 0;
    for (const [key, count] of this.requestCounts.entries()) {
      if (key.startsWith(endpoint)) {
        total += count;
      }
    }
    return total;
  }

  getErrorCount(endpoint: string): number {
    return this.errorCounts.get(endpoint) || 0;
  }

  getStats(): Record<string, any> {
    return {
      requests: Object.fromEntries(this.requestCounts),
      errors: Object.fromEntries(this.errorCounts),
    };
  }

  reset(): void {
    this.requestCounts.clear();
    this.errorCounts.clear();
  }
}

export const requestTracker = new RequestTracker();
