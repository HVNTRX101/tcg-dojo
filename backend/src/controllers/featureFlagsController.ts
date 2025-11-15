import { Request, Response } from 'express';
import { featureFlagsService, FeatureFlag, FlagTargetType } from '../services/featureFlags.service';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all feature flags (admin only)
 */
export const getAllFlags = async (req: Request, res: Response): Promise<void> => {
  const flags = featureFlagsService.getAllFlags();
  res.json({ flags, count: flags.length });
};

/**
 * Get a specific feature flag
 */
export const getFlag = async (req: Request, res: Response): Promise<void> => {
  const { flagKey } = req.params;
  const flag = featureFlagsService.getFlag(flagKey);

  if (!flag) {
    throw new AppError('Feature flag not found', 404);
  }

  res.json({ flag });
};

/**
 * Get flags enabled for current user
 */
export const getMyFlags = async (req: AuthRequest, res: Response): Promise<void> => {
  const context = {
    userId: req.user?.userId,
    userRole: req.user?.role,
    email: req.user?.email,
  };

  const enabledFlags = featureFlagsService.getEnabledFlagsForUser(context);
  res.json({ enabledFlags });
};

/**
 * Check if a specific flag is enabled for current user
 */
export const checkFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { flagKey } = req.params;

  const context = {
    userId: req.user?.userId,
    userRole: req.user?.role,
    email: req.user?.email,
  };

  const isEnabled = featureFlagsService.isEnabled(flagKey, context);
  const flag = featureFlagsService.getFlag(flagKey);

  res.json({
    flagKey,
    isEnabled,
    flag: flag || null,
  });
};

/**
 * Create a new feature flag (admin only)
 */
export const createFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { key, name, description, enabled, targetType, targetValue } = req.body;

  if (!key || !name) {
    throw new AppError('Flag key and name are required', 400);
  }

  // Validate targetType
  if (!Object.values(FlagTargetType).includes(targetType)) {
    throw new AppError('Invalid target type', 400);
  }

  try {
    const flag = featureFlagsService.createFlag({
      key,
      name,
      description: description || '',
      enabled: enabled !== undefined ? enabled : false,
      targetType,
      targetValue,
      createdBy: req.user?.userId,
    });

    res.status(201).json({ flag, message: 'Feature flag created successfully' });
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
};

/**
 * Update a feature flag (admin only)
 */
export const updateFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { flagKey } = req.params;
  const updates = req.body;

  // Prevent key changes
  delete updates.key;
  delete updates.createdAt;

  try {
    const flag = featureFlagsService.updateFlag(flagKey, updates);
    res.json({ flag, message: 'Feature flag updated successfully' });
  } catch (error: any) {
    throw new AppError(error.message, 404);
  }
};

/**
 * Toggle a feature flag on/off (admin only)
 */
export const toggleFlag = async (req: Request, res: Response): Promise<void> => {
  const { flagKey } = req.params;

  try {
    const flag = featureFlagsService.toggleFlag(flagKey);
    res.json({
      flag,
      message: `Feature flag '${flagKey}' is now ${flag.enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    throw new AppError(error.message, 404);
  }
};

/**
 * Delete a feature flag (admin only)
 */
export const deleteFlag = async (req: Request, res: Response): Promise<void> => {
  const { flagKey } = req.params;

  const deleted = featureFlagsService.deleteFlag(flagKey);

  if (!deleted) {
    throw new AppError('Feature flag not found', 404);
  }

  res.json({ message: 'Feature flag deleted successfully' });
};

/**
 * Export all flags (admin only)
 */
export const exportFlags = async (req: Request, res: Response): Promise<void> => {
  const flags = featureFlagsService.exportFlags();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="feature-flags-${Date.now()}.json"`
  );
  res.json({ flags, exportedAt: new Date().toISOString() });
};

/**
 * Import flags (admin only)
 */
export const importFlags = async (req: Request, res: Response): Promise<void> => {
  const { flags } = req.body;

  if (!Array.isArray(flags)) {
    throw new AppError('Flags must be an array', 400);
  }

  try {
    featureFlagsService.importFlags(flags);
    res.json({ message: `Imported ${flags.length} feature flags successfully` });
  } catch (error: any) {
    throw new AppError(error.message, 400);
  }
};
