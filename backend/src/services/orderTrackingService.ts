import prisma from '../config/database';
import { createNotification, NotificationTypes } from '../controllers/notificationController';

/**
 * Order Tracking Service
 * Enhanced order tracking with status history and notifications
 */

/**
 * Add status change to order history
 */
export const addOrderStatusHistory = async (
  orderId: string,
  status: string,
  note?: string,
  updatedBy?: string
) => {
  try {
    const historyEntry = await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        note,
        updatedBy,
      },
    });

    return historyEntry;
  } catch (error) {
    console.error('Error adding order status history:', error);
    throw error;
  }
};

/**
 * Update order status with history tracking and notifications
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: string,
  note?: string,
  updatedBy?: string
) => {
  try {
    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const oldStatus = order.status;

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    // Add to history
    await addOrderStatusHistory(
      orderId,
      newStatus,
      note || `Status changed from ${oldStatus} to ${newStatus}`,
      updatedBy
    );

    // Create notification for user
    const notificationMessages: { [key: string]: { title: string; message: string; type: string } } = {
      PROCESSING: {
        title: 'Order Processing',
        message: `Your order #${orderId.substring(0, 8)} is now being processed.`,
        type: NotificationTypes.ORDER_UPDATE,
      },
      SHIPPED: {
        title: 'Order Shipped',
        message: `Your order #${orderId.substring(0, 8)} has been shipped!`,
        type: NotificationTypes.ORDER_SHIPPED,
      },
      DELIVERED: {
        title: 'Order Delivered',
        message: `Your order #${orderId.substring(0, 8)} has been delivered.`,
        type: NotificationTypes.ORDER_DELIVERED,
      },
      CANCELLED: {
        title: 'Order Cancelled',
        message: `Your order #${orderId.substring(0, 8)} has been cancelled.`,
        type: NotificationTypes.ORDER_UPDATE,
      },
    };

    if (notificationMessages[newStatus]) {
      const { title, message, type } = notificationMessages[newStatus];
      await createNotification(
        order.userId,
        type,
        title,
        message,
        `/orders/${orderId}`,
        { orderId, oldStatus, newStatus }
      );
    }

    // TODO: Send email notification based on user preferences
    // TODO: Emit WebSocket event for real-time update

    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

/**
 * Get order status history
 */
export const getOrderStatusHistory = async (orderId: string) => {
  try {
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return history;
  } catch (error) {
    console.error('Error getting order status history:', error);
    throw error;
  }
};

/**
 * Get order with full tracking information
 */
export const getOrderWithTracking = async (orderId: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                game: true,
                set: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Parse JSON addresses
    const parsedOrder = {
      ...order,
      shippingAddress: JSON.parse(order.shippingAddress),
      billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
    };

    return parsedOrder;
  } catch (error) {
    console.error('Error getting order with tracking:', error);
    throw error;
  }
};

/**
 * Add tracking number to order
 */
export const addTrackingNumber = async (
  orderId: string,
  trackingNumber: string,
  updatedBy?: string
) => {
  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { trackingNumber },
    });

    // Add history entry
    await addOrderStatusHistory(
      orderId,
      order.status,
      `Tracking number added: ${trackingNumber}`,
      updatedBy
    );

    // Create notification
    await createNotification(
      order.userId,
      NotificationTypes.ORDER_UPDATE,
      'Tracking Number Available',
      `Tracking number for your order #${orderId.substring(0, 8)}: ${trackingNumber}`,
      `/orders/${orderId}`,
      { orderId, trackingNumber }
    );

    return order;
  } catch (error) {
    console.error('Error adding tracking number:', error);
    throw error;
  }
};

/**
 * Restore product inventory when order is cancelled
 */
export const restoreInventory = async (orderId: string) => {
  try {
    // Get all order items
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: {
        productId: true,
        quantity: true,
      },
    });

    // Restore inventory for each product
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    console.log(`✅ Restored inventory for order ${orderId.substring(0, 8)} (${orderItems.length} items)`);
  } catch (error) {
    console.error('Error restoring inventory:', error);
    throw error;
  }
};

/**
 * Cancel order with reason
 */
export const cancelOrder = async (
  orderId: string,
  cancelReason: string,
  cancelledBy?: string
) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Can only cancel pending or processing orders
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    // Add history
    await addOrderStatusHistory(
      orderId,
      'CANCELLED',
      `Order cancelled. Reason: ${cancelReason}`,
      cancelledBy
    );

    // Create notification
    await createNotification(
      order.userId,
      NotificationTypes.ORDER_UPDATE,
      'Order Cancelled',
      `Your order #${orderId.substring(0, 8)} has been cancelled.`,
      `/orders/${orderId}`,
      { orderId, cancelReason }
    );

    // TODO: Process refund if payment was completed

    // Restore product inventory
    await restoreInventory(orderId);

    return updatedOrder;
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

/**
 * Get estimated delivery date based on shipping method
 * (Placeholder - would integrate with actual shipping carrier APIs)
 */
export const getEstimatedDelivery = (shippingMethod: string = 'STANDARD'): Date => {
  const now = new Date();
  const estimatedDays: { [key: string]: number } = {
    STANDARD: 7,
    EXPRESS: 3,
    OVERNIGHT: 1,
  };

  const days = estimatedDays[shippingMethod] || 7;
  now.setDate(now.getDate() + days);
  return now;
};

/**
 * Check if order can be modified/cancelled
 */
export const canModifyOrder = (order: any): boolean => {
  return ['PENDING', 'PROCESSING'].includes(order.status);
};

/**
 * Get orders by status (for seller/admin dashboards)
 */
export const getOrdersByStatus = async (
  status: string,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { status } }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting orders by status:', error);
    throw error;
  }
};
