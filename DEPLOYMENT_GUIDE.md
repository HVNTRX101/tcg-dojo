# Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Setup](#database-setup)
6. [SSL/HTTPS Configuration](#ssl-https-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ LTS (recommended) or similar Linux distribution
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Network**: Static IP address and domain name

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- Node.js 20+ LTS (for manual deployment)
- Nginx or Apache (for reverse proxy)

### Required Accounts & Services
- Domain name registered
- SSL certificate (Let's Encrypt recommended)
- **Cloudinary** account for image storage
- **SendGrid** account for email services
- **Stripe** account for payment processing
- **Sentry** account for error tracking (optional but recommended)
- **AWS S3** or similar for database backups

---

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Node.js (if needed for manual deployment)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx
```

### 2. Clone Repository

```bash
cd /opt
sudo git clone https://github.com/yourusername/tcg-marketplace.git
cd tcg-marketplace
```

### 3. Configure Environment Variables

```bash
# Copy environment template
cp .env.docker .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# Server
NODE_ENV=production
BACKEND_PORT=3000
FRONTEND_PORT=80

# Database
POSTGRES_DB=tcg_marketplace_prod
POSTGRES_USER=tcgadmin
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>
REDIS_PORT=6379

# JWT Secrets (Generate with: openssl rand -base64 64)
JWT_SECRET=<YOUR_JWT_SECRET>
JWT_REFRESH_SECRET=<YOUR_JWT_REFRESH_SECRET>

# URLs
FRONTEND_URL=https://yourdomain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Sentry (Error Tracking)
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
APP_VERSION=1.0.0

# Logging
LOG_LEVEL=info
LOG_DB_QUERIES=false
```

---

## Docker Deployment (Recommended)

### 1. Build and Start Services

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Initialize Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database (optional)
docker-compose exec backend npm run seed
```

### 3. Verify Deployment

```bash
# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test API
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost:80
```

---

## Manual Deployment

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm ci --production

# Generate Prisma Client
npx prisma generate

# Build TypeScript
npm run build

# Run migrations
npx prisma migrate deploy

# Start with PM2 (process manager)
npm install -g pm2
pm2 start dist/server.js --name tcg-backend
pm2 save
pm2 startup
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci --production

# Build production bundle
npm run build

# Serve with Nginx (see Nginx configuration below)
```

### 3. Background Workers

```bash
# Start worker processes
cd backend
pm2 start dist/workers/index.js --name tcg-workers
pm2 save
```

---

## Database Setup

### 1. PostgreSQL Configuration

```bash
# If using external PostgreSQL (not Docker)
sudo -u postgres psql

CREATE DATABASE tcg_marketplace_prod;
CREATE USER tcgadmin WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tcg_marketplace_prod TO tcgadmin;
\q

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf

# Recommended settings:
# max_connections = 200
# shared_buffers = 2GB  # 25% of RAM
# effective_cache_size = 6GB  # 75% of RAM
# work_mem = 10MB
# maintenance_work_mem = 512MB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. Redis Configuration

```bash
# If using external Redis (not Docker)
sudo nano /etc/redis/redis.conf

# Recommended settings:
# maxmemory 512mb
# maxmemory-policy allkeys-lru
# requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis
```

---

## SSL/HTTPS Configuration

### 1. Install Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/tcg-marketplace`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (if serving static files)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for long requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/tcg-marketplace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Logging

### 1. Application Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2 logs (manual deployment)
pm2 logs tcg-backend
pm2 logs tcg-workers

# Application logs location
/opt/tcg-marketplace/backend/logs/
```

### 2. Set Up Log Rotation

Create `/etc/logrotate.d/tcg-marketplace`:

```
/opt/tcg-marketplace/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f /opt/tcg-marketplace/docker-compose.yml exec backend kill -USR1 1
    endscript
}
```

### 3. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop

# Monitor Docker resources
docker stats
```

---

## Backup & Recovery

### 1. Automated Database Backups

The GitHub Actions workflow automatically backs up the database daily. For manual backups:

```bash
# Create backup
docker-compose exec postgres pg_dump -U tcgadmin tcg_marketplace_prod > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql

# Upload to S3 (if configured)
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://your-backup-bucket/database/
```

### 2. Restore from Backup

```bash
# Stop application
docker-compose stop backend

# Restore database
gunzip -c backup_20250103.sql.gz | docker-compose exec -T postgres psql -U tcgadmin tcg_marketplace_prod

# Restart application
docker-compose start backend
```

### 3. Volume Backups

```bash
# Backup Docker volumes
docker run --rm -v tcg-marketplace_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz /data

# Restore Docker volume
docker run --rm -v tcg-marketplace_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz
```

---

## Scaling

### 1. Horizontal Scaling with Load Balancer

```nginx
# Nginx load balancer configuration
upstream backend_pool {
    least_conn;
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    location /api {
        proxy_pass http://backend_pool;
    }
}
```

### 2. Database Replication

Set up PostgreSQL master-slave replication for read scaling:

```bash
# On master server
# Edit postgresql.conf
wal_level = replica
max_wal_senders = 3

# Create replication user
CREATE ROLE replicator WITH REPLICATION PASSWORD 'repl_password' LOGIN;
```

### 3. Redis Cluster

For high availability, consider Redis Cluster or Redis Sentinel.

---

## Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Check port conflicts
sudo netstat -tulpn | grep :3000
```

**2. Database connection errors**
```bash
# Verify database is running
docker-compose ps postgres

# Test database connection
docker-compose exec postgres psql -U tcgadmin -d tcg_marketplace_prod
```

**3. High memory usage**
```bash
# Check container stats
docker stats

# Restart containers
docker-compose restart
```

**4. SSL certificate issues**
```bash
# Renew certificate
sudo certbot renew

# Test certificate
sudo certbot certificates
```

### Health Checks

```bash
# API health check
curl https://yourdomain.com/api/health

# Database health check
docker-compose exec backend npx prisma db execute --stdin < "SELECT 1;"

# Redis health check
docker-compose exec redis redis-cli ping
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (ufw)
- [ ] Configure fail2ban
- [ ] Set up automatic security updates
- [ ] Enable HTTPS only
- [ ] Configure CSP headers
- [ ] Set up rate limiting
- [ ] Enable database encryption at rest
- [ ] Configure VPC/private networks
- [ ] Set up intrusion detection
- [ ] Regular security audits

---

## Performance Optimization

### 1. Enable CDN

Use Cloudflare or AWS CloudFront for:
- Static asset caching
- DDoS protection
- Global distribution

### 2. Database Optimization

```bash
# Analyze and optimize tables
docker-compose exec postgres psql -U tcgadmin -d tcg_marketplace_prod -c "VACUUM ANALYZE;"

# Reindex
docker-compose exec postgres psql -U tcgadmin -d tcg_marketplace_prod -c "REINDEX DATABASE tcg_marketplace_prod;"
```

### 3. Redis Optimization

```bash
# Monitor Redis performance
docker-compose exec redis redis-cli --latency

# Check memory usage
docker-compose exec redis redis-cli INFO memory
```

---

## Maintenance Windows

Schedule regular maintenance:

1. **Weekly**: Check logs, review metrics
2. **Monthly**: Update dependencies, security patches
3. **Quarterly**: Database optimization, capacity planning

---

## Support & Documentation

- Application logs: `/opt/tcg-marketplace/backend/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u docker`
- Documentation: [GitHub Wiki](https://github.com/yourusername/tcg-marketplace/wiki)

---

**Deployment Complete!** 🎉

Your TCG Marketplace is now running in production. Monitor the application closely during the first 24-48 hours and be prepared to respond to any issues.
