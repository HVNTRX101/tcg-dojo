import { logger } from '../config/logger';
import { config } from '../config/env';

/**
 * Alerting Utilities
 * Send alerts via various channels (Slack, email, webhooks)
 */

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Send alert to configured channels
 */
export async function sendAlert(alert: Alert): Promise<void> {
  if (!config.alerting.enabled) {
    logger.debug('Alerting is disabled, skipping alert', alert);
    return;
  }

  const alertData = {
    ...alert,
    timestamp: alert.timestamp || new Date(),
    environment: config.nodeEnv,
  };

  // Log the alert
  logger.warn('ALERT', alertData);

  // Send to configured channels
  const promises: Promise<void>[] = [];

  if (config.alerting.slackWebhook) {
    promises.push(sendSlackAlert(alertData));
  }

  if (config.alerting.webhookUrl) {
    promises.push(sendWebhookAlert(alertData));
  }

  if (config.alerting.emailRecipients) {
    promises.push(sendEmailAlert(alertData));
  }

  await Promise.allSettled(promises);
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(alert: Alert): Promise<void> {
  try {
    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ff9900',
      [AlertSeverity.ERROR]: '#ff0000',
      [AlertSeverity.CRITICAL]: '#8b0000',
    }[alert.severity];

    const payload = {
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          text: alert.message,
          fields: alert.metadata
            ? Object.entries(alert.metadata).map(([key, value]) => ({
                title: key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                short: true,
              }))
            : [],
          footer: 'TCG Marketplace',
          ts: Math.floor((alert.timestamp?.getTime() || Date.now()) / 1000),
        },
      ],
    };

    const response = await fetch(config.alerting.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    logger.debug('Alert sent to Slack successfully');
  } catch (error) {
    logger.error('Failed to send Slack alert', { error, alert });
  }
}

/**
 * Send alert to generic webhook
 */
async function sendWebhookAlert(alert: Alert): Promise<void> {
  try {
    const response = await fetch(config.alerting.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    logger.debug('Alert sent to webhook successfully');
  } catch (error) {
    logger.error('Failed to send webhook alert', { error, alert });
  }
}

/**
 * Send alert via email (placeholder - integrate with email service)
 */
async function sendEmailAlert(alert: Alert): Promise<void> {
  try {
    // TODO: Integrate with email service (Nodemailer already configured)
    // This is a placeholder for email alerting
    logger.info('Email alert would be sent', {
      recipients: config.alerting.emailRecipients,
      alert,
    });
  } catch (error) {
    logger.error('Failed to send email alert', { error, alert });
  }
}

/**
 * Predefined alert rules
 */

export async function alertHighErrorRate(errorCount: number, timeWindow: string): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.CRITICAL,
    title: 'High Error Rate Detected',
    message: `Detected ${errorCount} errors in the last ${timeWindow}`,
    metadata: {
      errorCount,
      timeWindow,
      action: 'Investigate immediately',
    },
  });
}

export async function alertSlowResponse(endpoint: string, duration: number): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.WARNING,
    title: 'Slow API Response',
    message: `Endpoint ${endpoint} took ${duration}ms to respond`,
    metadata: {
      endpoint,
      duration: `${duration}ms`,
      threshold: '5000ms',
    },
  });
}

export async function alertDatabaseConnection(): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.CRITICAL,
    title: 'Database Connection Lost',
    message: 'Unable to connect to the database',
    metadata: {
      action: 'Check database status and connectivity',
    },
  });
}

export async function alertHighMemoryUsage(usage: number): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.WARNING,
    title: 'High Memory Usage',
    message: `Memory usage is at ${usage}%`,
    metadata: {
      usage: `${usage}%`,
      threshold: '80%',
    },
  });
}

export async function alertSecurityEvent(event: string, details: any): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.ERROR,
    title: 'Security Event Detected',
    message: event,
    metadata: details,
  });
}

export async function alertServiceDown(service: string): Promise<void> {
  await sendAlert({
    severity: AlertSeverity.CRITICAL,
    title: 'Service Down',
    message: `${service} is not responding`,
    metadata: {
      service,
      action: 'Investigate service health',
    },
  });
}

/**
 * Alert aggregation to prevent alert spam
 */
class AlertAggregator {
  private alertCounts: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();
  private readonly aggregationWindow = 5 * 60 * 1000; // 5 minutes
  private readonly maxAlertsPerWindow = 10;

  shouldSendAlert(alertKey: string): boolean {
    const now = new Date();
    const entry = this.alertCounts.get(alertKey);

    if (!entry) {
      this.alertCounts.set(alertKey, { count: 1, firstSeen: now, lastSeen: now });
      return true;
    }

    // Reset if window expired
    if (now.getTime() - entry.firstSeen.getTime() > this.aggregationWindow) {
      this.alertCounts.set(alertKey, { count: 1, firstSeen: now, lastSeen: now });
      return true;
    }

    // Update count
    entry.count++;
    entry.lastSeen = now;

    // Suppress if too many alerts
    if (entry.count > this.maxAlertsPerWindow) {
      if (entry.count === this.maxAlertsPerWindow + 1) {
        // Send one final alert about suppression
        sendAlert({
          severity: AlertSeverity.WARNING,
          title: 'Alert Suppression',
          message: `Alert "${alertKey}" has been suppressed after ${this.maxAlertsPerWindow} occurrences`,
          metadata: {
            alertKey,
            count: entry.count,
            windowMinutes: this.aggregationWindow / 60000,
          },
        });
      }
      return false;
    }

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.alertCounts.entries()) {
      if (now - entry.lastSeen.getTime() > this.aggregationWindow * 2) {
        this.alertCounts.delete(key);
      }
    }
  }
}

export const alertAggregator = new AlertAggregator();

// Cleanup stale entries every 10 minutes
setInterval(() => alertAggregator.cleanup(), 10 * 60 * 1000);
