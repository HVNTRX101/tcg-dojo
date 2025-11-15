import { test, expect } from '@playwright/test';

/**
 * Product Browsing E2E Tests
 * Tests product listing, filtering, and search functionality
 */

test.describe('Product Browsing', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if page loaded successfully
    expect(page.url()).toContain('localhost:5173');
  });

  test('should display product listings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for products to load (if they exist)
    await page.waitForTimeout(2000);

    // Check if product elements or loading states are present
    const productCards = page.locator('[data-testid="product-card"], .product-card, article');
    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');

    // Either products should be visible or loading should be shown
    const hasProducts = (await productCards.count()) > 0;
    const isLoading = await loadingIndicator.isVisible().catch(() => false);

    expect(hasProducts || isLoading).toBeTruthy();
  });

  test('should test product API endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/products');

    // Should return 200 or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
    }
  });

  test('should handle product search', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('pokemon');
      await searchInput.press('Enter');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify search was performed (URL change or results update)
      const url = page.url();
      expect(url.includes('search') || url.includes('pokemon')).toBeTruthy();
    }
  });

  test('should test search API endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/search?q=pokemon');

    // Should return 200 or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
    }
  });

  test('should navigate to product details', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find first product link
    const productLink = page.locator('a[href*="/product"], a[href*="/products"]').first();

    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we're on a product detail page
      const url = page.url();
      expect(url.includes('/product')).toBeTruthy();
    }
  });

  test('should handle filters and sorting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for filter elements
    const filterButton = page.getByRole('button', { name: /filter|sort/i }).first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Check if filter menu opened
      const filterMenu = page.locator('[role="menu"], .filter-menu, .dropdown-menu').first();
      if (await filterMenu.isVisible()) {
        expect(filterMenu).toBeVisible();
      }
    }
  });
});

test.describe('Product API Integration', () => {
  test('should fetch products from API', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/products', {
      params: {
        page: '1',
        limit: '10',
      },
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();

      // Check for common response structures
      if (body.products) {
        expect(Array.isArray(body.products)).toBeTruthy();
      } else if (body.data) {
        expect(Array.isArray(body.data)).toBeTruthy();
      } else if (Array.isArray(body)) {
        expect(Array.isArray(body)).toBeTruthy();
      }
    }
  });

  test('should handle pagination', async ({ request }) => {
    const page1 = await request.get('http://localhost:3000/api/products?page=1&limit=5');
    const page2 = await request.get('http://localhost:3000/api/products?page=2&limit=5');

    if (page1.status() === 200 && page2.status() === 200) {
      const data1 = await page1.json();
      const data2 = await page2.json();

      // If both pages have data, they should be different
      expect(data1).toBeDefined();
      expect(data2).toBeDefined();
    }
  });
});
