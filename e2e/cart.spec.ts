import { test, expect } from '@playwright/test';
import { clearSession, waitForNetworkIdle, login } from './utils/helpers';
import { testUsers } from './fixtures/test-data';

test.describe('Shopping Cart Operations', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('should add product to cart', async ({ page }) => {
    // Find first "Add to Cart" button
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();

    await expect(addToCartButton).toBeVisible({ timeout: 10000 });

    // Click add to cart
    await addToCartButton.click();

    // Wait for cart to update (look for success message or cart count)
    await expect(
      page.locator(
        'text=/added to cart|item added|success/i, [data-testid="cart-count"], [aria-label*="cart" i] span'
      )
    ).toBeVisible({ timeout: 5000 });

    // Verify cart count increased
    const cartCount = page.locator('[data-testid="cart-count"], [aria-label*="cart items" i]').first();
    const count = await cartCount.textContent().catch(() => '0');
    expect(parseInt(count || '0')).toBeGreaterThan(0);
  });

  test('should open cart drawer/page', async ({ page }) => {
    // Add item to cart first
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Click cart icon/button
    const cartButton = page.locator(
      '[aria-label*="cart" i], [data-testid*="cart"], button:has-text("Cart")'
    ).first();
    await cartButton.click();

    // Cart drawer or page should open
    await expect(
      page.locator('text=/shopping cart|your cart|cart items/i, [role="dialog"]').first()
    ).toBeVisible({ timeout: 5000 });

    // Verify cart has items
    const cartItems = page.locator('[data-testid*="cart-item"], [class*="cart-item"]');
    await expect(cartItems.first()).toBeVisible({ timeout: 3000 });
  });

  test('should display cart item details', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Verify cart item shows product name, price, quantity
    const cartItem = page.locator('[data-testid*="cart-item"], [class*="cart-item"]').first();
    await expect(cartItem).toBeVisible();

    // Check for price
    await expect(cartItem.locator('text=/\\$\\d+/')).toBeVisible();

    // Check for quantity
    await expect(cartItem.locator('[aria-label*="quantity" i], input[type="number"]')).toBeVisible();
  });

  test('should update item quantity in cart', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Find quantity input or increase button
    const increaseButton = page.locator('[aria-label*="increase" i], button:has-text("+")').first();

    if (await increaseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Get initial total
      const initialTotal = await page
        .locator('text=/total|subtotal/i')
        .first()
        .textContent();

      await increaseButton.click();
      await waitForNetworkIdle(page);

      // Get new total
      const newTotal = await page
        .locator('text=/total|subtotal/i')
        .first()
        .textContent();

      // Total should have increased
      expect(newTotal).not.toBe(initialTotal);
    } else {
      // Try quantity input
      const quantityInput = page.locator('input[type="number"]').first();
      if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quantityInput.fill('2');
        await waitForNetworkIdle(page);

        // Verify quantity changed
        expect(await quantityInput.inputValue()).toBe('2');
      } else {
        test.skip();
      }
    }
  });

  test('should remove item from cart', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Find and click remove button
    const removeButton = page
      .locator('button:has-text("Remove"), [aria-label*="remove" i], [aria-label*="delete" i]')
      .first();

    await removeButton.click({ timeout: 5000 });
    await waitForNetworkIdle(page);

    // Cart should be empty or item should be gone
    await expect(
      page.locator('text=/cart is empty|no items/i, [data-testid="empty-cart"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should calculate cart total correctly', async ({ page }) => {
    // Go to products page
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Get price of first product
    const firstProduct = page.locator('[data-testid*="product"], .product-card, article').first();
    const priceText = await firstProduct.locator('text=/\\$([\\d,]+\\.\\d{2})/).textContent();
    const price = parseFloat(priceText?.replace(/[$,]/g, '') || '0');

    // Add to cart
    await firstProduct.locator('button:has-text("Add to Cart")').click();
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Check total
    const totalText = await page
      .locator('text=/total:?\\s*\\$([\\d,]+\\.\\d{2})/i')
      .first()
      .textContent();
    const total = parseFloat(totalText?.replace(/[^0-9.]/g, '') || '0');

    // Total should be at least the price (might include tax/shipping)
    expect(total).toBeGreaterThanOrEqual(price);
  });

  test('should clear entire cart', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Look for clear cart button
    const clearButton = page.locator('button:has-text("Clear Cart"), button:has-text("Clear All")').first();

    if (await clearButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearButton.click();
      await waitForNetworkIdle(page);

      // Cart should be empty
      await expect(
        page.locator('text=/cart is empty|no items/i, [data-testid="empty-cart"]')
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should persist cart items after page reload', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Reload page
    await page.reload();
    await waitForNetworkIdle(page);

    // Check cart count
    const cartCount = page.locator('[data-testid="cart-count"], [aria-label*="cart items" i]').first();
    const count = await cartCount.textContent().catch(() => '0');
    expect(parseInt(count || '0')).toBeGreaterThan(0);
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Open cart
    const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
    await cartButton.click();

    // Click checkout button
    const checkoutButton = page.locator('button:has-text("Checkout"), a:has-text("Checkout")').first();
    await checkoutButton.click({ timeout: 5000 });

    // Should navigate to checkout or login (if not authenticated)
    await expect(page).toHaveURL(/checkout|signin|login/i, { timeout: 5000 });
  });

  test('should add multiple different products to cart', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Add first product
    const firstAddButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await firstAddButton.click();
    await waitForNetworkIdle(page);

    // Add second product if available
    const secondAddButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .nth(1);

    if (await secondAddButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondAddButton.click();
      await waitForNetworkIdle(page);

      // Open cart
      const cartButton = page.locator('[aria-label*="cart" i], button:has-text("Cart")').first();
      await cartButton.click();

      // Should have 2 items
      const cartItems = page.locator('[data-testid*="cart-item"], [class*="cart-item"]');
      const itemCount = await cartItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(2);
    } else {
      test.skip();
    }
  });
});
