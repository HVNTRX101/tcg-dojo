import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helper Functions
 */

/**
 * Login helper
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/(home|dashboard)/);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[data-testid="user-menu"]');

  // Click logout button
  await page.click('[data-testid="logout-button"]');

  // Wait for redirect to home
  await page.waitForURL('/');
}

/**
 * Add product to cart
 */
export async function addToCart(page: Page, productId: string) {
  await page.goto(`/product/${productId}`);
  await page.click('[data-testid="add-to-cart"]');

  // Wait for cart update
  await page.waitForSelector('[data-testid="cart-count"]');
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, endpoint: string) {
  return page.waitForResponse(response =>
    response.url().includes(endpoint) && response.status() === 200
  );
}

/**
 * Fill form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`input[name="${name}"]`, value);
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = page.locator('[data-sonner-toast]');
  await expect(toast).toBeVisible();

  if (message) {
    await expect(toast).toContainText(message);
  }

  return toast;
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await expect(element).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Select dropdown option
 */
export async function selectDropdown(page: Page, selector: string, value: string) {
  await page.click(selector);
  await page.click(`[role="option"][data-value="${value}"]`);
}

/**
 * Upload file
 */
export async function uploadFile(page: Page, selector: string, filePath: string) {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Wait for loading to finish
 */
export async function waitForLoading(page: Page) {
  const loader = page.locator('[data-testid="loading"]');

  // Wait for loader to appear (optional)
  try {
    await loader.waitFor({ state: 'visible', timeout: 1000 });
  } catch {
    // Loader might not appear if operation is fast
  }

  // Wait for loader to disappear
  await loader.waitFor({ state: 'hidden', timeout: 30000 });
}

/**
 * Check for error message
 */
export async function expectError(page: Page, message?: string) {
  const error = page.locator('[role="alert"], .error-message');
  await expect(error).toBeVisible();

  if (message) {
    await expect(error).toContainText(message);
  }
}

/**
 * Clear local storage and cookies
 */
export async function clearStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, endpoint: string, response: any) {
  await page.route(`**/${endpoint}`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Generate random email
 */
export function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Retry action with exponential backoff
 */
export async function retry<T>(
  action: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
