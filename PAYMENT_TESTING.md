# Payment Flow Integration Testing

## Overview
Comprehensive test coverage for Stripe payment integration, covering payment intent creation, webhook handling, refunds, and full E2E payment flows.

## Test Coverage

### Backend Integration Tests

#### Payment Service Tests (`backend/src/services/__tests__/paymentService.test.ts`)
**Total: 25+ tests**

##### Payment Intent Management
- ✅ Create payment intent successfully
- ✅ Convert decimal amounts to cents correctly
- ✅ Handle create payment intent errors
- ✅ Use default currency if not provided
- ✅ Retrieve payment intent successfully
- ✅ Handle retrieve errors
- ✅ Confirm payment intent with payment method
- ✅ Confirm without payment method
- ✅ Handle confirmation errors
- ✅ Cancel payment intent successfully
- ✅ Handle cancel errors

##### Refund Processing
- ✅ Create full refund successfully
- ✅ Create partial refund with amount
- ✅ Handle refund errors
- ✅ Accept different refund reasons (duplicate, fraudulent, requested_by_customer)

##### Customer Management
- ✅ Create customer successfully
- ✅ Handle create customer errors
- ✅ Retrieve customer successfully
- ✅ Handle retrieve customer errors

##### Webhook Handling
- ✅ Construct and verify webhook event
- ✅ Handle invalid webhook signatures

##### Metadata Management
- ✅ Update payment intent metadata
- ✅ Handle update errors

#### Payment Controller Tests (`backend/src/controllers/__tests__/paymentController.test.ts`)
**Total: 20+ tests**

##### Create Payment Intent Endpoint
- ✅ Create payment intent for valid order
- ✅ Return 400 if order ID is missing
- ✅ Return 404 if order not found
- ✅ Return 403 if user does not own the order
- ✅ Return 400 if order already paid
- ✅ Return 400 if order is cancelled
- ✅ Reuse existing payment intent if valid
- ✅ Create new payment intent if existing one is cancelled

##### Payment Status Endpoint
- ✅ Return payment status for valid payment intent
- ✅ Return 404 if order not found for payment
- ✅ Return 403 if user does not own the order

##### Refund Endpoint
- ✅ Process refund for admin user
- ✅ Return 403 for non-admin users
- ✅ Return 404 if order not found
- ✅ Return 400 if order has no payment

##### Webhook Endpoint
- ✅ Handle payment_intent.succeeded webhook
- ✅ Return 400 if stripe signature is missing
- ✅ Return 400 for invalid webhook signature
- ✅ Handle payment_intent.payment_failed webhook
- ✅ Handle payment_intent.canceled webhook
- ✅ Handle charge.refunded webhook

##### Config Endpoint
- ✅ Return publishable key

### E2E Tests

#### Payment Flow E2E (`e2e/payment-flow.spec.ts`)
**Total: 15 tests**

##### Stripe Integration
- ✅ Display Stripe payment form in checkout
- ✅ Load Stripe publishable key
- ✅ Create payment intent when starting checkout
- ✅ Display payment amount correctly

##### Payment Processing
- ✅ Show error for invalid card details
- ✅ Successfully process test payment with Stripe test card
- ✅ Show payment processing indicator
- ✅ Allow payment retry after failure
- ✅ Handle payment timeout gracefully

##### Cart & Order Management
- ✅ Not allow payment for empty cart
- ✅ Preserve cart if payment is cancelled

##### Success & Confirmation (Documented for future implementation)
- ⏳ Display order confirmation after successful payment
- ⏳ Send payment receipt email after successful payment
- ⏳ Update order status in real-time via webhook

## Stripe Test Cards

### Successful Payments
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Card Errors
```
Declined: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Lost Card: 4000 0000 0000 9987
Stolen Card: 4000 0000 0000 9979
Expired Card: 4000 0000 0000 0069
Incorrect CVC: 4000 0000 0000 0127
Processing Error: 4000 0000 0000 0119
```

### 3D Secure
```
3DS Required: 4000 0027 6000 3184
3DS Optional: 4000 0025 0000 3155
```

## Test Implementation Details

### Mocking Strategy

#### Service Tests
```typescript
// Mock Stripe SDK
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      update: vi.fn(),
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));
```

#### Controller Tests
```typescript
// Mock dependencies
vi.mock('../../services/paymentService');
vi.mock('../../config/database');
vi.mock('../../services/emailService');
vi.mock('../../services/messageQueue');
```

### Test Data

#### Mock Payment Intent
```typescript
{
  id: 'pi_test_123',
  amount: 10000, // $100 in cents
  currency: 'usd',
  status: 'requires_payment_method',
  client_secret: 'pi_test_123_secret'
}
```

#### Mock Order
```typescript
{
  id: 'order_123',
  userId: 'user_123',
  total: 100,
  paymentStatus: 'PENDING',
  status: 'PENDING',
  paymentIntentId: null
}
```

#### Mock Refund
```typescript
{
  id: 're_test_123',
  amount: 10000,
  status: 'succeeded',
  payment_intent: 'pi_test_123',
  reason: 'requested_by_customer'
}
```

## Running Tests

### Unit & Integration Tests
```bash
# Run all backend tests
cd backend && npm test

# Run only payment tests
cd backend && npm test paymentService
cd backend && npm test paymentController

# Run with coverage
cd backend && npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run only payment E2E tests
npx playwright test e2e/payment-flow.spec.ts

# Run in headed mode to see browser
npm run test:e2e:headed -- e2e/payment-flow.spec.ts

# Debug mode
npm run test:e2e:debug -- e2e/payment-flow.spec.ts
```

## Webhook Testing

### Local Webhook Testing with Stripe CLI

1. **Install Stripe CLI**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
```

2. **Login to Stripe**
```bash
stripe login
```

3. **Forward webhooks to local server**
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

4. **Trigger test webhooks**
```bash
# Payment succeeded
stripe trigger payment_intent.succeeded

# Payment failed
stripe trigger payment_intent.payment_failed

# Refund
stripe trigger charge.refunded
```

### Webhook Event Types Handled

- `payment_intent.succeeded` → Order status: PROCESSING, Payment status: COMPLETED
- `payment_intent.payment_failed` → Payment status: FAILED, Send failure email
- `payment_intent.canceled` → Log cancellation
- `charge.refunded` → Payment status: REFUNDED, Send refund email

## Error Scenarios Tested

### Payment Intent Creation
- ❌ Missing order ID
- ❌ Order not found
- ❌ User not authorized for order
- ❌ Order already paid
- ❌ Order cancelled
- ❌ Stripe API errors

### Payment Processing
- ❌ Invalid card number
- ❌ Card declined
- ❌ Insufficient funds
- ❌ Expired card
- ❌ Incorrect CVC
- ❌ Network timeout

### Refunds
- ❌ Non-admin trying to refund
- ❌ Order not found
- ❌ Order has no payment
- ❌ Payment not completed
- ❌ Already refunded

### Webhooks
- ❌ Missing signature header
- ❌ Invalid signature
- ❌ Malformed payload
- ❌ Missing order ID in metadata

## Security Considerations

### Test Environment
- ✅ Use Stripe test mode API keys only
- ✅ Never commit real API keys
- ✅ Webhook signature verification required
- ✅ User authorization checks
- ✅ Admin-only refund endpoints

### Data Protection
- ✅ No card data stored in database
- ✅ PCI compliance via Stripe Elements
- ✅ TLS/HTTPS required for production
- ✅ Payment intents expire after 24 hours

## Integration with CI/CD

### Environment Variables Required
```bash
# Stripe API Keys (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL for email links
FRONTEND_URL=http://localhost:5173
```

### GitHub Actions
Tests run automatically on:
- Push to main/master branches
- Pull requests
- Manual workflow dispatch

## Best Practices

### 1. Always Use Test Mode
```typescript
// Verify test mode keys
if (!config.stripe.secretKey.startsWith('sk_test_')) {
  throw new Error('Production keys should not be used in tests');
}
```

### 2. Mock External Services
```typescript
// Don't make real Stripe API calls in unit tests
vi.mock('stripe');
```

### 3. Test Idempotency
```typescript
// Test that creating duplicate payment intents is handled
it('should reuse existing payment intent', async () => {
  // First call
  await createPaymentIntent(order.id);
  // Second call should reuse
  await createPaymentIntent(order.id);
});
```

### 4. Test Webhook Signatures
```typescript
it('should reject invalid webhook signatures', () => {
  expect(() => constructWebhookEvent(payload, 'invalid')).toThrow();
});
```

### 5. Test Amount Conversion
```typescript
it('should convert dollars to cents', () => {
  await createPaymentIntent(49.99); // Should be 4999 cents
  expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 4999 })
  );
});
```

## Troubleshooting

### Tests Failing

**Problem**: Payment intent creation fails
```
Solution: Verify STRIPE_SECRET_KEY is set and valid
```

**Problem**: Webhook tests fail
```
Solution: Check STRIPE_WEBHOOK_SECRET is configured
```

**Problem**: E2E tests timeout
```
Solution: Ensure dev server is running and Stripe Elements loads
```

### Common Issues

1. **Missing Environment Variables**
   - Ensure `.env` file is configured
   - Check that test environment loads correct keys

2. **Stripe API Version Mismatch**
   - Update Stripe SDK: `npm install stripe@latest`
   - Check API version compatibility

3. **Webhook Signature Verification Fails**
   - Verify raw body is passed to webhook handler
   - Check signature header is present

4. **Payment Intent Already Exists**
   - Test is creating duplicate payment intents
   - Clear test database between runs

## Future Enhancements

- [ ] Add tests for 3D Secure authentication
- [ ] Test subscription/recurring payments
- [ ] Add tests for payment method storage
- [ ] Test multi-currency payments
- [ ] Add load testing for payment endpoints
- [ ] Test payment dispute handling
- [ ] Add tests for partial captures
- [ ] Test payment intent confirmation timing

## Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [PCI Compliance](https://stripe.com/docs/security)
