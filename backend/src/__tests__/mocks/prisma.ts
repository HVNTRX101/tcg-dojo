/**
 * Shared Prisma mock for tests.
 *
 * Usage in test files:
 *   jest.mock('../../config/database', () => require('../../__tests__/mocks/prisma').mockPrisma);
 *
 * All model methods are jest.fn() by default. Configure return values in
 * individual tests via mockPrisma.<model>.<method>.mockResolvedValue(...).
 */

const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
  aggregate: jest.fn(),
});

export const mockPrisma = {
  user: createModelMock(),
  order: createModelMock(),
  orderItem: createModelMock(),
  orderStatusHistory: createModelMock(),
  product: createModelMock(),
  notification: createModelMock(),
  userSettings: createModelMock(),
  cart: createModelMock(),
  cartItem: createModelMock(),
  coupon: createModelMock(),
  seller: createModelMock(),
  review: createModelMock(),
  message: createModelMock(),
  conversation: createModelMock(),
  $executeRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

export default mockPrisma;
