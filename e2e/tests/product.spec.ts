import { test, expect } from '@playwright/test';
import { testUsers, testProducts } from '../fixtures/test-data';
import { login, waitForToast, waitForLoading } from '../utils/helpers';

/**
 * Product E2E Tests
 */

test.describe('Product Features', () => {
  test('should display home page with products', async ({ page }) => {
    await page.goto('/');

    // Check for product grid
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toBeVisible();

    // Check for at least one product
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/');

    // Enter search query
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('trading card');
    await searchInput.press('Enter');

    // Wait for results
    await waitForLoading(page);

    // Check for search results
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/');

    // Click on category filter
    const categoryFilter = page.locator('[data-testid="category-filter"]');
    await categoryFilter.click();

    // Select a category
    await page.click('[data-value="TCG"]');

    // Wait for filtered results
    await waitForLoading(page);

    // Verify filtered products
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toBeVisible();
  });

  test('should display product details', async ({ page }) => {
    await page.goto('/');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Check for product details
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-to-cart"]')).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Get initial cart count
    const cartCount = page.locator('[data-testid="cart-count"]');
    const initialCount = await cartCount.textContent();

    // Add to cart
    await page.click('[data-testid="add-to-cart"]');

    // Wait for success message
    await waitForToast(page);

    // Verify cart count increased
    const newCount = await cartCount.textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
  });

  test('should navigate to cart page', async ({ page }) => {
    await page.goto('/');

    // Click cart icon
    await page.click('[data-testid="cart-icon"]');

    // Should navigate to cart page
    await page.waitForURL(/cart/);

    // Check for cart content
    const cartPage = page.locator('[data-testid="cart-page"]');
    await expect(cartPage).toBeVisible();
  });

  test('should update product quantity in cart', async ({ page }) => {
    // First add a product to cart
    await page.goto('/');
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.click('[data-testid="add-to-cart"]');
    await waitForToast(page);

    // Go to cart
    await page.goto('/cart');

    // Find quantity input
    const quantityInput = page.locator('[data-testid="quantity-input"]').first();
    await quantityInput.fill('2');

    // Wait for update
    await waitForToast(page);

    // Verify quantity updated
    await expect(quantityInput).toHaveValue('2');
  });

  test('should remove product from cart', async ({ page }) => {
    // First add a product to cart
    await page.goto('/');
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.click('[data-testid="add-to-cart"]');
    await waitForToast(page);

    // Go to cart
    await page.goto('/cart');

    // Get initial item count
    const items = page.locator('[data-testid="cart-item"]');
    const initialCount = await items.count();

    // Click remove button
    await page.click('[data-testid="remove-item"]').first();

    // Confirm removal if dialog appears
    try {
      await page.click('[data-testid="confirm-remove"]', { timeout: 2000 });
    } catch {
      // No confirmation dialog
    }

    // Wait for update
    await waitForToast(page);

    // Verify item removed
    const newCount = await items.count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should sort products by price', async ({ page }) => {
    await page.goto('/');

    // Click sort dropdown
    await page.click('[data-testid="sort-dropdown"]');

    // Select price low to high
    await page.click('[data-value="price_asc"]');

    // Wait for sorting
    await waitForLoading(page);

    // Verify products are sorted
    const prices = await page.locator('[data-testid="product-price"]').allTextContents();
    const numericPrices = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, '')));

    for (let i = 1; i < numericPrices.length; i++) {
      expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i - 1]);
    }
  });

  test('should display product reviews', async ({ page }) => {
    await page.goto('/');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Scroll to reviews section
    await page.locator('[data-testid="reviews-section"]').scrollIntoViewIfNeeded();

    // Check for reviews
    const reviewsSection = page.locator('[data-testid="reviews-section"]');
    await expect(reviewsSection).toBeVisible();
  });

  test.describe('Authenticated Features', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, testUsers.validUser.email, testUsers.validUser.password);
    });

    test('should add product review', async ({ page }) => {
      await page.goto('/');

      // Click on first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      // Scroll to reviews
      await page.locator('[data-testid="reviews-section"]').scrollIntoViewIfNeeded();

      // Click add review button
      await page.click('[data-testid="add-review"]');

      // Fill review form
      await page.click(`[data-testid="rating-5"]`);
      await page.fill('[data-testid="review-title"]', 'Great product!');
      await page.fill('[data-testid="review-comment"]', 'Excellent quality and fast shipping.');

      // Submit review
      await page.click('[data-testid="submit-review"]');

      // Wait for success
      await waitForToast(page);

      // Verify review appears
      const review = page.locator('[data-testid="user-review"]');
      await expect(review).toBeVisible();
    });

    test('should add product to wishlist', async ({ page }) => {
      await page.goto('/');

      // Click on first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      // Click wishlist button
      await page.click('[data-testid="add-to-wishlist"]');

      // Wait for success
      await waitForToast(page);

      // Verify button state changed
      const wishlistButton = page.locator('[data-testid="add-to-wishlist"]');
      await expect(wishlistButton).toHaveAttribute('data-wishlisted', 'true');
    });
  });
});
