import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Clear all cookies and local storage
 */
export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Login helper
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/signin');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await waitForNetworkIdle(page);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click account menu
  await page.click('[aria-label="Account menu"]', { timeout: 5000 }).catch(() => {
    // Fallback: look for logout button directly
  });
  await page.click('text=Logout', { timeout: 5000 });
  await waitForNetworkIdle(page);
}

/**
 * Add product to cart
 */
export async function addToCart(page: Page, productName: string) {
  await page.click(`[data-testid="product-${productName}"] button:has-text("Add to Cart")`);
  await expect(page.locator('text=Added to cart')).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load');
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png`, fullPage: true });
}

/**
 * Verify element is visible and contains text
 */
export async function verifyText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(text);
}

/**
 * Fill form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`[name="${name}"]`, value);
  }
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, url: string, response: any) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for API call
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) => {
    const url = response.url();
    return typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
  });
}
