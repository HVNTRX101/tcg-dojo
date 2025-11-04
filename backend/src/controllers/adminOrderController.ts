import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '../services/adminLog.service';

const prisma = new PrismaClient();

/**
 * Get all orders with filtering and pagination (admin view)
 * GET /api/admin/orders
 */
export const getAllOrders = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      userId,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (minTotal || maxTotal) {
      where.total = {};
      if (minTotal) where.total.gte = parseFloat(minTotal);
      if (maxTotal) where.total.lte = parseFloat(maxTotal);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  seller: {
                    select: { id: true, businessName: true },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Get order by ID with full details
 * GET /api/admin/orders/:orderId
 */
export const getOrderById = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: { id: true, businessName: true, contactEmail: true },
                },
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Parse JSON addresses
    const parsedOrder = {
      ...order,
      shippingAddress: order.shippingAddress
        ? JSON.parse(order.shippingAddress)
        : null,
      billingAddress: order.billingAddress
        ? JSON.parse(order.billingAddress)
        : null,
    };

    res.json(parsedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

/**
 * Update order status (admin override)
 * PUT /api/admin/orders/:orderId/status
 */
export const updateOrderStatus = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    // Update order status
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Add to status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        note,
        updatedBy: req.user.userId,
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'ORDER_STATUS_UPDATED',
      'ORDER',
      orderId,
      { newStatus: status, note }
    );

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

/**
 * Update order payment status
 * PUT /api/admin/orders/:orderId/payment-status
 */
export const updatePaymentStatus = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, note } = req.body;

    if (!paymentStatus) {
      res.status(400).json({ error: 'Payment status is required' });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    // Log admin action
    await logAdminAction(
      req,
      'ORDER_PAYMENT_STATUS_UPDATED',
      'ORDER',
      orderId,
      { newPaymentStatus: paymentStatus, note }
    );

    res.json(order);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};

/**
 * Refund an order
 * POST /api/admin/orders/:orderId/refund
 */
export const refundOrder = async (req: any, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    // Update order payment status to refunded
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'REFUNDED',
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Add to status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: 'CANCELLED',
        note: `Refunded by admin. Reason: ${reason}`,
        updatedBy: req.user.userId,
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'ORDER_REFUNDED',
      'ORDER',
      orderId,
      { reason }
    );

    res.json(order);
  } catch (error) {
    console.error('Error refunding order:', error);
    res.status(500).json({ error: 'Failed to refund order' });
  }
};

/**
 * Get order statistics
 * GET /api/admin/orders/stats
 */
export const getOrderStats = async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalOrders,
      ordersByStatus,
      ordersByPaymentStatus,
      totalRevenue,
      averageOrderValue,
      topBuyers,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where,
        _count: { paymentStatus: true },
      }),
      prisma.order.aggregate({
        where: {
          ...where,
          paymentStatus: 'COMPLETED',
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          ...where,
          paymentStatus: 'COMPLETED',
        },
        _avg: { total: true },
      }),
      prisma.order.groupBy({
        by: ['userId'],
        where: {
          ...where,
          paymentStatus: 'COMPLETED',
        },
        _count: { userId: true },
        _sum: { total: true },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Get user details for top buyers
    const userIds = topBuyers.map((b) => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = users.reduce((acc: any, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    res.json({
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc: any, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      ordersByPaymentStatus: ordersByPaymentStatus.reduce((acc: any, item) => {
        acc[item.paymentStatus] = item._count.paymentStatus;
        return acc;
      }, {}),
      totalRevenue: totalRevenue._sum.total || 0,
      averageOrderValue: averageOrderValue._avg.total || 0,
      topBuyers: topBuyers.map((b) => ({
        user: userMap[b.userId],
        orderCount: b._count.userId,
        totalSpent: b._sum.total,
      })),
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
};
