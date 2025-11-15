import express from 'express';
import { getMetrics, getMetricsJSON } from '../config/metrics';
import { alertManager } from '../config/alerting';
import { logger } from '../config/logger';
import os from 'os';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      memory: process.memoryUsage(),
      // Add database and Redis health checks here
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
});

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if critical services are available
    // TODO: Add actual database and Redis connection checks
    const ready = true;

    if (ready) {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: 'Readiness check failed',
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * Metrics in JSON format endpoint
 */
router.get('/metrics/json', async (req, res) => {
  try {
    const metrics = await getMetricsJSON();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * Alert history endpoint
 */
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const alerts = alertManager.getAlertHistory(limit);

    res.json({
      total: alerts.length,
      alerts,
    });
  } catch (error) {
    logger.error('Failed to get alert history:', error);
    res.status(500).json({ error: 'Failed to get alert history' });
  }
});

/**
 * System info endpoint
 */
router.get('/info', (req, res) => {
  try {
    const info = {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      hostname: os.hostname(),
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: process.memoryUsage(),
      },
      load: os.loadavg(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.json(info);
  } catch (error) {
    logger.error('Failed to get system info:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

export default router;
