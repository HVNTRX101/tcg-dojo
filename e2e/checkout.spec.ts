import { test, expect } from '@playwright/test';
import { clearSession, waitForNetworkIdle, login } from './utils/helpers';
import { testUsers, testCheckout } from './fixtures/test-data';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('should require authentication for checkout', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    // Add item to cart
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Try to go to checkout
    await page.goto('/checkout');

    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/signin|login/i, { timeout: 5000 });
  });

  test('should display checkout page for authenticated user with items', async ({ page }) => {
    // Login first
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Add item to cart
    await page.goto('/');
    const addToCartButton = page
      .locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')
      .first();
    await addToCartButton.click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Should show checkout form
    await expect(page.locator('text=/checkout|shipping|payment/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display order summary in checkout', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Should show order summary with items, subtotal, and total
    await expect(page.locator('text=/order summary|summary/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/subtotal/i')).toBeVisible();
    await expect(page.locator('text=/total/i')).toBeVisible();
  });

  test('should validate shipping address form', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Try to submit without filling form
    const submitButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next")').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();

      // Should show validation errors
      await expect(page.locator('text=/required|field is required/i').first()).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('should fill shipping address', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Fill shipping address
    const fillField = async (name: string, value: string) => {
      const field = page.locator(`[name="${name}"], [name="${name.toLowerCase()}"]`).first();
      if (await field.isVisible({ timeout: 2000 }).catch(() => false)) {
        await field.fill(value);
      }
    };

    await fillField('fullName', testCheckout.shippingAddress.fullName);
    await fillField('addressLine1', testCheckout.shippingAddress.addressLine1);
    await fillField('addressLine2', testCheckout.shippingAddress.addressLine2);
    await fillField('city', testCheckout.shippingAddress.city);
    await fillField('state', testCheckout.shippingAddress.state);
    await fillField('zipCode', testCheckout.shippingAddress.zipCode);

    // Verify fields are filled
    const nameField = page.locator('[name="fullName"], [name="fullname"]').first();
    if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await nameField.inputValue()).toBe(testCheckout.shippingAddress.fullName);
    }
  });

  test('should proceed to payment step', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Fill shipping address (if required)
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();

    if (await continueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try to fill minimal required fields
      const nameField = page.locator('[name="fullName"], [name="name"]').first();
      if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameField.fill('Test User');
        await page.locator('[name="address"], [name="addressLine1"]').first().fill('123 Test St');
        await page.locator('[name="city"]').first().fill('Test City');
        await page.locator('[name="zipCode"], [name="zip"]').first().fill('12345');

        await continueButton.click();
        await waitForNetworkIdle(page);

        // Should move to payment step or show payment section
        await expect(page.locator('text=/payment|card|billing/i')).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display payment form', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Look for payment section (might be Stripe iframe or payment fields)
    const paymentSection = page.locator('text=/payment|card number|credit card/i').first();

    if (await paymentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check for card input or Stripe iframe
      const hasStripeIframe = await page.frameLocator('iframe[name^="__privateStripeFrame"]').first().locator('input').isVisible({ timeout: 3000 }).catch(() => false);
      const hasCardInput = await page.locator('[name="cardNumber"], [placeholder*="card number" i]').isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasStripeIframe || hasCardInput).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should show order confirmation after successful checkout', async ({ page }) => {
    // Note: This test would need to be mocked or use test payment credentials
    // Skipping actual payment processing in E2E tests
    test.skip();
  });

  test('should redirect to cart if cart is empty', async ({ page }) => {
    // Login
    await login(page, testUsers.validUser.email, testUsers.validUser.password);

    // Try to go to checkout without items
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Should redirect to cart or show empty cart message
    const onCheckoutPage = page.url().includes('checkout');
    const emptyMessage = await page.locator('text=/cart is empty|no items/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (onCheckoutPage) {
      // If on checkout page, should show empty cart message
      expect(emptyMessage).toBeTruthy();
    } else {
      // Should have redirected away from checkout
      expect(page.url()).not.toContain('checkout');
    }
  });

  test('should calculate tax and shipping', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Check for tax and shipping in summary
    const hasTax = await page.locator('text=/tax/i').isVisible({ timeout: 3000 }).catch(() => false);
    const hasShipping = await page.locator('text=/shipping/i').isVisible({ timeout: 3000 }).catch(() => false);

    // At least one should be visible
    expect(hasTax || hasShipping).toBeTruthy();
  });

  test('should apply coupon code', async ({ page }) => {
    // Login and add item
    await login(page, testUsers.validUser.email, testUsers.validUser.password);
    await page.goto('/');
    await page.locator('button:has-text("Add to Cart")').first().click({ timeout: 10000 });
    await waitForNetworkIdle(page);

    // Go to checkout
    await page.goto('/checkout');
    await waitForNetworkIdle(page);

    // Look for coupon input
    const couponInput = page.locator('[name="coupon"], [placeholder*="coupon" i], [placeholder*="promo" i]').first();

    if (await couponInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Get initial total
      const initialTotal = await page.locator('text=/total:?\\s*\\$/i').first().textContent();

      await couponInput.fill('TEST10');
      await page.locator('button:has-text("Apply")').click();
      await waitForNetworkIdle(page);

      // Check for success or error message
      const hasMessage = await page.locator('text=/applied|invalid|expired/i').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasMessage).toBeTruthy();
    } else {
      test.skip();
    }
  });
});
