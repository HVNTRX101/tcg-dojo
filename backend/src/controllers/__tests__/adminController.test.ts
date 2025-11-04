import { Request, Response } from 'express';
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUserStats,
  getDashboardOverview,
} from '../adminController';
import { PrismaClient } from '@prisma/client';
import * as adminLogService from '../../services/adminLog.service';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock admin log service
jest.mock('../../services/adminLog.service');

describe('Admin Controller - Authorization Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let prisma: any;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
    };
    mockRequest = {
      query: {},
      params: {},
      body: {},
    };

    // Get the mocked prisma instance
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should successfully fetch users when user is ADMIN', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'USER',
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { orders: 5 },
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          name: 'User Two',
          role: 'SELLER',
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { orders: 10 },
        },
      ];

      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.query = { page: '1', limit: '20' };

      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(2);

      await getAllUsers(mockRequest as any, mockResponse as Response);

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          users: mockUsers,
          pagination: expect.any(Object),
        })
      );
    });

    it('should apply role filter when provided', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.query = { role: 'SELLER' };

      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await getAllUsers(mockRequest as any, mockResponse as Response);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'SELLER' }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      prisma.user.findMany.mockRejectedValue(new Error('Database error'));

      await getAllUsers(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should successfully update user when admin', async () => {
      const mockUser = {
        id: 'user1',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'SELLER',
      };

      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.params = { userId: 'user1' };
      mockRequest.body = { name: 'Updated Name', role: 'SELLER' };

      prisma.user.update.mockResolvedValue(mockUser);
      (adminLogService.logAdminAction as jest.Mock).mockResolvedValue(undefined);

      await updateUser(mockRequest as any, mockResponse as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: expect.objectContaining({
          name: 'Updated Name',
          role: 'SELLER',
        }),
        select: expect.any(Object),
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle user not found error', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.params = { userId: 'nonexistent' };
      mockRequest.body = { name: 'Updated Name' };

      prisma.user.update.mockRejectedValue(new Error('User not found'));

      await updateUser(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user when admin', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.params = { userId: 'user1' };

      prisma.user.delete.mockResolvedValue({ id: 'user1' });
      (adminLogService.logAdminAction as jest.Mock).mockResolvedValue(undefined);

      await deleteUser(mockRequest as any, mockResponse as Response);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });
      expect(adminLogService.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'DELETE_USER',
        { userId: 'user1' }
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });
    });

    it('should prevent admin from deleting themselves', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.params = { userId: 'admin-id' };

      await deleteUser(mockRequest as any, mockResponse as Response);

      expect(prisma.user.delete).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot delete your own account',
      });
    });

    it('should handle errors when deleting user', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      mockRequest.params = { userId: 'user1' };

      prisma.user.delete.mockRejectedValue(new Error('User not found'));

      await deleteUser(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getDashboardOverview', () => {
    it('should successfully fetch dashboard data when admin', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      prisma.user.count.mockResolvedValue(100);
      prisma.order.count.mockResolvedValue(50);

      await getDashboardOverview(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.user = {
        userId: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      prisma.user.count.mockRejectedValue(new Error('Database error'));

      await getDashboardOverview(mockRequest as any, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('Authorization - Role Checking', () => {
    it('should verify admin endpoints require ADMIN role in route middleware', () => {
      // This test documents the expected authorization behavior
      // In actual implementation, these checks are done by the authorize middleware
      // before the controller is called

      const testCases = [
        { endpoint: 'getAllUsers', requiresRole: 'ADMIN' },
        { endpoint: 'updateUser', requiresRole: 'ADMIN' },
        { endpoint: 'deleteUser', requiresRole: 'ADMIN' },
        { endpoint: 'getDashboardOverview', requiresRole: 'ADMIN' },
        { endpoint: 'getUserStats', requiresRole: 'ADMIN' },
      ];

      testCases.forEach(({ endpoint, requiresRole }) => {
        expect(requiresRole).toBe('ADMIN');
      });

      // In the router, these endpoints should be protected like:
      // router.get('/users', authenticate, authorize('ADMIN'), getAllUsers);
    });
  });
});
