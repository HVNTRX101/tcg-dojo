import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

/**
 * Database Query Performance Monitoring
 * Tracks slow queries, execution times, and provides insights
 */

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  model?: string;
  action?: string;
  params?: any;
}

// Store for query metrics (in-memory, consider Redis for production)
const queryMetrics: QueryPerformanceMetrics[] = [];
const MAX_METRICS_SIZE = 1000; // Keep last 1000 queries

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '100');
const VERY_SLOW_QUERY_THRESHOLD = parseInt(process.env.VERY_SLOW_QUERY_THRESHOLD || '1000');

/**
 * Setup Prisma query monitoring middleware
 */
export const setupDatabasePerformanceMonitoring = (prisma: PrismaClient) => {
  // Prisma query event logging
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    const result = await next(params);
    const duration = Date.now() - startTime;

    // Create query string for logging
    const queryString = `${params.model}.${params.action}`;

    // Store metric
    const metric: QueryPerformanceMetrics = {
      query: queryString,
      duration,
      timestamp: new Date(),
      model: params.model,
      action: params.action,
      params: params.args, // Be careful with sensitive data
    };

    // Add to metrics array (circular buffer)
    queryMetrics.push(metric);
    if (queryMetrics.length > MAX_METRICS_SIZE) {
      queryMetrics.shift();
    }

    // Log slow queries
    if (duration > VERY_SLOW_QUERY_THRESHOLD) {
      logger.error('🐢 VERY SLOW QUERY DETECTED', {
        query: queryString,
        duration: `${duration}ms`,
        model: params.model,
        action: params.action,
        threshold: `${VERY_SLOW_QUERY_THRESHOLD}ms`,
        args: JSON.stringify(params.args).substring(0, 200), // Truncate for logging
      });
    } else if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('⚠️ Slow query detected', {
        query: queryString,
        duration: `${duration}ms`,
        model: params.model,
        action: params.action,
      });
    } else {
      // Log all queries in development for debugging
      if (process.env.NODE_ENV === 'development' && process.env.LOG_ALL_QUERIES === 'true') {
        logger.debug('Query executed', {
          query: queryString,
          duration: `${duration}ms`,
        });
      }
    }

    return result;
  });

  logger.info('✅ Database performance monitoring enabled', {
    slowQueryThreshold: `${SLOW_QUERY_THRESHOLD}ms`,
    verySlowQueryThreshold: `${VERY_SLOW_QUERY_THRESHOLD}ms`,
  });
};

/**
 * Get query performance statistics
 */
export const getQueryPerformanceStats = () => {
  if (queryMetrics.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      slowQueries: 0,
      fastQueries: 0,
      topSlowQueries: [],
    };
  }

  const totalQueries = queryMetrics.length;
  const totalDuration = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
  const avgDuration = totalDuration / totalQueries;

  const slowQueries = queryMetrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD);
  const fastQueries = queryMetrics.filter(m => m.duration <= SLOW_QUERY_THRESHOLD);

  // Get top 10 slowest queries
  const topSlowQueries = [...queryMetrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(m => ({
      query: m.query,
      duration: m.duration,
      timestamp: m.timestamp,
    }));

  // Query breakdown by model
  const queryByModel: Record<string, { count: number; totalDuration: number }> = {};
  queryMetrics.forEach(m => {
    if (m.model) {
      if (!queryByModel[m.model]) {
        queryByModel[m.model] = { count: 0, totalDuration: 0 };
      }
      queryByModel[m.model].count++;
      queryByModel[m.model].totalDuration += m.duration;
    }
  });

  return {
    totalQueries,
    avgDuration: Math.round(avgDuration * 100) / 100,
    slowQueries: slowQueries.length,
    fastQueries: fastQueries.length,
    slowQueryPercentage: Math.round((slowQueries.length / totalQueries) * 100 * 100) / 100,
    topSlowQueries,
    queryByModel: Object.entries(queryByModel).map(([model, stats]) => ({
      model,
      count: stats.count,
      avgDuration: Math.round((stats.totalDuration / stats.count) * 100) / 100,
    })),
    thresholds: {
      slow: SLOW_QUERY_THRESHOLD,
      verySlow: VERY_SLOW_QUERY_THRESHOLD,
    },
  };
};

/**
 * Get recent slow queries
 */
export const getRecentSlowQueries = (limit: number = 20) => {
  return queryMetrics
    .filter(m => m.duration > SLOW_QUERY_THRESHOLD)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
    .map(m => ({
      query: m.query,
      duration: m.duration,
      timestamp: m.timestamp,
      model: m.model,
      action: m.action,
    }));
};

/**
 * Clear query metrics (useful for testing)
 */
export const clearQueryMetrics = () => {
  queryMetrics.length = 0;
  logger.info('Query metrics cleared');
};

/**
 * Database connection pool monitoring
 */
export const getDatabaseConnectionStats = async (prisma: PrismaClient) => {
  try {
    // For PostgreSQL, you can query connection stats
    // This requires the pg_stat_database view
    const stats = await prisma.$queryRaw`
      SELECT
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database
      WHERE datname = current_database()
    `;

    return stats;
  } catch (error) {
    logger.warn('Unable to fetch database connection stats (PostgreSQL only)', { error });
    return null;
  }
};

/**
 * Get table statistics
 */
export const getTableStatistics = async (prisma: PrismaClient) => {
  try {
    // PostgreSQL table statistics
    const tableStats = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20
    `;

    return tableStats;
  } catch (error) {
    logger.warn('Unable to fetch table statistics (PostgreSQL only)', { error });
    return null;
  }
};

/**
 * Middleware to expose database monitoring endpoints
 */
export const databaseMonitoringEndpoints = {
  getPerformanceStats: getQueryPerformanceStats,
  getRecentSlowQueries,
  getDatabaseConnectionStats,
  getTableStatistics,
  clearMetrics: clearQueryMetrics,
};
