# Prisma Setup Guide for TCG Marketplace Backend

## Overview

This guide helps you resolve Prisma Client generation issues, particularly in environments with network restrictions or firewall configurations that block access to Prisma's binary distribution server.

## The Problem

When running `npx prisma generate`, you may encounter errors like:

```
Error: Failed to fetch the engine file at https://binaries.prisma.sh/... - 403 Forbidden
```

or

```
@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
```

These errors occur because Prisma needs to download platform-specific query engines from `binaries.prisma.sh`, but network restrictions prevent this.

## Quick Start

### Option 1: Use the Setup Script (Recommended)

We've provided a helper script that automates the setup and testing process:

```bash
cd backend
./scripts/setup-and-test.sh
```

To run a specific test file:

```bash
./scripts/setup-and-test.sh src/controllers/__tests__/productController.test.ts
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client (with checksum ignore)
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

# 3. Run migrations
npx prisma migrate dev

# 4. Run tests
npm test
```

## Solutions for Network Restrictions

### Solution 1: Network Configuration

**For Corporate/Firewall Environments:**

1. Whitelist the following domains in your firewall/proxy:
   - `binaries.prisma.sh`
   - `*.prisma.sh`

2. If using a proxy, set environment variables:
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   npm config set proxy http://your-proxy:port
   npm config set https-proxy http://your-proxy:port
   ```

3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

### Solution 2: Use a VPN or Different Network

If you're on a restricted network (corporate, university, etc.):

1. Connect to a VPN or switch to a different network (e.g., mobile hotspot)
2. Run `npx prisma generate`
3. The generated client will be cached in `node_modules/.prisma/client/`
4. Switch back to your original network - the generated client will continue to work

### Solution 3: Pre-download Engines

Download Prisma engines manually and point Prisma to them:

```bash
# Download engines for your platform
npx @prisma/engines download --force

# Or manually download from GitHub releases
# https://github.com/prisma/prisma-engines/releases
```

### Solution 4: Use Prisma Accelerate (Cloud)

For environments where local engines cannot be used:

1. Sign up for [Prisma Data Platform](https://console.prisma.io/)
2. Create an Accelerate connection
3. Update your schema:
   ```prisma
   datasource db {
     provider = "postgresql" // or your database
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
     previewFeatures = ["accelerate"]
   }
   ```
4. Use the Accelerate connection string in your `.env`

### Solution 5: Docker with Cached Engines

Create a Docker image with pre-generated Prisma Client:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies and generate Prisma Client
RUN npm install
RUN npx prisma generate

# Copy rest of application
COPY . .

CMD ["npm", "run", "dev"]
```

### Solution 6: CI/CD Configuration

**For GitHub Actions:**

```yaml
- name: Generate Prisma Client
  run: npx prisma generate
  env:
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: 1
```

**For GitLab CI:**

```yaml
before_script:
  - npm install
  - PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```

## Environment Variables

Useful Prisma environment variables for troubleshooting:

```bash
# Ignore missing checksums
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Specify custom engine paths
PRISMA_QUERY_ENGINE_BINARY=/path/to/query-engine
PRISMA_MIGRATION_ENGINE_BINARY=/path/to/migration-engine

# Enable debug logging
DEBUG=prisma:*
PRISMA_DEBUG=1

# Skip postinstall generate (if needed)
PRISMA_SKIP_POSTINSTALL_GENERATE=1
```

## Verifying Successful Setup

After running `npx prisma generate`, verify the client was created:

```bash
# Check if generated files exist
ls -la node_modules/.prisma/client/

# Should see files like:
# index.js, index.d.ts, schema.prisma, etc.

# Verify it's not a stub (should NOT contain "did not initialize yet")
grep -q "did not initialize yet" node_modules/.prisma/client/index.js && \
  echo "⚠️ Still using stub client" || \
  echo "✓ Client generated successfully"
```

## Running Tests

Once Prisma Client is generated:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/controllers/__tests__/productController.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### Issue: "Module not found: @prisma/client"

**Solution:**
```bash
npm install @prisma/client
npx prisma generate
```

### Issue: "PrismaClient did not initialize yet"

**Cause:** The Prisma Client stub is still in place (generation failed)

**Solution:**
1. Check network connectivity to binaries.prisma.sh
2. Try with VPN or different network
3. Use one of the solutions above

### Issue: "Error: Unknown engine type"

**Solution:**
Remove any custom `engineType` configuration from `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  // Remove any engineType or binaryTargets unless specifically needed
}
```

### Issue: TypeScript errors in controllers

**Solution:**
```bash
# Fix any 'any' type errors by adding explicit types
npm run lint:fix

# Run type check
npm run type-check
```

### Issue: Database connection errors

**Solution:**
```bash
# Ensure database file exists (for SQLite)
ls -la prisma/dev.db

# Run migrations if needed
npx prisma migrate dev

# Reset database if corrupted
npx prisma migrate reset
```

## Platform-Specific Notes

### Linux (Debian/Ubuntu)

Usually works without issues. If you encounter OpenSSL errors:

```bash
# Install OpenSSL
sudo apt-get update
sudo apt-get install openssl libssl-dev

# Regenerate with specific binary target
npx prisma generate --force-download
```

### macOS

Usually works without issues. For M1/M2 Macs:

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "darwin-arm64"]
}
```

### Windows

May require additional setup:

```bash
# Use PowerShell or Git Bash
# Set environment variables before generate
$env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"
npx prisma generate
```

## Best Practices

1. **Commit generated client?** NO
   - Add `node_modules/.prisma` to `.gitignore`
   - Generate fresh on each environment

2. **When to regenerate:**
   - After changing `schema.prisma`
   - After pulling schema changes from git
   - When switching between branches with schema differences

3. **CI/CD:**
   - Always run `npx prisma generate` in CI pipeline
   - Cache `node_modules` for faster builds
   - Use environment variables for database connections

4. **Development:**
   - Run `npx prisma migrate dev` after schema changes
   - Use `npx prisma studio` to browse database
   - Keep database schema in sync with Prisma schema

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Troubleshooting Guide](https://www.prisma.io/docs/guides/troubleshooting)
- [Prisma GitHub Issues](https://github.com/prisma/prisma/issues)
- [Prisma Community Slack](https://slack.prisma.io/)

## Support

If you continue to experience issues:

1. Check the error logs in `/root/.npm/_logs/`
2. Try deleting `node_modules` and reinstalling
3. Ensure Node.js version compatibility (14+)
4. Check Prisma version: `npx prisma --version`
5. Open an issue in the project repository with:
   - Error message
   - Platform/OS
   - Node version
   - Network environment details
