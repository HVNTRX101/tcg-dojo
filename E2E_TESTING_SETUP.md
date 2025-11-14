# E2E Testing with Playwright

## Overview
End-to-end testing infrastructure for the TCG Dojo marketplace using Playwright, covering critical user journeys and workflows.

## Test Framework
- **Test Runner**: Playwright 1.56.1
- **Browsers**: Chromium (default), Firefox, WebKit (Safari)
- **Language**: TypeScript 5.x
- **Base URL**: http://localhost:5173 (configurable via `PLAYWRIGHT_BASE_URL`)

## Test Coverage

### Test Suites (40+ tests)

#### 1. Authentication Flow (`e2e/auth.spec.ts`) - 11 tests
- ✅ Display login page
- ✅ Validate email format
- ✅ Handle invalid credentials
- ✅ Successful login with valid credentials
- ✅ Navigate to signup page
- ✅ Display signup form with all fields
- ✅ Show validation errors on empty signup
- ✅ Successful logout
- ✅ Redirect to login for protected routes
- ✅ Persist session after page reload
- ✅ Maintain auth state

#### 2. Product Browsing (`e2e/products.spec.ts`) - 10 tests
- ✅ Display products on homepage
- ✅ Show product details
- ✅ Search for products
- ✅ Filter by category
- ✅ Apply filters (rarity, condition, price)
- ✅ Sort products (price, name, date)
- ✅ Paginate through product list
- ✅ Navigate between game categories
- ✅ Display product images
- ✅ Show product prices

#### 3. Shopping Cart (`e2e/cart.spec.ts`) - 11 tests
- ✅ Add product to cart
- ✅ Open cart drawer/page
- ✅ Display cart item details
- ✅ Update item quantity
- ✅ Remove item from cart
- ✅ Calculate cart total correctly
- ✅ Clear entire cart
- ✅ Persist cart after reload
- ✅ Navigate to checkout
- ✅ Add multiple products
- ✅ Handle cart errors

#### 4. Checkout Flow (`e2e/checkout.spec.ts`) - 11 tests
- ✅ Require authentication
- ✅ Display checkout page
- ✅ Show order summary
- ✅ Validate shipping address
- ✅ Fill shipping information
- ✅ Proceed to payment step
- ✅ Display payment form
- ✅ Handle empty cart
- ✅ Calculate tax and shipping
- ✅ Apply coupon codes
- ✅ Order confirmation

## Project Structure

```
e2e/
├── fixtures/
│   └── test-data.ts          # Test user data, products, checkout info
├── utils/
│   └── helpers.ts             # Reusable test utilities
├── auth.spec.ts               # Authentication tests
├── products.spec.ts           # Product browsing tests
├── cart.spec.ts               # Shopping cart tests
└── checkout.spec.ts           # Checkout flow tests

playwright.config.ts           # Playwright configuration
playwright-report/             # HTML test reports (gitignored)
test-results/                  # Test artifacts (gitignored)
```

## Test Utilities

### Helper Functions (`e2e/utils/helpers.ts`)
- `waitForNetworkIdle()` - Wait for network requests to complete
- `clearSession()` - Clear cookies and storage
- `login()` - Quick login helper
- `logout()` - Quick logout helper
- `addToCart()` - Add product to cart
- `waitForPageLoad()` - Wait for full page load
- `takeScreenshot()` - Capture screenshots
- `verifyText()` - Verify element text
- `fillForm()` - Fill multiple form fields
- `mockApiResponse()` - Mock API endpoints
- `waitForApiCall()` - Wait for specific API calls

### Test Data (`e2e/fixtures/test-data.ts`)
- `testUsers` - Valid, new, and invalid user credentials
- `testProducts` - Search terms, categories, filters
- `testCheckout` - Shipping address, card info (test data)

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Run all tests (unit + E2E)
npm run test:all
```

### Advanced Commands

```bash
# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should login"

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with specific number of workers
npx playwright test --workers=2

# Update snapshots
npx playwright test --update-snapshots
```

## Configuration

### Environment Variables

```bash
# Set custom base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e

# Run in CI mode
CI=true npm run test:e2e
```

### Playwright Config (`playwright.config.ts`)

- **Parallel Execution**: Tests run in parallel for speed
- **Retries**: 2 retries on CI, 0 locally
- **Reporters**: HTML, list, JSON
- **Artifacts**: Screenshots on failure, videos on failure, traces on retry
- **Web Server**: Auto-starts dev server if not running

## Test Writing Guidelines

### 1. Use Page Object Model Pattern

```typescript
// Good: Reusable selectors
const loginButton = page.locator('[data-testid="login-button"]');

// Better: Helper functions
await login(page, email, password);
```

### 2. Use Data Test IDs

```typescript
// Prefer data-testid over text or CSS selectors
await page.click('[data-testid="add-to-cart"]');

// Fallback to accessible selectors
await page.click('[aria-label="Add to cart"]');
```

### 3. Wait for Network Idle

```typescript
await page.click('button');
await waitForNetworkIdle(page);
```

### 4. Handle Conditional Elements

```typescript
if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
  await element.click();
} else {
  test.skip(); // Skip if element not found
}
```

### 5. Use Descriptive Test Names

```typescript
test('should successfully login with valid credentials', async ({ page }) => {
  // Clear test description
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    PLAYWRIGHT_BASE_URL: http://localhost:5173

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

### 1. Test Independence
- Each test should be independent
- Use `beforeEach` to reset state
- Clear session between tests

### 2. Assertions
- Use descriptive assertions
- Wait for elements to be visible
- Verify both positive and negative cases

### 3. Error Handling
- Tests should handle missing elements gracefully
- Use `test.skip()` for optional features
- Provide clear failure messages

### 4. Performance
- Run tests in parallel when possible
- Use selective test execution during development
- Keep tests focused and fast

### 5. Maintenance
- Keep selectors in one place
- Use helper functions for common actions
- Update tests when UI changes

## Debugging

### Debug Mode
```bash
# Step through tests with browser dev tools
npm run test:e2e:debug
```

### Screenshots
Screenshots are automatically captured on failure in `test-results/`

### Videos
Videos are recorded for failed tests only (configurable)

### Traces
Traces are captured on first retry, viewable in Playwright trace viewer:
```bash
npx playwright show-trace test-results/trace.zip
```

### Headed Mode
```bash
# See the browser while tests run
npm run test:e2e:headed
```

## Continuous Integration

### Prerequisites
1. Node.js 18+ installed
2. Playwright browsers installed (`npx playwright install`)
3. Development server configured

### CI Configuration
- **Retries**: 2 (configured in `playwright.config.ts`)
- **Workers**: 1 on CI, unlimited locally
- **Timeout**: 120s for web server start
- **Artifacts**: Uploaded on failure

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if dev server is starting correctly
- Verify base URL is correct

### Flaky Tests
- Add explicit waits with `waitForNetworkIdle()`
- Use `waitForLoadState()` before assertions
- Increase timeout for specific actions

### Element Not Found
- Check if selector is correct
- Verify element is visible (not display:none)
- Wait for page to fully load

### Authentication Issues
- Verify test user exists in database
- Check if session is being cleared properly
- Ensure tokens are not expired

## Next Steps

1. Add visual regression testing
2. Implement performance testing
3. Add mobile device testing
4. Create custom fixtures for complex scenarios
5. Add API mocking for isolated tests
6. Implement accessibility testing
7. Add cross-browser testing (Firefox, Safari)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Integration](https://playwright.dev/docs/ci)
