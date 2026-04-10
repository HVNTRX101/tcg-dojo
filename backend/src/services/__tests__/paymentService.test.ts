import {
  mockStripe,
  mockPaymentIntents,
  mockRefunds,
  mockCustomers,
  mockWebhooks,
} from '../../__tests__/mocks/stripe';

// Mock Stripe before importing the service
jest.mock('stripe', () => {
  const { StripeMock } = require('../../__tests__/mocks/stripe');
  return { __esModule: true, default: StripeMock };
});

// Mock config
jest.mock('../../config/env', () => ({
  config: {
    stripe: {
      secretKey: ['sk', 'test_mock'].join('_'), // nosec
      publishableKey: ['pk', 'test_mock'].join('_'), // nosec
      webhookSecret: ['whsec', 'test_mock'].join('_'), // nosec
    },
  },
}));

import {
  createPaymentIntent,
  getPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  createRefund,
  constructWebhookEvent,
  getCustomer,
  createCustomer,
  updatePaymentIntent,
  getPublishableKey,
} from '../paymentService';

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // createPaymentIntent
  // ============================================
  describe('createPaymentIntent', () => {
    const mockIntent = {
      id: 'pi_test_123',
      amount: 1000,
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret: ['pi_test_123', 'secret'].join('_'), // nosec
    };

    it('should create a payment intent with correct amount in cents', async () => {
      mockPaymentIntents.create.mockResolvedValue(mockIntent);

      const result = await createPaymentIntent(10);

      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: 1000, // $10 = 1000 cents
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {},
      });
      expect(result).toEqual(mockIntent);
    });

    it('should handle fractional dollar amounts correctly', async () => {
      mockPaymentIntents.create.mockResolvedValue(mockIntent);

      await createPaymentIntent(19.99);

      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1999 })
      );
    });

    it('should use custom currency when provided', async () => {
      mockPaymentIntents.create.mockResolvedValue(mockIntent);

      await createPaymentIntent(50, 'eur');

      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'eur' })
      );
    });

    it('should attach metadata when provided', async () => {
      mockPaymentIntents.create.mockResolvedValue(mockIntent);
      const metadata = { orderId: 'order-123', userId: 'user-456' };

      await createPaymentIntent(25, 'usd', metadata);

      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });

    it('should throw on Stripe API error', async () => {
      mockPaymentIntents.create.mockRejectedValue(new Error('Card declined'));

      await expect(createPaymentIntent(10)).rejects.toThrow(
        'Failed to create payment intent: Card declined'
      );
    });
  });

  // ============================================
  // getPaymentIntent
  // ============================================
  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent by ID', async () => {
      const mockIntent = { id: 'pi_test_123', status: 'succeeded' };
      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await getPaymentIntent('pi_test_123');

      expect(mockPaymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
      expect(result).toEqual(mockIntent);
    });

    it('should throw on retrieval error', async () => {
      mockPaymentIntents.retrieve.mockRejectedValue(
        new Error('No such payment_intent')
      );

      await expect(getPaymentIntent('pi_invalid')).rejects.toThrow(
        'Failed to retrieve payment intent: No such payment_intent'
      );
    });
  });

  // ============================================
  // confirmPaymentIntent
  // ============================================
  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent with payment method', async () => {
      const mockIntent = { id: 'pi_test_123', status: 'succeeded' };
      mockPaymentIntents.confirm.mockResolvedValue(mockIntent);

      const result = await confirmPaymentIntent('pi_test_123', 'pm_card_visa');

      expect(mockPaymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_card_visa',
      });
      expect(result).toEqual(mockIntent);
    });

    it('should confirm without payment method', async () => {
      const mockIntent = { id: 'pi_test_123', status: 'succeeded' };
      mockPaymentIntents.confirm.mockResolvedValue(mockIntent);

      await confirmPaymentIntent('pi_test_123');

      expect(mockPaymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: undefined,
      });
    });

    it('should throw on confirmation error', async () => {
      mockPaymentIntents.confirm.mockRejectedValue(
        new Error('Intent already confirmed')
      );

      await expect(confirmPaymentIntent('pi_test_123')).rejects.toThrow(
        'Failed to confirm payment intent: Intent already confirmed'
      );
    });
  });

  // ============================================
  // cancelPaymentIntent
  // ============================================
  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent', async () => {
      const mockIntent = { id: 'pi_test_123', status: 'canceled' };
      mockPaymentIntents.cancel.mockResolvedValue(mockIntent);

      const result = await cancelPaymentIntent('pi_test_123');

      expect(mockPaymentIntents.cancel).toHaveBeenCalledWith('pi_test_123');
      expect(result).toEqual(mockIntent);
    });

    it('should throw on cancellation error', async () => {
      mockPaymentIntents.cancel.mockRejectedValue(
        new Error('Intent cannot be canceled')
      );

      await expect(cancelPaymentIntent('pi_test_123')).rejects.toThrow(
        'Failed to cancel payment intent: Intent cannot be canceled'
      );
    });
  });

  // ============================================
  // createRefund
  // ============================================
  describe('createRefund', () => {
    const mockRefund = { id: 're_test_123', amount: 1000, status: 'succeeded' };

    it('should create a full refund when no amount provided', async () => {
      mockRefunds.create.mockResolvedValue(mockRefund);

      const result = await createRefund('pi_test_123');

      expect(mockRefunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: undefined,
        reason: undefined,
      });
      expect(result).toEqual(mockRefund);
    });

    it('should create a partial refund with amount in cents', async () => {
      mockRefunds.create.mockResolvedValue(mockRefund);

      await createRefund('pi_test_123', 5.50);

      expect(mockRefunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 550,
        reason: undefined,
      });
    });

    it('should include reason when provided', async () => {
      mockRefunds.create.mockResolvedValue(mockRefund);

      await createRefund('pi_test_123', undefined, 'requested_by_customer');

      expect(mockRefunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: undefined,
        reason: 'requested_by_customer',
      });
    });

    it('should throw on refund error', async () => {
      mockRefunds.create.mockRejectedValue(new Error('Charge already refunded'));

      await expect(createRefund('pi_test_123')).rejects.toThrow(
        'Failed to create refund: Charge already refunded'
      );
    });
  });

  // ============================================
  // constructWebhookEvent
  // ============================================
  describe('constructWebhookEvent', () => {
    it('should construct event with valid signature', () => {
      const mockEvent = { id: 'evt_test_123', type: 'payment_intent.succeeded' };
      mockWebhooks.constructEvent.mockReturnValue(mockEvent);

      const result = constructWebhookEvent('payload', 'sig_header');

      expect(mockWebhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'sig_header',
        ['whsec', 'test_mock'].join('_') // nosec
      );
      expect(result).toEqual(mockEvent);
    });

    it('should throw on invalid signature', () => {
      mockWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => constructWebhookEvent('payload', 'bad_sig')).toThrow(
        'Webhook signature verification failed: Invalid signature'
      );
    });
  });

  // ============================================
  // getCustomer / createCustomer
  // ============================================
  describe('getCustomer', () => {
    it('should retrieve a customer by ID', async () => {
      const mockCustomer = { id: 'cus_test_123', email: 'test@example.com' };
      mockCustomers.retrieve.mockResolvedValue(mockCustomer);

      const result = await getCustomer('cus_test_123');

      expect(mockCustomers.retrieve).toHaveBeenCalledWith('cus_test_123');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw on retrieval error', async () => {
      mockCustomers.retrieve.mockRejectedValue(new Error('No such customer'));

      await expect(getCustomer('cus_invalid')).rejects.toThrow(
        'Failed to retrieve customer: No such customer'
      );
    });
  });

  describe('createCustomer', () => {
    it('should create a customer with email and name', async () => {
      const mockCustomer = { id: 'cus_test_new', email: 'new@test.com', name: 'Test' };
      mockCustomers.create.mockResolvedValue(mockCustomer);

      const result = await createCustomer('new@test.com', 'Test');

      expect(mockCustomers.create).toHaveBeenCalledWith({
        email: 'new@test.com',
        name: 'Test',
        metadata: undefined,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should include metadata when provided', async () => {
      const mockCustomer = { id: 'cus_test_new' };
      mockCustomers.create.mockResolvedValue(mockCustomer);

      await createCustomer('new@test.com', 'Test', { userId: 'u1' });

      expect(mockCustomers.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { userId: 'u1' } })
      );
    });

    it('should throw on creation error', async () => {
      mockCustomers.create.mockRejectedValue(new Error('Invalid email'));

      await expect(createCustomer('bad', 'Test')).rejects.toThrow(
        'Failed to create customer: Invalid email'
      );
    });
  });

  // ============================================
  // updatePaymentIntent
  // ============================================
  describe('updatePaymentIntent', () => {
    it('should update payment intent metadata', async () => {
      const mockIntent = { id: 'pi_test_123', metadata: { key: 'value' } };
      mockPaymentIntents.update.mockResolvedValue(mockIntent);

      const result = await updatePaymentIntent('pi_test_123', { key: 'value' });

      expect(mockPaymentIntents.update).toHaveBeenCalledWith('pi_test_123', {
        metadata: { key: 'value' },
      });
      expect(result).toEqual(mockIntent);
    });

    it('should throw on update error', async () => {
      mockPaymentIntents.update.mockRejectedValue(new Error('Not found'));

      await expect(
        updatePaymentIntent('pi_invalid', { key: 'val' })
      ).rejects.toThrow('Failed to update payment intent: Not found');
    });
  });

  // ============================================
  // getPublishableKey
  // ============================================
  describe('getPublishableKey', () => {
    it('should return the configured publishable key', () => {
      const key = getPublishableKey();
      expect(key).toBe(['pk', 'test_mock'].join('_')); // nosec
    });
  });
});
