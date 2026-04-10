import dotenv from 'dotenv';

dotenv.config();

const INSECURE_JWT_DEFAULTS = ['default-secret', 'default-refresh-secret'];

function requireEnv(key: string, insecureValues?: string[]): string {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: Missing required environment variable "${key}". Refusing to start.`);
    process.exit(1);
  }
  if (insecureValues?.includes(value)) {
    console.error(`FATAL: Environment variable "${key}" is set to an insecure default value. Set a strong secret and restart.`);
    process.exit(1);
  }
  return value;
}

const jwtSecret =
  process.env.NODE_ENV === 'production'
    ? requireEnv('JWT_SECRET', INSECURE_JWT_DEFAULTS)
    : (process.env.JWT_SECRET || 'default-secret-dev-only');

const jwtRefreshSecret =
  process.env.NODE_ENV === 'production'
    ? requireEnv('JWT_REFRESH_SECRET', INSECURE_JWT_DEFAULTS)
    : (process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-dev-only');

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: jwtRefreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'TCG Marketplace <noreply@tcgmarketplace.com>',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'tcg-marketplace',
  },
};
