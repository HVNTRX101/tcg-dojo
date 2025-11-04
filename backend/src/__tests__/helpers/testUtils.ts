import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export const mockRequest = (overrides: any = {}): Partial<Request> => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ...overrides,
  };
};

export const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();

// Test database setup
export const setupTestDatabase = async (prisma: PrismaClient) => {
  // Clean up database before tests
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations';
  `;

  for (const { name } of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
  }

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
};

export const cleanupTestDatabase = async (prisma: PrismaClient) => {
  await prisma.$disconnect();
};

// Helper to generate random test data
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2);
};

export const generateRandomEmail = (): string => {
  return `test_${generateRandomString()}@example.com`;
};

export const generateRandomNumber = (min: number = 1, max: number = 1000): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
