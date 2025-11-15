# TCG Dojo Operations Runbook

This document provides step-by-step procedures for common operational tasks and incident response.

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [System Architecture](#system-architecture)
3. [Common Issues](#common-issues)
4. [Incident Response](#incident-response)
5. [Deployment Procedures](#deployment-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Database Operations](#database-operations)
8. [Performance Troubleshooting](#performance-troubleshooting)

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | oncall@tcgdojo.com | 24/7 |
| DevOps Lead | devops@tcgdojo.com | Business hours |
| CTO | cto@tcgdojo.com | Escalation only |
| PagerDuty | https://tcgdojo.pagerduty.com | 24/7 |

## System Architecture

### Components

- **Frontend**: React + Vite (Port 5173)
- **Backend**: Node.js + Express (Port 3000)
- **Database**: PostgreSQL (Port 5432)
- **Cache**: Redis (Port 6379)
- **Queue**: Bull (Redis-backed)
- **Monitoring**: Sentry + Custom metrics

### Infrastructure

- **Hosting**: AWS/GCP/Azure
- **Load Balancer**: Nginx/ALB
- **CDN**: CloudFlare
- **File Storage**: Cloudinary

## Common Issues

### 1. High Error Rate

**Symptoms:**
- Error rate > 1% in Sentry
- HTTP 500 responses
- User reports of errors

**Diagnosis:**
```bash
# Check error logs
tail -f logs/error-*.log

# Check Sentry dashboard
# https://sentry.io/organizations/tcg-dojo/

# Check database health
curl http://localhost:3000/api/database/health
```

**Resolution:**
1. Identify error pattern in logs
2. Check recent deployments (rollback if needed)
3. Verify database connectivity
4. Check external service status (Stripe, Cloudinary)
5. Scale up if resource-constrained

### 2. Slow Response Times

**Symptoms:**
- P95 response time > 1s
- User complaints about slowness
- Timeout errors

**Diagnosis:**
```bash
# Check slow queries
curl http://localhost:3000/api/database/slow-queries

# Check database performance
curl http://localhost:3000/api/database/performance

# Check server metrics
top
htop
```

**Resolution:**
1. Identify slow queries
2. Add missing database indexes
3. Enable query caching
4. Scale horizontally if needed
5. Optimize N+1 queries

### 3. High Memory Usage

**Symptoms:**
- Memory > 80%
- OOM (Out of Memory) kills
- Slow performance

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js heap
node --max-old-space-size=4096 dist/server.js
```

**Resolution:**
1. Identify memory leaks (heap snapshots)
2. Restart application
3. Increase memory allocation
4. Fix memory leaks in code
5. Scale horizontally

### 4. Database Connection Errors

**Symptoms:**
- "Too many connections" errors
- Connection timeouts
- Pool exhaustion

**Diagnosis:**
```bash
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool
curl http://localhost:3000/api/database/connections
```

**Resolution:**
1. Identify connection leaks
2. Close idle connections
3. Increase connection pool size
4. Restart database if necessary
5. Add read replicas

### 5. Redis Connection Issues

**Symptoms:**
- Cache misses
- Session errors
- Queue failures

**Diagnosis:**
```bash
# Check Redis status
redis-cli ping

# Check memory
redis-cli info memory

# Check connected clients
redis-cli client list
```

**Resolution:**
1. Restart Redis
2. Clear cache if corrupted
3. Increase memory limit
4. Check network connectivity
5. Verify Redis configuration

## Incident Response

### Severity Levels

**P0 - Critical**
- Complete outage
- Data loss
- Security breach

**P1 - High**
- Major feature broken
- High error rate (>5%)
- Slow performance affecting all users

**P2 - Medium**
- Minor feature broken
- Isolated issues
- Performance degradation

**P3 - Low**
- Cosmetic issues
- Low priority bugs

### Incident Response Process

#### 1. Acknowledge

```bash
# Update incident status
curl -X POST https://status.tcgdojo.com/api/incidents \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"status": "investigating", "title": "High error rate"}'
```

#### 2. Investigate

- Check monitoring dashboards
- Review recent changes
- Examine logs and metrics
- Identify root cause

#### 3. Mitigate

- Rollback if caused by deployment
- Scale resources if needed
- Enable circuit breakers
- Apply hotfix

#### 4. Resolve

- Implement permanent fix
- Verify resolution
- Update status page
- Document in postmortem

#### 5. Postmortem

- What happened?
- Root cause analysis
- Timeline of events
- Action items to prevent recurrence

## Deployment Procedures

### Rolling Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Build application
npm run build

# 5. Run database migrations
npx prisma migrate deploy

# 6. Restart application (zero-downtime)
pm2 reload ecosystem.config.js --update-env

# 7. Verify deployment
curl http://localhost:3000/health
```

### Rollback Procedure

```bash
# 1. Identify last known good version
git log --oneline

# 2. Revert to previous version
git revert HEAD

# 3. Or checkout specific commit
git checkout abc123

# 4. Deploy rolled-back version
npm run build
pm2 reload all

# 5. Verify rollback
curl http://localhost:3000/health
```

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
./deploy-green.sh

# 2. Run smoke tests
npm run test:smoke -- --env=green

# 3. Switch traffic to green
./switch-to-green.sh

# 4. Monitor for issues
watch -n 5 'curl http://localhost:3000/health'

# 5. Keep blue as backup for 24h
# Then tear down blue environment
```

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error Rate | > 1% | P1 |
| Response Time (P95) | > 1s | P2 |
| Response Time (P99) | > 2s | P2 |
| CPU Usage | > 80% | P2 |
| Memory Usage | > 85% | P2 |
| Disk Usage | > 90% | P1 |
| Database Connections | > 90% | P1 |
| Queue Size | > 1000 | P2 |

### Dashboards

- **Application**: https://grafana.tcgdojo.com/d/app
- **Infrastructure**: https://grafana.tcgdojo.com/d/infra
- **Database**: https://grafana.tcgdojo.com/d/db
- **Business**: https://grafana.tcgdojo.com/d/business

### Alert Channels

- **PagerDuty**: Critical alerts (P0, P1)
- **Slack #alerts**: All alerts
- **Email**: Daily digest

## Database Operations

### Backup

```bash
# Manual backup
pg_dump -h localhost -U postgres tcgdojo > backup_$(date +%Y%m%d).sql

# Verify backup
pg_restore --list backup_20240101.sql

# Automated backups run daily at 2 AM UTC
# Stored in S3: s3://tcgdojo-backups/
```

### Restore

```bash
# Stop application
pm2 stop all

# Drop and recreate database
dropdb tcgdojo
createdb tcgdojo

# Restore from backup
psql -U postgres tcgdojo < backup_20240101.sql

# Run migrations
npx prisma migrate deploy

# Restart application
pm2 start all
```

### Migrations

```bash
# Create migration
npx prisma migrate dev --name add_user_preferences

# Apply migration (production)
npx prisma migrate deploy

# Rollback migration (manual)
# Edit migration file and create reverse migration
npx prisma migrate dev --name rollback_user_preferences
```

### Performance Tuning

```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE price > 100;

# Create index
CREATE INDEX idx_products_price ON products(price);

# Vacuum database
VACUUM ANALYZE;

# Reindex
REINDEX DATABASE tcgdojo;
```

## Performance Troubleshooting

### Slow Endpoints

```bash
# 1. Check slow queries
curl http://localhost:3000/api/database/slow-queries

# 2. Enable query logging
LOG_DB_QUERIES=true npm start

# 3. Profile endpoint
node --inspect dist/server.js
# Open chrome://inspect

# 4. Check APM
# Sentry Performance or similar
```

### Memory Leaks

```bash
# 1. Take heap snapshot
node --inspect dist/server.js
# Chrome DevTools > Memory > Take snapshot

# 2. Compare snapshots
# Take snapshot before and after operation

# 3. Identify leaked objects
# Look for detached DOM nodes, closures

# 4. Fix and verify
npm test
```

### High CPU Usage

```bash
# 1. Identify CPU-intensive code
node --prof dist/server.js
node --prof-process isolate-*.log

# 2. Check event loop lag
# Add event loop monitoring

# 3. Optimize hot paths
# Use profiler to identify

# 4. Scale horizontally
# Add more instances
```

## Maintenance Windows

### Scheduled Maintenance

```bash
# 1. Notify users (24h advance)
# Update status page

# 2. Create database backup
pg_dump tcgdojo > pre_maintenance_backup.sql

# 3. Enable maintenance mode
# Set MAINTENANCE_MODE=true

# 4. Perform maintenance
# Database upgrades, schema changes, etc.

# 5. Verify system health
npm run test:integration

# 6. Disable maintenance mode
# Set MAINTENANCE_MODE=false

# 7. Monitor for issues
# Watch dashboards for 1 hour
```

## Escalation Procedures

### When to Escalate

- Unable to resolve within 30 minutes (P0)
- Unable to resolve within 2 hours (P1)
- Need database admin access
- Need infrastructure changes
- Security incident

### Escalation Path

1. On-Call Engineer
2. DevOps Lead
3. Engineering Manager
4. CTO

## Useful Commands

```bash
# Application logs
tail -f logs/combined-*.log
tail -f logs/error-*.log

# System logs
journalctl -u tcgdojo -f

# Process management
pm2 list
pm2 logs
pm2 monit
pm2 restart all

# Database
psql -U postgres tcgdojo
\dt                    # List tables
\d users              # Describe table
SELECT * FROM users LIMIT 10;

# Redis
redis-cli
KEYS *
GET key
FLUSHALL              # Clear all (careful!)

# Health checks
curl http://localhost:3000/health
curl http://localhost:3000/api/database/health

# Load testing
k6 run loadtests/product-api.test.js
```

## Quick Reference

### Service Ports

- Frontend: 5173
- Backend: 3000
- PostgreSQL: 5432
- Redis: 6379
- Grafana: 3001
- Prometheus: 9090

### Log Locations

- Application: `logs/`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`
- System: `/var/log/syslog`

### Configuration Files

- Application: `.env`
- Nginx: `/etc/nginx/sites-available/tcgdojo`
- PostgreSQL: `/etc/postgresql/*/main/postgresql.conf`
- PM2: `ecosystem.config.js`

## Support

For questions or issues with this runbook:
- Slack: #devops
- Email: devops@tcgdojo.com
- Wiki: https://wiki.tcgdojo.com/runbook
