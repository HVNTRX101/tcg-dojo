import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { logger } from './logger';

/**
 * Prometheus Metrics Configuration
 * Collect and expose application metrics for monitoring
 */

// Create a Registry
export const register = new Registry();

// Set default labels for all metrics
register.setDefaultLabels({
  app: 'tcg-marketplace-backend',
  environment: process.env.NODE_ENV || 'development',
});

/**
 * HTTP Metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 5000],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpErrorTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
  registers: [register],
});

/**
 * Database Metrics
 */
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_ms',
  help: 'Duration of database queries in milliseconds',
  labelNames: ['operation', 'table'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});

export const databaseConnectionPool = new Gauge({
  name: 'database_connection_pool',
  help: 'Database connection pool status',
  labelNames: ['status'],
  registers: [register],
});

export const databaseErrors = new Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

/**
 * Cache Metrics
 */
export const cacheHitTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMissTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_ms',
  help: 'Duration of cache operations in milliseconds',
  labelNames: ['operation', 'cache_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

/**
 * Business Metrics
 */
export const orderCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register],
});

export const orderValue = new Histogram({
  name: 'order_value_dollars',
  help: 'Order value in dollars',
  labelNames: ['status'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['type'],
  registers: [register],
});

export const paymentTransactions = new Counter({
  name: 'payment_transactions_total',
  help: 'Total number of payment transactions',
  labelNames: ['status', 'provider'],
  registers: [register],
});

/**
 * System Metrics
 */
export const processMemoryUsage = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

export const processCpuUsage = new Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage',
  registers: [register],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Authentication Metrics
 */
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'method'],
  registers: [register],
});

export const authTokensIssued = new Counter({
  name: 'auth_tokens_issued_total',
  help: 'Total number of authentication tokens issued',
  labelNames: ['type'],
  registers: [register],
});

/**
 * API Rate Limiting Metrics
 */
export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'user_type'],
  registers: [register],
});

/**
 * Background Job Metrics
 */
export const jobsProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of background jobs processed',
  labelNames: ['job_type', 'status'],
  registers: [register],
});

export const jobDuration = new Histogram({
  name: 'job_duration_ms',
  help: 'Duration of background jobs in milliseconds',
  labelNames: ['job_type'],
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
  registers: [register],
});

/**
 * Collect system metrics
 */
export const collectSystemMetrics = () => {
  try {
    const usage = process.memoryUsage();
    processMemoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
    processMemoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
    processMemoryUsage.set({ type: 'rss' }, usage.rss);
    processMemoryUsage.set({ type: 'external' }, usage.external);

    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    processCpuUsage.set(totalUsage);
  } catch (error) {
    logger.error('Failed to collect system metrics:', error);
  }
};

// Collect system metrics every 30 seconds
setInterval(collectSystemMetrics, 30000);

/**
 * Get all metrics
 */
export const getMetrics = async (): Promise<string> => {
  return register.metrics();
};

/**
 * Get metrics in JSON format
 */
export const getMetricsJSON = async (): Promise<any> => {
  return register.getMetricsAsJSON();
};

/**
 * Clear all metrics
 */
export const clearMetrics = () => {
  register.clear();
};

export default {
  register,
  getMetrics,
  getMetricsJSON,
  clearMetrics,
  collectSystemMetrics,
};
