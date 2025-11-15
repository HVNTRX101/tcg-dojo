import { Response } from 'express';
import { config } from '../config/env';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Convert JWT expiry time to milliseconds for cookie maxAge
 * @param expiryString - JWT expiry string (e.g., '7d', '30d', '1h')
 * @returns milliseconds
 */
export const parseExpiryToMs = (expiryString: string): number => {
  const match = expiryString.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiryString}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to ms
    case 'h':
      return value * 60 * 60 * 1000; // hours to ms
    case 'm':
      return value * 60 * 1000; // minutes to ms
    case 's':
      return value * 1000; // seconds to ms
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
};

/**
 * Set access token as HttpOnly cookie
 */
export const setAccessTokenCookie = (res: Response, token: string): void => {
  const isProduction = config.nodeEnv === 'production';
  const maxAge = parseExpiryToMs(config.jwt.expiresIn as string);

  res.cookie('accessToken', token, {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: maxAge,
    path: '/',
  });
};

/**
 * Set refresh token as HttpOnly cookie
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  const isProduction = config.nodeEnv === 'production';
  const maxAge = parseExpiryToMs(config.jwt.refreshExpiresIn as string);

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: maxAge,
    path: '/',
  });
};

/**
 * Clear authentication cookies on logout
 */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};
