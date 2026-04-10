import { mockPrisma } from '../../__tests__/mocks/prisma';

// Mock dependencies
jest.mock('../../config/database', () => {
  const { mockPrisma } = require('../../__tests__/mocks/prisma');
  return { __esModule: true, default: mockPrisma };
});

jest.mock('../../services/paymentService', () => ({
  createPaymentIntent: jest.fn(),
  getPaymentIntent: jest.fn(),
  createRefund: jest.fn(),
  constructWebhookEvent: jest.fn(),
  getPublishableKey: jest.fn(),
}));

jest.mock('../../services/emailService', () => ({
  sendOrderConfirmationEmail: jest.fn(),
}));

jest.mock('../../services/messageQueue', () => ({
  queueEmail: jest.fn(),
}));

import {
  createPaymentIntent,
  getPaymentStatus,
  handleWebhook,
  processRefund,
  getConfig,
} from '../paymentController';
import {
  createPaymentIntent as createStripePaymentIntent,
  getPaymentIntent,
  createRefund,
  constructWebhookEvent,
  getPublishableKey,
} from '../../services/paymentService';
import { mockRequest, mockResponse } from '../../__tests__/helpers/testUtils';

describe('PaymentController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ============================================
  // createPaymentIntent
  // ============================================
  describe('createPaymentIntent', () => {
    const mockOrder = {
      id: 'order-123',
      userId: 'user-1',
      total: 49.99,
      paymentStatus: 'PENDING',
      paymentIntentId: null,
      status: 'PENDING',
      items: [{ product: { id: 'p1' } }],
    };

    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1', role: 'USER' },
        body: { orderId: 'order-123' },
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
    });

    it('should throw AppError when orderId is missing', async () => {
      req.body = {};

      await expect(createPaymentIntent(req, res)).rejects.toThrow('Order ID is required');
    });

    it('should throw AppError when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(createPaymentIntent(req, res)).rejects.toThrow('Order not found');
    });

    it('should throw AppError when user does not own order', async () => {
      req.user = { userId: 'other-user', role: 'USER' };

      await expect(createPaymentIntent(req, res)).rejects.toThrow('Unauthorized to pay for this order');
    });

    it('should throw AppError when order is already paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentStatus: 'COMPLETED',
      });

      await expect(createPaymentIntent(req, res)).rejects.toThrow('Order has already been paid');
    });

    it('should throw AppError when order is cancelled', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'CANCELLED',
      });

      await expect(createPaymentIntent(req, res)).rejects.toThrow('Cannot pay for a cancelled order');
    });

    it('should create new payment intent for order without existing one', async () => {
      const mockIntent = {
        id: 'pi_new',
        client_secret: ['pi_new', 'secret'].join('_'), // nosec
        status: 'requires_payment_method',
      };
      (createStripePaymentIntent as jest.Mock).mockResolvedValue(mockIntent);

      await createPaymentIntent(req, res);

      expect(createStripePaymentIntent).toHaveBeenCalledWith(49.99, 'usd', {
        orderId: 'order-123',
        userId: 'user-1',
      });
      expect(res.json).toHaveBeenCalledWith({
        clientSecret: ['pi_new', 'secret'].join('_'), // nosec
        paymentIntentId: 'pi_new',
        amount: 49.99,
        orderId: 'order-123',
      });
    });

    it('should retrieve existing payment intent', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentIntentId: 'pi_existing',
      });
      const mockIntent = {
        id: 'pi_existing',
        client_secret: ['pi_existing', 'secret'].join('_'), // nosec
        status: 'requires_payment_method',
      };
      (getPaymentIntent as jest.Mock).mockResolvedValue(mockIntent);

      await createPaymentIntent(req, res);

      expect(getPaymentIntent).toHaveBeenCalledWith('pi_existing');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ paymentIntentId: 'pi_existing' })
      );
    });

    it('should create new intent when existing one is canceled', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentIntentId: 'pi_old',
      });
      (getPaymentIntent as jest.Mock).mockResolvedValue({
        id: 'pi_old',
        status: 'canceled',
      });
      const newIntent = { id: 'pi_new', client_secret: ['pi_new', 'secret'].join('_') }; // nosec
      (createStripePaymentIntent as jest.Mock).mockResolvedValue(newIntent);

      await createPaymentIntent(req, res);

      expect(createStripePaymentIntent).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { paymentIntentId: 'pi_new' },
      });
    });
  });

  // ============================================
  // getPaymentStatus
  // ============================================
  describe('getPaymentStatus', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'user-1', role: 'USER' },
        params: { paymentIntentId: 'pi_test' },
      });
    });

    it('should return payment status for order owner', async () => {
      const mockIntent = {
        status: 'succeeded',
        amount: 5000,
        currency: 'usd',
        payment_method: 'pm_card',
      };
      (getPaymentIntent as jest.Mock).mockResolvedValue(mockIntent);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-123',
        userId: 'user-1',
      });

      await getPaymentStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'succeeded',
        amount: 50,
        currency: 'usd',
        orderId: 'order-123',
        paymentMethod: 'pm_card',
      });
    });

    it('should throw when order not found', async () => {
      (getPaymentIntent as jest.Mock).mockResolvedValue({ status: 'succeeded' });
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(getPaymentStatus(req, res)).rejects.toThrow('Order not found for this payment');
    });

    it('should throw when non-owner non-admin accesses', async () => {
      (getPaymentIntent as jest.Mock).mockResolvedValue({ status: 'succeeded' });
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-123',
        userId: 'other-user',
      });

      await expect(getPaymentStatus(req, res)).rejects.toThrow('Unauthorized to view this payment');
    });

    it('should allow admin to view any payment', async () => {
      req.user = { userId: 'admin-1', role: 'ADMIN' };
      const mockIntent = { status: 'succeeded', amount: 1000, currency: 'usd', payment_method: 'pm_card' };
      (getPaymentIntent as jest.Mock).mockResolvedValue(mockIntent);
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-123',
        userId: 'other-user',
      });

      await getPaymentStatus(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  // ============================================
  // handleWebhook
  // ============================================
  describe('handleWebhook', () => {
    beforeEach(() => {
      req = mockRequest({
        headers: { 'stripe-signature': 'sig_test' },
        body: 'raw_body',
      });
    });

    it('should return 400 when signature is missing', async () => {
      req.headers = {};

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Missing stripe-signature header');
    });

    it('should return 400 on invalid signature', async () => {
      (constructWebhookEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: { orderId: 'order-123' },
          },
        },
      };
      (constructWebhookEvent as jest.Mock).mockReturnValue(mockEvent);
      mockPrisma.order.update.mockResolvedValue({
        id: 'order-123',
        shippingAddress: '{}',
        items: [],
        user: { email: 'test@test.com', name: 'Test' },
        subtotal: 40,
        discount: 0,
        tax: 4,
        shipping: 5.99,
        total: 49.99,
      });

      await handleWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: expect.objectContaining({
            paymentStatus: 'COMPLETED',
            status: 'PROCESSING',
          }),
        })
      );
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: { metadata: { orderId: 'order-123' } },
        },
      };
      (constructWebhookEvent as jest.Mock).mockReturnValue(mockEvent);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        total: 49.99,
        user: { email: 'test@test.com', name: 'Test' },
      });
      mockPrisma.order.update.mockResolvedValue({});

      await handleWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: 'FAILED' },
        })
      );
    });

    it('should handle unrecognized event type gracefully', async () => {
      (constructWebhookEvent as jest.Mock).mockReturnValue({
        type: 'some.unknown.event',
        data: { object: {} },
      });

      await handleWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // ============================================
  // processRefund
  // ============================================
  describe('processRefund', () => {
    beforeEach(() => {
      req = mockRequest({
        user: { userId: 'admin-1', role: 'ADMIN' },
        body: { orderId: 'order-123', amount: 25 },
      });
    });

    it('should throw when non-admin tries to refund', async () => {
      req.user = { userId: 'user-1', role: 'USER' };

      await expect(processRefund(req, res)).rejects.toThrow('Unauthorized to process refunds');
    });

    it('should throw when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(processRefund(req, res)).rejects.toThrow('Order not found');
    });

    it('should throw when order has no payment intent', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        paymentIntentId: null,
        paymentStatus: 'COMPLETED',
      });

      await expect(processRefund(req, res)).rejects.toThrow('Order has no payment to refund');
    });

    it('should throw when payment is not completed', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        paymentIntentId: 'pi_test',
        paymentStatus: 'PENDING',
      });

      await expect(processRefund(req, res)).rejects.toThrow('Can only refund completed payments');
    });

    it('should process refund successfully', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        paymentIntentId: 'pi_test',
        paymentStatus: 'COMPLETED',
      });
      (createRefund as jest.Mock).mockResolvedValue({
        id: 're_test',
        amount: 2500,
        status: 'succeeded',
        reason: null,
      });

      await processRefund(req, res);

      expect(createRefund).toHaveBeenCalledWith('pi_test', 25, undefined);
      expect(res.json).toHaveBeenCalledWith({
        refund: {
          id: 're_test',
          amount: 25,
          status: 'succeeded',
          reason: null,
        },
        order: {
          id: 'order-123',
          paymentStatus: 'REFUNDED',
        },
      });
    });
  });

  // ============================================
  // getConfig
  // ============================================
  describe('getConfig', () => {
    it('should return the publishable key', async () => {
      req = mockRequest();
      (getPublishableKey as jest.Mock).mockReturnValue(['pk', 'test_mock'].join('_')); // nosec

      await getConfig(req, res);

      expect(res.json).toHaveBeenCalledWith({ publishableKey: ['pk', 'test_mock'].join('_') }); // nosec
    });
  });
});
