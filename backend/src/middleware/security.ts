import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisConnected } from '../config/redis';

/**
 * Security Headers Middleware
 * Implements comprehensive HTTP security headers using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from external sources
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CDN resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Rate Limiting Configurations
 * Uses Redis for distributed rate limiting when available
 * Falls back to in-memory store if Redis is unavailable
 */

/**
 * Get Redis store configuration for rate limiting
 * Returns undefined if Redis is not connected (falls back to memory store)
 */
function getRedisStore(prefix: string) {
  try {
    const redisClient = getRedisClient();
    if (redisClient && isRedisConnected()) {
      return new RedisStore({
        // @ts-expect-error - RedisStore accepts ioredis client
        client: redisClient,
        prefix: `rl:${prefix}:`,
      });
    }
  } catch (error) {
    console.warn(`Failed to initialize Redis store for ${prefix}, falling back to memory store:`, error);
  }
  return undefined;
}

// General API rate limit - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  store: getRedisStore('general'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Authentication rate limit - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  store: getRedisStore('auth'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Authentication Attempts',
      message: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// Strict rate limit for sensitive operations - 3 per hour
export const strictLimiter = rateLimit({
  store: getRedisStore('strict'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many requests for this sensitive operation.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'This operation is rate-limited. Please try again later.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

// API key/admin operations - 1000 per hour
export const adminLimiter = rateLimit({
  store: getRedisStore('admin'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Admin rate limit exceeded.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Admin operation rate limit exceeded.',
      retryAfter: res.getHeader('RateLimit-Reset'),
    });
  },
});

/**
 * MongoDB Query Sanitization
 * Prevents NoSQL injection attacks
 */
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized potentially malicious input in ${key}`);
  },
});

/**
 * XSS Protection Middleware
 * Sanitizes user input to prevent XSS attacks
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitize object to prevent XSS
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * HTTP Parameter Pollution (HPP) Protection
 * Prevents parameter pollution attacks
 */
export const hppProtection = (req: Request, res: Response, next: NextFunction) => {
  // Whitelist of parameters that can be arrays
  const whitelist = ['tags', 'filters', 'sort', 'fields', 'games', 'rarities'];

  // Check query parameters
  if (req.query) {
    for (const key in req.query) {
      if (!whitelist.includes(key) && Array.isArray(req.query[key])) {
        // Take only the last value if not whitelisted
        req.query[key] = (req.query[key] as string[])[
          (req.query[key] as string[]).length - 1
        ];
      }
    }
  }

  next();
};

/**
 * CSRF Token Validation Middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF for API endpoints using JWT (stateless)
  // CSRF protection is mainly for cookie-based sessions
  // Since we use JWT in headers, we rely on SameSite cookies and Origin checking

  const origin = req.get('origin');
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF validation failed: Invalid origin',
    });
    return;
  }

  next();
};

/**
 * SQL Injection Prevention
 * Note: Prisma already provides protection against SQL injection
 * This is an additional layer of validation
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi;

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPattern.test(value);
    }
    if (Array.isArray(value)) {
      return value.some(item => checkValue(item));
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(v => checkValue(v));
    }
    return false;
  };

  // Check all inputs
  const hasInjection =
    checkValue(req.body) ||
    checkValue(req.query) ||
    checkValue(req.params);

  if (hasInjection) {
    console.warn(`Potential SQL injection attempt detected from IP: ${req.ip}`);
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid input detected',
    });
    return;
  }

  next();
};

/**
 * Security Logger
 * Logs security-relevant events
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log security-relevant headers
  const securityHeaders = {
    userAgent: req.get('user-agent'),
    ip: req.ip,
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    referer: req.get('referer'),
  };

  // Attach to request for later use
  (req as any).securityLog = securityHeaders;

  next();
};

/**
 * Trusted Proxy Configuration
 */
export const trustProxy = (app: any) => {
  // Trust proxy - important for rate limiting to work correctly behind nginx/load balancer
  app.set('trust proxy', 1);
};
