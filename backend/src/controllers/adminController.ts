import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '../services/adminLog.service';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Get all users with filtering and pagination
 * GET /api/admin/users
 */
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    // Apply filters
    if (role) where.role = role;
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';

    // Search by email or name
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
              collections: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user by ID with full details
 * GET /api/admin/users/:userId
 */
export const getUserById = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller: true,
        addresses: true,
        settings: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            collections: true,
            wishlists: true,
            follows: true,
            sentMessages: true,
            receivedMessages: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Update user details
 * PUT /api/admin/users/:userId
 */
export const updateUser = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { email, name, role, isVerified } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'USER_UPDATED',
      'USER',
      userId,
      { updatedFields: Object.keys(updateData) }
    );

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent self-deletion
    if (userId === req.user.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log admin action
    await logAdminAction(req, 'USER_DELETED', 'USER', userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Get user statistics
 * GET /api/admin/users/stats
 */
export const getUserStats = async (req: any, res: Response) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      usersByRole,
      newUsersLast30Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      usersByRole: usersByRole.reduce((acc: any, item: any) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {}),
      newUsersLast30Days,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

// ============================================
// SYSTEM SETTINGS
// ============================================

/**
 * Get all system settings
 * GET /api/admin/settings
 */
export const getSystemSettings = async (req: any, res: Response) => {
  try {
    const { category } = req.query;

    const where: any = {};
    if (category) where.category = category;

    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Parse JSON values
    const parsedSettings = settings.map((setting: any) => ({
      ...setting,
      value: setting.value ? JSON.parse(setting.value) : null,
    }));

    res.json(parsedSettings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
};

/**
 * Get a single system setting by key
 * GET /api/admin/settings/:key
 */
export const getSystemSettingByKey = async (req: any, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await prisma.systemSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    res.json({
      ...setting,
      value: setting.value ? JSON.parse(setting.value) : null,
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
};

/**
 * Update or create a system setting
 * PUT /api/admin/settings/:key
 */
export const updateSystemSetting = async (req: any, res: Response) => {
  try {
    const { key } = req.params;
    const { value, category, description, isPublic } = req.body;

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        category: category || undefined,
        description: description || undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
        updatedBy: req.user.userId,
      },
      create: {
        key,
        value: JSON.stringify(value),
        category: category || 'GENERAL',
        description,
        isPublic: isPublic || false,
        updatedBy: req.user.userId,
      },
    });

    // Log admin action
    await logAdminAction(
      req,
      'SYSTEM_SETTING_UPDATED',
      'SETTING',
      setting.id,
      { key, category: setting.category }
    );

    res.json({
      ...setting,
      value: JSON.parse(setting.value),
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

/**
 * Delete a system setting
 * DELETE /api/admin/settings/:key
 */
export const deleteSystemSetting = async (req: any, res: Response) => {
  try {
    const { key } = req.params;

    await prisma.systemSettings.delete({
      where: { key },
    });

    // Log admin action
    await logAdminAction(req, 'SYSTEM_SETTING_DELETED', 'SETTING', key);

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

// ============================================
// ADMIN LOGS
// ============================================

/**
 * Get admin logs
 * GET /api/admin/logs
 */
export const getAdminLogs = async (req: any, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      adminId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    } = req.query;

    const where: any = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.adminLog.count({ where }),
    ]);

    // Parse JSON details
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    res.json({
      logs: parsedLogs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
};

/**
 * Get dashboard overview
 * GET /api/admin/dashboard
 */
export const getDashboardOverview = async (req: any, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast30Days,
      newUsersLast7Days,
      totalProducts,
      newProductsLast30Days,
      totalOrders,
      ordersLast30Days,
      totalRevenue,
      revenueLast30Days,
      pendingReviews,
      activeSellers,
    ] = await Promise.all([
      // User metrics
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      // Product metrics
      prisma.product.count(),
      prisma.product.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Order metrics
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Revenue metrics
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'COMPLETED' },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Review metrics
      prisma.review.count({ where: { moderationStatus: 'PENDING' } }),

      // Seller metrics
      prisma.seller.count({ where: { isActive: true } }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days,
      },
      products: {
        total: totalProducts,
        newLast30Days: newProductsLast30Days,
      },
      orders: {
        total: totalOrders,
        last30Days: ordersLast30Days,
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
        last30Days: revenueLast30Days._sum.total || 0,
      },
      reviews: {
        pendingModeration: pendingReviews,
      },
      sellers: {
        active: activeSellers,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
