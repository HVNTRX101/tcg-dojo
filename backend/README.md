# TCG Marketplace Backend

Backend API server for the TCG Marketplace application.

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb tcg_marketplace

# Or using psql
psql -U postgres
CREATE DATABASE tcg_marketplace;
```

4. Generate Prisma Client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the database with sample data:
```bash
npm run seed
```

## Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Test Accounts

After seeding, you can use these accounts:

- **User**: john@example.com / password123
- **Seller**: seller@example.com / password123
- **Admin**: admin@example.com / password123

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile (authenticated)

### Products
- `GET /api/products` - Get all products (with filters and pagination)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (seller/admin only)
- `PUT /api/products/:id` - Update product (seller/admin only)
- `DELETE /api/products/:id` - Delete product (seller/admin only)

### Cart
- `GET /api/cart` - Get user cart (authenticated)
- `POST /api/cart` - Add item to cart (authenticated)
- `PUT /api/cart/:itemId` - Update cart item quantity (authenticated)
- `DELETE /api/cart/:itemId` - Remove item from cart (authenticated)
- `DELETE /api/cart` - Clear cart (authenticated)

## Database Management

### View database in Prisma Studio:
```bash
npm run prisma:studio
```

### Create new migration:
```bash
npm run prisma:migrate
```

### Reset database:
```bash
npx prisma migrate reset
```

## Building for Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Security**: Helmet, bcrypt
