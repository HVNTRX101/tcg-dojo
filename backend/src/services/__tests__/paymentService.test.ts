import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Stripe from 'stripe';
import {
  createPaymentIntent,
  getPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  constructWebhookEvent,
  createCustomer,
  getCustomer,
  updatePaymentIntent,
} from '../paymentService';

// Mock Stripe
vi.mock('stripe', () => {
  const mockPaymentIntents = {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    update: vi.fn(),
  };

  const mockCustomers = {
    create: vi.fn(),
    retrieve: vi.fn(),
  };

  const mockRefunds = {
    create: vi.fn(),
  };

  const mockWebhooks = {
    constructEvent: vi.fn(),
  };

  return {
    default: vi.fn(() => ({
      paymentIntents: mockPaymentIntents,
      customers: mockCustomers,
      refunds: mockRefunds,
      webhooks: mockWebhooks,
    })),
  };
});

describe('Payment Service Integration Tests', () => {
  let stripe: any;

  beforeEach(() => {
    // Get the mocked Stripe instance
    stripe = new (require('stripe').default)();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await createPaymentIntent(100, 'usd', {
        orderId: 'order_123',
        userId: 'user_123',
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000, // $100 in cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: 'order_123',
          userId: 'user_123',
        },
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(result.id).toBe('pi_test_123');
      expect(result.amount).toBe(10000);
    });

    it('should convert decimal amounts to cents correctly', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_456',
        amount: 4999,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent(49.99, 'usd');

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4999,
        })
      );
    });

    it('should handle create payment intent errors', async () => {
      stripe.paymentIntents.create.mockRejectedValue(
        new Error('Insufficient funds')
      );

      await expect(createPaymentIntent(100, 'usd')).rejects.toThrow(
        'Failed to create payment intent: Insufficient funds'
      );
    });

    it('should use default currency if not provided', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_789',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await createPaymentIntent(50);

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        })
      );
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      stripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await getPaymentIntent('pi_test_123');

      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
      expect(result).toEqual(mockPaymentIntent);
      expect(result.id).toBe('pi_test_123');
    });

    it('should handle retrieve errors', async () => {
      stripe.paymentIntents.retrieve.mockRejectedValue(
        new Error('Payment intent not found')
      );

      await expect(getPaymentIntent('invalid_id')).rejects.toThrow(
        'Failed to retrieve payment intent: Payment intent not found'
      );
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      stripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

      const result = await confirmPaymentIntent('pi_test_123', 'pm_test_123');

      expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_test_123',
      });
      expect(result.status).toBe('succeeded');
    });

    it('should confirm without payment method', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_456',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
      };

      stripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

      await confirmPaymentIntent('pi_test_456');

      expect(stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_456', {
        payment_method: undefined,
      });
    });

    it('should handle confirmation errors', async () => {
      stripe.paymentIntents.confirm.mockRejectedValue(
        new Error('Card declined')
      );

      await expect(confirmPaymentIntent('pi_test_123', 'pm_test_123')).rejects.toThrow(
        'Failed to confirm payment intent: Card declined'
      );
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        status: 'canceled',
      };

      stripe.paymentIntents.cancel.mockResolvedValue(mockPaymentIntent);

      const result = await cancelPaymentIntent('pi_test_123');

      expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_test_123');
      expect(result.status).toBe('canceled');
    });

    it('should handle cancel errors', async () => {
      stripe.paymentIntents.cancel.mockRejectedValue(
        new Error('Payment already succeeded')
      );

      await expect(cancelPaymentIntent('pi_test_123')).rejects.toThrow(
        'Failed to cancel payment intent: Payment already succeeded'
      );
    });
  });

  describe('createRefund', () => {
    it('should create a full refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 10000,
        status: 'succeeded',
        payment_intent: 'pi_test_123',
      };

      stripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createRefund('pi_test_123');

      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: undefined, // Full refund
        reason: undefined,
      });
      expect(result).toEqual(mockRefund);
    });

    it('should create a partial refund with amount', async () => {
      const mockRefund = {
        id: 're_test_456',
        amount: 5000,
        status: 'succeeded',
        payment_intent: 'pi_test_123',
      };

      stripe.refunds.create.mockResolvedValue(mockRefund);

      await createRefund('pi_test_123', 50, 'requested_by_customer');

      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 5000,
        reason: 'requested_by_customer',
      });
    });

    it('should handle refund errors', async () => {
      stripe.refunds.create.mockRejectedValue(
        new Error('Charge already refunded')
      );

      await expect(createRefund('pi_test_123')).rejects.toThrow(
        'Failed to create refund: Charge already refunded'
      );
    });

    it('should accept different refund reasons', async () => {
      const reasons: Array<'duplicate' | 'fraudulent' | 'requested_by_customer'> = [
        'duplicate',
        'fraudulent',
        'requested_by_customer',
      ];

      for (const reason of reasons) {
        stripe.refunds.create.mockResolvedValue({
          id: 're_test',
          amount: 1000,
          status: 'succeeded',
        });

        await createRefund('pi_test_123', 10, reason);

        expect(stripe.refunds.create).toHaveBeenCalledWith(
          expect.objectContaining({ reason })
        );
      }
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct and verify webhook event', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
          },
        },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const payload = JSON.stringify({ test: 'data' });
      const signature = 'test_signature';

      const result = constructWebhookEvent(payload, signature);

      expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
      expect(result.type).toBe('payment_intent.succeeded');
    });

    it('should handle invalid webhook signatures', () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() =>
        constructWebhookEvent('invalid_payload', 'invalid_signature')
      ).toThrow('Webhook signature verification failed: Invalid signature');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      stripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await createCustomer('test@example.com', 'Test User', {
        userId: 'user_123',
      });

      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: 'user_123',
        },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should handle create customer errors', async () => {
      stripe.customers.create.mockRejectedValue(
        new Error('Invalid email')
      );

      await expect(
        createCustomer('invalid-email', 'Test User')
      ).rejects.toThrow('Failed to create customer: Invalid email');
    });
  });

  describe('getCustomer', () => {
    it('should retrieve a customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      stripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await getCustomer('cus_test_123');

      expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_test_123');
      expect(result).toEqual(mockCustomer);
    });

    it('should handle retrieve customer errors', async () => {
      stripe.customers.retrieve.mockRejectedValue(
        new Error('Customer not found')
      );

      await expect(getCustomer('invalid_id')).rejects.toThrow(
        'Failed to retrieve customer: Customer not found'
      );
    });
  });

  describe('updatePaymentIntent', () => {
    it('should update payment intent metadata', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 10000,
        currency: 'usd',
        metadata: {
          orderId: 'order_456',
          status: 'updated',
        },
      };

      stripe.paymentIntents.update.mockResolvedValue(mockPaymentIntent);

      const result = await updatePaymentIntent('pi_test_123', {
        orderId: 'order_456',
        status: 'updated',
      });

      expect(stripe.paymentIntents.update).toHaveBeenCalledWith('pi_test_123', {
        metadata: {
          orderId: 'order_456',
          status: 'updated',
        },
      });
      expect(result.metadata).toEqual({
        orderId: 'order_456',
        status: 'updated',
      });
    });

    it('should handle update errors', async () => {
      stripe.paymentIntents.update.mockRejectedValue(
        new Error('Invalid payment intent')
      );

      await expect(
        updatePaymentIntent('invalid_id', { test: 'data' })
      ).rejects.toThrow('Failed to update payment intent: Invalid payment intent');
    });
  });
});
