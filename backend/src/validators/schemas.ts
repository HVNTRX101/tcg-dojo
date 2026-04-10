import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation Schemas
 * Comprehensive input validation using Zod
 */

// Common schemas
const emailSchema = z.string().email().max(255).toLowerCase().trim();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

const uuidSchema = z.string().uuid();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
  role: z.enum(['USER', 'SELLER', 'ADMIN']).default('USER'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(5000).trim().optional().default(''),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  gameId: uuidSchema,
  setId: uuidSchema.optional(),
  rarity: z.string().max(50).trim().optional(),
  condition: z
    .enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'])
    .optional(),
  finish: z.enum(['NORMAL', 'FOIL', 'ETCHED', 'GILDED']).optional(),
  language: z.string().length(2).toUpperCase().default('EN'),
  cardNumber: z.string().max(50).trim().optional(),
  artist: z.string().max(100).trim().optional(),
  imageUrl: z.string().url().max(500).optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().max(5000).trim().optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    gameId: uuidSchema.optional(),
    setId: uuidSchema.optional(),
    rarity: z.string().max(50).trim().optional(),
    condition: z
      .enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'])
      .optional(),
    finish: z.enum(['NORMAL', 'FOIL', 'ETCHED', 'GILDED']).optional(),
    language: z.string().length(2).toUpperCase().optional(),
    cardNumber: z.string().max(50).trim().optional(),
    artist: z.string().max(100).trim().optional(),
    imageUrl: z.string().url().max(500).optional(),
    tags: z.array(z.string().max(50).trim()).max(10).optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const productQuerySchema = paginationSchema.extend({
  search: z.string().max(200).trim().optional(),
  gameId: uuidSchema.optional(),
  setId: uuidSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rarity: z.string().max(50).optional(),
  condition: z
    .enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'])
    .optional(),
  finish: z.enum(['NORMAL', 'FOIL', 'ETCHED', 'GILDED']).optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'price', 'name', 'stock']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Cart schemas
export const addToCartSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

// Order schemas
export const createOrderSchema = z.object({
  shippingAddress: z.object({
    street: z.string().max(255).trim(),
    city: z.string().max(100).trim(),
    state: z.string().max(100).trim(),
    zipCode: z.string().max(20).trim(),
    country: z.string().length(2).toUpperCase(),
  }),
  paymentMethodId: z.string().min(1),
  couponCode: z.string().max(50).trim().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
});

// Review schemas
export const createReviewSchema = z.object({
  productId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).trim(),
  images: z.array(z.string().url().max(500)).max(5).optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).trim().optional(),
    images: z.array(z.string().url().max(500)).max(5).optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// Seller schemas
export const updateSellerProfileSchema = z
  .object({
    businessName: z.string().max(200).trim().optional(),
    description: z.string().max(2000).trim().optional(),
    logoUrl: z.string().url().max(500).optional(),
    bannerUrl: z.string().url().max(500).optional(),
    website: z.string().url().max(500).optional(),
    phone: z.string().max(20).trim().optional(),
    shippingPolicy: z.string().max(2000).trim().optional(),
    returnPolicy: z.string().max(2000).trim().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

// Message schemas
export const sendMessageSchema = z.object({
  receiverId: uuidSchema,
  content: z.string().min(1).max(5000).trim(),
  orderId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
  productId: uuidSchema,
  content: z.string().min(1).max(1000).trim(),
  parentId: uuidSchema.optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
});

// Admin schemas
export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    email: emailSchema.optional(),
    role: z.enum(['USER', 'SELLER', 'ADMIN']).optional(),
    emailVerified: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const systemSettingSchema = z.object({
  value: z.string().min(1),
  isPublic: z.boolean().default(false),
  category: z.string().max(100).trim().optional(),
});

export const refundOrderSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500).trim(),
});

// Analytics schemas
export const analyticsDateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    sellerId: uuidSchema.optional(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const generateAnalyticsSchema = z.object({
  date: z.coerce.date(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

export const createReportSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  reportType: z.enum(['SALES', 'INVENTORY', 'USERS', 'REVENUE', 'CUSTOM']),
  parameters: z.record(z.unknown()).optional(),
  schedule: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
  recipients: z.array(emailSchema).min(1).optional(),
});

// Notification schemas
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  messages: z.boolean().optional(),
  reviews: z.boolean().optional(),
});

// File upload schemas
export const imageUploadSchema = z.object({
  fieldName: z.enum(['image', 'images', 'logo', 'banner', 'avatar']),
  maxSize: z
    .number()
    .int()
    .max(10 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  allowedTypes: z
    .array(z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']))
    .default(['image/jpeg', 'image/png', 'image/webp']),
});

/**
 * Validation Middleware Factory
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        errors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

/**
 * Query Validation Middleware Factory
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        errors,
      });
      return;
    }

    req.query = result.data;
    next();
  };
};

/**
 * Params Validation Middleware Factory
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid URL parameters',
        errors,
      });
      return;
    }

    req.params = result.data;
    next();
  };
};
