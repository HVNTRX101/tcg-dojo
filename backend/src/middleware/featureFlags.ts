import { Request, Response, NextFunction } from 'express';
import { featureFlagsService, FlagEvaluationContext } from '../services/featureFlags.service';
import { AuthRequest } from './auth';

/**
 * Middleware to check if a feature flag is enabled
 * Returns 403 if feature is disabled for the user
 */
export const requireFeatureFlag = (flagKey: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const context: FlagEvaluationContext = {
      userId: req.user?.userId,
      userRole: req.user?.role,
      email: req.user?.email,
    };

    const isEnabled = featureFlagsService.isEnabled(flagKey, context);

    if (!isEnabled) {
      res.status(403).json({
        error: 'Feature not available',
        message: `The feature '${flagKey}' is not enabled for your account`,
        code: 'FEATURE_DISABLED',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to attach enabled flags to request object
 * Useful for conditional rendering or logic
 */
export const attachFeatureFlags = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const context: FlagEvaluationContext = {
    userId: req.user?.userId,
    userRole: req.user?.role,
    email: req.user?.email,
  };

  const enabledFlags = featureFlagsService.getEnabledFlagsForUser(context);

  // Attach to request for use in handlers
  (req as any).featureFlags = enabledFlags;

  next();
};

/**
 * Helper function to check feature flag in controllers
 */
export const checkFeatureFlag = (flagKey: string, context?: FlagEvaluationContext): boolean => {
  return featureFlagsService.isEnabled(flagKey, context);
};
