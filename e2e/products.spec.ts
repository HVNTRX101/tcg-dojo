import { test, expect } from '@playwright/test';
import { testProducts } from './fixtures/test-data';
import { waitForNetworkIdle } from './utils/helpers';

test.describe('Product Browsing and Search', () => {
  test('should display products on homepage', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Check for product cards
    const productCards = page.locator('[data-testid*="product"], .product-card, article').first();
    await expect(productCards).toBeVisible({ timeout: 10000 });
  });

  test('should display product details', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Find and click first product
    const firstProduct = page.locator('[data-testid*="product"], .product-card, article').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });

    // Get product name before clicking
    const productName = await firstProduct.locator('h2, h3, [class*="name"]').first().textContent();

    await firstProduct.click();
    await waitForNetworkIdle(page);

    // Verify we're on product detail page
    expect(page.url()).toMatch(/\/product/i);

    // Verify product details are shown
    await expect(page.locator('text=/price|\\$/i')).toBeVisible();
    await expect(page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/');

    // Find and use search input
    const searchInput = page.locator(
      '[placeholder*="search" i], [aria-label*="search" i], [name="search"], input[type="search"]'
    ).first();

    await searchInput.fill(testProducts.searchTerm);
    await searchInput.press('Enter');

    await waitForNetworkIdle(page);

    // Verify search results or search term in URL
    expect(page.url()).toMatch(/search|query|q=/i);

    // Check for results or "no results" message
    const hasResults = await page.locator('[data-testid*="product"], .product-card, article').count();
    const noResults = page.locator('text=/no results|no products|not found/i');

    if (hasResults > 0) {
      await expect(page.locator('[data-testid*="product"], .product-card, article').first()).toBeVisible();
    } else {
      await expect(noResults).toBeVisible();
    }
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Look for category/filter navigation
    const categoryLink = page.locator(`text="${testProducts.category}"`).first();

    if (await categoryLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryLink.click();
      await waitForNetworkIdle(page);

      // Verify URL changed or products filtered
      expect(page.url()).toMatch(/game|category|filter/i);

      // Verify products are shown
      await expect(page.locator('[data-testid*="product"], .product-card, article').first()).toBeVisible({
        timeout: 5000,
      });
    } else {
      test.skip();
    }
  });

  test('should apply filters to product list', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Look for filter sidebar or button
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters")').first();

    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterButton.click();

      // Try to apply a rarity filter
      const rarityFilter = page.locator(`text="${testProducts.filters.rarity}"`).first();
      if (await rarityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rarityFilter.click();
        await waitForNetworkIdle(page);

        // Verify products are filtered (URL should change or product count should update)
        const initialCount = await page.locator('[data-testid*="product"], .product-card, article').count();
        expect(initialCount).toBeGreaterThan(0);
      }
    } else {
      test.skip();
    }
  });

  test('should sort products', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Look for sort dropdown
    const sortSelect = page.locator('select[name*="sort" i], [aria-label*="sort" i]').first();

    if (await sortSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get initial first product name
      const initialFirstProduct = await page
        .locator('[data-testid*="product"], .product-card, article')
        .first()
        .locator('h2, h3, [class*="name"]')
        .first()
        .textContent();

      // Change sort order
      await sortSelect.selectOption({ index: 1 }); // Select second option
      await waitForNetworkIdle(page);

      // Get new first product name
      const newFirstProduct = await page
        .locator('[data-testid*="product"], .product-card, article')
        .first()
        .locator('h2, h3, [class*="name"]')
        .first()
        .textContent();

      // Verify sort changed the order (products should be different)
      // Note: This might not always be true if there's only one product
      const productCount = await page.locator('[data-testid*="product"], .product-card, article').count();
      if (productCount > 1) {
        expect(initialFirstProduct).not.toBe(newFirstProduct);
      }
    } else {
      test.skip();
    }
  });

  test('should paginate through products', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Look for pagination
    const nextButton = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="next" i]').first();

    if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get first product on page 1
      const firstProductPage1 = await page
        .locator('[data-testid*="product"], .product-card, article')
        .first()
        .locator('h2, h3')
        .first()
        .textContent();

      await nextButton.click();
      await waitForNetworkIdle(page);

      // Get first product on page 2
      const firstProductPage2 = await page
        .locator('[data-testid*="product"], .product-card, article')
        .first()
        .locator('h2, h3')
        .first()
        .textContent();

      // Products should be different
      expect(firstProductPage1).not.toBe(firstProductPage2);

      // Verify previous button now appears
      await expect(page.locator('button:has-text("Previous"), a:has-text("Previous")')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should navigate between game categories', async ({ page }) => {
    await page.goto('/');

    // Look for game navigation
    const gameNav = page.locator('nav a, button').filter({ hasText: /magic|pokemon|yugioh/i }).first();

    if (await gameNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gameNav.click();
      await waitForNetworkIdle(page);

      // Verify products are shown
      await expect(page.locator('[data-testid*="product"], .product-card, article').first()).toBeVisible({
        timeout: 5000,
      });
    } else {
      test.skip();
    }
  });

  test('should display product images', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const firstProductImage = page.locator('[data-testid*="product"], .product-card, article').first().locator('img');

    await expect(firstProductImage).toBeVisible();

    // Verify image has loaded
    const naturalWidth = await firstProductImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test('should display product price', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const priceElement = page
      .locator('[data-testid*="product"], .product-card, article')
      .first()
      .locator('text=/\\$\\d+|price/i');

    await expect(priceElement).toBeVisible();
  });
});
