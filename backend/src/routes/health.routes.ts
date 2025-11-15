import { Router, Request, Response } from 'express';
import {
  performHealthCheck,
  metrics,
  performanceMonitor,
  requestTracker,
} from '../utils/monitoring';
import { logger } from '../config/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error', { error });
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date(),
    });
  }
});

/**
 * Liveness probe - simple check that server is running
 * GET /health/live
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness probe - check if server is ready to accept traffic
 * GET /health/ready
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();

    if (health.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Critical health checks failing',
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'Health check failed',
      timestamp: new Date(),
    });
  }
});

/**
 * Metrics endpoint
 * GET /health/metrics
 */
router.get('/health/metrics', (req: Request, res: Response) => {
  try {
    const metricsSnapshot = metrics.getSnapshot();
    const requestStats = requestTracker.getStats();
    const operations = performanceMonitor.getOperations();

    const performanceStats: Record<string, any> = {};
    for (const op of operations) {
      const stats = performanceMonitor.getStats(op);
      if (stats) {
        performanceStats[op] = stats;
      }
    }

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
      timestamp: new Date(),
      uptime: process.uptime(),
      metrics: metricsSnapshot,
      requests: requestStats,
      performance: performanceStats,
      system: {
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
          heapUsedPercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    });
  } catch (error) {
    logger.error('Metrics endpoint error', { error });
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date(),
    });
  }
});

/**
 * Prometheus-compatible metrics endpoint
 * GET /health/metrics/prometheus
 */
router.get('/health/metrics/prometheus', (req: Request, res: Response) => {
  try {
    const metricsSnapshot = metrics.getSnapshot();
    const memoryUsage = process.memoryUsage();

    // Generate Prometheus-compatible output
    let output = '# HELP nodejs_heap_size_total_bytes Total heap size\n';
    output += '# TYPE nodejs_heap_size_total_bytes gauge\n';
    output += `nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}\n\n`;

    output += '# HELP nodejs_heap_size_used_bytes Used heap size\n';
    output += '# TYPE nodejs_heap_size_used_bytes gauge\n';
    output += `nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}\n\n`;

    output += '# HELP process_uptime_seconds Process uptime in seconds\n';
    output += '# TYPE process_uptime_seconds gauge\n';
    output += `process_uptime_seconds ${process.uptime()}\n\n`;

    // Add custom metrics
    for (const [name, data] of Object.entries(metricsSnapshot)) {
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      output += `# TYPE ${metricName} gauge\n`;
      output += `${metricName} ${data.current}\n\n`;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.send(output);
  } catch (error) {
    logger.error('Prometheus metrics endpoint error', { error });
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;
