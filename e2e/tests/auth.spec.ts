import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import { login, logout, clearStorage, generateRandomEmail, waitForToast } from '../utils/helpers';

/**
 * Authentication E2E Tests
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display sign-in page', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.locator('h1')).toContainText(/sign in/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/signin');

    await page.click('button[type="submit"]');

    // Check for validation errors
    const errors = page.locator('[role="alert"], .error-message');
    await expect(errors).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await waitForToast(page);
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/invalid/i);
  });

  test('should successfully sign in with valid credentials', async ({ page }) => {
    await page.goto('/signin');

    await page.fill('input[name="email"]', testUsers.validUser.email);
    await page.fill('input[name="password"]', testUsers.validUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or home
    await page.waitForURL(/\/(home|dashboard)/);

    // Check for user menu or profile
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('should display sign-up page', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.locator('h1')).toContainText(/sign up/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('should successfully sign up with new account', async ({ page }) => {
    await page.goto('/signup');

    const email = generateRandomEmail();

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"]', 'Test123456!');
    await page.click('button[type="submit"]');

    // Should show success message or redirect
    await waitForToast(page);
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/success/i);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Then logout
    await logout(page);

    // Should redirect to home
    await page.waitForURL('/');

    // User menu should not be visible
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).not.toBeVisible();
  });

  test('should display password recovery page', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('h1')).toContainText(/forgot password/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle password recovery request', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', testUsers.validUser.email);
    await page.click('button[type="submit"]');

    // Should show success message
    await waitForToast(page);
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/email sent/i);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Reload page
    await page.reload();

    // User should still be logged in
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await clearStorage(page);

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to signin
    await page.waitForURL(/signin/);
  });
});
