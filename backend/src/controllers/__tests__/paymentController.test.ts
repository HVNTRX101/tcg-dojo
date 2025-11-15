import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as paymentController from '../paymentController';
import * as paymentService from '../../services/paymentService';
import prisma from '../../config/database';
import { errorHandler } from '../../middleware/errorHandler';

// Mock dependencies
vi.mock('../../services/paymentService');
vi.mock('../../config/database', () => ({
  default: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('../../services/emailService', () => ({
  sendOrderConfirmationEmail: vi.fn(),
}));
vi.mock('../../services/messageQueue', () => ({
  queueEmail: vi.fn(),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).user = {
      userId: 'user_123',
      email: 'test@example.com',
      role: 'USER',
    };
    next();
  });

  // Routes
  app.post('/payments/create-intent', paymentController.createPaymentIntent as any);
  app.get('/payments/status/:paymentIntentId', paymentController.getPaymentStatus as any);
  app.post('/payments/refund', paymentController.processRefund as any);
  app.post('/payments/webhook', paymentController.handleWebhook as any);
  app.get('/payments/config', paymentController.getConfig);

  // Error handler
  app.use(errorHandler);

  return app;
};

describe('Payment Controller Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /payments/create-intent', () => {
    it('should create payment intent for valid order', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        paymentIntentId: null,
        items: [],
      };

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.update).mockResolvedValue(mockOrder as any);
      vi.mocked(paymentService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
      expect(response.body).toHaveProperty('amount', 100);
      expect(response.body).toHaveProperty('orderId', 'order_123');
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        100,
        'usd',
        expect.objectContaining({
          orderId: 'order_123',
          userId: 'user_123',
        })
      );
    });

    it('should return 400 if order ID is missing', async () => {
      const response = await request(app)
        .post('/payments/create-intent')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if order not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'invalid_order' });

      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own the order', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'different_user',
        total: 100,
        paymentStatus: 'PENDING',
        status: 'PENDING',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(403);
    });

    it('should return 400 if order already paid', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        paymentStatus: 'COMPLETED',
        status: 'COMPLETED',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if order is cancelled', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        paymentStatus: 'PENDING',
        status: 'CANCELLED',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(400);
    });

    it('should reuse existing payment intent if valid', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        paymentIntentId: 'pi_existing_123',
        items: [],
      };

      const mockPaymentIntent = {
        id: 'pi_existing_123',
        client_secret: 'pi_existing_123_secret',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(paymentService.getPaymentIntent).mockResolvedValue(mockPaymentIntent as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(200);
      expect(paymentService.getPaymentIntent).toHaveBeenCalledWith('pi_existing_123');
      expect(paymentService.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('should create new payment intent if existing one is cancelled', async () => {
      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        paymentIntentId: 'pi_cancelled_123',
        items: [],
      };

      const mockCancelledIntent = {
        id: 'pi_cancelled_123',
        status: 'canceled',
      };

      const mockNewIntent = {
        id: 'pi_new_123',
        client_secret: 'pi_new_123_secret',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.update).mockResolvedValue(mockOrder as any);
      vi.mocked(paymentService.getPaymentIntent).mockResolvedValue(mockCancelledIntent as any);
      vi.mocked(paymentService.createPaymentIntent).mockResolvedValue(mockNewIntent as any);

      const response = await request(app)
        .post('/payments/create-intent')
        .send({ orderId: 'order_123' });

      expect(response.status).toBe(200);
      expect(paymentService.createPaymentIntent).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        data: { paymentIntentId: 'pi_new_123' },
      });
    });
  });

  describe('GET /payments/status/:paymentIntentId', () => {
    it('should return payment status for valid payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
        payment_method: 'pm_test_123',
      };

      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        paymentIntentId: 'pi_test_123',
      };

      vi.mocked(paymentService.getPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const response = await request(app).get('/payments/status/pi_test_123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'succeeded',
        amount: 100, // Converted from cents
        currency: 'usd',
        orderId: 'order_123',
        paymentMethod: 'pm_test_123',
      });
    });

    it('should return 404 if order not found for payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      vi.mocked(paymentService.getPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);

      const response = await request(app).get('/payments/status/pi_test_123');

      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own the order', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      const mockOrder = {
        id: 'order_123',
        userId: 'different_user',
        paymentIntentId: 'pi_test_123',
      };

      vi.mocked(paymentService.getPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const response = await request(app).get('/payments/status/pi_test_123');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /payments/refund', () => {
    it('should process refund for admin user', async () => {
      // Override auth middleware for admin
      app = express();
      app.use(express.json());
      app.use((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
          userId: 'admin_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        };
        next();
      });
      app.post('/payments/refund', paymentController.processRefund as any);
      app.use(errorHandler);

      const mockOrder = {
        id: 'order_123',
        paymentIntentId: 'pi_test_123',
        paymentStatus: 'COMPLETED',
        total: 100,
      };

      const mockRefund = {
        id: 're_test_123',
        amount: 10000,
        status: 'succeeded',
        reason: 'requested_by_customer',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(paymentService.createRefund).mockResolvedValue(mockRefund as any);

      const response = await request(app)
        .post('/payments/refund')
        .send({
          orderId: 'order_123',
          amount: 100,
          reason: 'requested_by_customer',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('refund');
      expect(response.body.refund).toMatchObject({
        id: 're_test_123',
        amount: 100,
        status: 'succeeded',
        reason: 'requested_by_customer',
      });
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/payments/refund')
        .send({
          orderId: 'order_123',
          amount: 100,
          reason: 'requested_by_customer',
        });

      expect(response.status).toBe(403);
    });

    it('should return 404 if order not found', async () => {
      // Override auth middleware for admin
      app = express();
      app.use(express.json());
      app.use((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
          userId: 'admin_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        };
        next();
      });
      app.post('/payments/refund', paymentController.processRefund as any);
      app.use(errorHandler);

      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .post('/payments/refund')
        .send({
          orderId: 'invalid_order',
          amount: 100,
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if order has no payment', async () => {
      app = express();
      app.use(express.json());
      app.use((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
          userId: 'admin_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        };
        next();
      });
      app.post('/payments/refund', paymentController.processRefund as any);
      app.use(errorHandler);

      const mockOrder = {
        id: 'order_123',
        paymentIntentId: null,
        paymentStatus: 'PENDING',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/refund')
        .send({
          orderId: 'order_123',
          amount: 100,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /payments/webhook', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              orderId: 'order_123',
              userId: 'user_123',
            },
          },
        },
      };

      const mockOrder = {
        id: 'order_123',
        userId: 'user_123',
        total: 100,
        items: [],
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        shippingAddress: JSON.stringify({
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
        }),
        subtotal: 90,
        discount: 0,
        tax: 5,
        shipping: 5,
      };

      vi.mocked(paymentService.constructWebhookEvent).mockReturnValue(mockEvent as any);
      vi.mocked(prisma.order.update).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_123' },
          data: expect.objectContaining({
            paymentStatus: 'COMPLETED',
            status: 'PROCESSING',
          }),
        })
      );
    });

    it('should return 400 if stripe signature is missing', async () => {
      const response = await request(app)
        .post('/payments/webhook')
        .send({ test: 'data' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid webhook signature', async () => {
      vi.mocked(paymentService.constructWebhookEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/payments/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send({ test: 'data' });

      expect(response.status).toBe(400);
    });

    it('should handle payment_intent.payment_failed webhook', async () => {
      const mockEvent = {
        id: 'evt_test_456',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_456',
            metadata: {
              orderId: 'order_456',
            },
          },
        },
      };

      const mockOrder = {
        id: 'order_456',
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        total: 100,
      };

      vi.mocked(paymentService.constructWebhookEvent).mockReturnValue(mockEvent as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.update).mockResolvedValue(mockOrder as any);

      const response = await request(app)
        .post('/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_456' },
        data: {
          paymentStatus: 'FAILED',
        },
      });
    });
  });

  describe('GET /payments/config', () => {
    it('should return publishable key', async () => {
      vi.mocked(paymentService.getPublishableKey).mockReturnValue('pk_test_123');

      const response = await request(app).get('/payments/config');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        publishableKey: 'pk_test_123',
      });
    });
  });
});
