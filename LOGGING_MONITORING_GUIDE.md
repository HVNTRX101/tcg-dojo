# Logging, Monitoring, and Alerting Guide

## Overview

This application includes a comprehensive logging, monitoring, and alerting system designed for production-grade observability.

## Table of Contents

- [Centralized Logging](#centralized-logging)
- [CloudWatch Integration](#cloudwatch-integration)
- [ELK Stack Integration](#elk-stack-integration)
- [Health Checks](#health-checks)
- [Metrics and Monitoring](#metrics-and-monitoring)
- [Alerting System](#alerting-system)
- [E2E Testing](#e2e-testing)

---

## Centralized Logging

### Winston Logger Configuration

The application uses Winston for centralized logging with multiple transports:

- **Console Transport**: Development environment only
- **File Transport**: Daily rotating log files
  - `error-{DATE}.log`: Error logs (30 days retention)
  - `combined-{DATE}.log`: All logs (14 days retention)
  - `http-{DATE}.log`: HTTP request logs (7 days retention)
  - `exceptions-{DATE}.log`: Uncaught exceptions (30 days retention)
  - `rejections-{DATE}.log`: Unhandled promise rejections (30 days retention)
- **CloudWatch Transport**: Production cloud logging (optional)
- **ELK/Elasticsearch Transport**: Advanced log analysis (optional)

### Log Levels

- `error`: Application errors and exceptions
- `warn`: Warning messages and slow operations
- `info`: General information and business events
- `http`: HTTP request/response logs
- `debug`: Detailed debugging information

### Usage

```typescript
import { logger } from './config/logger';

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error });

// Structured logging helpers
import { logError, logSecurityEvent, logBusinessEvent } from './config/logger';

logError(error, { context: 'payment processing' });
logSecurityEvent('Failed login attempt', { ip, email });
logBusinessEvent('Order placed', { orderId, amount });
```

---

## CloudWatch Integration

### Setup

1. Install AWS CLI and configure credentials:
```bash
aws configure
```

2. Set environment variables in `.env`:
```env
# CloudWatch Configuration
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/tcg-marketplace/production
CLOUDWATCH_LOG_STREAM=app
AWS_REGION=us-east-1
```

3. Ensure your AWS IAM role/user has CloudWatch Logs permissions:
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
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Features

- Automatic log group and stream creation
- 30-day log retention
- JSON-formatted logs for CloudWatch Insights
- Real-time log streaming
- Integration with AWS CloudWatch Alarms

### CloudWatch Insights Queries

```sql
# Find all errors in the last hour
fields @timestamp, level, message, @message
| filter level = "error"
| sort @timestamp desc
| limit 100

# Track slow API responses
fields @timestamp, endpoint, duration
| filter duration > 5000
| stats count() by endpoint
| sort count desc

# Monitor authentication failures
fields @timestamp, event, ip
| filter event = "Failed login attempt"
| stats count() by ip
| sort count desc
```

---

## ELK Stack Integration

### Setup (Optional)

1. Install `winston-elasticsearch`:
```bash
cd backend && npm install winston-elasticsearch
```

2. Update `backend/src/config/logger.ts`:
```typescript
// Uncomment the ELK configuration section
import { ElasticsearchTransport } from 'winston-elasticsearch';

if (process.env.ELASTICSEARCH_NODE) {
  transports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_NODE,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME || '',
          password: process.env.ELASTICSEARCH_PASSWORD || '',
        },
      },
      index: 'tcg-marketplace-logs',
    })
  );
}
```

3. Set environment variables:
```env
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

### Docker Compose ELK Setup

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

---

## Health Checks

### Endpoints

#### GET /health
Comprehensive health check of all system components.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database is healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "pass",
      "message": "Redis is healthy",
      "responseTime": 12
    },
    "memory": {
      "status": "pass",
      "message": "Heap usage: 45%"
    }
  },
  "timestamp": "2025-11-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### GET /health/live
Kubernetes/Docker liveness probe - checks if server is running.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "uptime": 3600
}
```

#### GET /health/ready
Kubernetes/Docker readiness probe - checks if server can handle traffic.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

### Kubernetes Integration

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: tcg-marketplace
    image: tcg-marketplace:latest
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

---

## Metrics and Monitoring

### Endpoints

#### GET /health/metrics
JSON metrics for custom monitoring tools.

**Response:**
```json
{
  "timestamp": "2025-11-15T10:30:00.000Z",
  "uptime": 3600,
  "metrics": {
    "http_requests_total": { "current": 1500 },
    "http_errors_total": { "current": 25 }
  },
  "system": {
    "memory": {
      "heapUsed": 45000000,
      "heapTotal": 100000000,
      "heapUsedPercent": "45.00"
    },
    "cpu": {
      "user": 1234567,
      "system": 234567
    }
  }
}
```

#### GET /health/metrics/prometheus
Prometheus-compatible metrics endpoint.

**Response (text/plain):**
```
# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 100000000

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 45000000

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds 3600
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'tcg-marketplace'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/health/metrics/prometheus'
```

### Grafana Dashboards

Import the Prometheus metrics into Grafana for visualization:

1. Add Prometheus as a data source
2. Create dashboards for:
   - Request rate and latency
   - Error rates
   - Memory and CPU usage
   - Database query performance

---

## Alerting System

### Configuration

Set environment variables in `.env`:

```env
# Alerting Configuration
ALERTING_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_WEBHOOK_URL=https://your-custom-webhook.com/alerts
ALERT_EMAIL_RECIPIENTS=ops@example.com,dev@example.com
```

### Alert Severity Levels

- **INFO**: Informational alerts
- **WARNING**: Non-critical issues that need attention
- **ERROR**: Errors that affect functionality
- **CRITICAL**: Critical issues requiring immediate attention

### Predefined Alerts

The system automatically alerts on:

- **High Error Rate**: More than 10 errors in 5 minutes
- **Slow API Response**: Endpoint takes longer than 5 seconds
- **Database Connection Lost**: Cannot connect to database
- **High Memory Usage**: Memory usage exceeds 80%
- **Security Events**: Failed login attempts, suspicious activity
- **Service Down**: External service not responding

### Custom Alerts

```typescript
import { sendAlert, AlertSeverity } from './utils/alerting';

await sendAlert({
  severity: AlertSeverity.WARNING,
  title: 'Custom Alert',
  message: 'Something needs attention',
  metadata: {
    customField: 'value',
  },
});
```

### Slack Integration

Alerts are sent to Slack with color-coded messages:
- 🟢 INFO: Green
- 🟡 WARNING: Orange
- 🔴 ERROR: Red
- 🔴 CRITICAL: Dark Red

### Alert Aggregation

The system prevents alert spam by:
- Limiting to 10 alerts per 5-minute window
- Sending a suppression notice after threshold
- Automatically cleaning up old alert data

---

## E2E Testing

### Setup

The application uses Playwright for end-to-end testing.

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Test Structure

```
e2e/
├── health-check.spec.ts       # Health check endpoint tests
├── authentication.spec.ts      # User authentication flows
├── product-browsing.spec.ts    # Product listing and search
└── cart-checkout.spec.ts       # Shopping cart and checkout
```

### Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page, request }) => {
    // Navigate to page
    await page.goto('/');

    // Interact with UI
    await page.click('button');

    // Make API request
    const response = await request.get('/api/endpoint');
    expect(response.status()).toBe(200);
  });
});
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Browser Support

Tests run on multiple browsers:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

---

## Best Practices

### Logging

1. **Use structured logging**: Always include context objects
2. **Don't log sensitive data**: Passwords, tokens, credit cards
3. **Use appropriate log levels**: Don't use `error` for warnings
4. **Include request IDs**: For tracing requests across services
5. **Log at boundaries**: API requests, database queries, external calls

### Monitoring

1. **Monitor golden signals**: Latency, traffic, errors, saturation
2. **Set up dashboards**: Real-time visibility into system health
3. **Track business metrics**: Not just technical metrics
4. **Use correlation IDs**: Track requests across microservices
5. **Monitor dependencies**: Database, Redis, external APIs

### Alerting

1. **Alert on symptoms, not causes**: Focus on user impact
2. **Make alerts actionable**: Include context and next steps
3. **Avoid alert fatigue**: Use aggregation and suppression
4. **Test alert channels**: Regularly verify Slack/email delivery
5. **Document runbooks**: What to do when an alert fires

### Testing

1. **Test critical paths**: Authentication, checkout, payments
2. **Test across browsers**: Don't assume Chrome-only
3. **Use realistic data**: Test with production-like scenarios
4. **Run tests in CI/CD**: Catch issues before deployment
5. **Keep tests maintainable**: Use page objects and helpers

---

## Troubleshooting

### Logs Not Appearing in CloudWatch

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify IAM permissions for CloudWatch Logs
3. Check `CLOUDWATCH_ENABLED` environment variable
4. Review application logs for CloudWatch errors

### High Memory Alerts

1. Check for memory leaks: Use Node.js profiling tools
2. Review recent deployments: Correlate with code changes
3. Scale horizontally: Add more instances
4. Optimize queries: Check for N+1 queries or large datasets

### Tests Failing in CI

1. Check timeouts: CI may be slower than local
2. Verify services running: Backend and frontend both up
3. Review screenshots: Playwright saves failure screenshots
4. Check browser compatibility: Test locally with same browser

---

## Support

For issues or questions:
- Check application logs in `backend/logs/`
- Review CloudWatch Logs (if enabled)
- Check health endpoints: `/health`, `/health/metrics`
- Review Sentry for error tracking
- Contact the development team

---

## License

MIT
