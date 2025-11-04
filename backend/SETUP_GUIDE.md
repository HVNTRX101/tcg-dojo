# Backend Setup Guide

## Phase 0 Implementation - Complete! ✅

All Phase 0 backend files have been created successfully. Now you need to set up the database and run the server.

## Option 1: Quick Start with SQLite (Recommended for Development)

If you want to get started quickly without installing PostgreSQL:

1. Update `backend/prisma/schema.prisma` - change the datasource:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

2. Update `backend/.env` - change DATABASE_URL:
```env
DATABASE_URL="file:./dev.db"
```

3. Run migrations and seed:
```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

4. Start the server:
```bash
npm run dev
```

## Option 2: Full Setup with PostgreSQL (Production-Ready)

### Step 1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is 5432

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

**Windows (using pgAdmin or Command Prompt):**
```bash
# Using psql command line
psql -U postgres
# Then in psql:
CREATE DATABASE tcg_marketplace;
\q
```

**macOS/Linux:**
```bash
# Create database
createdb tcg_marketplace

# Or using psql:
psql -U postgres
CREATE DATABASE tcg_marketplace;
\q
```

### Step 3: Update Database Connection

Edit `backend/.env` and update the DATABASE_URL with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/tcg_marketplace?schema=public"
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

### Step 4: Run Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate the Prisma Client
- Set up the schema

### Step 5: Seed Database

```bash
npm run seed
```

This will populate your database with:
- 3 Games (Pokemon, Magic, Yu-Gi-Oh)
- Multiple card sets
- Test users and sellers
- Sample products

### Step 6: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Get Products
```bash
curl http://localhost:3000/api/products
```

## Test Accounts

After seeding:
- **User**: john@example.com / password123
- **Seller**: seller@example.com / password123
- **Admin**: admin@example.com / password123

## Useful Commands

```bash
# View database in Prisma Studio (GUI)
npm run prisma:studio

# Reset database (careful - deletes all data!)
npx prisma migrate reset

# Generate Prisma Client (after schema changes)
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### "Connection refused" or "Cannot connect to database"

1. Make sure PostgreSQL is running:
   - Windows: Check Services (services.msc) for "postgresql" service
   - macOS: `brew services list`
   - Linux: `sudo systemctl status postgresql`

2. Verify connection string in `.env`

3. Test connection:
```bash
psql -U postgres -h localhost -d tcg_marketplace
```

### "Role does not exist"

Create the PostgreSQL user:
```bash
psql -U postgres
CREATE USER yourusername WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE tcg_marketplace TO yourusername;
```

### Port 3000 already in use

Change the port in `backend/.env`:
```env
PORT=3001
```

## Next Steps

Once the backend is running:

1. Test all API endpoints
2. Connect the frontend to the backend (already configured!)
3. Implement Phase 1 features (Cart & Orders)
4. Add payment integration (Stripe)

## Architecture Overview

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types & validation
│   ├── scripts/         # Database scripts
│   └── server.ts        # Main application entry
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json         # Dependencies
```

## API Documentation

Full API documentation is available in the README.md file.

## Phase 0 Complete! 🎉

You now have:
- ✅ Backend server with Express & TypeScript
- ✅ Database schema with Prisma ORM
- ✅ Authentication (JWT-based)
- ✅ User management (signup, login, profile)
- ✅ Product APIs (CRUD with filters)
- ✅ Cart management
- ✅ Error handling & validation
- ✅ Seed data for testing

Ready to move to Phase 1!
