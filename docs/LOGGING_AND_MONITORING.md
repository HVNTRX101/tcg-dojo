# Logging and Monitoring Guide

This document describes the centralized logging and monitoring setup for the TCG Marketplace application.

## Table of Contents

- [Overview](#overview)
- [CloudWatch Logging](#cloudwatch-logging)
- [ELK Stack Setup](#elk-stack-setup)
- [Alerting System](#alerting-system)
- [Metrics Collection](#metrics-collection)
- [Monitoring Endpoints](#monitoring-endpoints)

## Overview

The application uses a comprehensive logging and monitoring stack that includes:

- **Winston** - Structured logging with daily file rotation
- **CloudWatch** - Cloud-based centralized logging (optional)
- **ELK Stack** - Elasticsearch, Logstash, Kibana for log aggregation and visualization (optional)
- **Prometheus Metrics** - Application and system metrics collection
- **Custom Alerting** - Real-time alerts for critical events

## CloudWatch Logging

### Configuration

CloudWatch logging is optional and can be enabled via environment variables.

#### Environment Variables

Add these to your `.env` file:

```bash
# CloudWatch Configuration
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/tcg-marketplace/backend
CLOUDWATCH_LOG_STREAM=production-2025-01-15
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### AWS Setup

1. **Create Log Group**:
   ```bash
   aws logs create-log-group --log-group-name /aws/tcg-marketplace/backend
   ```

2. **Set Retention Policy** (optional):
   ```bash
   aws logs put-retention-policy \
     --log-group-name /aws/tcg-marketplace/backend \
     --retention-in-days 30
   ```

3. **IAM Permissions**:
   Ensure your IAM user/role has the following permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogStreams"
         ],
         "Resource": "arn:aws:logs:*:*:log-group:/aws/tcg-marketplace/*"
       }
     ]
   }
   ```

### Features

- Automatic log streaming to CloudWatch
- 30-day log retention
- JSON-formatted logs with timestamps
- Error grouping and filtering
- Integration with CloudWatch Insights for log analysis

## ELK Stack Setup

### Running the ELK Stack

Start the ELK stack using Docker Compose:

```bash
docker-compose -f docker-compose.elk.yml up -d
```

### Components

1. **Elasticsearch** - Log storage and indexing
   - URL: http://localhost:9200
   - Stores logs in time-based indices

2. **Logstash** - Log processing pipeline
   - URL: http://localhost:9600
   - Processes and transforms logs before indexing

3. **Kibana** - Visualization and analytics
   - URL: http://localhost:5601
   - Web UI for searching and visualizing logs

4. **Filebeat** - Log shipper
   - Watches log files and ships to Elasticsearch
   - Lightweight and reliable

### Accessing Kibana

1. Open http://localhost:5601 in your browser
2. Go to "Discover" to view logs
3. Create visualizations and dashboards

### Index Patterns

The following index patterns are created:

- `tcg-logs-combined-*` - All application logs
- `tcg-logs-error-*` - Error logs only
- `tcg-logs-http-*` - HTTP request logs

### Sample Kibana Queries

**Find all errors in the last hour:**
```
level: "error" AND @timestamp:[now-1h TO now]
```

**Find slow API requests:**
```
type: "http" AND duration: >5000
```

**Find authentication failures:**
```
message: "authentication failed" OR message: "unauthorized"
```

## Alerting System

### Configuration

Configure alerting via environment variables:

```bash
# Email Alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_EMAIL_FROM=alerts@tcg-marketplace.com
ALERT_EMAIL_TO=admin@tcg-marketplace.com

# Webhook Alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Sentry Integration (for critical alerts)
SENTRY_DSN=your-sentry-dsn
```

### Alert Rules

The system includes predefined alert rules:

| Alert Rule | Threshold | Severity | Cooldown |
|------------|-----------|----------|----------|
| High Error Rate | >5% | High | 10 min |
| Slow Response Time | >5s avg | Medium | 5 min |
| Database Connection Failure | Connection lost | Critical | 1 min |
| Redis Connection Failure | Connection lost | High | 1 min |
| High Memory Usage | >90% | High | 5 min |
| High CPU Usage | >80% | Medium | 5 min |
| Low Disk Space | >85% | High | 10 min |
| API Rate Limit Exceeded | >1000 req/min | Medium | 5 min |
| Unauthorized Access Attempt | >10 attempts | High | 5 min |
| Payment Gateway Failure | Unavailable | Critical | 1 min |

### Alert Channels

Alerts are sent through multiple channels based on severity:

- **Low/Medium**: Logged only
- **High**: Email + Webhook + Logs
- **Critical**: Email + Webhook + Sentry + Logs

### Manual Alert Triggering

```typescript
import { alertManager, alertRules } from './config/alerting';

// Trigger a custom alert
await alertManager.triggerAlert({
  name: 'Custom Alert',
  condition: () => true,
  severity: 'high',
  message: 'Something important happened',
}, { additionalData: 'context' });
```

## Metrics Collection

### Prometheus Metrics

The application exposes Prometheus-compatible metrics at `/api/monitoring/metrics`.

### Available Metrics

**HTTP Metrics:**
- `http_request_duration_ms` - Request duration histogram
- `http_requests_total` - Total HTTP requests counter
- `http_errors_total` - Total HTTP errors counter

**Database Metrics:**
- `database_query_duration_ms` - Query duration histogram
- `database_connection_pool` - Connection pool status
- `database_errors_total` - Database errors counter

**Cache Metrics:**
- `cache_hits_total` - Cache hit counter
- `cache_misses_total` - Cache miss counter
- `cache_operation_duration_ms` - Cache operation duration

**Business Metrics:**
- `orders_created_total` - Order creation counter
- `order_value_dollars` - Order value histogram
- `user_registrations_total` - User registration counter
- `payment_transactions_total` - Payment transaction counter

**System Metrics:**
- `process_memory_usage_bytes` - Memory usage gauge
- `process_cpu_usage_percent` - CPU usage gauge
- `active_connections` - Active connection gauge

**Authentication Metrics:**
- `auth_attempts_total` - Authentication attempt counter
- `auth_tokens_issued_total` - Token issuance counter

**Job Metrics:**
- `jobs_processed_total` - Background job counter
- `job_duration_ms` - Job duration histogram

### Viewing Metrics

**Prometheus format:**
```bash
curl http://localhost:3000/api/monitoring/metrics
```

**JSON format:**
```bash
curl http://localhost:3000/api/monitoring/metrics/json
```

### Setting up Prometheus

Create a `prometheus.yml` configuration:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tcg-marketplace'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/monitoring/metrics'
```

Run Prometheus:
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

## Monitoring Endpoints

### Health Checks

**Health Check** - `/api/monitoring/health`
```bash
curl http://localhost:3000/api/monitoring/health
```

**Readiness Probe** - `/api/monitoring/ready`
```bash
curl http://localhost:3000/api/monitoring/ready
```

**Liveness Probe** - `/api/monitoring/live`
```bash
curl http://localhost:3000/api/monitoring/live
```

### System Information

**System Info** - `/api/monitoring/info`
```bash
curl http://localhost:3000/api/monitoring/info
```

### Alert History

**View Alerts** - `/api/monitoring/alerts`
```bash
curl http://localhost:3000/api/monitoring/alerts?limit=50
```

## Integration with Existing Code

### Tracking Custom Metrics

```typescript
import { httpRequestDuration, orderCreated } from './config/metrics';

// Track HTTP request duration
const start = Date.now();
// ... handle request ...
const duration = Date.now() - start;
httpRequestDuration.observe({ method: 'GET', route: '/api/products', status_code: '200' }, duration);

// Track business event
orderCreated.inc({ status: 'completed' });
```

### Triggering Alerts

```typescript
import { monitorMetrics } from './config/alerting';

// Monitor metrics and trigger alerts if thresholds are exceeded
await monitorMetrics({
  errorRate: 8.5, // Will trigger high error rate alert
  avgResponseTime: 6000, // Will trigger slow response time alert
  memoryUsage: 92, // Will trigger high memory usage alert
});
```

### Logging Best Practices

```typescript
import { logger, logError, logBusinessEvent } from './config/logger';

// Structured logging
logger.info('User action', {
  userId: '123',
  action: 'purchase',
  productId: '456',
});

// Error logging with context
try {
  // ... code ...
} catch (error) {
  logError(error, {
    userId: req.user?.id,
    endpoint: req.path,
  });
}

// Business event logging
logBusinessEvent('order_completed', {
  orderId: '789',
  amount: 99.99,
  userId: '123',
});
```

## Troubleshooting

### CloudWatch Issues

**Logs not appearing in CloudWatch:**
1. Check AWS credentials are correct
2. Verify IAM permissions
3. Check CloudWatch log group exists
4. Review application logs for CloudWatch errors

### ELK Stack Issues

**Elasticsearch won't start:**
```bash
# Check logs
docker-compose -f docker-compose.elk.yml logs elasticsearch

# Increase memory (if needed)
# Add to docker-compose.elk.yml:
# environment:
#   - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

**Kibana connection refused:**
1. Wait for Elasticsearch to be fully ready
2. Check Elasticsearch health: `curl http://localhost:9200/_cluster/health`

**Logs not showing in Kibana:**
1. Create index pattern in Kibana
2. Check Filebeat is running: `docker-compose -f docker-compose.elk.yml ps`
3. Verify log files exist in `backend/logs/`

### Alert Issues

**Alerts not being sent:**
1. Check SMTP credentials
2. Verify email server allows connections
3. Check application logs for alert errors
4. Test email configuration separately

## Best Practices

1. **Log Level Management**: Use appropriate log levels (debug, info, warn, error)
2. **PII Sanitization**: Never log sensitive information (passwords, credit cards, etc.)
3. **Structured Logging**: Always use structured logs with context
4. **Alert Fatigue**: Configure appropriate cooldown periods to avoid spam
5. **Metric Naming**: Use consistent naming conventions for metrics
6. **Resource Monitoring**: Regularly review system resource usage
7. **Log Retention**: Configure appropriate retention policies based on compliance needs

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [Elastic Stack Documentation](https://www.elastic.co/guide/index.html)
- [Prometheus Documentation](https://prometheus.io/docs/)
