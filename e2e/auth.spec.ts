import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { clearSession, waitForNetworkIdle, fillForm } from './utils/helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('h1, h2').filter({ hasText: /sign in|login/i })).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for validation error
    await expect(page.locator('text=/invalid|valid email/i')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('[name="email"]', testUsers.invalidUser.email);
    await page.fill('[name="password"]', testUsers.invalidUser.password);
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(
      page.locator('text=/invalid credentials|incorrect|failed/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('[name="email"]', testUsers.validUser.email);
    await page.fill('[name="password"]', testUsers.validUser.password);

    // Click submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    await waitForNetworkIdle(page);

    // Verify redirect to home or dashboard
    expect(page.url()).toMatch(/\/(home|dashboard|products)?$/);

    // Verify user is logged in by checking for account menu or user info
    const accountIndicator = page.locator(
      '[aria-label*="account" i], [data-testid*="account" i], text=/account|profile/i'
    ).first();
    await expect(accountIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to signup page from login', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=/sign up|create account|register/i');

    await expect(page).toHaveURL(/signup|register/i);
    await expect(page.locator('[name="firstName"], [name="first-name"]')).toBeVisible();
    await expect(page.locator('[name="lastName"], [name="last-name"]')).toBeVisible();
  });

  test('should display signup page with all fields', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[name="firstName"], [name="first-name"]')).toBeVisible();
    await expect(page.locator('[name="lastName"], [name="last-name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors on empty signup form', async ({ page }) => {
    await page.goto('/signup');
    await page.click('button[type="submit"]');

    // Check for required field errors
    const errorLocator = page.locator('text=/required|field is required/i');
    await expect(errorLocator.first()).toBeVisible({ timeout: 3000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/signin');
    await page.fill('[name="email"]', testUsers.validUser.email);
    await page.fill('[name="password"]', testUsers.validUser.password);
    await page.click('button[type="submit"]');
    await waitForNetworkIdle(page);

    // Then logout
    // Try to find and click account menu
    const accountMenu = page.locator(
      '[aria-label*="account" i], [data-testid*="account" i], button:has-text("Account")'
    ).first();

    await accountMenu.click({ timeout: 5000 }).catch(async () => {
      // If account menu not found, look for direct logout button
      await page.click('text=/logout|sign out/i');
    });

    // Click logout in dropdown
    await page.click('text=/logout|sign out/i').catch(() => {});

    await waitForNetworkIdle(page);

    // Verify redirect to home or login
    expect(page.url()).toMatch(/\/(home|signin|login)?$/);

    // Verify user is logged out
    await expect(page.locator('text=/sign in|login/i')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/account');

    // Should redirect to login
    await expect(page).toHaveURL(/signin|login/i, { timeout: 5000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login
    await page.goto('/signin');
    await page.fill('[name="email"]', testUsers.validUser.email);
    await page.fill('[name="password"]', testUsers.validUser.password);
    await page.click('button[type="submit"]');
    await waitForNetworkIdle(page);

    // Reload page
    await page.reload();
    await waitForNetworkIdle(page);

    // Verify still logged in
    const accountIndicator = page.locator(
      '[aria-label*="account" i], [data-testid*="account" i], text=/account|profile/i'
    ).first();
    await expect(accountIndicator).toBeVisible({ timeout: 5000 });
  });
});
