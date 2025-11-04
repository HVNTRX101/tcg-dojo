import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  getOrderWithTracking,
  getOrderStatusHistory,
  updateOrderStatus,
  addTrackingNumber,
  canModifyOrder,
} from '../services/orderTrackingService';

/**
 * Order Tracking Controller
 * Enhanced order tracking endpoints
 */

/**
 * Get order with full tracking information
 * GET /api/orders/:orderId/tracking
 */
export const getOrderTracking = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { orderId } = req.params;

    // Get order with tracking
    const order = await getOrderWithTracking(orderId);

    // Verify ownership or authorization
    if (order.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, seller: { select: { id: true } } },
      });

      // Allow access if user is ADMIN
      if (user?.role === 'ADMIN') {
        return res.json({ data: order });
      }

      // Allow access if user is SELLER and has products in this order
      if (user?.seller) {
        const hasSellerProducts = order.items.some(
          (item: any) => item.product.sellerId === user.seller!.id
        );
        if (hasSellerProducts) {
          return res.json({ data: order });
        }
      }

      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ data: order });
  } catch (error) {
    console.error('Error getting order tracking:', error);
    return res.status(500).json({ error: 'Failed to get order tracking' });
  }
};

/**
 * Get order status history
 * GET /api/orders/:orderId/history
 */
export const getStatusHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { orderId } = req.params;

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await getOrderStatusHistory(orderId);

    return res.json({ data: history });
  } catch (error) {
    console.error('Error getting order history:', error);
    return res.status(500).json({ error: 'Failed to get order history' });
  }
};

/**
 * Update order status (seller/admin only)
 * PUT /api/orders/:orderId/status
 */
export const updateStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const updatedBy = req.user!.userId;
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify user is seller/admin for this order
    const user = await prisma.user.findUnique({
      where: { id: updatedBy },
      select: { role: true, seller: { select: { id: true } } },
    });

    if (user?.role !== 'ADMIN') {
      // If not admin, check if user is seller for this order
      if (!user?.seller) {
        return res.status(403).json({ error: 'Only sellers and admins can update order status' });
      }

      // Verify seller has products in this order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const hasSellerProducts = order.items.some(
        (item) => item.product.sellerId === user.seller!.id
      );

      if (!hasSellerProducts) {
        return res.status(403).json({ error: 'You do not have permission to update this order' });
      }
    }

    const order = await updateOrderStatus(orderId, status, note, updatedBy);

    return res.json({
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
};

/**
 * Add tracking number to order (seller/admin only)
 * PUT /api/orders/:orderId/tracking-number
 */
export const setTrackingNumber = async (req: Request, res: Response): Promise<any> => {
  try {
    const updatedBy = req.user!.userId;
    const { orderId } = req.params;
    const { trackingNumber } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    // Verify user is seller/admin for this order
    const user = await prisma.user.findUnique({
      where: { id: updatedBy },
      select: { role: true, seller: { select: { id: true } } },
    });

    if (user?.role !== 'ADMIN') {
      // If not admin, check if user is seller for this order
      if (!user?.seller) {
        return res.status(403).json({ error: 'Only sellers and admins can add tracking numbers' });
      }

      // Verify seller has products in this order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const hasSellerProducts = order.items.some(
        (item) => item.product.sellerId === user.seller!.id
      );

      if (!hasSellerProducts) {
        return res
          .status(403)
          .json({ error: 'You do not have permission to update this order' });
      }
    }

    const order = await addTrackingNumber(orderId, trackingNumber, updatedBy);

    return res.json({
      message: 'Tracking number added successfully',
      data: order,
    });
  } catch (error: any) {
    console.error('Error adding tracking number:', error);
    return res.status(500).json({ error: error.message || 'Failed to add tracking number' });
  }
};

/**
 * Get all orders for current user with filtering
 * GET /api/orders/my-orders
 */
export const getMyOrders = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const whereCondition: any = { userId };
    if (status) {
      whereCondition.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereCondition,
        include: {
          items: {
            include: {
              product: {
                include: {
                  game: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereCondition }),
    ]);

    // Parse addresses
    const formattedOrders = orders.map((order) => ({
      ...order,
      shippingAddress: JSON.parse(order.shippingAddress),
      billingAddress: order.billingAddress ? JSON.parse(order.billingAddress) : null,
      canModify: canModifyOrder(order),
    }));

    return res.json({
      data: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    return res.status(500).json({ error: 'Failed to get orders' });
  }
};

/**
 * Get order statistics for user
 * GET /api/orders/stats
 */
export const getOrderStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalSpent,
    ] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: 'PENDING' } }),
      prisma.order.count({ where: { userId, status: 'PROCESSING' } }),
      prisma.order.count({ where: { userId, status: 'SHIPPED' } }),
      prisma.order.count({ where: { userId, status: 'DELIVERED' } }),
      prisma.order.count({ where: { userId, status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: { userId, paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
    ]);

    return res.json({
      stats: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalSpent: totalSpent._sum.total || 0,
      },
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    return res.status(500).json({ error: 'Failed to get order stats' });
  }
};
