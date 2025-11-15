# User Acceptance Testing (UAT) Environment Setup

This document provides instructions for setting up and managing the UAT environment.

## Overview

The UAT environment is a production-like environment used for:
- User acceptance testing before production deployment
- Stakeholder demos and previews
- Training and onboarding
- Final validation before releases

## Environment Details

| Aspect | Configuration |
|--------|--------------|
| **URL** | https://uat.tcgdojo.com |
| **Database** | PostgreSQL (separate instance) |
| **Redis** | Separate Redis instance |
| **File Storage** | Cloudinary (UAT folder) |
| **Email** | Mailtrap or test email service |
| **Payment** | Stripe Test Mode |
| **Monitoring** | Sentry (UAT project) |

## Prerequisites

- Docker and Docker Compose
- Access to UAT server (SSH)
- Environment variables configured
- Database backup from production (anonymized)

## Setup Instructions

### 1. Infrastructure Setup

```bash
# Create UAT directory
mkdir -p ~/uat-tcgdojo
cd ~/uat-tcgdojo

# Clone repository
git clone https://github.com/HVNTRX101/tcg-dojo.git
cd tcg-dojo

# Checkout UAT branch (or main)
git checkout uat
```

### 2. Environment Configuration

Create `.env.uat` file:

```env
# Environment
NODE_ENV=uat
PORT=3000

# Application
FRONTEND_URL=https://uat.tcgdojo.com
BACKEND_URL=https://api-uat.tcgdojo.com

# Database
DATABASE_URL=postgresql://uat_user:password@uat-db:5432/tcgdojo_uat

# Redis
REDIS_URL=redis://uat-redis:6379

# JWT
JWT_SECRET=uat-secret-change-me
JWT_REFRESH_SECRET=uat-refresh-secret-change-me
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=https://uat.tcgdojo.com

# Email (Mailtrap for UAT)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=mailtrap_user
EMAIL_PASSWORD=mailtrap_password
EMAIL_FROM=noreply@uat.tcgdojo.com

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=tcgdojo-uat
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=uat

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=uat

# Feature Flags (enable all for UAT)
ENABLE_BETA_FEATURES=true

# Database Logging
LOG_DB_QUERIES=true
SLOW_QUERY_THRESHOLD=100

# Security
BCRYPT_ROUNDS=10
```

### 3. Docker Setup

Create `docker-compose.uat.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "5173:80"
    environment:
      - VITE_API_BASE_URL=https://api-uat.tcgdojo.com/api
    networks:
      - uat-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.uat
    depends_on:
      - postgres
      - redis
    networks:
      - uat-network
    volumes:
      - ./backend/logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tcgdojo_uat
      POSTGRES_USER: uat_user
      POSTGRES_PASSWORD: change_me
    ports:
      - "5432:5432"
    volumes:
      - uat-postgres-data:/var/lib/postgresql/data
    networks:
      - uat-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - uat-redis-data:/data
    networks:
      - uat-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.uat.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - uat-network

networks:
  uat-network:
    driver: bridge

volumes:
  uat-postgres-data:
  uat-redis-data:
```

### 4. Database Setup

```bash
# Start PostgreSQL
docker-compose -f docker-compose.uat.yml up -d postgres

# Wait for PostgreSQL to be ready
sleep 5

# Run migrations
cd backend
npx prisma migrate deploy

# Seed with test data
npm run seed:uat
```

### 5. Deploy Application

```bash
# Build and start all services
docker-compose -f docker-compose.uat.yml up -d

# Verify deployment
docker-compose -f docker-compose.uat.yml ps

# Check logs
docker-compose -f docker-compose.uat.yml logs -f
```

### 6. SSL/TLS Setup

```bash
# Install certbot
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d uat.tcgdojo.com

# Copy certificates
sudo cp /etc/letsencrypt/live/uat.tcgdojo.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/uat.tcgdojo.com/privkey.pem ./ssl/

# Set permissions
sudo chmod 644 ./ssl/*.pem
```

## Test Data

### Create Test Users

```sql
-- Admin user
INSERT INTO users (id, email, password, name, role, is_verified)
VALUES (
  gen_random_uuid(),
  'admin@uat.tcgdojo.com',
  '$2b$10$hashed_password',
  'UAT Admin',
  'ADMIN',
  true
);

-- Regular user
INSERT INTO users (id, email, password, name, role, is_verified)
VALUES (
  gen_random_uuid(),
  'user@uat.tcgdojo.com',
  '$2b$10$hashed_password',
  'UAT User',
  'USER',
  true
);

-- Seller user
INSERT INTO users (id, email, password, name, role, is_verified)
VALUES (
  gen_random_uuid(),
  'seller@uat.tcgdojo.com',
  '$2b$10$hashed_password',
  'UAT Seller',
  'SELLER',
  true
);
```

### Load Sample Products

```bash
npm run seed:products -- --count=100
```

### Generate Test Orders

```bash
npm run seed:orders -- --count=50
```

## Access Credentials

Document test credentials (store securely):

```
Admin Account:
Email: admin@uat.tcgdojo.com
Password: UAT_Admin_2024

Regular User:
Email: user@uat.tcgdojo.com
Password: UAT_User_2024

Seller Account:
Email: seller@uat.tcgdojo.com
Password: UAT_Seller_2024

Stripe Test Cards:
4242 4242 4242 4242 (Success)
4000 0000 0000 9995 (Decline)
4000 0025 0000 3155 (3D Secure)
```

## UAT Workflows

### 1. Smoke Testing

```bash
# Run automated smoke tests
npm run test:smoke -- --env=uat

# Manual checks:
# - Homepage loads
# - Login works
# - Product listing works
# - Search works
# - Cart works
# - Checkout works (test mode)
```

### 2. Regression Testing

```bash
# Run full test suite
npm run test:regression -- --env=uat

# Check critical paths:
# - User registration
# - Product purchase
# - Order tracking
# - Profile updates
# - Seller dashboard
```

### 3. User Acceptance Testing

Create test scenarios:

```markdown
Test Scenario: Product Purchase Flow
1. Browse products
2. Add product to cart
3. View cart
4. Proceed to checkout
5. Enter shipping address
6. Enter payment (test card)
7. Complete order
8. Receive confirmation email
9. Track order status

Expected Results:
- All steps complete successfully
- Order appears in order history
- Email received
- Order tracking works
```

### 4. Performance Testing

```bash
# Run load tests against UAT
k6 run --env BASE_URL=https://api-uat.tcgdojo.com loadtests/product-api.test.js

# Monitor performance
# - Response times < 1s
# - No errors
# - Database performance acceptable
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://api-uat.tcgdojo.com/health

# Database health
curl https://api-uat.tcgdojo.com/api/database/health
```

### Logs

```bash
# Application logs
docker-compose -f docker-compose.uat.yml logs -f backend

# Database logs
docker-compose -f docker-compose.uat.yml logs -f postgres

# Nginx logs
docker-compose -f docker-compose.uat.yml logs -f nginx
```

### Metrics

- Sentry Dashboard: https://sentry.io/organizations/tcgdojo/projects/uat
- Application Logs: `/backend/logs/`
- Database Metrics: Grafana dashboard

## Data Management

### Reset UAT Environment

```bash
# Stop all services
docker-compose -f docker-compose.uat.yml down

# Remove volumes (WARNING: Data loss)
docker volume rm uat-postgres-data uat-redis-data

# Restart and reseed
docker-compose -f docker-compose.uat.yml up -d
npm run seed:uat
```

### Sync from Production

```bash
# Export production data (anonymized)
npm run export:prod -- --anonymize

# Import to UAT
npm run import:uat -- --file=prod-export-anonymized.sql

# Run migrations
npx prisma migrate deploy
```

### Data Anonymization

```javascript
// scripts/anonymize-data.js
await prisma.user.updateMany({
  data: {
    email: prisma.$raw`CONCAT('user', id, '@uat.example.com')`,
    password: '$2b$10$default_test_password',
    phone: '555-0000',
  },
});
```

## Maintenance

### Update UAT Environment

```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install
cd backend && npm install

# Run migrations
npx prisma migrate deploy

# Rebuild and restart
docker-compose -f docker-compose.uat.yml up -d --build
```

### Backup UAT Data

```bash
# Automated daily backups
0 2 * * * /usr/local/bin/backup-uat.sh

# backup-uat.sh
#!/bin/bash
docker exec uat-postgres pg_dump -U uat_user tcgdojo_uat > \
  /backups/uat-$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

**Can't connect to database:**
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.uat.yml ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec -it uat-postgres psql -U uat_user -d tcgdojo_uat
```

**502 Bad Gateway:**
```bash
# Check backend is running
docker-compose -f docker-compose.uat.yml ps backend

# Check logs
docker-compose -f docker-compose.uat.yml logs backend

# Restart backend
docker-compose -f docker-compose.uat.yml restart backend
```

**Slow performance:**
```bash
# Check resource usage
docker stats

# Check database performance
curl https://api-uat.tcgdojo.com/api/database/slow-queries

# Scale up if needed
docker-compose -f docker-compose.uat.yml up -d --scale backend=2
```

## Best Practices

1. **Keep UAT in sync with production**
   - Same versions
   - Same configuration (where applicable)
   - Similar data volume

2. **Use realistic test data**
   - Production-like data (anonymized)
   - Sufficient volume for performance testing

3. **Automate testing**
   - Smoke tests after each deployment
   - Regression tests weekly
   - Performance tests monthly

4. **Document test scenarios**
   - Maintain test case library
   - Update with new features
   - Track test results

5. **Control access**
   - Only authorized users
   - Separate credentials from production
   - Monitor usage

## UAT Checklist

Before releasing to production:

- [ ] All UAT tests passed
- [ ] Performance acceptable
- [ ] No critical bugs
- [ ] Stakeholder sign-off
- [ ] Documentation updated
- [ ] Training completed
- [ ] Rollback plan ready

## Support

For UAT environment issues:
- Email: uat-support@tcgdojo.com
- Slack: #uat-environment
- Documentation: https://wiki.tcgdojo.com/uat
