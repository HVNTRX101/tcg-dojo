import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/database';
import {
  createPaymentIntent as createStripePaymentIntent,
  getPaymentIntent,
  createRefund,
  constructWebhookEvent,
  getPublishableKey,
} from '../services/paymentService';
import { sendOrderConfirmationEmail } from '../services/emailService';
import { queueEmail } from '../services/messageQueue';

/**
 * Create payment intent for an order
 * POST /api/payments/create-intent
 */
export const createPaymentIntent = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId;
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('Order ID is required', 400);
  }

  // Get order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Verify ownership
  if (order.userId !== userId) {
    throw new AppError('Unauthorized to pay for this order', 403);
  }

  // Check if order is already paid
  if (order.paymentStatus === 'COMPLETED') {
    throw new AppError('Order has already been paid', 400);
  }

  // Check if order is cancelled
  if (order.status === 'CANCELLED') {
    throw new AppError('Cannot pay for a cancelled order', 400);
  }

  // Create or retrieve payment intent
  let paymentIntent;

  if (order.paymentIntentId) {
    // Retrieve existing payment intent
    paymentIntent = await getPaymentIntent(order.paymentIntentId);

    // If payment intent is cancelled or succeeded, create a new one
    if (
      paymentIntent.status === 'canceled' ||
      paymentIntent.status === 'succeeded'
    ) {
      paymentIntent = await createStripePaymentIntent(order.total, 'usd', {
        orderId: order.id,
        userId: order.userId,
      });

      // Update order with new payment intent
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentIntentId: paymentIntent.id },
      });
    }
  } else {
    // Create new payment intent
    paymentIntent = await createStripePaymentIntent(order.total, 'usd', {
      orderId: order.id,
      userId: order.userId,
    });

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentIntentId: paymentIntent.id },
    });
  }

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: order.total,
    orderId: order.id,
  });
};

/**
 * Get payment status
 * GET /api/payments/status/:paymentIntentId
 */
export const getPaymentStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { paymentIntentId } = req.params;
  const userId = req.user!.userId;

  // Get payment intent
  const paymentIntent = await getPaymentIntent(paymentIntentId);

  // Find order with this payment intent
  const order = await prisma.order.findFirst({
    where: {
      paymentIntentId,
    },
  });

  if (!order) {
    throw new AppError('Order not found for this payment', 404);
  }

  // Verify ownership (unless admin)
  if (order.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Unauthorized to view this payment', 403);
  }

  res.json({
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    orderId: order.id,
    paymentMethod: paymentIntent.payment_method,
  });
};

/**
 * Handle Stripe webhooks
 * POST /api/payments/webhook
 */
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  let event;

  try {
    // Construct event from raw body
    event = constructWebhookEvent(req.body, signature);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCancellation(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentSuccess = async (paymentIntent: any): Promise<void> => {
  const orderId = paymentIntent.metadata.orderId;

  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  // Update order
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'COMPLETED',
      status: 'PROCESSING',
      paymentMethod: 'CARD',
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: true,
    },
  });

  console.log(`Payment succeeded for order: ${orderId}`);

  // Send order confirmation email
  try {
    const shippingAddress = JSON.parse(order.shippingAddress);

    await sendOrderConfirmationEmail(order.user.email, {
      orderNumber: order.id.substring(0, 8).toUpperCase(),
      customerName: order.user.name,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      shippingAddress,
    });

    console.log(`✅ Order confirmation email sent for order: ${orderId}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to send order confirmation email:`, emailError.message);
    // Don't throw - email failure shouldn't fail the webhook
  }
};

/**
 * Handle failed payment
 */
const handlePaymentFailure = async (paymentIntent: any): Promise<void> => {
  const orderId = paymentIntent.metadata.orderId;

  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  // Get order details with user information
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (!order) {
    console.error('Order not found for payment failure notification');
    return;
  }

  // Update order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'FAILED',
    },
  });

  console.log(`Payment failed for order: ${orderId}`);

  // Send payment failed email
  try {
    await queueEmail({
      to: order.user.email,
      subject: `Payment Failed for Order #${orderId.substring(0, 8)}`,
      template: 'generic-notification',
      data: {
        userName: order.user.name,
        title: 'Payment Failed',
        message: `We're sorry, but the payment for your order #${orderId.substring(0, 8)} has failed. Please try again or use a different payment method.`,
        actionText: 'Retry Payment',
        actionUrl: `${process.env.FRONTEND_URL}/orders/${orderId}`,
        additionalInfo: `Order Total: $${order.total.toFixed(2)}`,
      },
    });
    console.log(`✅ Payment failure email queued for order: ${orderId}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to queue payment failure email:`, emailError.message);
    // Don't throw - email failure shouldn't fail the webhook
  }
};

/**
 * Handle payment cancellation
 */
const handlePaymentCancellation = async (paymentIntent: any): Promise<void> => {
  const orderId = paymentIntent.metadata.orderId;

  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  console.log(`Payment cancelled for order: ${orderId}`);
};

/**
 * Handle refund
 */
const handleRefund = async (charge: any): Promise<void> => {
  const paymentIntentId = charge.payment_intent;

  if (!paymentIntentId) {
    console.error('No payment intent in charge');
    return;
  }

  // Find order with user information
  const order = await prisma.order.findFirst({
    where: { paymentIntentId },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (!order) {
    console.error('Order not found for refund');
    return;
  }

  // Calculate refund amount from charge
  const refundAmount = charge.amount_refunded / 100; // Convert from cents to dollars

  // Update order
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'REFUNDED',
    },
  });

  console.log(`Refund processed for order: ${order.id}`);

  // Send refund confirmation email
  try {
    await queueEmail({
      to: order.user.email,
      subject: `Refund Confirmed for Order #${order.id.substring(0, 8)}`,
      template: 'generic-notification',
      data: {
        userName: order.user.name,
        title: 'Refund Processed',
        message: `Your refund for order #${order.id.substring(0, 8)} has been processed successfully. The amount will be returned to your original payment method within 5-10 business days.`,
        actionText: 'View Order',
        actionUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
        additionalInfo: `Refund Amount: $${refundAmount.toFixed(2)}`,
      },
    });
    console.log(`✅ Refund confirmation email queued for order: ${order.id}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to queue refund confirmation email:`, emailError.message);
    // Don't throw - email failure shouldn't fail the webhook
  }
};

/**
 * Process refund for an order
 * POST /api/payments/refund
 */
export const processRefund = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { orderId, amount, reason } = req.body;
  const role = req.user!.role;

  // Only admins can process refunds
  if (role !== 'ADMIN') {
    throw new AppError('Unauthorized to process refunds', 403);
  }

  // Get order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (!order.paymentIntentId) {
    throw new AppError('Order has no payment to refund', 400);
  }

  if (order.paymentStatus !== 'COMPLETED') {
    throw new AppError('Can only refund completed payments', 400);
  }

  // Create refund
  const refund = await createRefund(
    order.paymentIntentId,
    amount, // If not provided, full refund
    reason as 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined
  );

  res.json({
    refund: {
      id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      reason: refund.reason,
    },
    order: {
      id: order.id,
      paymentStatus: 'REFUNDED',
    },
  });
};

/**
 * Get Stripe publishable key
 * GET /api/payments/config
 */
export const getConfig = async (req: Request, res: Response): Promise<void> => {
  res.json({
    publishableKey: getPublishableKey(),
  });
};
