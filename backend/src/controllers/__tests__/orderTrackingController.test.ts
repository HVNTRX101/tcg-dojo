import { mockPrisma } from '../../__tests__/mocks/prisma';

jest.mock('../../config/database', () => {
  const { mockPrisma } = require('../../__tests__/mocks/prisma');
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../services/orderTrackingService', () => ({
  getOrderWithTracking: jest.fn(),
  getOrderStatusHistory: jest.fn(),
  updateOrderStatus: jest.fn(),
  addTrackingNumber: jest.fn(),
  canModifyOrder: jest.fn(),
}));

import {
  getOrderTracking,
  getStatusHistory,
  updateStatus,
  setTrackingNumber,
  getMyOrders,
  getOrderStats,
} from '../orderTrackingController';
import {
  getOrderWithTracking,
  getOrderStatusHistory,
  updateOrderStatus,
  addTrackingNumber,
  canModifyOrder,
} from '../../services/orderTrackingService';
import { mockRequest, mockResponse } from '../../__tests__/helpers/testUtils';

describe('OrderTrackingController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ============================================
  // getOrderTracking
  // ============================================
  describe('getOrderTracking', () => {
    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      items: [{ product: { sellerId: 'seller-1' } }],
    };

    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { orderId: 'order-1' },
      });
      (getOrderWithTracking as jest.Mock).mockResolvedValue(mockOrder);
    });

    it('should return order for owner', async () => {
      await getOrderTracking(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: mockOrder });
    });

    it('should allow admin access to any order', async () => {
      req.user = { userId: 'admin-1' };
      (getOrderWithTracking as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', seller: null });

      await getOrderTracking(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: expect.any(Object) });
    });

    it('should allow seller access when they have products in order', async () => {
      req.user = { userId: 'seller-user' };
      (getOrderWithTracking as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'SELLER',
        seller: { id: 'seller-1' },
      });

      await getOrderTracking(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: expect.any(Object) });
    });

    it('should deny access when user has no relation to order', async () => {
      req.user = { userId: 'stranger' };
      (getOrderWithTracking as jest.Mock).mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER', seller: null });

      await getOrderTracking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // getStatusHistory
  // ============================================
  describe('getStatusHistory', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        params: { orderId: 'order-1' },
      });
    });

    it('should return history for order owner', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ userId: 'user-1' });
      const mockHistory = [{ status: 'PENDING' }, { status: 'SHIPPED' }];
      (getOrderStatusHistory as jest.Mock).mockResolvedValue(mockHistory);

      await getStatusHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: mockHistory });
    });

    it('should return 404 when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await getStatusHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user does not own order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ userId: 'other-user' });

      await getStatusHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // updateStatus
  // ============================================
  describe('updateStatus', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'admin-1' },
        params: { orderId: 'order-1' },
        body: { status: 'SHIPPED', note: 'Shipped via UPS' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', seller: null });
    });

    it('should update status when admin', async () => {
      const mockUpdated = { id: 'order-1', status: 'SHIPPED' };
      (updateOrderStatus as jest.Mock).mockResolvedValue(mockUpdated);

      await updateStatus(req, res);

      expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'SHIPPED', 'Shipped via UPS', 'admin-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Order status updated successfully',
        data: mockUpdated,
      });
    });

    it('should return 400 when status is missing', async () => {
      req.body = {};

      await updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid status', async () => {
      req.body = { status: 'INVALID' };

      await updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid status' });
    });

    it('should return 403 for non-admin non-seller', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER', seller: null });

      await updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // setTrackingNumber
  // ============================================
  describe('setTrackingNumber', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'admin-1' },
        params: { orderId: 'order-1' },
        body: { trackingNumber: 'TRACK123' },
      });
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', seller: null });
    });

    it('should add tracking number for admin', async () => {
      const mockOrder = { id: 'order-1', trackingNumber: 'TRACK123' };
      (addTrackingNumber as jest.Mock).mockResolvedValue(mockOrder);

      await setTrackingNumber(req, res);

      expect(addTrackingNumber).toHaveBeenCalledWith('order-1', 'TRACK123', 'admin-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tracking number added successfully',
        data: mockOrder,
      });
    });

    it('should return 400 when tracking number missing', async () => {
      req.body = {};

      await setTrackingNumber(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 for non-admin non-seller', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER', seller: null });

      await setTrackingNumber(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // getMyOrders
  // ============================================
  describe('getMyOrders', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1' },
        query: { page: '1', limit: '10' },
      });
    });

    it('should return paginated orders for user', async () => {
      const mockOrders = [
        {
          id: 'o1',
          userId: 'user-1',
          status: 'PENDING',
          shippingAddress: '{"street":"123 Main"}',
          billingAddress: null,
        },
      ];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);
      (canModifyOrder as jest.Mock).mockReturnValue(true);

      await getMyOrders(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            shippingAddress: { street: '123 Main' },
            canModify: true,
          }),
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
    });

    it('should filter by status when provided', async () => {
      req.query = { page: '1', limit: '10', status: 'SHIPPED' };
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await getMyOrders(req, res);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: 'SHIPPED' },
        })
      );
    });
  });

  // ============================================
  // getOrderStats
  // ============================================
  describe('getOrderStats', () => {
    it('should return order statistics for user', async () => {
      req = mockRequest({ user: { userId: 'user-1' } });
      mockPrisma.order.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(2)   // pending
        .mockResolvedValueOnce(1)   // processing
        .mockResolvedValueOnce(3)   // shipped
        .mockResolvedValueOnce(3)   // delivered
        .mockResolvedValueOnce(1);  // cancelled
      mockPrisma.order.aggregate = jest.fn().mockResolvedValue({ _sum: { total: 499.99 } });

      await getOrderStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        stats: {
          totalOrders: 10,
          pendingOrders: 2,
          processingOrders: 1,
          shippedOrders: 3,
          deliveredOrders: 3,
          cancelledOrders: 1,
          totalSpent: 499.99,
        },
      });
    });
  });
});
