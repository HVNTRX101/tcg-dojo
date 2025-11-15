import { logger } from '../config/logger';

/**
 * Feature Flags Service
 * Enables/disables features dynamically without code deployment
 * Supports: boolean flags, percentage rollouts, user-specific, role-specific
 */

export enum FlagTargetType {
  GLOBAL = 'GLOBAL', // All users
  PERCENTAGE = 'PERCENTAGE', // Percentage of users
  USER_LIST = 'USER_LIST', // Specific user IDs
  ROLE = 'ROLE', // Specific user roles
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  targetType: FlagTargetType;
  targetValue?: any; // percentage (0-100), userIds[], or roles[]
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface FlagEvaluationContext {
  userId?: string;
  userRole?: string;
  email?: string;
}

class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    // Initialize with default flags
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'new_checkout_flow',
        name: 'New Checkout Flow',
        description: 'Enable the redesigned checkout experience',
        enabled: false,
        targetType: FlagTargetType.PERCENTAGE,
        targetValue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'advanced_search',
        name: 'Advanced Search',
        description: 'Enable advanced search filters',
        enabled: true,
        targetType: FlagTargetType.GLOBAL,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'seller_analytics_v2',
        name: 'Seller Analytics V2',
        description: 'New analytics dashboard for sellers',
        enabled: false,
        targetType: FlagTargetType.ROLE,
        targetValue: ['ADMIN', 'SELLER'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'ai_recommendations',
        name: 'AI-Powered Recommendations',
        description: 'ML-based product recommendations',
        enabled: true,
        targetType: FlagTargetType.PERCENTAGE,
        targetValue: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'beta_features',
        name: 'Beta Features Access',
        description: 'Access to beta features',
        enabled: true,
        targetType: FlagTargetType.USER_LIST,
        targetValue: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });

    logger.info(`✅ Feature flags initialized with ${this.flags.size} flags`);
  }

  /**
   * Check if a feature is enabled for a given context
   */
  isEnabled(flagKey: string, context?: FlagEvaluationContext): boolean {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      logger.warn(`Feature flag not found: ${flagKey}`);
      return false; // Default to disabled if flag doesn't exist
    }

    // If flag is globally disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Evaluate based on target type
    switch (flag.targetType) {
      case FlagTargetType.GLOBAL:
        return true;

      case FlagTargetType.PERCENTAGE:
        return this.evaluatePercentage(flag, context);

      case FlagTargetType.USER_LIST:
        return this.evaluateUserList(flag, context);

      case FlagTargetType.ROLE:
        return this.evaluateRole(flag, context);

      default:
        return false;
    }
  }

  /**
   * Evaluate percentage-based rollout
   * Uses consistent hashing to ensure same user always gets same result
   */
  private evaluatePercentage(flag: FeatureFlag, context?: FlagEvaluationContext): boolean {
    const percentage = flag.targetValue || 0;

    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Use userId or email for consistent hashing
    const identifier = context?.userId || context?.email || '';
    if (!identifier) {
      // If no identifier, use random (not consistent)
      return Math.random() * 100 < percentage;
    }

    // Simple hash function for consistent results
    const hash = this.hashString(identifier + flag.key);
    const bucket = hash % 100;

    return bucket < percentage;
  }

  /**
   * Simple hash function for consistent percentage evaluation
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Evaluate user list targeting
   */
  private evaluateUserList(flag: FeatureFlag, context?: FlagEvaluationContext): boolean {
    const userList = flag.targetValue || [];
    const userId = context?.userId;

    if (!userId) return false;
    return userList.includes(userId);
  }

  /**
   * Evaluate role-based targeting
   */
  private evaluateRole(flag: FeatureFlag, context?: FlagEvaluationContext): boolean {
    const allowedRoles = flag.targetValue || [];
    const userRole = context?.userRole;

    if (!userRole) return false;
    return allowedRoles.includes(userRole);
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }

  /**
   * Create a new feature flag
   */
  createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag {
    if (this.flags.has(flag.key)) {
      throw new Error(`Feature flag with key '${flag.key}' already exists`);
    }

    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.flags.set(flag.key, newFlag);
    logger.info(`Feature flag created: ${flag.key}`);

    return newFlag;
  }

  /**
   * Update an existing feature flag
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): FeatureFlag {
    const existingFlag = this.flags.get(flagKey);

    if (!existingFlag) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    const updatedFlag: FeatureFlag = {
      ...existingFlag,
      ...updates,
      key: existingFlag.key, // Prevent key changes
      createdAt: existingFlag.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    this.flags.set(flagKey, updatedFlag);
    logger.info(`Feature flag updated: ${flagKey}`);

    return updatedFlag;
  }

  /**
   * Delete a feature flag
   */
  deleteFlag(flagKey: string): boolean {
    const deleted = this.flags.delete(flagKey);

    if (deleted) {
      logger.info(`Feature flag deleted: ${flagKey}`);
    } else {
      logger.warn(`Feature flag not found for deletion: ${flagKey}`);
    }

    return deleted;
  }

  /**
   * Toggle a feature flag on/off
   */
  toggleFlag(flagKey: string): FeatureFlag {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      throw new Error(`Feature flag not found: ${flagKey}`);
    }

    return this.updateFlag(flagKey, { enabled: !flag.enabled });
  }

  /**
   * Get flags enabled for a specific user
   */
  getEnabledFlagsForUser(context: FlagEvaluationContext): string[] {
    return Array.from(this.flags.values())
      .filter(flag => this.isEnabled(flag.key, context))
      .map(flag => flag.key);
  }

  /**
   * Export flags configuration (for backup/migration)
   */
  exportFlags(): FeatureFlag[] {
    return this.getAllFlags();
  }

  /**
   * Import flags configuration (for backup/migration)
   */
  importFlags(flags: FeatureFlag[]): void {
    flags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
    logger.info(`Imported ${flags.length} feature flags`);
  }
}

// Singleton instance
export const featureFlagsService = new FeatureFlagsService();
