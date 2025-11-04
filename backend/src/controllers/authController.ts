import { Request, Response } from 'express';
import { LoginInput, SignupInput, RefreshTokenInput } from '../types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from '../services/emailService';
import {
  generateToken,
  hashToken,
  compareToken,
  generateTokenExpiry,
  isTokenExpired
} from '../utils/authUtils';
import { config } from '../config/env';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as SignupInput;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('User already exists with this email', 409);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Generate email verification token
  const verificationToken = generateToken();
  const hashedVerificationToken = await hashToken(verificationToken);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: generateTokenExpiry(24), // 24 hours
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Send verification email (don't block on this)
  try {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    await sendVerificationEmail(email, {
      userName: name,
      verificationUrl,
    });
    console.log(`✅ Verification email sent to: ${email}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to send verification email:`, emailError.message);
    // Don't fail signup if email fails
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    user,
    accessToken,
    refreshToken,
    message: 'Account created successfully. Please check your email to verify your account.',
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput;

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as RefreshTokenInput;

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
};

/**
 * Verify user's email address
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token, email } = req.body;

  if (!token || !email) {
    throw new AppError('Token and email are required', 400);
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
      emailVerificationToken: true,
      emailVerificationExpires: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    res.json({ message: 'Email is already verified' });
    return;
  }

  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Check if token is expired
  if (isTokenExpired(user.emailVerificationExpires)) {
    throw new AppError('Verification token has expired. Please request a new one.', 400);
  }

  // Compare token
  const isValidToken = await compareToken(token, user.emailVerificationToken);
  if (!isValidToken) {
    throw new AppError('Invalid verification token', 400);
  }

  // Update user as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  res.json({ message: 'Email verified successfully' });
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // Generate new verification token
  const verificationToken = generateToken();
  const hashedVerificationToken = await hashToken(verificationToken);

  // Update user with new token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: generateTokenExpiry(24),
    },
  });

  // Send verification email
  try {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    await sendVerificationEmail(email, {
      userName: user.name,
      verificationUrl,
    });
    console.log(`✅ Verification email resent to: ${email}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to resend verification email:`, emailError.message);
    throw new AppError('Failed to send verification email. Please try again later.', 500);
  }

  res.json({ message: 'Verification email sent successfully' });
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  // Don't reveal if user exists or not for security
  if (!user) {
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    return;
  }

  // Generate password reset token
  const resetToken = generateToken();
  const hashedResetToken = await hashToken(resetToken);

  // Update user with reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedResetToken,
      passwordResetExpires: generateTokenExpiry(1), // 1 hour for password reset
    },
  });

  // Send password reset email
  try {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, {
      userName: user.name,
      resetUrl,
    });
    console.log(`✅ Password reset email sent to: ${email}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to send password reset email:`, emailError.message);
    throw new AppError('Failed to send password reset email. Please try again later.', 500);
  }

  res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
};

/**
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, email, newPassword } = req.body;

  if (!token || !email || !newPassword) {
    throw new AppError('Token, email, and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordResetToken: true,
      passwordResetExpires: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  if (!user.passwordResetToken || !user.passwordResetExpires) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Check if token is expired
  if (isTokenExpired(user.passwordResetExpires)) {
    throw new AppError('Reset token has expired. Please request a new one.', 400);
  }

  // Compare token
  const isValidToken = await compareToken(token, user.passwordResetToken);
  if (!isValidToken) {
    throw new AppError('Invalid reset token', 400);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  // Send password changed confirmation email
  try {
    await sendPasswordChangedEmail(email, {
      userName: user.name,
    });
    console.log(`✅ Password changed email sent to: ${email}`);
  } catch (emailError: any) {
    console.error(`❌ Failed to send password changed email:`, emailError.message);
    // Don't fail the password reset if email fails
  }

  res.json({ message: 'Password reset successfully' });
};
