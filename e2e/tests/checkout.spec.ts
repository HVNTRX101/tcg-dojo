import { test, expect } from '@playwright/test';
import { testUsers, testOrders } from '../fixtures/test-data';
import { login, waitForToast, waitForLoading } from '../utils/helpers';

/**
 * Checkout Flow E2E Tests
 */

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add a product to cart
    await page.goto('/');
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.click('[data-testid="add-to-cart"]');
    await waitForToast(page);
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    await page.goto('/cart');

    // Click checkout button
    await page.click('[data-testid="checkout-button"]');

    // Should navigate to checkout
    await page.waitForURL(/checkout/);

    // Check for checkout form
    const checkoutForm = page.locator('[data-testid="checkout-form"]');
    await expect(checkoutForm).toBeVisible();
  });

  test('should display cart summary in checkout', async ({ page }) => {
    await page.goto('/checkout');

    // Check for order summary
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toBeVisible();

    // Check for subtotal
    await expect(page.locator('[data-testid="subtotal"]')).toBeVisible();

    // Check for total
    await expect(page.locator('[data-testid="total"]')).toBeVisible();
  });

  test('should fill shipping information', async ({ page }) => {
    await page.goto('/checkout');

    // Fill shipping address
    await page.fill('[name="street"]', testOrders.sampleOrder.shippingAddress.street);
    await page.fill('[name="city"]', testOrders.sampleOrder.shippingAddress.city);
    await page.fill('[name="state"]', testOrders.sampleOrder.shippingAddress.state);
    await page.fill('[name="zipCode"]', testOrders.sampleOrder.shippingAddress.zipCode);
    await page.fill('[name="country"]', testOrders.sampleOrder.shippingAddress.country);

    // Click continue button
    await page.click('[data-testid="continue-to-payment"]');

    // Should move to payment step
    const paymentSection = page.locator('[data-testid="payment-section"]');
    await expect(paymentSection).toBeVisible();
  });

  test('should validate shipping information', async ({ page }) => {
    await page.goto('/checkout');

    // Try to continue without filling required fields
    await page.click('[data-testid="continue-to-payment"]');

    // Should show validation errors
    const errors = page.locator('[role="alert"]');
    await expect(errors).toBeVisible();
  });

  test('should select payment method', async ({ page }) => {
    await page.goto('/checkout');

    // Fill shipping first
    await page.fill('[name="street"]', testOrders.sampleOrder.shippingAddress.street);
    await page.fill('[name="city"]', testOrders.sampleOrder.shippingAddress.city);
    await page.fill('[name="state"]', testOrders.sampleOrder.shippingAddress.state);
    await page.fill('[name="zipCode"]', testOrders.sampleOrder.shippingAddress.zipCode);
    await page.fill('[name="country"]', testOrders.sampleOrder.shippingAddress.country);
    await page.click('[data-testid="continue-to-payment"]');

    // Select payment method
    await page.click('[data-testid="payment-credit-card"]');

    // Verify payment form appears
    const cardForm = page.locator('[data-testid="card-form"]');
    await expect(cardForm).toBeVisible();
  });

  test('should apply promo code', async ({ page }) => {
    await page.goto('/checkout');

    // Enter promo code
    const promoInput = page.locator('[data-testid="promo-code"]');
    await promoInput.fill('TEST10');

    // Click apply button
    await page.click('[data-testid="apply-promo"]');

    // Wait for response
    await waitForToast(page);

    // Check for discount applied
    const discount = page.locator('[data-testid="discount"]');
    await expect(discount).toBeVisible();
  });

  test('should display order review before placing order', async ({ page }) => {
    await page.goto('/checkout');

    // Fill shipping
    await page.fill('[name="street"]', testOrders.sampleOrder.shippingAddress.street);
    await page.fill('[name="city"]', testOrders.sampleOrder.shippingAddress.city);
    await page.fill('[name="state"]', testOrders.sampleOrder.shippingAddress.state);
    await page.fill('[name="zipCode"]', testOrders.sampleOrder.shippingAddress.zipCode);
    await page.fill('[name="country"]', testOrders.sampleOrder.shippingAddress.country);
    await page.click('[data-testid="continue-to-payment"]');

    // Select payment
    await page.click('[data-testid="payment-credit-card"]');

    // Fill card details (mock)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Continue to review
    await page.click('[data-testid="continue-to-review"]');

    // Check for order review
    const reviewSection = page.locator('[data-testid="order-review"]');
    await expect(reviewSection).toBeVisible();

    // Verify all details are shown
    await expect(page.locator('[data-testid="review-shipping"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-payment"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-items"]')).toBeVisible();
  });

  test('should successfully place order', async ({ page }) => {
    await page.goto('/checkout');

    // Complete full checkout flow
    await page.fill('[name="street"]', testOrders.sampleOrder.shippingAddress.street);
    await page.fill('[name="city"]', testOrders.sampleOrder.shippingAddress.city);
    await page.fill('[name="state"]', testOrders.sampleOrder.shippingAddress.state);
    await page.fill('[name="zipCode"]', testOrders.sampleOrder.shippingAddress.zipCode);
    await page.fill('[name="country"]', testOrders.sampleOrder.shippingAddress.country);
    await page.click('[data-testid="continue-to-payment"]');

    await page.click('[data-testid="payment-credit-card"]');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.click('[data-testid="continue-to-review"]');

    // Place order
    await page.click('[data-testid="place-order"]');

    // Wait for processing
    await waitForLoading(page);

    // Should redirect to confirmation page
    await page.waitForURL(/order-confirmation/);

    // Check for success message
    const successMessage = page.locator('[data-testid="order-success"]');
    await expect(successMessage).toBeVisible();

    // Check for order number
    const orderNumber = page.locator('[data-testid="order-number"]');
    await expect(orderNumber).toBeVisible();
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/payments/**', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment failed' }),
      });
    });

    await page.goto('/checkout');

    // Complete checkout
    await page.fill('[name="street"]', testOrders.sampleOrder.shippingAddress.street);
    await page.fill('[name="city"]', testOrders.sampleOrder.shippingAddress.city);
    await page.fill('[name="state"]', testOrders.sampleOrder.shippingAddress.state);
    await page.fill('[name="zipCode"]', testOrders.sampleOrder.shippingAddress.zipCode);
    await page.fill('[name="country"]', testOrders.sampleOrder.shippingAddress.country);
    await page.click('[data-testid="continue-to-payment"]');

    await page.click('[data-testid="payment-credit-card"]');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.click('[data-testid="continue-to-review"]');

    await page.click('[data-testid="place-order"]');

    // Should show error message
    await waitForToast(page);
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/failed/i);
  });
});
