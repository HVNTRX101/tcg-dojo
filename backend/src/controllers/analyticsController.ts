import { Request, Response } from 'express';
import { analyticsStore } from '../services/analytics';
import { getQueueStats } from '../services/messageQueue';

/**
 * Analytics Controller
 * Provides endpoints for monitoring WebSocket and queue performance
 */

/**
 * Get all analytics metrics
 * GET /api/analytics
 */
export const getAllMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = analyticsStore.getAllMetrics();
    const detailedStats = analyticsStore.getDetailedStatistics();
    const queueStats = await getQueueStats();

    res.json({
      timestamp: new Date().toISOString(),
      metrics,
      detailedStatistics: detailedStats,
      queueStatus: queueStats,
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Get connection metrics
 * GET /api/analytics/connections
 */
export const getConnectionMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = analyticsStore.getConnectionMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting connection metrics:', error);
    res.status(500).json({ error: 'Failed to get connection metrics' });
  }
};

/**
 * Get message metrics
 * GET /api/analytics/messages
 */
export const getMessageMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = analyticsStore.getMessageMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting message metrics:', error);
    res.status(500).json({ error: 'Failed to get message metrics' });
  }
};

/**
 * Get queue metrics
 * GET /api/analytics/queues
 */
export const getQueueMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = analyticsStore.getQueueMetrics();
    const queueStats = await getQueueStats();

    res.json({
      ...metrics,
      detailedStatus: queueStats,
    });
  } catch (error) {
    console.error('Error getting queue metrics:', error);
    res.status(500).json({ error: 'Failed to get queue metrics' });
  }
};

/**
 * Get active user sessions
 * GET /api/analytics/sessions/active
 */
export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = analyticsStore.getAllActiveUserSessions();
    res.json({
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
};

/**
 * Get recent disconnected sessions
 * GET /api/analytics/sessions/recent
 */
export const getRecentSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = analyticsStore.getRecentDisconnectedSessions(limit);
    res.json({
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    res.status(500).json({ error: 'Failed to get recent sessions' });
  }
};

/**
 * Get user session metrics
 * GET /api/analytics/sessions/:userId
 */
export const getUserSession = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const session = analyticsStore.getUserSessionMetrics(userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error getting user session:', error);
    return res.status(500).json({ error: 'Failed to get user session' });
  }
};

/**
 * Get detailed statistics summary
 * GET /api/analytics/statistics
 */
export const getDetailedStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = analyticsStore.getDetailedStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting detailed statistics:', error);
    res.status(500).json({ error: 'Failed to get detailed statistics' });
  }
};
