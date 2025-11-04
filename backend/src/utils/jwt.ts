import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string | number,
  } as SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as string | number,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
};
