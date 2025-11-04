import { Router } from 'express';
import {
  validateCoupon,
  getCoupon,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { validateCouponSchema, createCouponSchema } from '../types';

const router = Router();

/**
 * @route   POST /api/coupons/validate
 * @desc    Validate a coupon code
 * @access  Public
 */
router.post('/validate', validate(validateCouponSchema), validateCoupon);

/**
 * @route   GET /api/coupons/:code
 * @desc    Get coupon by code
 * @access  Public
 */
router.get('/:code', getCoupon);

/**
 * @route   POST /api/coupons
 * @desc    Create coupon
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createCouponSchema),
  createCoupon
);

/**
 * @route   GET /api/coupons/admin/all
 * @desc    Get all coupons
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticate, requireRole('ADMIN'), getAllCoupons);

/**
 * @route   PUT /api/coupons/:id
 * @desc    Update coupon
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, requireRole('ADMIN'), updateCoupon);

/**
 * @route   DELETE /api/coupons/:id
 * @desc    Delete coupon
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteCoupon);

export default router;
