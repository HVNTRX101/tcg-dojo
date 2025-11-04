import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Product schemas
export const createProductSchema = z.object({
  gameId: z.string().uuid(),
  setId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().nonnegative(),
  condition: z.enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR']),
  rarity: z.string().optional(),
  finish: z.enum(['NORMAL', 'FOIL', 'HOLO', 'REVERSE_HOLO', 'FULL_ART', 'SECRET_RARE']).default('NORMAL'),
  language: z.string().default('English'),
  imageUrl: z.string().url().optional(),
  cardNumber: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Cart schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

// Order schemas
export const addressSchema = z.object({
  fullName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
});

export const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  cancelReason: z.string().min(1),
});

// Coupon schemas
export const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
});

export const createCouponSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  minPurchase: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

// Types
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
