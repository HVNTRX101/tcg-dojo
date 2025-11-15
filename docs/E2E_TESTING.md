# E2E Testing Guide

This document describes the End-to-End (E2E) testing setup using Playwright for the TCG Marketplace application.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The TCG Marketplace uses [Playwright](https://playwright.dev/) for E2E testing. Playwright provides:

- Cross-browser testing (Chromium, Firefox, WebKit)
- Auto-waiting for elements
- Network interception and mocking
- Screenshot and video recording
- Parallel test execution
- Mobile viewport testing

## Setup

### Prerequisites

- Node.js 18+ installed
- Frontend and backend services running

### Installation

Install Playwright and browsers:

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Configuration

Create a `.env.test` file in the project root:

```bash
# E2E Test Configuration
E2E_BASE_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

## Running Tests

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run tests in debug mode
npm run test:e2e:debug
```

### Run Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/tests/auth.spec.ts

# Run tests matching a pattern
npx playwright test -g "should login"

# Run tests in a specific browser
npx playwright test --project=chromium
```

### Interactive Mode

```bash
# Run tests with UI
npm run test:e2e:ui
```

This opens Playwright's UI mode where you can:
- Select which tests to run
- See test execution in real-time
- Inspect DOM and network requests
- Time-travel through test steps

### View Test Reports

```bash
# Generate and open HTML report
npm run test:e2e:report
```

## Writing Tests

### Test Structure

Tests are organized in the `e2e/` directory:

```
e2e/
├── tests/           # Test files
│   ├── auth.spec.ts
│   ├── product.spec.ts
│   └── checkout.spec.ts
├── fixtures/        # Test data
│   └── test-data.ts
└── utils/           # Helper functions
    └── helpers.ts
```

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Interact with elements
    await page.click('button');
    await page.fill('input[name="email"]', 'test@example.com');

    // Assert expectations
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});
```

### Using Test Fixtures

```typescript
import { testUsers } from '../fixtures/test-data';

test('should login with valid credentials', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[name="email"]', testUsers.validUser.email);
  await page.fill('input[name="password"]', testUsers.validUser.password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/dashboard/);
});
```

### Using Helper Functions

```typescript
import { login, waitForToast } from '../utils/helpers';

test('should access protected page', async ({ page }) => {
  // Use helper for common actions
  await login(page, 'user@example.com', 'password123');

  await page.goto('/dashboard');

  // Wait for toast notification
  await waitForToast(page, 'Welcome back!');
});
```

### Data-Driven Tests

```typescript
const testCases = [
  { email: 'invalid', password: 'test', error: 'Invalid email' },
  { email: 'test@test.com', password: '', error: 'Password required' },
];

for (const testCase of testCases) {
  test(`should show error: ${testCase.error}`, async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[name="email"]', testCase.email);
    await page.fill('input[name="password"]', testCase.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText(testCase.error);
  });
}
```

### API Mocking

```typescript
test('should handle API error', async ({ page }) => {
  // Mock API response
  await page.route('**/api/products', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error' }),
    });
  });

  await page.goto('/products');

  // Verify error handling
  await expect(page.locator('.error-message')).toBeVisible();
});
```

### Network Request Interception

```typescript
test('should track analytics event', async ({ page }) => {
  // Wait for specific API call
  const analyticsRequest = page.waitForRequest(
    request => request.url().includes('/api/analytics') &&
               request.method() === 'POST'
  );

  await page.goto('/product/123');
  await page.click('[data-testid="add-to-cart"]');

  // Verify request was made
  const request = await analyticsRequest;
  expect(request).toBeTruthy();
});
```

### Screenshots and Videos

```typescript
test('should render homepage correctly', async ({ page }) => {
  await page.goto('/');

  // Take screenshot
  await page.screenshot({ path: 'screenshots/homepage.png' });

  // Take full page screenshot
  await page.screenshot({
    path: 'screenshots/homepage-full.png',
    fullPage: true
  });
});
```

Videos are automatically recorded on test failure (configured in `playwright.config.ts`).

## Test Data Management

### Test Users

Predefined test users are available in `e2e/fixtures/test-data.ts`:

```typescript
import { testUsers } from '../fixtures/test-data';

// Available users:
// - testUsers.validUser
// - testUsers.newUser
// - testUsers.seller
// - testUsers.admin
```

### Dynamic Test Data

```typescript
import { generateRandomEmail, generateRandomString } from '../utils/helpers';

test('should register new user', async ({ page }) => {
  const email = generateRandomEmail();
  const name = generateRandomString(10);

  await page.goto('/signup');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="name"]', name);
  // ...
});
```

## Best Practices

### 1. Use Data-testid Attributes

```tsx
// Component
<button data-testid="submit-button">Submit</button>

// Test
await page.click('[data-testid="submit-button"]');
```

### 2. Wait for Elements Properly

```typescript
// ✅ Good - Uses auto-waiting
await page.click('button');

// ❌ Bad - Manual timeout
await page.waitForTimeout(1000);

// ✅ Good - Wait for specific condition
await page.waitForLoadState('networkidle');
```

### 3. Use Specific Selectors

```typescript
// ✅ Good - Specific and resilient
await page.click('[data-testid="checkout-button"]');

// ❌ Bad - Too broad, might break
await page.click('button');
```

### 4. Clean Up After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();
});
```

### 5. Group Related Tests

```typescript
test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup
    await login(page, testUsers.validUser);
    await addProductToCart(page);
  });

  test('should complete checkout', async ({ page }) => {
    // Test implementation
  });

  test('should apply discount code', async ({ page }) => {
    // Test implementation
  });
});
```

### 6. Handle Flaky Tests

```typescript
// Retry flaky tests
test.describe.configure({ retries: 2 });

test('potentially flaky test', async ({ page }) => {
  // Use retry helper for specific actions
  await retry(async () => {
    await page.click('button');
    await expect(page.locator('.success')).toBeVisible();
  }, 3);
});
```

### 7. Test Across Viewports

```typescript
test.use({ viewport: { width: 375, height: 667 } }); // Mobile

test('should display mobile menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start services
        run: |
          npm run dev &
          cd backend && npm run dev &

      - name: Wait for services
        run: npx wait-on http://localhost:5173 http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker Integration

Run tests in Docker:

```bash
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  mcr.microsoft.com/playwright:v1.51.1-jammy \
  npm run test:e2e
```

## Troubleshooting

### Tests Timing Out

**Issue**: Tests fail with timeout errors

**Solutions**:
1. Increase timeout in `playwright.config.ts`:
   ```typescript
   use: {
     actionTimeout: 15000,
     navigationTimeout: 45000,
   }
   ```

2. Wait for specific conditions:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

### Element Not Found

**Issue**: Tests fail with "Element not found" errors

**Solutions**:
1. Add explicit waits:
   ```typescript
   await page.waitForSelector('[data-testid="element"]');
   ```

2. Check if element is in viewport:
   ```typescript
   await page.locator('[data-testid="element"]').scrollIntoViewIfNeeded();
   ```

### Flaky Tests

**Issue**: Tests pass sometimes but fail other times

**Solutions**:
1. Avoid `waitForTimeout()`, use specific conditions
2. Use `waitForLoadState()` before assertions
3. Enable retries for specific tests
4. Check for race conditions

### Browser Not Installing

**Issue**: Playwright browsers fail to install

**Solutions**:
```bash
# Install with dependencies
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium
```

### Port Already in Use

**Issue**: Development server port is already in use

**Solutions**:
```bash
# Kill process using port
npx kill-port 5173 3000

# Or use different port in config
E2E_BASE_URL=http://localhost:5174
```

## Available Test Suites

### Authentication Tests (`auth.spec.ts`)
- Sign in validation
- Sign up flow
- Password recovery
- Session persistence
- Protected route access

### Product Tests (`product.spec.ts`)
- Product listing and search
- Product details
- Add to cart
- Cart management
- Product reviews
- Wishlist functionality

### Checkout Tests (`checkout.spec.ts`)
- Checkout flow
- Shipping information
- Payment methods
- Order review
- Order confirmation
- Error handling

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
