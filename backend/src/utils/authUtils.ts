import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a random token for email verification or password reset
 * @param length - Length of the token (default: 32 bytes = 64 hex characters)
 * @returns Random hex token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage in the database
 * @param token - Plain token to hash
 * @returns Hashed token
 */
export const hashToken = async (token: string): Promise<string> => {
  return await bcrypt.hash(token, 10);
};

/**
 * Compare a plain token with a hashed token
 * @param plainToken - Plain token to compare
 * @param hashedToken - Hashed token from database
 * @returns True if tokens match
 */
export const compareToken = async (
  plainToken: string,
  hashedToken: string
): Promise<boolean> => {
  return await bcrypt.compare(plainToken, hashedToken);
};

/**
 * Generate token expiry date
 * @param hours - Number of hours until expiry (default: 24)
 * @returns Expiry date
 */
export const generateTokenExpiry = (hours: number = 24): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

/**
 * Check if a token has expired
 * @param expiryDate - Token expiry date
 * @returns True if token is expired
 */
export const isTokenExpired = (expiryDate: Date | null): boolean => {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
};
