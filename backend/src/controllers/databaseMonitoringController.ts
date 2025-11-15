import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  getQueryPerformanceStats,
  getRecentSlowQueries,
  getDatabaseConnectionStats,
  getTableStatistics,
  clearQueryMetrics,
} from '../middleware/databaseMonitoring';

/**
 * Get query performance statistics
 */
export const getPerformanceStats = async (req: Request, res: Response): Promise<void> => {
  const stats = getQueryPerformanceStats();
  res.json(stats);
};

/**
 * Get recent slow queries
 */
export const getSlowQueries = async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 20;
  const slowQueries = getRecentSlowQueries(limit);
  res.json({ slowQueries, count: slowQueries.length });
};

/**
 * Get database connection statistics
 */
export const getConnectionStats = async (req: Request, res: Response): Promise<void> => {
  const stats = await getDatabaseConnectionStats(prisma);
  res.json(stats || { message: 'Connection stats not available (PostgreSQL only)' });
};

/**
 * Get table statistics
 */
export const getTableStats = async (req: Request, res: Response): Promise<void> => {
  const stats = await getTableStatistics(prisma);
  res.json(stats || { message: 'Table stats not available (PostgreSQL only)' });
};

/**
 * Clear query metrics (admin only)
 */
export const clearMetrics = async (req: Request, res: Response): Promise<void> => {
  clearQueryMetrics();
  res.json({ message: 'Query metrics cleared successfully' });
};

/**
 * Get comprehensive database health report
 */
export const getDatabaseHealthReport = async (req: Request, res: Response): Promise<void> => {
  const [performanceStats, slowQueries, connectionStats, tableStats] = await Promise.all([
    getQueryPerformanceStats(),
    getRecentSlowQueries(10),
    getDatabaseConnectionStats(prisma),
    getTableStatistics(prisma),
  ]);

  const report = {
    timestamp: new Date().toISOString(),
    performance: performanceStats,
    recentSlowQueries: slowQueries,
    connections: connectionStats,
    tables: tableStats,
    health: {
      status: performanceStats.slowQueryPercentage > 50 ? 'WARNING' : 'HEALTHY',
      alerts: [] as string[],
    },
  };

  // Add health alerts
  if (performanceStats.slowQueryPercentage > 50) {
    report.health.alerts.push(`High percentage of slow queries: ${performanceStats.slowQueryPercentage}%`);
  }

  if (performanceStats.avgDuration > 500) {
    report.health.alerts.push(`Average query duration is high: ${performanceStats.avgDuration}ms`);
  }

  res.json(report);
};
