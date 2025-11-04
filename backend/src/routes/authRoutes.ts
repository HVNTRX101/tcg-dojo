import { Router } from 'express';
import {
  signup,
  login,
  refresh,
  getProfile,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController';
import {
  validate,
  registerSchema,
  loginSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '../validators/schemas';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Authentication (with comprehensive validation)
router.post('/signup', validate(registerSchema), asyncHandler(signup));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh)); // Token refresh doesn't need body validation
router.get('/profile', authenticate, asyncHandler(getProfile));

// Email verification
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', asyncHandler(resendVerificationEmail));

// Password reset (with validation)
router.post('/request-password-reset', validate(resetPasswordRequestSchema), asyncHandler(requestPasswordReset));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
