import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getSalesAnalytics,
  getUserBehaviorAnalytics,
  getInventoryAnalytics,
  saveSalesAnalytics,
  saveUserBehaviorAnalytics,
  saveInventoryAnalytics,
} from '../services/analytics.service';

const prisma = new PrismaClient();

/**
 * Get sales analytics
 * GET /api/admin/analytics/sales
 */
export const getSales = async (req: any, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'DAILY',
      sellerId,
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const analytics = await getSalesAnalytics(
      new Date(startDate),
      new Date(endDate),
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      sellerId
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
};

/**
 * Get user behavior analytics
 * GET /api/admin/analytics/user-behavior
 */
export const getUserBehavior = async (req: any, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'DAILY',
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const analytics = await getUserBehaviorAnalytics(
      new Date(startDate),
      new Date(endDate),
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY'
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user behavior analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user behavior analytics' });
  }
};

/**
 * Get inventory analytics
 * GET /api/admin/analytics/inventory
 */
export const getInventory = async (req: any, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'DAILY',
      sellerId,
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const analytics = await getInventoryAnalytics(
      new Date(startDate),
      new Date(endDate),
      period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      sellerId
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ error: 'Failed to fetch inventory analytics' });
  }
};

/**
 * Generate analytics for a specific date
 * POST /api/admin/analytics/generate
 */
export const generateAnalytics = async (req: any, res: Response) => {
  try {
    const { date, period = 'DAILY', sellerId } = req.body;

    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const targetDate = new Date(date);

    const [sales, userBehavior, inventory] = await Promise.all([
      saveSalesAnalytics(targetDate, period, sellerId),
      sellerId ? null : saveUserBehaviorAnalytics(targetDate, period),
      saveInventoryAnalytics(targetDate, period, sellerId),
    ]);

    res.json({
      message: 'Analytics generated successfully',
      sales,
      userBehavior,
      inventory,
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
};

/**
 * Get revenue overview
 * GET /api/admin/analytics/revenue
 */
export const getRevenueOverview = async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalRevenue,
      completedRevenue,
      pendingRevenue,
      refundedAmount,
      orderCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PENDING' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'REFUNDED' },
        _sum: { total: true },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.total || 0,
      completedRevenue: completedRevenue._sum.total || 0,
      pendingRevenue: pendingRevenue._sum.total || 0,
      refundedAmount: refundedAmount._sum.total || 0,
      orderCount,
      averageOrderValue: orderCount > 0 ? (completedRevenue._sum.total || 0) / orderCount : 0,
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({ error: 'Failed to fetch revenue overview' });
  }
};

/**
 * Get top products
 * GET /api/admin/analytics/top-products
 */
export const getTopProducts = async (req: any, res: Response) => {
  try {
    const { limit = 10, startDate, endDate, sellerId } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.order = {
        createdAt: {},
      };
      if (startDate) where.order.createdAt.gte = new Date(startDate as string);
      if (endDate) where.order.createdAt.lte = new Date(endDate as string);
    }

    if (sellerId) {
      where.product = {
        sellerId,
      };
    }

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where,
      _sum: {
        quantity: true,
        price: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: Number(limit),
    });

    // Get product details
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        game: { select: { name: true } },
        seller: { select: { businessName: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    const productMap = products.reduce((acc: any, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const result = topProducts.map((item) => ({
      product: productMap[item.productId],
      quantitySold: item._sum.quantity,
      revenue: item._sum.price,
      orderCount: item._count.productId,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
};

/**
 * Get top customers
 * GET /api/admin/analytics/top-customers
 */
export const getTopCustomers = async (req: any, res: Response) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const where: any = {
      paymentStatus: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const topCustomers = await prisma.order.groupBy({
      by: ['userId'],
      where,
      _count: {
        userId: true,
      },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: Number(limit),
    });

    // Get user details
    const userIds = topCustomers.map((c) => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const userMap = users.reduce((acc: any, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const result = topCustomers.map((item) => ({
      user: userMap[item.userId],
      orderCount: item._count.userId,
      totalSpent: item._sum.total,
      averageOrderValue: (item._sum.total || 0) / item._count.userId,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
};

// ============================================
// REPORTS MANAGEMENT
// ============================================

/**
 * Create a new report
 * POST /api/admin/analytics/reports
 */
export const createReport = async (req: any, res: Response) => {
  try {
    const { name, description, type, parameters, schedule, recipients } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Name and type are required' });
      return;
    }

    const report = await prisma.report.create({
      data: {
        name,
        description,
        type,
        parameters: parameters ? JSON.stringify(parameters) : null,
        schedule,
        recipients: recipients ? JSON.stringify(recipients) : null,
        createdBy: req.user.userId,
      },
    });

    res.json({
      ...report,
      parameters: report.parameters ? JSON.parse(report.parameters) : null,
      recipients: report.recipients ? JSON.parse(report.recipients) : null,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

/**
 * Get all reports
 * GET /api/admin/analytics/reports
 */
export const getReports = async (req: any, res: Response) => {
  try {
    const { type, isActive } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const parsedReports = reports.map((report) => ({
      ...report,
      parameters: report.parameters ? JSON.parse(report.parameters) : null,
      recipients: report.recipients ? JSON.parse(report.recipients) : null,
    }));

    res.json(parsedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

/**
 * Update a report
 * PUT /api/admin/analytics/reports/:reportId
 */
export const updateReport = async (req: any, res: Response) => {
  try {
    const { reportId } = req.params;
    const { name, description, parameters, schedule, recipients, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);
    if (schedule !== undefined) updateData.schedule = schedule;
    if (recipients !== undefined) updateData.recipients = JSON.stringify(recipients);
    if (isActive !== undefined) updateData.isActive = isActive;

    const report = await prisma.report.update({
      where: { id: reportId },
      data: updateData,
    });

    res.json({
      ...report,
      parameters: report.parameters ? JSON.parse(report.parameters) : null,
      recipients: report.recipients ? JSON.parse(report.recipients) : null,
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

/**
 * Delete a report
 * DELETE /api/admin/analytics/reports/:reportId
 */
export const deleteReport = async (req: any, res: Response) => {
  try {
    const { reportId } = req.params;

    await prisma.report.delete({
      where: { id: reportId },
    });

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};
