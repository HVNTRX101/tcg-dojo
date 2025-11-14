/**
 * Test data fixtures for E2E tests
 */

export const testUsers = {
  validUser: {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    firstName: 'E2E',
    lastName: 'Test',
  },
  newUser: {
    email: `e2e-new-${Date.now()}@example.com`,
    password: 'NewPassword123!',
    firstName: 'New',
    lastName: 'User',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!',
  },
};

export const testProducts = {
  searchTerm: 'Lotus',
  category: 'Magic: The Gathering',
  filters: {
    rarity: 'Rare',
    condition: 'Near Mint',
    priceRange: [0, 10000],
  },
};

export const testCheckout = {
  shippingAddress: {
    fullName: 'E2E Test User',
    addressLine1: '123 Test Street',
    addressLine2: 'Apt 4',
    city: 'Test City',
    state: 'CA',
    zipCode: '90210',
    country: 'United States',
  },
  cardInfo: {
    number: '4242424242424242', // Stripe test card
    expiry: '12/25',
    cvc: '123',
    name: 'E2E Test User',
  },
};
