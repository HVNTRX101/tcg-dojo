import Stripe from 'stripe';
import { config } from '../config/env';

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

/**
 * Create a payment intent
 * @param amount - Amount in cents (e.g., $10.00 = 1000)
 * @param currency - Currency code (default: 'usd')
 * @param metadata - Additional metadata to attach to the payment
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata || {},
    });

    return paymentIntent;
  } catch (error: any) {
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Retrieve a payment intent
 */
export const getPaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new Error(`Failed to retrieve payment intent: ${error.message}`);
  }
};

/**
 * Confirm a payment intent (for server-side confirmation)
 */
export const confirmPaymentIntent = async (
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return paymentIntent;
  } catch (error: any) {
    throw new Error(`Failed to confirm payment intent: ${error.message}`);
  }
};

/**
 * Cancel a payment intent
 */
export const cancelPaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new Error(`Failed to cancel payment intent: ${error.message}`);
  }
};

/**
 * Create a refund
 * @param paymentIntentId - Payment intent ID to refund
 * @param amount - Amount to refund in cents (optional - full refund if not specified)
 * @param reason - Reason for refund
 */
export const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason,
    });

    return refund;
  } catch (error: any) {
    throw new Error(`Failed to create refund: ${error.message}`);
  }
};

/**
 * Construct webhook event from raw body
 * This is used to verify webhook signatures
 */
export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );

    return event;
  } catch (error: any) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Get customer by ID
 */
export const getCustomer = async (
  customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> => {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error: any) {
    throw new Error(`Failed to retrieve customer: ${error.message}`);
  }
};

/**
 * Create a customer
 */
export const createCustomer = async (
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  } catch (error: any) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }
};

/**
 * Update payment intent metadata
 */
export const updatePaymentIntent = async (
  paymentIntentId: string,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      metadata,
    });

    return paymentIntent;
  } catch (error: any) {
    throw new Error(`Failed to update payment intent: ${error.message}`);
  }
};

/**
 * Get Stripe publishable key
 */
export const getPublishableKey = (): string => {
  return config.stripe.publishableKey;
};

export default stripe;
