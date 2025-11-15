# TCG Marketplace - Setup Guide

This guide will help you set up the centralized logging, alerting, and E2E testing features for the TCG Marketplace application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Logging Setup](#logging-setup)
3. [Alerting Setup](#alerting-setup)
4. [E2E Testing Setup](#e2e-testing-setup)
5. [Monitoring Setup](#monitoring-setup)

## Quick Start

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install Playwright Browsers (for E2E testing)

```bash
# From project root
npx playwright install
```

## Logging Setup

The application includes three logging options. You can use one or all of them:

### Option 1: Local File Logging (Default)

This is enabled by default. Logs are stored in `backend/logs/`:

- `combined-*.log` - All logs (14 days retention)
- `error-*.log` - Error logs only (30 days retention)
- `http-*.log` - HTTP request logs (7 days retention)

**No configuration needed!**

### Option 2: CloudWatch Logging (Production)

Enable CloudWatch logging for centralized cloud-based logs:

1. **Create AWS CloudWatch Log Group:**
   ```bash
   aws logs create-log-group --log-group-name /aws/tcg-marketplace/backend
   ```

2. **Update `.env` file:**
   ```bash
   CLOUDWATCH_ENABLED=true
   CLOUDWATCH_LOG_GROUP=/aws/tcg-marketplace/backend
   CLOUDWATCH_LOG_STREAM=production
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

3. **Verify logs in CloudWatch:**
   - Open AWS Console
   - Navigate to CloudWatch > Log groups
   - Select your log group to view logs

### Option 3: ELK Stack (Local Development)

Run a complete ELK stack for advanced log analysis:

1. **Start ELK services:**
   ```bash
   docker-compose -f docker-compose.elk.yml up -d
   ```

2. **Wait for services to be ready (2-3 minutes):**
   ```bash
   # Check Elasticsearch health
   curl http://localhost:9200/_cluster/health

   # Check Kibana
   curl http://localhost:5601/api/status
   ```

3. **Access Kibana:**
   - Open http://localhost:5601
   - Go to "Discover"
   - Create index pattern: `tcg-logs-*`
   - Start exploring logs!

4. **Stop ELK services:**
   ```bash
   docker-compose -f docker-compose.elk.yml down
   ```

**Services:**
- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601
- Logstash: http://localhost:9600

## Alerting Setup

Configure alerts to be notified of critical issues:

### 1. Email Alerts

Update `.env` with SMTP configuration:

```bash
# For Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use App Password, not regular password
ALERT_EMAIL_FROM=alerts@tcg-marketplace.com
ALERT_EMAIL_TO=admin@tcg-marketplace.com
```

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in `SMTP_PASS`

### 2. Webhook Alerts (Slack/Discord)

**For Slack:**
1. Create Slack Webhook: https://api.slack.com/messaging/webhooks
2. Add to `.env`:
   ```bash
   ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

**For Discord:**
1. Create Discord Webhook in channel settings
2. Add to `.env`:
   ```bash
   ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
   ```

### 3. Alert Rules

The following alerts are pre-configured:

| Alert | Trigger | Severity | Actions |
|-------|---------|----------|---------|
| High Error Rate | >5% errors | High | Email + Webhook |
| Slow Response | Avg >5s | Medium | Logs |
| DB Connection Lost | Connection failure | Critical | Email + Webhook + Sentry |
| High Memory | >90% | High | Email + Webhook |
| Payment Gateway Down | Unavailable | Critical | Email + Webhook + Sentry |

### 4. Test Alerts

Start the backend and trigger a test alert:

```bash
cd backend
npm run dev

# In another terminal, trigger test alert
curl -X POST http://localhost:3000/api/monitoring/test-alert
```

## E2E Testing Setup

### 1. Install Playwright

```bash
# Install Playwright with browsers
npx playwright install --with-deps
```

### 2. Configure Test Environment

Create `.env.test` in project root:

```bash
E2E_BASE_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

### 3. Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

### 4. Run E2E Tests

**Run all tests:**
```bash
npm run test:e2e
```

**Run in headed mode (see browser):**
```bash
npm run test:e2e -- --headed
```

**Run with UI (interactive mode):**
```bash
npm run test:e2e:ui
```

**Run specific test file:**
```bash
npx playwright test e2e/tests/auth.spec.ts
```

**Debug mode:**
```bash
npm run test:e2e:debug
```

### 5. View Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

### 6. Available Test Suites

- **Authentication Tests** (`e2e/tests/auth.spec.ts`)
  - Sign in/Sign up
  - Password recovery
  - Session persistence

- **Product Tests** (`e2e/tests/product.spec.ts`)
  - Product listing
  - Search and filters
  - Cart operations
  - Reviews and wishlist

- **Checkout Tests** (`e2e/tests/checkout.spec.ts`)
  - Checkout flow
  - Payment processing
  - Order confirmation

## Monitoring Setup

### 1. Access Monitoring Endpoints

Start the backend and access:

**Health Check:**
```bash
curl http://localhost:3000/api/monitoring/health
```

**Prometheus Metrics:**
```bash
curl http://localhost:3000/api/monitoring/metrics
```

**System Info:**
```bash
curl http://localhost:3000/api/monitoring/info
```

**Alert History:**
```bash
curl http://localhost:3000/api/monitoring/alerts
```

### 2. Add Monitoring Routes to Backend

Update `backend/src/server.ts` to include monitoring routes:

```typescript
import monitoringRoutes from './routes/monitoring';

// Add monitoring middleware
app.use(httpMetricsMiddleware);
app.use(healthMonitoringMiddleware);

// Add monitoring routes
app.use('/api/monitoring', monitoringRoutes);
```

### 3. Optional: Set up Prometheus + Grafana

**Start Prometheus:**
```bash
# Create prometheus.yml config (see docs/LOGGING_AND_MONITORING.md)
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Start Grafana:**
```bash
docker run -d \
  -p 3001:3000 \
  grafana/grafana
```

Access Grafana at http://localhost:3001 (admin/admin)

## Verification Checklist

After setup, verify everything is working:

### Logging
- [ ] Backend starts without errors
- [ ] Log files appear in `backend/logs/`
- [ ] CloudWatch logs appear (if enabled)
- [ ] Kibana shows logs (if using ELK)

### Alerting
- [ ] Email alerts are received (test with high error simulation)
- [ ] Webhook alerts appear in Slack/Discord
- [ ] Alert history endpoint returns data

### E2E Testing
- [ ] Playwright browsers installed
- [ ] Tests run successfully: `npm run test:e2e`
- [ ] Test report opens: `npm run test:e2e:report`
- [ ] UI mode works: `npm run test:e2e:ui`

### Monitoring
- [ ] Health check returns 200: `/api/monitoring/health`
- [ ] Metrics endpoint returns data: `/api/monitoring/metrics`
- [ ] System info accessible: `/api/monitoring/info`

## Troubleshooting

### Logging Issues

**Logs not appearing:**
- Check `LOG_LEVEL` in `.env` (should be `info` or `debug`)
- Verify `backend/logs/` directory exists and is writable
- Check console for Winston errors

**CloudWatch not working:**
- Verify AWS credentials are correct
- Check IAM permissions for CloudWatch Logs
- Review CloudWatch errors in console logs

**ELK Stack not starting:**
- Ensure Docker is running
- Check port availability (9200, 5601, 9600)
- Increase Docker memory allocation (8GB recommended)

### Alerting Issues

**Email alerts not sending:**
- Verify SMTP credentials
- Check spam folder
- Test SMTP connection separately
- Review application logs for email errors

**Webhooks not working:**
- Verify webhook URL is correct
- Check webhook service (Slack/Discord) is accessible
- Review application logs for webhook errors

### E2E Testing Issues

**Playwright install fails:**
```bash
# Install with dependencies
npx playwright install --with-deps

# Or install specific browser
npx playwright install chromium
```

**Tests timeout:**
- Ensure frontend and backend are running
- Check URLs in `.env.test`
- Increase timeout in `playwright.config.ts`

**Port conflicts:**
```bash
# Kill processes using ports
npx kill-port 5173 3000
```

## Next Steps

1. **Review Documentation:**
   - [Logging and Monitoring Guide](./docs/LOGGING_AND_MONITORING.md)
   - [E2E Testing Guide](./docs/E2E_TESTING.md)

2. **Customize Configuration:**
   - Adjust alert thresholds in `backend/src/config/alerting.ts`
   - Add custom metrics in `backend/src/config/metrics.ts`
   - Create additional E2E tests

3. **Production Deployment:**
   - Enable CloudWatch logging
   - Configure production alert channels
   - Set up Prometheus + Grafana
   - Run E2E tests in CI/CD pipeline

## Support

For issues or questions:
- Check the troubleshooting section above
- Review detailed documentation in `docs/`
- Check application logs in `backend/logs/`
- Create an issue on GitHub

## Summary

You've now set up:
- ✅ Centralized logging (Local files + CloudWatch + ELK)
- ✅ Alerting system (Email + Webhooks + Sentry)
- ✅ Prometheus metrics collection
- ✅ E2E testing framework with Playwright
- ✅ Monitoring endpoints and dashboards

Happy monitoring and testing! 🚀
