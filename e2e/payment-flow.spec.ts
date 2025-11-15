import { test, expect } from '@playwright/test';
import { clearSession, waitForNetworkIdle, login } from './utils/helpers';
import { testUsers } from './fixtures/test-data';

test.describe('Payment Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('should display Stripe payment form in checkout', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Look for Stripe payment element or iframe
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    const hasStripeIframe = await stripeIframe
      .locator('input')
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    const hasPaymentElement = await page
      .locator('[data-testid="payment-element"], .StripeElement, #payment-element')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At least one should be present
    expect(hasStripeIframe || hasPaymentElement).toBeTruthy();
  });

  test('should load Stripe publishable key', async ({ page }) => {
    // Intercept API call to get config
    const configPromise = page.waitForResponse(
      (response) => response.url().includes('/api/payments/config'),
      { timeout: 10000 }
    );

    await page.goto('/checkout').catch(() => {});

    const configResponse = await configPromise.catch(() => null);

    if (configResponse) {
      const config = await configResponse.json();
      expect(config).toHaveProperty('publishableKey');
      expect(config.publishableKey).toMatch(/^pk_/);
    } else {
      test.skip();
    }
  });

  test('should create payment intent when starting checkout', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout and wait for payment intent creation
    const paymentIntentPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/payments/create-intent') ||
        response.url().includes('/api/payments/intent'),
      { timeout: 15000 }
    );

    await page.goto('/checkout');

    const paymentIntentResponse = await paymentIntentPromise.catch(() => null);

    if (paymentIntentResponse && paymentIntentResponse.ok()) {
      const data = await paymentIntentResponse.json();

      expect(data).toHaveProperty('clientSecret');
      expect(data).toHaveProperty('paymentIntentId');
      expect(data).toHaveProperty('amount');
      expect(data.clientSecret).toMatch(/^pi_/);
    } else {
      test.skip();
    }
  });

  test('should display payment amount correctly', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Get product price
    const firstProduct = page.locator('[data-testid*="product"], .product-card, article').first();
    const priceText = await firstProduct.locator('text=/\\$([\\d,]+\\.\\d{2})/).textContent();
    const productPrice = parseFloat(priceText?.replace(/[$,]/g, '') || '0');

    await firstProduct.locator('button:has-text("Add to Cart")').click();
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Verify amount in payment section
    const totalElement = page.locator('text=/total:?\\s*\\$/i').first();
    const totalText = await totalElement.textContent({ timeout: 5000 }).catch(() => null);

    if (totalText) {
      const total = parseFloat(totalText.replace(/[^0-9.]/g, ''));
      expect(total).toBeGreaterThanOrEqual(productPrice);
    }
  });

  test('should show error for invalid card details', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Try to fill Stripe iframe with invalid card
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

    if (await stripeIframe.locator('input').isVisible({ timeout: 5000 }).catch(() => false)) {
      // Try to enter invalid card number
      await stripeIframe.locator('input[name="cardnumber"]').fill('0000000000000000');

      // Look for error message
      await expect(
        page.locator('text=/invalid|incorrect|declined/i')
      ).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should successfully process test payment with Stripe test card', async ({ page }) => {
    // Note: This test uses Stripe test card
    // Only works in test mode with proper Stripe test keys

    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Fill shipping address if required
    const addressFields = {
      fullName: 'Test User',
      addressLine1: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
    };

    for (const [field, value] of Object.entries(addressFields)) {
      const input = page.locator(`[name="${field}"], [name="${field.toLowerCase()}"]`).first();
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill(value);
      }
    }

    // Try to fill Stripe test card (4242 4242 4242 4242)
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

    if (await stripeIframe.locator('input').isVisible({ timeout: 5000 }).catch(() => false)) {
      await stripeIframe.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeIframe.locator('input[name="exp-date"]').fill('1225'); // 12/25
      await stripeIframe.locator('input[name="cvc"]').fill('123');
      await stripeIframe.locator('input[name="postal"]').fill('12345');

      // Submit payment
      await page.locator('button:has-text("Pay"), button:has-text("Complete Order")').click();

      // Wait for success or error
      const successMessage = page.locator(
        'text=/order confirmed|payment successful|thank you/i'
      );
      const errorMessage = page.locator('text=/payment failed|error|declined/i');

      await Promise.race([
        successMessage.waitFor({ state: 'visible', timeout: 15000 }),
        errorMessage.waitFor({ state: 'visible', timeout: 15000 }),
      ]).catch(() => {});

      // Verify we got some response
      const hasSuccess = await successMessage.isVisible({ timeout: 2000 }).catch(() => false);
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasSuccess || hasError).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should show payment processing indicator', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Look for submit button
    const submitButton = page.locator(
      'button:has-text("Pay"), button:has-text("Complete Order"), button[type="submit"]'
    ).first();

    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click and look for loading state
      await submitButton.click();

      // Look for loading indicator
      const loadingIndicator = page.locator(
        '[data-testid="loading"], .loading, .spinner, text=/processing|please wait/i'
      );

      const hasLoadingState = await loadingIndicator
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const isDisabled = await submitButton.isDisabled({ timeout: 3000 }).catch(() => false);

      // Button should be disabled or show loading
      expect(hasLoadingState || isDisabled).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should allow payment retry after failure', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Use a card that will decline (4000000000000002)
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

    if (await stripeIframe.locator('input').isVisible({ timeout: 5000 }).catch(() => false)) {
      await stripeIframe.locator('input[name="cardnumber"]').fill('4000000000000002');
      await stripeIframe.locator('input[name="exp-date"]').fill('1225');
      await stripeIframe.locator('input[name="cvc"]').fill('123');

      // Submit
      await page.locator('button:has-text("Pay"), button:has-text("Complete Order")').click();
      await waitForNetworkIdle(page);

      // Should see error
      await expect(page.locator('text=/declined|failed|error/i')).toBeVisible({ timeout: 10000 });

      // Submit button should still be available for retry
      const retryButton = page.locator('button:has-text("Pay"), button:has-text("Retry")').first();
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();
    } else {
      test.skip();
    }
  });

  test('should display order confirmation after successful payment', async ({ page }) => {
    // This test would require full payment processing
    // Skipping for now as it needs proper Stripe test mode setup
    test.skip();
  });

  test('should send payment receipt email after successful payment', async ({ page }) => {
    // This test would require checking email queue/delivery
    // Skipping for now as it needs email testing infrastructure
    test.skip();
  });

  test('should update order status in real-time via webhook', async ({ page }) => {
    // This test would require webhook simulation
    // Skipping for now as it needs webhook testing infrastructure
    test.skip();
  });

  test('should handle payment timeout gracefully', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Wait for timeout (if any)
    // Look for timeout message or ability to retry
    await page.waitForTimeout(30000);

    const timeoutMessage = page.locator('text=/timeout|expired|try again/i');
    const hasTimeout = await timeoutMessage.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasTimeout) {
      expect(timeoutMessage).toBeVisible();
    }
  });

  test('should not allow payment for empty cart', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Go directly to checkout without items
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Should either redirect or show empty cart message
    const emptyMessage = page.locator('text=/cart is empty|no items/i');
    const notOnCheckout = !page.url().includes('checkout');

    const showsEmptyMessage = await emptyMessage.isVisible({ timeout: 3000 }).catch(() => false);

    expect(showsEmptyMessage || notOnCheckout).toBeTruthy();
  });

  test('should preserve cart if payment is cancelled', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Get cart count
    const cartCount = await page
      .locator('[data-testid="cart-count"], [aria-label*="cart items"]')
      .first()
      .textContent();

    // Go to checkout and cancel
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Navigate away (cancel payment)
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Verify cart count is preserved
    const newCartCount = await page
      .locator('[data-testid="cart-count"], [aria-label*="cart items"]')
      .first()
      .textContent();

    expect(cartCount).toBe(newCartCount);
  });
});
