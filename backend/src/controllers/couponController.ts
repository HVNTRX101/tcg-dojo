import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ValidateCouponInput, CreateCouponInput } from '../types';
import { AuthRequest } from '../middleware/auth';

/**
 * Validate a coupon code
 * POST /api/coupons/validate
 */
export const validateCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code, subtotal } = req.body as ValidateCouponInput;

  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    throw new AppError('Invalid coupon code', 404);
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
    res.status(400).json({
      valid: false,
      message: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required for this coupon`,
      minPurchase: coupon.minPurchase,
    });
    return;
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

  res.json({
    valid: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discount,
    finalAmount: subtotal - discount,
  });
};

/**
 * Get coupon by code
 * GET /api/coupons/:code
 */
export const getCoupon = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      minPurchase: true,
      maxDiscount: true,
      isActive: true,
      validFrom: true,
      validUntil: true,
    },
  });

  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }

  if (!coupon.isActive) {
    throw new AppError('Coupon is not active', 400);
  }

  res.json(coupon);
};

/**
 * Create coupon (Admin only)
 * POST /api/coupons
 */
export const createCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const data = req.body as CreateCouponInput;

  // Check if coupon code already exists
  const existingCoupon = await prisma.coupon.findUnique({
    where: { code: data.code },
  });

  if (existingCoupon) {
    throw new AppError('Coupon code already exists', 400);
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minPurchase: data.minPurchase || 0,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
    },
  });

  res.status(201).json(coupon);
};

/**
 * Get all coupons (Admin only)
 * GET /api/coupons/admin/all
 */
export const getAllCoupons = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { active, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (active !== undefined) {
    where.isActive = active === 'true';
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.coupon.count({ where }),
  ]);

  res.json({
    coupons,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * Update coupon (Admin only)
 * PUT /api/coupons/:id
 */
export const updateCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const data = req.body;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
  });

  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }

  const updatedCoupon = await prisma.coupon.update({
    where: { id },
    data: {
      description: data.description,
      discountValue: data.discountValue,
      minPurchase: data.minPurchase,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      isActive: data.isActive,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
  });

  res.json(updatedCoupon);
};

/**
 * Delete coupon (Admin only)
 * DELETE /api/coupons/:id
 */
export const deleteCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
  });

  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }

  await prisma.coupon.delete({
    where: { id },
  });

  res.json({ message: 'Coupon deleted successfully' });
};
