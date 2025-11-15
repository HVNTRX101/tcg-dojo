/**
 * E2E Test Data Fixtures
 */

export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123456!',
    name: 'Test User',
  },
  newUser: {
    email: `test-${Date.now()}@example.com`,
    password: 'NewUser123!',
    name: 'New Test User',
  },
  seller: {
    email: 'seller@example.com',
    password: 'Seller123!',
    name: 'Test Seller',
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Test Admin',
  },
};

export const testProducts = {
  sampleProduct: {
    name: 'Test Trading Card',
    description: 'A rare test trading card for E2E testing',
    price: 29.99,
    category: 'TCG',
    condition: 'Near Mint',
    stock: 10,
  },
  bulkProduct: {
    name: 'Bulk Card Set',
    description: 'A set of common cards for bulk purchase',
    price: 99.99,
    category: 'TCG',
    condition: 'Lightly Played',
    stock: 5,
  },
};

export const testOrders = {
  sampleOrder: {
    shippingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TC',
      zipCode: '12345',
      country: 'Test Country',
    },
    paymentMethod: 'credit_card',
  },
};

export const testReviews = {
  positiveReview: {
    rating: 5,
    title: 'Excellent product!',
    comment: 'This is a great trading card. Highly recommended!',
  },
  negativeReview: {
    rating: 2,
    title: 'Not as described',
    comment: 'The condition was not as described in the listing.',
  },
};
