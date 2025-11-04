# Product Listing Application - Gap Analysis & Development Plan

## Executive Summary

This Product Listing Application is a **frontend-only** React-based TCG (Trading Card Game) marketplace. While the frontend is comprehensive and feature-rich, **there is NO backend implementation** currently. The application is configured to connect to a backend API but all endpoints are currently non-functional.

---

## Critical Finding: Missing Backend

### Current State
- ❌ **NO backend server exists**
- ❌ **NO database implementation**
- ❌ **NO API endpoints are functional**
- ✅ Frontend is fully built and ready
- ✅ Frontend expects backend at `http://localhost:3000/api`
- ✅ All service layer interfaces are defined

### Impact
The application currently has:
- Mock data only (MOCK_CARDS in frontend)
- Non-functional authentication
- No real cart persistence
- No actual payment processing
- No database for products, users, orders, etc.

---

## Part 1: Missing Backend Elements

### 1.1 Core Backend Infrastructure (CRITICAL)

#### Server & Framework
**Missing:**
- Node.js/Express backend server (or alternative: NestJS, Fastify, Koa)
- Server entry point and configuration
- CORS configuration for frontend communication
- Environment variable management
- Middleware setup (body parser, compression, security headers)
- Request logging and monitoring
- Rate limiting and DDoS protection
- Health check endpoints

**Recommendation:** Start with Express.js for simplicity and compatibility

#### Database
**Missing:**
- Database system (PostgreSQL recommended for relational data)
- Database schema and migrations
- ORM/Query Builder (Prisma, TypeORM, or Sequelize)
- Database connection pooling
- Backup and recovery strategy
- Database seeding scripts

**Tables Needed:**
- `users` - User accounts
- `products` - Product/card listings
- `games` - Game information
- `sets` - Card sets per game
- `carts` - Shopping carts
- `cart_items` - Items in carts
- `orders` - Order history
- `order_items` - Items in orders
- `collections` - User card collections
- `collection_items` - Items in collections
- `wishlists` - User wishlists
- `sellers` - Seller profiles
- `reviews` - Product/seller reviews
- `coupons` - Discount codes
- `price_history` - Historical pricing data
- `follows` - User-seller follows
- `addresses` - Shipping addresses
- `reports` - Seller/product reports

### 1.2 Authentication & Authorization (CRITICAL)

**Missing:**
- JWT token generation and validation
- Password hashing (bcrypt/argon2)
- User registration endpoint implementation
- Login endpoint implementation
- Token refresh mechanism
- Email verification system
- Password reset flow with tokens
- Session management
- Role-based access control (RBAC)
- OAuth integration (Google, Facebook, etc.)
- Two-factor authentication (2FA)
- Account lockout after failed attempts
- Security audit logging

### 1.3 Product Management APIs

**Missing:**
- Product CRUD operations
- Product search with full-text search (Elasticsearch recommended)
- Advanced filtering (game, set, rarity, condition, finish, price range)
- Pagination implementation
- Product image upload and storage
- Image optimization and CDN integration
- Related products algorithm
- Product listing by seller
- Multiple seller listings per product
- Product availability tracking
- Low stock notifications

### 1.4 Cart & Order Management

**Missing:**
- Cart persistence (database-backed)
- Cart item operations (add, update, remove, clear)
- Cart session management
- Cart abandonment tracking
- Coupon validation and application
- Discount calculation engine
- Tax calculation service
- Shipping cost calculation
- Order creation from cart
- Order status management
- Order history retrieval
- Order tracking integration
- Order cancellation logic
- Inventory deduction on order
- Order confirmation emails

### 1.5 Payment Processing (CRITICAL)

**Missing:**
- Payment gateway integration (Stripe/PayPal)
- Payment intent creation
- Payment verification
- Refund processing
- Payment failure handling
- PCI compliance measures
- Payment method storage (tokenized)
- Split payments for multiple sellers
- Payout system for sellers
- Transaction history
- Invoice generation

### 1.6 Collection Management

**Missing:**
- Collection CRUD operations
- Collection statistics calculation
- Import collection (CSV/JSON parsing)
- Export collection (CSV/JSON generation)
- Wishlist management
- Collection value tracking
- Collection sharing features
- Duplicate detection

### 1.7 Seller Management

**Missing:**
- Seller profile management
- Seller verification system
- Seller ratings and reviews
- Seller statistics aggregation
- Seller follow/unfollow logic
- Seller messaging system
- Seller dashboard
- Seller analytics
- Seller payout management
- Seller fee calculation
- Report seller functionality
- Seller suspension/ban system

### 1.8 Review & Rating System

**Missing:**
- Review CRUD operations
- Rating calculation and aggregation
- Review moderation
- Verified purchase badges
- Review helpfulness voting
- Review reporting
- Automated review solicitation

### 1.9 Search & Recommendations

**Missing:**
- Full-text search engine (Elasticsearch/Algolia)
- Search query parsing
- Fuzzy matching for typos
- Search analytics
- Recommendation engine
- Collaborative filtering
- Recently viewed tracking
- Trending products algorithm
- Personalized recommendations

### 1.10 Notification System

**Missing:**
- Email service integration (SendGrid/AWS SES)
- Email templates
- Transactional emails (order confirmation, shipping, etc.)
- Marketing emails
- Push notification system
- In-app notifications
- SMS notifications (Twilio)
- Notification preferences management
- Email queue and retry logic

### 1.11 File Storage & CDN

**Missing:**
- File upload handling (multer/formidable)
- Cloud storage integration (AWS S3/Cloudinary)
- Image processing (sharp/jimp)
- Thumbnail generation
- CDN integration
- File validation and security
- Asset management

### 1.12 Analytics & Reporting

**Missing:**
- Analytics data collection
- Sales reports
- Inventory reports
- User behavior tracking
- Revenue analytics
- Seller performance reports
- Dashboard metrics aggregation
- Export reports functionality

### 1.13 Admin Panel Backend

**Missing:**
- Admin authentication and permissions
- User management APIs
- Product moderation
- Order management
- Seller management
- Review moderation
- Report handling
- System configuration
- Analytics dashboard APIs
- Bulk operations

### 1.14 API Documentation

**Missing:**
- OpenAPI/Swagger documentation
- API versioning strategy
- Postman collections
- Developer documentation
- API changelog

### 1.15 Testing Infrastructure

**Missing:**
- Unit tests for services
- Integration tests for APIs
- End-to-end tests
- Test database setup
- Test fixtures and factories
- Code coverage reporting
- CI/CD pipeline configuration

### 1.16 Security Features

**Missing:**
- Input validation (Joi/Yup)
- SQL injection prevention
- XSS protection
- CSRF tokens
- Security headers (helmet.js)
- API rate limiting
- Request sanitization
- Sensitive data encryption
- Security audit logging
- Vulnerability scanning
- Penetration testing

### 1.17 Performance & Scalability

**Missing:**
- Caching layer (Redis)
- Query optimization
- Database indexing strategy
- Load balancing setup
- Horizontal scaling configuration
- Background job processing (Bull/Agenda)
- WebSocket server (for real-time features)
- API response compression
- Connection pooling

### 1.18 Monitoring & Logging

**Missing:**
- Application logging (Winston/Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic/Datadog)
- Log aggregation (ELK stack)
- Alerting system
- Uptime monitoring
- Database monitoring
- API metrics

### 1.19 DevOps & Deployment

**Missing:**
- Docker configuration
- Docker Compose setup
- Production environment setup
- Staging environment
- CI/CD pipeline (GitHub Actions/Jenkins)
- Automated deployment
- Database migration scripts
- Backup automation
- SSL certificate management
- Environment variable management

---

## Part 2: Missing Frontend Elements

### 2.1 Payment Integration UI (CRITICAL)

**Missing:**
- Stripe/PayPal payment form integration
- Credit card input components
- Payment method selection
- Saved payment methods display
- 3D Secure authentication UI
- Payment success/failure pages
- Invoice display
- Payment history page

### 2.2 Order Management UI

**Missing:**
- Order history page
- Order details page
- Order tracking page
- Order cancellation UI
- Reorder functionality
- Invoice download
- Print order functionality

### 2.3 Review & Rating UI

**Missing:**
- Product review form
- Review display component
- Review filtering and sorting
- Seller review page
- Review images upload
- Review editing
- Review reporting UI
- Helpful/not helpful voting

### 2.4 Messaging System

**Missing:**
- Seller messaging interface
- Message inbox
- Message composition
- Real-time chat (WebSocket)
- Message notifications
- Message history
- Attachment support

### 2.5 Advanced Search Features

**Missing:**
- Search suggestions/autocomplete
- Search history
- Saved searches
- Advanced search filters UI
- Search within results
- Visual search (image-based)

### 2.6 User Settings & Preferences

**Missing:**
- Notification preferences UI
- Privacy settings
- Email preferences
- Shipping addresses management
- Payment methods management
- Account deletion
- Data export (GDPR compliance)
- Language preferences
- Currency preferences

### 2.7 Seller Dashboard

**Missing:**
- Seller analytics dashboard
- Sales metrics charts
- Inventory management UI
- Product listing management
- Order fulfillment interface
- Payout history
- Customer messages
- Performance metrics

### 2.8 Admin Panel Frontend

**Missing:**
- Admin dashboard
- User management interface
- Product moderation UI
- Order management
- Seller management
- Report handling UI
- System configuration
- Analytics reports
- Content management

### 2.9 Social Features

**Missing:**
- User profiles (public view)
- Following/followers list
- Activity feed
- Social sharing buttons
- Community forums
- User-generated content

### 2.10 Mobile Optimization

**Missing:**
- Mobile-specific navigation
- Touch gesture support
- Mobile payment optimization
- Progressive Web App (PWA) features
- Offline mode
- App-like experience

### 2.11 Accessibility Features

**Missing:**
- ARIA labels audit
- Keyboard navigation improvements
- Screen reader optimization
- High contrast mode
- Font size adjustments
- Focus indicators
- Alt text for all images

### 2.12 Error Handling Improvements

**Missing:**
- User-friendly error messages
- Network error recovery
- Offline detection and messaging
- Retry mechanisms UI
- Error reporting UI for users

### 2.13 Performance Features

**Missing:**
- Image lazy loading improvements
- Virtual scrolling for long lists
- Service worker for caching
- Code splitting optimization
- Bundle size analysis

### 2.14 Marketing & SEO

**Missing:**
- SEO meta tags
- Open Graph tags
- Structured data (JSON-LD)
- Sitemap generation
- robots.txt
- Landing pages
- Marketing banners
- Promotional content
- Blog/news section
- Newsletter signup

### 2.15 Help & Support

**Missing:**
- FAQ page
- Help center
- Contact form
- Live chat widget
- Ticket system UI
- Video tutorials
- Onboarding flow
- Feature announcements

---

## Part 3: Security & Compliance Gaps

### 3.1 Security Vulnerabilities

**Current Issues:**
- Token stored in localStorage (XSS vulnerable) - Should use httpOnly cookies
- No CSRF protection
- No rate limiting on frontend
- No input sanitization visible
- Error messages may expose sensitive info

### 3.2 Compliance Requirements

**Missing:**
- GDPR compliance (EU)
  - Cookie consent banner
  - Privacy policy
  - Terms of service
  - Data export functionality
  - Right to deletion
  - Data breach notification
- CCPA compliance (California)
- PCI DSS compliance (payment handling)
- ADA compliance (accessibility)
- Age verification (if applicable)

### 3.3 Legal Pages

**Missing:**
- Privacy Policy
- Terms of Service
- Cookie Policy
- Refund Policy
- Shipping Policy
- DMCA Policy
- Community Guidelines

---

## Part 4: Data & Business Logic Gaps

### 4.1 Inventory Management

**Missing:**
- Real-time inventory tracking
- Stock reservations during checkout
- Overselling prevention
- Low stock alerts
- Inventory forecasting

### 4.2 Pricing Logic

**Missing:**
- Dynamic pricing engine
- Bulk discount rules
- Promotional pricing
- Price drop alerts
- Price matching

### 4.3 Shipping & Fulfillment

**Missing:**
- Multiple shipping methods
- Shipping carrier integration
- Shipping label generation
- Package tracking
- International shipping
- Shipping insurance
- Split shipments

### 4.4 Multi-seller Marketplace Logic

**Missing:**
- Seller commission calculation
- Multi-seller cart splitting
- Seller payout schedules
- Dispute resolution system
- Seller performance tracking
- Seller onboarding flow

### 4.5 Internationalization

**Missing:**
- Multi-language support (i18n)
- Currency conversion
- Regional pricing
- Localized content
- International tax handling
- Multi-region deployment

---

## Part 5: Testing Gaps

### 5.1 Frontend Testing

**Missing:**
- Unit tests for components
- Integration tests for pages
- E2E tests (Playwright/Cypress)
- Visual regression tests
- Accessibility tests
- Performance tests
- Mobile testing suite

### 5.2 Backend Testing (when built)

**Missing:**
- API endpoint tests
- Database integration tests
- Authentication tests
- Authorization tests
- Payment processing tests
- Load tests
- Security tests

---

## Part 6: Development Roadmap

### Phase 0: Foundation (Week 1-2) - IMMEDIATE PRIORITY

**Goal:** Get basic backend running with core features

#### Tasks:
1. **Backend Setup**
   - Initialize Node.js/Express project
   - Set up project structure
   - Configure TypeScript
   - Install core dependencies
   - Create .env configuration
   - Set up error handling middleware
   - Configure CORS

2. **Database Setup**
   - Install and configure PostgreSQL
   - Set up Prisma ORM
   - Design database schema
   - Create initial migrations
   - Set up connection pooling
   - Create seed data scripts

3. **Authentication Foundation**
   - Implement JWT generation/validation
   - Create password hashing utilities
   - Build login endpoint
   - Build signup endpoint
   - Build token refresh endpoint
   - Create auth middleware
   - Test authentication flow

4. **Basic Product APIs**
   - Create product model
   - Build GET /products endpoint
   - Build GET /products/:id endpoint
   - Implement basic filtering
   - Add pagination
   - Test with frontend

5. **Development Environment**
   - Set up nodemon for development
   - Create development seed data
   - Configure debugging
   - Set up API testing (Postman/Insomnia)

**Deliverables:**
- Functional backend server
- Working database with schema
- User authentication
- Basic product listing
- Frontend can connect and fetch data

---

### Phase 1: Core E-commerce (Week 3-4)

**Goal:** Enable end-to-end shopping experience

#### Tasks:
1. **Cart System**
   - Implement cart database models
   - Build cart APIs (add, update, remove)
   - Cart persistence
   - Cart sync functionality
   - Test cart operations

2. **Order Management**
   - Create order models
   - Build order creation endpoint
   - Order history APIs
   - Order status management
   - Inventory deduction logic

3. **Payment Integration**
   - Set up Stripe account
   - Implement payment intent creation
   - Build payment verification
   - Handle payment webhooks
   - Test payment flow

4. **Email System**
   - Configure email service (SendGrid)
   - Create email templates
   - Order confirmation emails
   - Email verification
   - Password reset emails

5. **Product Management**
   - Advanced filtering
   - Search functionality
   - Related products
   - Price history tracking
   - Product images upload

**Deliverables:**
- Complete shopping flow
- Payment processing
- Order management
- Email notifications
- Enhanced product features

---

### Phase 2: Marketplace Features (Week 5-6)

**Goal:** Enable multi-seller marketplace

#### Tasks:
1. **Seller System**
   - Seller profile models
   - Seller registration
   - Seller dashboard APIs
   - Seller product management
   - Seller statistics

2. **Review & Rating**
   - Review models
   - Review CRUD APIs
   - Rating aggregation
   - Review moderation
   - Verified purchase logic

3. **Collection Management**
   - Collection models
   - Collection CRUD APIs
   - Import/export functionality
   - Wishlist features
   - Collection statistics

4. **Advanced Search**
   - Implement Elasticsearch
   - Full-text search
   - Search autocomplete
   - Search analytics
   - Trending products

5. **Seller Features UI**
   - Seller profile page enhancements
   - Review display components
   - Seller dashboard UI
   - Product listing management UI

**Deliverables:**
- Multi-seller marketplace
- Review system
- Collection tracking
- Advanced search
- Seller tools

---

### Phase 3: Enhanced UX (Week 7-8)

**Goal:** Improve user experience and engagement

#### Tasks:
1. **Messaging System**
   - Message models
   - Messaging APIs
   - Real-time chat (WebSocket)
   - Message UI components
   - Notification system

2. **User Features**
   - User settings page
   - Address management
   - Payment methods management
   - Order history page
   - Order tracking page

3. **Social Features**
   - Follow system
   - Activity feed
   - Social sharing
   - Public user profiles
   - Favorites/likes

4. **Notifications**
   - In-app notifications
   - Push notifications
   - Email preferences
   - SMS notifications
   - Notification center UI

5. **Mobile Optimization**
   - Responsive refinements
   - Touch gestures
   - Mobile navigation
   - PWA features
   - Offline mode

**Deliverables:**
- Messaging system
- Enhanced user management
- Social features
- Comprehensive notifications
- Mobile-optimized experience

---

### Phase 4: Admin & Analytics (Week 9-10)

**Goal:** Build administration and analytics capabilities

#### Tasks:
1. **Admin Backend**
   - Admin authentication
   - User management APIs
   - Product moderation APIs
   - Order management APIs
   - System configuration APIs

2. **Admin Frontend**
   - Admin dashboard UI
   - User management interface
   - Product moderation UI
   - Order management UI
   - Analytics reports UI

3. **Analytics System**
   - Analytics data collection
   - Sales reports
   - User behavior tracking
   - Revenue analytics
   - Dashboard metrics

4. **Seller Dashboard**
   - Sales analytics
   - Inventory management
   - Order fulfillment
   - Payout tracking
   - Performance metrics

5. **Reporting**
   - Report generation
   - Export functionality
   - Scheduled reports
   - Custom report builder
   - Report templates

**Deliverables:**
- Complete admin panel
- Analytics system
- Seller dashboard
- Reporting tools
- System monitoring

---

### Phase 5: Security & Performance (Week 11-12)

**Goal:** Harden security and optimize performance

#### Tasks:
1. **Security Hardening**
   - Input validation implementation
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Security headers
   - Rate limiting
   - Security audit

2. **Performance Optimization**
   - Redis caching implementation
   - Database query optimization
   - Index optimization
   - API response compression
   - CDN integration
   - Image optimization

3. **Testing Suite**
   - Unit tests (backend)
   - API integration tests
   - Frontend component tests
   - E2E tests (Cypress)
   - Load testing
   - Security testing

4. **Monitoring & Logging**
   - Application logging
   - Error tracking (Sentry)
   - Performance monitoring
   - Log aggregation
   - Alerting system

5. **Legal & Compliance**
   - Privacy policy
   - Terms of service
   - Cookie consent
   - GDPR compliance
   - Accessibility improvements

**Deliverables:**
- Hardened security
- Optimized performance
- Comprehensive testing
- Production monitoring
- Legal compliance

---

### Phase 6: Scale & Polish (Week 13-14)

**Goal:** Prepare for production and scale

#### Tasks:
1. **DevOps & Deployment**
   - Docker containerization
   - CI/CD pipeline
   - Production environment setup
   - Staging environment
   - Database backup automation
   - SSL configuration

2. **Scalability**
   - Load balancing setup
   - Horizontal scaling
   - Database replication
   - Background job processing
   - Message queue (RabbitMQ/SQS)

3. **Advanced Features**
   - Advanced recommendation engine
   - AI-powered search
   - Fraud detection
   - Automated customer support
   - Loyalty program

4. **Marketing & SEO**
   - SEO optimization
   - Meta tags
   - Sitemap
   - Blog system
   - Newsletter system
   - Landing pages

5. **Help & Support**
   - FAQ page
   - Help center
   - Contact form
   - Live chat
   - Tutorial videos
   - Onboarding flow

**Deliverables:**
- Production-ready deployment
- Scalable infrastructure
- Advanced features
- Marketing tools
- Support system

---

## Part 7: Technology Stack Recommendations

### Backend

**Core:**
- **Runtime:** Node.js 20+ LTS
- **Framework:** Express.js 4.x (or NestJS for enterprise)
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 5.x
- **Cache:** Redis 7.x

**Authentication:**
- **JWT:** jsonwebtoken
- **Password:** bcrypt or argon2
- **OAuth:** Passport.js

**Payment:**
- **Gateway:** Stripe (primary), PayPal (secondary)

**Email:**
- **Service:** SendGrid or AWS SES
- **Templates:** Handlebars or MJML

**File Storage:**
- **Service:** AWS S3 or Cloudinary
- **Processing:** Sharp (image processing)

**Search:**
- **Engine:** Elasticsearch or Algolia

**Real-time:**
- **WebSocket:** Socket.io

**Background Jobs:**
- **Queue:** Bull (Redis-based)

**Testing:**
- **Framework:** Jest
- **API Testing:** Supertest
- **E2E:** Playwright

**Monitoring:**
- **Errors:** Sentry
- **Logs:** Winston + ELK stack
- **APM:** New Relic or Datadog

**DevOps:**
- **Containers:** Docker
- **Orchestration:** Docker Compose (dev) / Kubernetes (prod)
- **CI/CD:** GitHub Actions
- **Hosting:** AWS, Google Cloud, or DigitalOcean

### Frontend (Already Implemented)

- React 18.3.1 ✅
- TypeScript ✅
- Vite ✅
- React Query ✅
- Tailwind CSS ✅
- Radix UI ✅

---

## Part 8: Cost Estimates

### Development Costs (Solo Developer)

**Assuming 40 hours/week:**
- Phase 0: 80 hours (2 weeks)
- Phase 1: 80 hours (2 weeks)
- Phase 2: 80 hours (2 weeks)
- Phase 3: 80 hours (2 weeks)
- Phase 4: 80 hours (2 weeks)
- Phase 5: 80 hours (2 weeks)
- Phase 6: 80 hours (2 weeks)

**Total: 560 hours (14 weeks / ~3.5 months)**

### Infrastructure Costs (Monthly)

**Development Environment:**
- Database (PostgreSQL): $0 (local)
- Redis: $0 (local)
- Email: $0 (SendGrid free tier)
- Storage: $0 (local)
- **Total: $0/month**

**Production Environment (Small Scale):**
- Server (2 vCPU, 4GB RAM): $20-40
- Database (managed PostgreSQL): $15-30
- Redis (managed): $10-20
- Email (SendGrid): $15-20 (up to 50k emails)
- Storage (AWS S3): $5-10
- CDN (CloudFlare): $0-20
- Monitoring (Sentry): $0-26
- Search (Algolia): $0 (free tier for small scale)
- Payment processing: 2.9% + $0.30 per transaction
- **Total: ~$65-166/month + transaction fees**

**Production Environment (Medium Scale):**
- Server (4 vCPU, 8GB RAM): $80-160
- Database: $50-100
- Redis: $30-60
- Email: $50-100
- Storage + CDN: $50-100
- Monitoring: $50-100
- Search: $50-100
- **Total: ~$360-720/month + transaction fees**

---

## Part 9: Risk Assessment

### High Risk

1. **No Backend** - Application is non-functional without it
2. **Payment Security** - PCI compliance is critical
3. **Data Loss** - No backup strategy yet
4. **Authentication Vulnerabilities** - Tokens in localStorage

### Medium Risk

1. **Scalability** - No load testing yet
2. **Search Performance** - No search engine implemented
3. **Email Deliverability** - No email service configured
4. **Legal Compliance** - No GDPR/privacy policies

### Low Risk

1. **Mobile Experience** - Frontend is responsive
2. **UI/UX** - Modern component library used
3. **Code Quality** - TypeScript provides type safety

---

## Part 10: Success Metrics (KPIs)

### Technical Metrics

- API response time < 200ms (p95)
- Page load time < 2s
- Uptime > 99.9%
- Error rate < 0.1%
- Test coverage > 80%

### Business Metrics

- Conversion rate
- Average order value
- Cart abandonment rate
- User retention rate
- Seller growth rate
- Revenue per user

---

## Conclusion

This Product Listing Application has a **solid frontend foundation** but requires **complete backend development** to become functional. The roadmap prioritizes:

1. **Foundation** - Get basic backend running (2 weeks)
2. **Core E-commerce** - Enable shopping and payment (2 weeks)
3. **Marketplace** - Add seller and collection features (2 weeks)
4. **Enhanced UX** - Improve user experience (2 weeks)
5. **Admin & Analytics** - Build management tools (2 weeks)
6. **Security & Performance** - Harden and optimize (2 weeks)
7. **Scale & Polish** - Prepare for production (2 weeks)

**Estimated Timeline: 14 weeks (3.5 months) for full implementation**

The most critical priority is **Phase 0** - establishing the backend foundation. Without it, the frontend cannot function beyond displaying mock data.
