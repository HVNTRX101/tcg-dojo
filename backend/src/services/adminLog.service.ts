import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

interface CreateAdminLogParams {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an admin log entry
 */
export const createAdminLog = async (params: CreateAdminLogParams) => {
  try {
    const log = await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return log;
  } catch (error) {
    console.error('Error creating admin log:', error);
    // Don't throw - logging should not break the main flow
    return null;
  }
};

/**
 * Extract admin log info from request
 */
export const extractRequestInfo = (req: Request) => {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('user-agent') || undefined,
  };
};

/**
 * Create admin log from request
 */
export const logAdminAction = async (
  req: any,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any
) => {
  if (!req.user || !req.user.userId) {
    return null;
  }

  const requestInfo = extractRequestInfo(req);

  return createAdminLog({
    adminId: req.user.userId,
    action,
    entityType,
    entityId,
    details,
    ...requestInfo,
  });
};

/**
 * Get admin logs with pagination and filtering
 */
export const getAdminLogs = async (options: {
  adminId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) => {
  const {
    adminId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;

  const where: any = {};

  if (adminId) where.adminId = adminId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get recent admin activity
 */
export const getRecentAdminActivity = async (hours: number = 24, limit: number = 100) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const logs = await prisma.adminLog.findMany({
    where: {
      createdAt: {
        gte: since,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs;
};

/**
 * Get admin activity summary
 */
export const getAdminActivitySummary = async (
  adminId: string,
  startDate?: Date,
  endDate?: Date
) => {
  const where: any = { adminId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [totalActions, actionsByType] = await Promise.all([
    prisma.adminLog.count({ where }),
    prisma.adminLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    }),
  ]);

  return {
    totalActions,
    actionsByType,
  };
};
