# TCG Marketplace Backend

Backend API for the TCG Marketplace application, built with Express.js, TypeScript, Prisma ORM, and PostgreSQL/SQLite.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (production) or SQLite (development)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/controllers/__tests__/productController.test.ts
```

## 🚨 Important: Prisma Setup

If you encounter errors like:
```
Error: Failed to fetch the engine file at https://binaries.prisma.sh/... - 403 Forbidden
```

**Quick Solution:**
```bash
# Use our automated setup script
./scripts/setup-and-test.sh
```

**Or refer to:** [PRISMA_SETUP_GUIDE.md](./PRISMA_SETUP_GUIDE.md) for comprehensive troubleshooting.

## 📚 Documentation

- **[PRISMA_SETUP_GUIDE.md](./PRISMA_SETUP_GUIDE.md)** - Complete guide for setting up Prisma in various environments
- **[BACKEND_TESTING_STATUS.md](./BACKEND_TESTING_STATUS.md)** - Testing coverage status and roadmap

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (database, env, etc.)
│   ├── controllers/     # Request handlers
│   │   └── __tests__/   # Controller integration tests
│   ├── middleware/      # Express middleware (auth, validation, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   │   └── __tests__/   # Service unit tests
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── server.ts        # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── dev.db          # SQLite database (development)
├── scripts/             # Utility scripts
│   └── setup-and-test.sh  # Automated setup and test runner
├── jest.config.js       # Jest configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests in CI mode

### Database (Prisma)
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run seed` - Seed database with sample data

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Testing Architecture

### Stack
- **Framework:** Jest 30.2.0 with ts-jest
- **HTTP Testing:** Supertest 7.1.4
- **Database:** Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Coverage Target:** 70%

### Current Status
- **Controllers tested:** 4 / 26 (15%)
- **Total tests:** 64+

See [BACKEND_TESTING_STATUS.md](./BACKEND_TESTING_STATUS.md) for complete status.

### Test Data Factory

Use the `TestDataFactory` to create test data:

```typescript
const factory = new TestDataFactory(prisma);

// Create test user
const user = await factory.createUser({
  email: 'test@example.com',
  role: 'USER'
});

// Create test product
const product = await factory.createProduct(sellerId, {
  name: 'Black Lotus',
  price: 10000
});

// Cleanup
await factory.cleanup();
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - List products (with filtering, search, pagination)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)

### Orders
- `POST /api/orders` - Create order from cart
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item quantity
- `DELETE /api/cart/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

For complete API documentation, run:
```bash
npm run dev
# Visit http://localhost:3000/api-docs
```

## Environment Variables

Create a `.env` file in the backend directory:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"  # SQLite (dev)
# DATABASE_URL="postgresql://user:password@localhost:5432/tcg_marketplace"  # PostgreSQL (prod)

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3000
NODE_ENV="development"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# Cloudinary (Optional - for image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

## Seed Data

After seeding, you can use these test accounts:

- **User**: john@example.com / password123
- **Seller**: seller@example.com / password123
- **Admin**: admin@example.com / password123

```bash
npm run seed
```

## Troubleshooting

### Common Issues

#### 1. Prisma Client Generation Fails
**Error:** `Failed to fetch the engine file at https://binaries.prisma.sh/...`

**Solution:** See [PRISMA_SETUP_GUIDE.md](./PRISMA_SETUP_GUIDE.md)

#### 2. Database Connection Error
**Error:** `Can't reach database server`

**Solution:**
```bash
# For SQLite
ls -la prisma/dev.db  # Check if database exists
npx prisma migrate dev  # Create/migrate database

# For PostgreSQL
# Ensure PostgreSQL is running
sudo service postgresql start
```

#### 3. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

## Production Deployment

### Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# (Optional) Seed production data
npm run seed
```

### Build and Start

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL / SQLite
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Payment**: Stripe
- **Security**: Helmet, bcrypt, rate limiting

## License

MIT

## Support

For issues and questions:
- Setup Help: [PRISMA_SETUP_GUIDE.md](./PRISMA_SETUP_GUIDE.md)
- Testing Guide: [BACKEND_TESTING_STATUS.md](./BACKEND_TESTING_STATUS.md)
