import Joi from 'joi';

/**
 * Validation Schemas
 * Comprehensive input validation using Joi
 */

// Common schemas
const emailSchema = Joi.string()
  .email()
  .max(255)
  .lowercase()
  .trim()
  .required();

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters long',
  });

const uuidSchema = Joi.string().uuid().required();

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Authentication schemas
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: Joi.string().min(2).max(100).trim().required(),
  role: Joi.string().valid('USER', 'SELLER', 'ADMIN').default('USER'),
});

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(), // Don't validate pattern on login
});

export const resetPasswordRequestSchema = Joi.object({
  email: emailSchema,
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
});

// Product schemas
export const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).trim().required(),
  description: Joi.string().max(5000).trim().allow(''),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
  gameId: uuidSchema,
  setId: Joi.string().uuid().optional(),
  rarity: Joi.string().max(50).trim().optional(),
  condition: Joi.string().valid('MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR').optional(),
  finish: Joi.string().valid('NORMAL', 'FOIL', 'ETCHED', 'GILDED').optional(),
  language: Joi.string().length(2).uppercase().default('EN'),
  cardNumber: Joi.string().max(50).trim().optional(),
  artist: Joi.string().max(100).trim().optional(),
  imageUrl: Joi.string().uri().max(500).optional(),
  tags: Joi.array().items(Joi.string().max(50).trim()).max(10).optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).trim(),
  description: Joi.string().max(5000).trim().allow(''),
  price: Joi.number().positive().precision(2),
  stock: Joi.number().integer().min(0),
  gameId: Joi.string().uuid(),
  setId: Joi.string().uuid(),
  rarity: Joi.string().max(50).trim(),
  condition: Joi.string().valid('MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'),
  finish: Joi.string().valid('NORMAL', 'FOIL', 'ETCHED', 'GILDED'),
  language: Joi.string().length(2).uppercase(),
  cardNumber: Joi.string().max(50).trim(),
  artist: Joi.string().max(100).trim(),
  imageUrl: Joi.string().uri().max(500),
  tags: Joi.array().items(Joi.string().max(50).trim()).max(10),
}).min(1); // At least one field must be present

export const productQuerySchema = paginationSchema.keys({
  search: Joi.string().max(200).trim(),
  gameId: Joi.string().uuid(),
  setId: Joi.string().uuid(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  rarity: Joi.string().max(50),
  condition: Joi.string().valid('MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'LIGHT_PLAYED', 'PLAYED', 'POOR'),
  finish: Joi.string().valid('NORMAL', 'FOIL', 'ETCHED', 'GILDED'),
  inStock: Joi.boolean(),
  sortBy: Joi.string().valid('createdAt', 'price', 'name', 'stock'),
  sortOrder: Joi.string().valid('asc', 'desc'),
});

// Cart schemas
export const addToCartSchema = Joi.object({
  productId: uuidSchema,
  quantity: Joi.number().integer().min(1).max(99).required(),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(99).required(),
});

// Order schemas
export const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    street: Joi.string().max(255).trim().required(),
    city: Joi.string().max(100).trim().required(),
    state: Joi.string().max(100).trim().required(),
    zipCode: Joi.string().max(20).trim().required(),
    country: Joi.string().length(2).uppercase().required(),
  }).required(),
  paymentMethodId: Joi.string().required(),
  couponCode: Joi.string().max(50).trim().optional(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')
    .required(),
});

// Review schemas
export const createReviewSchema = Joi.object({
  productId: uuidSchema,
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).trim().required(),
  images: Joi.array().items(Joi.string().uri().max(500)).max(5).optional(),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  comment: Joi.string().max(2000).trim(),
  images: Joi.array().items(Joi.string().uri().max(500)).max(5),
}).min(1);

// Seller schemas
export const updateSellerProfileSchema = Joi.object({
  businessName: Joi.string().max(200).trim(),
  description: Joi.string().max(2000).trim(),
  logoUrl: Joi.string().uri().max(500),
  bannerUrl: Joi.string().uri().max(500),
  website: Joi.string().uri().max(500),
  phone: Joi.string().max(20).trim(),
  shippingPolicy: Joi.string().max(2000).trim(),
  returnPolicy: Joi.string().max(2000).trim(),
}).min(1);

// Message schemas
export const sendMessageSchema = Joi.object({
  receiverId: uuidSchema,
  content: Joi.string().min(1).max(5000).trim().required(),
  orderId: Joi.string().uuid().optional(),
  productId: Joi.string().uuid().optional(),
});

// Comment schemas
export const createCommentSchema = Joi.object({
  productId: uuidSchema,
  content: Joi.string().min(1).max(1000).trim().required(),
  parentId: Joi.string().uuid().optional(),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).trim().required(),
});

// Admin schemas
export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  email: emailSchema.optional(),
  role: Joi.string().valid('USER', 'SELLER', 'ADMIN'),
  emailVerified: Joi.boolean(),
}).min(1);

export const systemSettingSchema = Joi.object({
  value: Joi.string().required(),
  isPublic: Joi.boolean().default(false),
  category: Joi.string().max(100).trim().optional(),
});

export const refundOrderSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  reason: Joi.string().max(500).trim().required(),
});

// Analytics schemas
export const analyticsDateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  period: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').default('DAILY'),
  sellerId: Joi.string().uuid().optional(),
});

export const generateAnalyticsSchema = Joi.object({
  date: Joi.date().iso().required(),
  period: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').required(),
});

export const createReportSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().required(),
  description: Joi.string().max(1000).trim().optional(),
  reportType: Joi.string().valid('SALES', 'INVENTORY', 'USERS', 'REVENUE', 'CUSTOM').required(),
  parameters: Joi.object().optional(),
  schedule: Joi.string().valid('NONE', 'DAILY', 'WEEKLY', 'MONTHLY').default('NONE'),
  recipients: Joi.array().items(emailSchema).min(1).optional(),
});

// Notification schemas
export const notificationPreferencesSchema = Joi.object({
  emailNotifications: Joi.boolean(),
  pushNotifications: Joi.boolean(),
  orderUpdates: Joi.boolean(),
  promotions: Joi.boolean(),
  newsletter: Joi.boolean(),
  messages: Joi.boolean(),
  reviews: Joi.boolean(),
});

// File upload schemas
export const imageUploadSchema = Joi.object({
  fieldName: Joi.string().valid('image', 'images', 'logo', 'banner', 'avatar').required(),
  maxSize: Joi.number().integer().max(10 * 1024 * 1024).default(5 * 1024 * 1024), // Default 5MB
  allowedTypes: Joi.array()
    .items(Joi.string().valid('image/jpeg', 'image/png', 'image/webp', 'image/gif'))
    .default(['image/jpeg', 'image/png', 'image/webp']),
});

/**
 * Validation Middleware Factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Type conversion
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        errors,
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Query Validation Middleware Factory
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        errors,
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Params Validation Middleware Factory
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid URL parameters',
        errors,
      });
    }

    req.params = value;
    next();
  };
};
