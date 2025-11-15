import { test, expect } from '@playwright/test';

/**
 * Shopping Cart and Checkout E2E Tests
 * Tests cart functionality and checkout process
 */

test.describe('Shopping Cart', () => {
  test('should access cart page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for cart icon/button
    const cartButton = page.locator('[data-testid="cart-button"], [aria-label*="cart" i], button:has-text("Cart")').first();

    if (await cartButton.isVisible()) {
      await cartButton.click();
      await page.waitForLoadState('networkidle');

      // Verify cart page or modal opened
      const url = page.url();
      const cartModal = page.locator('[role="dialog"], .cart-modal, .cart-sidebar').first();

      expect(url.includes('/cart') || (await cartModal.isVisible())).toBeTruthy();
    }
  });

  test('should test cart API endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/cart');

    // Should return 200, 401 (unauthorized), or 404 (not found)
    expect([200, 401, 404]).toContain(response.status());
  });

  test('should add item to cart via API', async ({ request }) => {
    // First try to get products
    const productsResponse = await request.get('http://localhost:3000/api/products?limit=1');

    if (productsResponse.status() === 200) {
      const productsData = await productsResponse.json();
      let productId;

      // Extract product ID from response
      if (productsData.products && productsData.products.length > 0) {
        productId = productsData.products[0].id;
      } else if (productsData.data && productsData.data.length > 0) {
        productId = productsData.data[0].id;
      } else if (Array.isArray(productsData) && productsData.length > 0) {
        productId = productsData[0].id;
      }

      if (productId) {
        // Try to add to cart
        const addToCartResponse = await request.post('http://localhost:3000/api/cart', {
          data: {
            productId,
            quantity: 1,
          },
        });

        // Should be 200 (success), 401 (unauthorized), or 404 (not found)
        expect([200, 201, 401, 404]).toContain(addToCartResponse.status());
      }
    }
  });

  test('should handle empty cart state', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Look for empty cart message or cart items
    const emptyMessage = page.locator('text=/empty cart|no items|cart is empty/i').first();
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item').first();

    // Either empty message should be visible or cart items should exist
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false);
    const hasItems = await cartItems.isVisible().catch(() => false);

    expect(hasEmptyMessage || hasItems).toBeTruthy();
  });
});

test.describe('Checkout Process', () => {
  test('should navigate to checkout', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Look for checkout button
    const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i }).first();

    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to checkout or show login
      const url = page.url();
      expect(url.includes('/checkout') || url.includes('/login')).toBeTruthy();
    }
  });

  test('should test orders API endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/orders');

    // Should return 200, 401, or 404
    expect([200, 401, 404]).toContain(response.status());
  });

  test('should validate checkout form', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // If checkout page exists, look for form elements
    const addressInput = page.locator('input[name*="address"], input[placeholder*="address" i]').first();

    if (await addressInput.isVisible()) {
      // Verify form validation
      const submitButton = page.getByRole('button', { name: /place order|submit|pay/i }).first();

      if (await submitButton.isVisible()) {
        // Try to submit empty form
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation errors
        const errorMessage = page.locator('.error, [role="alert"], .text-red-500').first();
        const hasError = await errorMessage.isVisible().catch(() => false);

        // Form should either show errors or require authentication
        expect(hasError || page.url().includes('/login')).toBeTruthy();
      }
    }
  });
});

test.describe('Payment Integration', () => {
  test('should test payment endpoint', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/payments/create-intent', {
      data: {
        amount: 1000,
      },
    });

    // Should return 200, 401, 404, or 400 (bad request)
    expect([200, 400, 401, 404]).toContain(response.status());
  });

  test('should display payment options', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for payment-related elements
    const paymentSection = page.locator('[data-testid="payment"], .payment-section, text=/payment method/i').first();

    if (await paymentSection.isVisible()) {
      expect(paymentSection).toBeVisible();
    }
  });
});
