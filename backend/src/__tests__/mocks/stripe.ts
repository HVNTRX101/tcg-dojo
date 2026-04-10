/**
 * Shared Stripe mock for tests.
 *
 * Usage in test files:
 *   jest.mock('stripe', () => require('../../__tests__/mocks/stripe').StripeMock);
 *
 * Then retrieve the mock instances via:
 *   const { mockStripe } = require('../../__tests__/mocks/stripe');
 */

export const mockPaymentIntents = {
  create: jest.fn(),
  retrieve: jest.fn(),
  confirm: jest.fn(),
  cancel: jest.fn(),
  update: jest.fn(),
};

export const mockRefunds = {
  create: jest.fn(),
};

export const mockCustomers = {
  create: jest.fn(),
  retrieve: jest.fn(),
};

export const mockWebhooks = {
  constructEvent: jest.fn(),
};

export const mockStripe = {
  paymentIntents: mockPaymentIntents,
  refunds: mockRefunds,
  customers: mockCustomers,
  webhooks: mockWebhooks,
};

/**
 * Default export is a constructor that returns the mock instance.
 * This matches how stripe is imported: `new Stripe(key, opts)`
 */
export const StripeMock = jest.fn().mockImplementation(() => mockStripe);

export default StripeMock;
