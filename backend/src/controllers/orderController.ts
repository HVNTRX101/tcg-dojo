import { Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  CreateOrderInput,
  UpdateOrderStatusInput,
  CancelOrderInput,
} from '../types';
import { AuthRequest } from '../middleware/auth';

/**
 * Calculate tax (simplified - 10% for demo purposes)
 * In production, use a tax calculation service based on location
 */
const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * 0.10 * 100) / 100;
};

/**
 * Calculate shipping (simplified - flat rate for demo)
 * In production, use shipping carrier APIs
 */
const calculateShipping = (itemCount: number): number => {
  if (itemCount === 0) return 0;
  return 5.99; // Flat rate shipping
};

/**
 * Validate and apply coupon discount
 */
const applyCoupon = async (
  couponCode: string,
  subtotal: number
): Promise<{ discount: number; coupon: any }> => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
  });

  if (!coupon) {
    throw new AppError('Invalid coupon code', 400);
  }

  if (!coupon.isActive) {
    throw new AppError('Coupon is not active', 400);
  }

  // Check if expired
  if (coupon.validUntil && new Date() > coupon.validUntil) {
    throw new AppError('Coupon has expired', 400);
  }

  // Check if started
  if (coupon.validFrom && new Date() < coupon.validFrom) {
    throw new AppError('Coupon is not yet valid', 400);
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError('Coupon usage limit reached', 400);
  }

  // Check minimum purchase
  if (subtotal < coupon.minPurchase) {
    throw new AppError(
      `Minimum purchase of $${coupon.minPurchase} required for this coupon`,
      400
    );
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = (subtotal * coupon.discountValue) / 100;
    // Apply max discount if set
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    // FIXED discount
    discount = coupon.discountValue;
  }

  // Discount can't exceed subtotal
  discount = Math.min(discount, subtotal);
  discount = Math.round(discount * 100) / 100;

  return { discount, coupon };
};

/**
 * Create order from cart
 * POST /api/orders
 */
export const createOrder = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const userId = req.user!.userId;
  const { shippingAddress, billingAddress, couponCode, notes } =
    req.body as CreateOrderInput;

  // Use Prisma transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get cart with items
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Validate inventory for all items
    for (const item of cart.items) {
      if (item.product.quantity < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.quantity}, Requested: ${item.quantity}`,
          400
        );
      }
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Apply coupon if provided
    let discount = 0;
    let finalCouponCode: string | undefined = undefined;
    if (couponCode) {
      const couponResult = await applyCoupon(couponCode, subtotal);
      discount = couponResult.discount;
      finalCouponCode = couponCode;

      // Increment coupon usage
      await tx.coupon.update({
        where: { code: couponCode },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Calculate other costs
    const tax = calculateTax(subtotal - discount);
    const shipping = calculateShipping(cart.items.length);
    const total = subtotal - discount + tax + shipping;

    // Create order
    const order = await tx.order.create({
      data: {
        userId,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: discount,
        tax: tax,
        shipping: shipping,
        total: Math.round(total * 100) / 100,
        couponCode: finalCouponCode,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: billingAddress
          ? JSON.stringify(billingAddress)
          : JSON.stringify(shippingAddress),
        notes,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Deduct inventory
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order;
  });

  // Parse addresses for response
  const response = {
    ...result,
    shippingAddress: JSON.parse(result.shippingAddress),
    billingAddress: result.billingAddress
      ? JSON.parse(result.billingAddress)
      : null,
  };

  res.status(201).json(response);
};

/**
 * Get user order history
 * GET /api/orders
 */
export const getOrders = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const userId = req.user!.userId;
  const { status, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.order.count({ where }),
  ]);

  // Parse addresses
  const ordersWithParsedAddresses = orders.map((order) => ({
    ...order,
    shippingAddress: JSON.parse(order.shippingAddress),
    billingAddress: order.billingAddress
      ? JSON.parse(order.billingAddress)
      : null,
  }));

  res.json({
    orders: ordersWithParsedAddresses,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
export const getOrderById = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              game: true,
              set: true,
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  rating: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Users can only view their own orders (unless admin)
  if (order.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Unauthorized to view this order', 403);
  }

  // Parse addresses
  const response = {
    ...order,
    shippingAddress: JSON.parse(order.shippingAddress),
    billingAddress: order.billingAddress
      ? JSON.parse(order.billingAddress)
      : null,
  };

  res.json(response);
};

/**
 * Update order status (Admin/Seller only)
 * PATCH /api/orders/:id/status
 */
export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body as UpdateOrderStatusInput;
  const role = req.user!.role;

  // Only admins can update order status
  if (role !== 'ADMIN') {
    throw new AppError('Unauthorized to update order status', 403);
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Validate status transition
  if (order.status === 'CANCELLED') {
    throw new AppError('Cannot update a cancelled order', 400);
  }

  if (order.status === 'DELIVERED' && status !== 'DELIVERED') {
    throw new AppError('Cannot change status of delivered order', 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status,
      trackingNumber: trackingNumber || order.trackingNumber,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Parse addresses
  const response = {
    ...updatedOrder,
    shippingAddress: JSON.parse(updatedOrder.shippingAddress),
    billingAddress: updatedOrder.billingAddress
      ? JSON.parse(updatedOrder.billingAddress)
      : null,
  };

  res.json(response);
};

/**
 * Cancel order
 * POST /api/orders/:id/cancel
 */
export const cancelOrder = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { cancelReason } = req.body as CancelOrderInput;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check ownership
  if (order.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Unauthorized to cancel this order', 403);
  }

  // Can only cancel pending or processing orders
  if (!['PENDING', 'PROCESSING'].includes(order.status)) {
    throw new AppError(
      `Cannot cancel order with status: ${order.status}`,
      400
    );
  }

  // Use transaction to restore inventory and cancel order
  const result = await prisma.$transaction(async (tx) => {
    // Restore inventory
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    // Update order
    const cancelledOrder = await tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return cancelledOrder;
  });

  // Parse addresses
  const response = {
    ...result,
    shippingAddress: JSON.parse(result.shippingAddress),
    billingAddress: result.billingAddress
      ? JSON.parse(result.billingAddress)
      : null,
  };

  res.json(response);
};

/**
 * Get all orders (Admin only)
 * GET /api/orders/admin/all
 */
export const getAllOrders = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  const role = req.user!.role;

  if (role !== 'ADMIN') {
    throw new AppError('Unauthorized', 403);
  }

  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.order.count({ where }),
  ]);

  // Parse addresses
  const ordersWithParsedAddresses = orders.map((order) => ({
    ...order,
    shippingAddress: JSON.parse(order.shippingAddress),
    billingAddress: order.billingAddress
      ? JSON.parse(order.billingAddress)
      : null,
  }));

  res.json({
    orders: ordersWithParsedAddresses,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};
