import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock Redis for tests
jest.mock('ioredis', () => {
  const Redis = require('ioredis-mock');
  return Redis;
});

// Mock Bull for tests
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock Socket.io
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      close: jest.fn(),
    })),
  };
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 100));
});
