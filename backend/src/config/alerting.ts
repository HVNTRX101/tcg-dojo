import nodemailer from 'nodemailer';
import { logger } from './logger';

/**
 * Alerting Configuration
 * Centralized alerting system for monitoring and notifications
 */

export interface AlertRule {
  name: string;
  condition: (metric: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown?: number; // Minimum time between alerts in milliseconds
}

export interface Alert {
  rule: string;
  severity: string;
  message: string;
  timestamp: Date;
  metadata?: any;
}

class AlertManager {
  private alerts: Map<string, Date> = new Map();
  private emailTransporter: nodemailer.Transporter | null = null;
  private alertHistory: Alert[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter for alert notifications
   */
  private initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          } : undefined,
        });
        logger.info('Email alerting configured');
      } catch (error) {
        logger.error('Failed to configure email alerting:', error);
      }
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(ruleName: string, cooldown: number): boolean {
    const lastAlert = this.alerts.get(ruleName);
    if (!lastAlert) return false;

    const timeSinceLastAlert = Date.now() - lastAlert.getTime();
    return timeSinceLastAlert < cooldown;
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule: AlertRule, metadata?: any) {
    const cooldown = rule.cooldown || 300000; // Default 5 minutes

    // Check cooldown
    if (this.isInCooldown(rule.name, cooldown)) {
      logger.debug(`Alert '${rule.name}' in cooldown period, skipping`);
      return;
    }

    const alert: Alert = {
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      metadata,
    };

    // Log the alert
    const logMethod = rule.severity === 'critical' || rule.severity === 'high' ? 'error' : 'warn';
    logger[logMethod]('ALERT TRIGGERED', {
      rule: rule.name,
      severity: rule.severity,
      message: rule.message,
      metadata,
    });

    // Store alert
    this.alerts.set(rule.name, new Date());
    this.addToHistory(alert);

    // Send notifications
    await this.sendNotifications(alert);
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert) {
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }
  }

  /**
   * Send alert notifications via configured channels
   */
  private async sendNotifications(alert: Alert) {
    // Send email notification for high/critical alerts
    if ((alert.severity === 'high' || alert.severity === 'critical') && this.emailTransporter) {
      await this.sendEmailAlert(alert);
    }

    // Send to webhook if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      await this.sendWebhookAlert(alert);
    }

    // Log to Sentry for critical alerts
    if (alert.severity === 'critical' && process.env.SENTRY_DSN) {
      this.sendToSentry(alert);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert) {
    if (!this.emailTransporter || !process.env.ALERT_EMAIL_TO) return;

    try {
      await this.emailTransporter.sendMail({
        from: process.env.ALERT_EMAIL_FROM || 'alerts@tcg-marketplace.com',
        to: process.env.ALERT_EMAIL_TO,
        subject: `[${alert.severity.toUpperCase()}] ${alert.rule}`,
        text: `
Alert: ${alert.rule}
Severity: ${alert.severity}
Time: ${alert.timestamp.toISOString()}
Message: ${alert.message}

${alert.metadata ? 'Details:\n' + JSON.stringify(alert.metadata, null, 2) : ''}
        `,
        html: `
<h2>Alert: ${alert.rule}</h2>
<p><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(alert.severity)}">${alert.severity.toUpperCase()}</span></p>
<p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
<p><strong>Message:</strong> ${alert.message}</p>
${alert.metadata ? '<h3>Details:</h3><pre>' + JSON.stringify(alert.metadata, null, 2) + '</pre>' : ''}
        `,
      });
      logger.info('Email alert sent successfully');
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert) {
    try {
      const response = await fetch(process.env.ALERT_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      logger.info('Webhook alert sent successfully');
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send alert to Sentry
   */
  private sendToSentry(alert: Alert) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureMessage(alert.message, {
        level: 'error',
        tags: {
          alert_rule: alert.rule,
          severity: alert.severity,
        },
        extra: alert.metadata,
      });
    } catch (error) {
      logger.error('Failed to send alert to Sentry:', error);
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: '#00ff00',
      medium: '#ffff00',
      high: '#ff9900',
      critical: '#ff0000',
    };
    return colors[severity] || '#cccccc';
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * Clear alert cooldown
   */
  clearCooldown(ruleName: string) {
    this.alerts.delete(ruleName);
  }

  /**
   * Clear all alert cooldowns
   */
  clearAllCooldowns() {
    this.alerts.clear();
  }
}

// Singleton instance
export const alertManager = new AlertManager();

/**
 * Predefined Alert Rules
 */
export const alertRules = {
  highErrorRate: {
    name: 'High Error Rate',
    condition: (errorRate: number) => errorRate > 5, // More than 5% error rate
    severity: 'high' as const,
    message: 'Error rate exceeded threshold',
    cooldown: 600000, // 10 minutes
  },

  slowResponseTime: {
    name: 'Slow Response Time',
    condition: (avgResponseTime: number) => avgResponseTime > 5000, // More than 5 seconds
    severity: 'medium' as const,
    message: 'Average response time exceeded threshold',
    cooldown: 300000, // 5 minutes
  },

  databaseConnectionFailure: {
    name: 'Database Connection Failure',
    condition: (isConnected: boolean) => !isConnected,
    severity: 'critical' as const,
    message: 'Database connection lost',
    cooldown: 60000, // 1 minute
  },

  redisConnectionFailure: {
    name: 'Redis Connection Failure',
    condition: (isConnected: boolean) => !isConnected,
    severity: 'high' as const,
    message: 'Redis connection lost',
    cooldown: 60000, // 1 minute
  },

  highMemoryUsage: {
    name: 'High Memory Usage',
    condition: (memoryUsagePercent: number) => memoryUsagePercent > 90,
    severity: 'high' as const,
    message: 'Memory usage exceeded 90%',
    cooldown: 300000, // 5 minutes
  },

  highCpuUsage: {
    name: 'High CPU Usage',
    condition: (cpuUsagePercent: number) => cpuUsagePercent > 80,
    severity: 'medium' as const,
    message: 'CPU usage exceeded 80%',
    cooldown: 300000, // 5 minutes
  },

  diskSpaceLow: {
    name: 'Low Disk Space',
    condition: (diskSpacePercent: number) => diskSpacePercent > 85,
    severity: 'high' as const,
    message: 'Disk space usage exceeded 85%',
    cooldown: 600000, // 10 minutes
  },

  apiRateLimitExceeded: {
    name: 'API Rate Limit Exceeded',
    condition: (requestCount: number) => requestCount > 1000, // More than 1000 requests per minute
    severity: 'medium' as const,
    message: 'API rate limit threshold exceeded',
    cooldown: 300000, // 5 minutes
  },

  unauthorizedAccessAttempt: {
    name: 'Unauthorized Access Attempt',
    condition: (failedAttempts: number) => failedAttempts > 10,
    severity: 'high' as const,
    message: 'Multiple unauthorized access attempts detected',
    cooldown: 300000, // 5 minutes
  },

  paymentGatewayFailure: {
    name: 'Payment Gateway Failure',
    condition: (isAvailable: boolean) => !isAvailable,
    severity: 'critical' as const,
    message: 'Payment gateway is unavailable',
    cooldown: 60000, // 1 minute
  },
};

/**
 * Monitor metrics and trigger alerts
 */
export const monitorMetrics = async (metrics: {
  errorRate?: number;
  avgResponseTime?: number;
  dbConnected?: boolean;
  redisConnected?: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
  diskUsage?: number;
  requestsPerMinute?: number;
  failedAuthAttempts?: number;
  paymentGatewayAvailable?: boolean;
}) => {
  // Check each alert rule
  if (metrics.errorRate !== undefined && alertRules.highErrorRate.condition(metrics.errorRate)) {
    await alertManager.triggerAlert(alertRules.highErrorRate, { errorRate: metrics.errorRate });
  }

  if (metrics.avgResponseTime !== undefined && alertRules.slowResponseTime.condition(metrics.avgResponseTime)) {
    await alertManager.triggerAlert(alertRules.slowResponseTime, { avgResponseTime: metrics.avgResponseTime });
  }

  if (metrics.dbConnected !== undefined && alertRules.databaseConnectionFailure.condition(metrics.dbConnected)) {
    await alertManager.triggerAlert(alertRules.databaseConnectionFailure);
  }

  if (metrics.redisConnected !== undefined && alertRules.redisConnectionFailure.condition(metrics.redisConnected)) {
    await alertManager.triggerAlert(alertRules.redisConnectionFailure);
  }

  if (metrics.memoryUsage !== undefined && alertRules.highMemoryUsage.condition(metrics.memoryUsage)) {
    await alertManager.triggerAlert(alertRules.highMemoryUsage, { memoryUsage: `${metrics.memoryUsage}%` });
  }

  if (metrics.cpuUsage !== undefined && alertRules.highCpuUsage.condition(metrics.cpuUsage)) {
    await alertManager.triggerAlert(alertRules.highCpuUsage, { cpuUsage: `${metrics.cpuUsage}%` });
  }

  if (metrics.diskUsage !== undefined && alertRules.diskSpaceLow.condition(metrics.diskUsage)) {
    await alertManager.triggerAlert(alertRules.diskSpaceLow, { diskUsage: `${metrics.diskUsage}%` });
  }

  if (metrics.requestsPerMinute !== undefined && alertRules.apiRateLimitExceeded.condition(metrics.requestsPerMinute)) {
    await alertManager.triggerAlert(alertRules.apiRateLimitExceeded, { requestsPerMinute: metrics.requestsPerMinute });
  }

  if (metrics.failedAuthAttempts !== undefined && alertRules.unauthorizedAccessAttempt.condition(metrics.failedAuthAttempts)) {
    await alertManager.triggerAlert(alertRules.unauthorizedAccessAttempt, { failedAttempts: metrics.failedAuthAttempts });
  }

  if (metrics.paymentGatewayAvailable !== undefined && alertRules.paymentGatewayFailure.condition(metrics.paymentGatewayAvailable)) {
    await alertManager.triggerAlert(alertRules.paymentGatewayFailure);
  }
};

export default alertManager;
