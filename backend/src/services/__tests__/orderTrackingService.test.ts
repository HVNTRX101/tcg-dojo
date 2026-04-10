// Mock dependencies before imports
jest.mock('../../config/database', () => {
  const { mockPrisma } = require('../../__tests__/mocks/prisma');
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../paymentService', () => ({
  createRefund: jest.fn(),
}));

jest.mock('../emailService', () => ({
  sendOrderShippedEmail: jest.fn(),
  sendOrderDeliveredEmail: jest.fn(),
}));

jest.mock('../websocket', () => ({
  emitNotificationToUser: jest.fn(),
}));

jest.mock('../../controllers/notificationController', () => ({
  createNotification: jest.fn(),
  NotificationTypes: {
    ORDER_UPDATE: 'ORDER_UPDATE',
    ORDER_SHIPPED: 'ORDER_SHIPPED',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
  },
}));

import { mockPrisma } from '../../__tests__/mocks/prisma';
import { createRefund } from '../paymentService';
import { sendOrderShippedEmail, sendOrderDeliveredEmail } from '../emailService';
import { emitNotificationToUser } from '../websocket';
import { createNotification } from '../../controllers/notificationController';

import {
  addOrderStatusHistory,
  updateOrderStatus,
  getOrderStatusHistory,
  getOrderWithTracking,
  addTrackingNumber,
  restoreInventory,
  cancelOrder,
  getEstimatedDelivery,
  canModifyOrder,
  getOrdersByStatus,
} from '../orderTrackingService';

describe('OrderTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // addOrderStatusHistory
  // ============================================
  describe('addOrderStatusHistory', () => {
    it('should create a status history entry', async () => {
      const mockEntry = { id: 'h1', orderId: 'o1', status: 'SHIPPED', note: 'test' };
      mockPrisma.orderStatusHistory.create.mockResolvedValue(mockEntry);

      const result = await addOrderStatusHistory('o1', 'SHIPPED', 'test', 'admin1');

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'o1',
          status: 'SHIPPED',
          note: 'test',
          updatedBy: 'admin1',
        },
      });
      expect(result).toEqual(mockEntry);
    });

    it('should throw on database error', async () => {
      mockPrisma.orderStatusHistory.create.mockRejectedValue(new Error('DB error'));

      await expect(addOrderStatusHistory('o1', 'SHIPPED')).rejects.toThrow('DB error');
    });
  });

  // ============================================
  // updateOrderStatus
  // ============================================
  describe('updateOrderStatus', () => {
    const mockOrder = {
      id: 'order-123',
      userId: 'user-1',
      status: 'PENDING',
      user: { id: 'user-1', name: 'John', email: 'john@test.com' },
    };

    beforeEach(() => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PROCESSING' });
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});
      (createNotification as jest.Mock).mockResolvedValue({});
      (sendOrderShippedEmail as jest.Mock).mockResolvedValue(undefined);
      (sendOrderDeliveredEmail as jest.Mock).mockResolvedValue(undefined);
      (emitNotificationToUser as jest.Mock).mockReturnValue(undefined);
    });

    it('should update order status and add history', async () => {
      await updateOrderStatus('order-123', 'PROCESSING');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: 'PROCESSING' },
      });
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalled();
    });

    it('should create notification for PROCESSING status', async () => {
      await updateOrderStatus('order-123', 'PROCESSING');

      expect(createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_UPDATE',
        'Order Processing',
        expect.stringContaining('order-12'),
        expect.stringContaining('/orders/order-123'),
        expect.objectContaining({ orderId: 'order-123', newStatus: 'PROCESSING' })
      );
    });

    it('should send email for SHIPPED status', async () => {
      await updateOrderStatus('order-123', 'SHIPPED');

      expect(sendOrderShippedEmail).toHaveBeenCalledWith(
        'john@test.com',
        expect.objectContaining({ customerName: 'John' })
      );
    });

    it('should send email for DELIVERED status', async () => {
      await updateOrderStatus('order-123', 'DELIVERED');

      expect(sendOrderDeliveredEmail).toHaveBeenCalledWith(
        'john@test.com',
        expect.objectContaining({ customerName: 'John' })
      );
    });

    it('should emit WebSocket notification', async () => {
      await updateOrderStatus('order-123', 'SHIPPED');

      expect(emitNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          type: 'ORDER_SHIPPED',
          title: 'Order Shipped',
        })
      );
    });

    it('should not block on email failure', async () => {
      (sendOrderShippedEmail as jest.Mock).mockRejectedValue(new Error('SMTP down'));

      // Should not throw
      await expect(updateOrderStatus('order-123', 'SHIPPED')).resolves.toBeDefined();
    });

    it('should throw if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(updateOrderStatus('nonexistent', 'SHIPPED')).rejects.toThrow('Order not found');
    });

    it('should use custom note when provided', async () => {
      await updateOrderStatus('order-123', 'PROCESSING', 'Custom note', 'admin-1');

      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          note: 'Custom note',
          updatedBy: 'admin-1',
        }),
      });
    });
  });

  // ============================================
  // getOrderStatusHistory
  // ============================================
  describe('getOrderStatusHistory', () => {
    it('should return history sorted by createdAt asc', async () => {
      const mockHistory = [
        { id: 'h1', status: 'PENDING', createdAt: new Date('2024-01-01') },
        { id: 'h2', status: 'SHIPPED', createdAt: new Date('2024-01-02') },
      ];
      mockPrisma.orderStatusHistory.findMany.mockResolvedValue(mockHistory);

      const result = await getOrderStatusHistory('order-123');

      expect(mockPrisma.orderStatusHistory.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-123' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockHistory);
    });
  });

  // ============================================
  // getOrderWithTracking
  // ============================================
  describe('getOrderWithTracking', () => {
    it('should return order with parsed addresses', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: '{"street":"123 Main St","city":"NY"}',
        billingAddress: '{"street":"456 Oak Ave","city":"LA"}',
        items: [],
        statusHistory: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await getOrderWithTracking('order-123');

      expect(result.shippingAddress).toEqual({ street: '123 Main St', city: 'NY' });
      expect(result.billingAddress).toEqual({ street: '456 Oak Ave', city: 'LA' });
    });

    it('should handle null billing address', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: '{"street":"123 Main St"}',
        billingAddress: null,
        items: [],
        statusHistory: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await getOrderWithTracking('order-123');

      expect(result.billingAddress).toBeNull();
    });

    it('should throw if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(getOrderWithTracking('nonexistent')).rejects.toThrow('Order not found');
    });
  });

  // ============================================
  // addTrackingNumber
  // ============================================
  describe('addTrackingNumber', () => {
    it('should update order and create notification', async () => {
      const mockOrder = { id: 'order-123', userId: 'user-1', status: 'SHIPPED' };
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});
      (createNotification as jest.Mock).mockResolvedValue({});

      await addTrackingNumber('order-123', 'TRACK123', 'admin-1');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { trackingNumber: 'TRACK123' },
      });
      expect(createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_UPDATE',
        'Tracking Number Available',
        expect.stringContaining('TRACK123'),
        expect.stringContaining('/orders/order-123'),
        expect.objectContaining({ trackingNumber: 'TRACK123' })
      );
    });
  });

  // ============================================
  // restoreInventory
  // ============================================
  describe('restoreInventory', () => {
    it('should increment product quantities for each order item', async () => {
      const mockItems = [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 3 },
      ];
      mockPrisma.orderItem.findMany.mockResolvedValue(mockItems);
      mockPrisma.product.update.mockResolvedValue({});

      await restoreInventory('order-123');

      expect(mockPrisma.product.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { quantity: { increment: 2 } },
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { quantity: { increment: 3 } },
      });
    });
  });

  // ============================================
  // cancelOrder
  // ============================================
  describe('cancelOrder', () => {
    const mockPendingOrder = {
      id: 'order-123',
      userId: 'user-1',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentIntentId: null,
    };

    beforeEach(() => {
      mockPrisma.order.findUnique.mockResolvedValue(mockPendingOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockPendingOrder, status: 'CANCELLED' });
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      mockPrisma.product.update.mockResolvedValue({});
      (createNotification as jest.Mock).mockResolvedValue({});
    });

    it('should cancel a PENDING order', async () => {
      const result = await cancelOrder('order-123', 'Changed my mind');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
          cancelReason: 'Changed my mind',
        },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel a PROCESSING order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockPendingOrder, status: 'PROCESSING' });

      await expect(cancelOrder('order-123', 'Reason')).resolves.toBeDefined();
    });

    it('should reject cancellation for SHIPPED order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockPendingOrder, status: 'SHIPPED' });

      await expect(cancelOrder('order-123', 'Reason')).rejects.toThrow(
        'Cannot cancel order with status: SHIPPED'
      );
    });

    it('should reject cancellation for DELIVERED order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockPendingOrder, status: 'DELIVERED' });

      await expect(cancelOrder('order-123', 'Reason')).rejects.toThrow(
        'Cannot cancel order with status: DELIVERED'
      );
    });

    it('should process refund when payment was completed', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockPendingOrder,
        paymentStatus: 'COMPLETED',
        paymentIntentId: 'pi_test_123',
      });
      (createRefund as jest.Mock).mockResolvedValue({ id: 're_test_123' });

      await cancelOrder('order-123', 'Reason');

      expect(createRefund).toHaveBeenCalledWith('pi_test_123', undefined, 'requested_by_customer');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: { paymentStatus: 'REFUNDED' },
        })
      );
    });

    it('should not block on refund failure', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockPendingOrder,
        paymentStatus: 'COMPLETED',
        paymentIntentId: 'pi_test_123',
      });
      (createRefund as jest.Mock).mockRejectedValue(new Error('Refund failed'));

      // Should not throw
      await expect(cancelOrder('order-123', 'Reason')).resolves.toBeDefined();
    });

    it('should restore inventory after cancellation', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([{ productId: 'p1', quantity: 1 }]);

      await cancelOrder('order-123', 'Reason');

      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-123' },
        select: { productId: true, quantity: true },
      });
    });

    it('should create cancellation notification', async () => {
      await cancelOrder('order-123', 'Changed my mind');

      expect(createNotification).toHaveBeenCalledWith(
        'user-1',
        'ORDER_UPDATE',
        'Order Cancelled',
        expect.stringContaining('cancelled'),
        expect.stringContaining('/orders/order-123'),
        expect.objectContaining({ cancelReason: 'Changed my mind' })
      );
    });

    it('should throw if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(cancelOrder('nonexistent', 'Reason')).rejects.toThrow('Order not found');
    });
  });

  // ============================================
  // getEstimatedDelivery
  // ============================================
  describe('getEstimatedDelivery', () => {
    it('should return 7 days for STANDARD shipping', () => {
      const now = new Date();
      const result = getEstimatedDelivery('STANDARD');
      const daysDiff = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });

    it('should return 3 days for EXPRESS shipping', () => {
      const now = new Date();
      const result = getEstimatedDelivery('EXPRESS');
      const daysDiff = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(3);
    });

    it('should return 1 day for OVERNIGHT shipping', () => {
      const now = new Date();
      const result = getEstimatedDelivery('OVERNIGHT');
      const daysDiff = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(1);
    });

    it('should default to 7 days for unknown shipping method', () => {
      const now = new Date();
      const result = getEstimatedDelivery('UNKNOWN');
      const daysDiff = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });

    it('should default to 7 days when no method provided', () => {
      const now = new Date();
      const result = getEstimatedDelivery();
      const daysDiff = Math.round((result.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });
  });

  // ============================================
  // canModifyOrder
  // ============================================
  describe('canModifyOrder', () => {
    it('should return true for PENDING orders', () => {
      expect(canModifyOrder({ status: 'PENDING' })).toBe(true);
    });

    it('should return true for PROCESSING orders', () => {
      expect(canModifyOrder({ status: 'PROCESSING' })).toBe(true);
    });

    it('should return false for SHIPPED orders', () => {
      expect(canModifyOrder({ status: 'SHIPPED' })).toBe(false);
    });

    it('should return false for DELIVERED orders', () => {
      expect(canModifyOrder({ status: 'DELIVERED' })).toBe(false);
    });

    it('should return false for CANCELLED orders', () => {
      expect(canModifyOrder({ status: 'CANCELLED' })).toBe(false);
    });
  });

  // ============================================
  // getOrdersByStatus
  // ============================================
  describe('getOrdersByStatus', () => {
    it('should return paginated orders filtered by status', async () => {
      const mockOrders = [{ id: 'o1', status: 'SHIPPED' }];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await getOrdersByStatus('SHIPPED', 1, 20);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'SHIPPED' },
          skip: 0,
          take: 20,
        })
      );
      expect(result).toEqual({
        orders: mockOrders,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(50);

      const result = await getOrdersByStatus('PENDING', 3, 10);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });
  });
});
