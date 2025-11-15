import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * API Versioning Middleware
 * Supports URL-based versioning: /api/v1/..., /api/v2/...
 * Also supports header-based versioning: API-Version: 1.0
 */

export interface VersionedRequest extends Request {
  apiVersion?: string;
}

// Current supported API versions
export const SUPPORTED_VERSIONS = ['1', '2'];
export const DEFAULT_VERSION = '1';
export const LATEST_VERSION = '2';

/**
 * Extract API version from request
 * Priority: URL path > Header > Default
 */
export const extractApiVersion = (req: Request): string => {
  // 1. Check URL path for version (e.g., /api/v1/products)
  const pathMatch = req.path.match(/^\/api\/v(\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Check API-Version header
  const headerVersion = req.headers['api-version'] as string;
  if (headerVersion) {
    // Support both "1" and "1.0" formats
    const versionMatch = headerVersion.match(/^(\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // 3. Check Accept-Version header (alternative)
  const acceptVersion = req.headers['accept-version'] as string;
  if (acceptVersion) {
    const versionMatch = acceptVersion.match(/^(\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }

  // 4. Default to version 1 (unversioned routes default to v1)
  return DEFAULT_VERSION;
};

/**
 * Middleware to attach API version to request
 */
export const apiVersionMiddleware = (
  req: VersionedRequest,
  res: Response,
  next: NextFunction
): void => {
  const version = extractApiVersion(req);

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(version)) {
    res.status(400).json({
      error: 'Unsupported API version',
      message: `API version '${version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      supportedVersions: SUPPORTED_VERSIONS,
      latestVersion: LATEST_VERSION,
    });
    return;
  }

  // Attach version to request
  req.apiVersion = version;

  // Add version info to response headers
  res.setHeader('API-Version', version);
  res.setHeader('API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

  // Log version usage for analytics
  logger.debug(`API request using version ${version}`, {
    path: req.path,
    method: req.method,
    version,
  });

  next();
};

/**
 * Middleware to require a specific API version
 */
export const requireApiVersion = (requiredVersion: string) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const currentVersion = req.apiVersion || extractApiVersion(req);

    if (currentVersion !== requiredVersion) {
      res.status(400).json({
        error: 'Wrong API version',
        message: `This endpoint requires API version ${requiredVersion}. You are using version ${currentVersion}.`,
        requiredVersion,
        currentVersion,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to deprecate an endpoint in a specific version
 */
export const deprecateInVersion = (version: string, deprecationMessage?: string) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const currentVersion = req.apiVersion || extractApiVersion(req);

    if (currentVersion === version) {
      const message =
        deprecationMessage ||
        `This endpoint is deprecated in API version ${version}. Please migrate to version ${LATEST_VERSION}.`;

      // Add deprecation header
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days

      // Log deprecation usage
      logger.warn('Deprecated API endpoint accessed', {
        path: req.path,
        method: req.method,
        version: currentVersion,
        message,
      });

      // Optionally, add deprecation warning to response (non-breaking)
      // This will be visible in JSON responses
      (req as any).deprecationWarning = message;
    }

    next();
  };
};

/**
 * Helper to add deprecation warning to response
 */
export const addDeprecationWarning = (req: Request, data: any): any => {
  const warning = (req as any).deprecationWarning;

  if (warning) {
    return {
      ...data,
      _deprecation: {
        message: warning,
        documentationUrl: 'https://docs.tcgdojo.com/api/migration',
      },
    };
  }

  return data;
};

/**
 * Version-specific route wrapper
 * Usage: versionedRoute('2', myHandler)
 */
export const versionedRoute = (version: string, handler: any) => {
  return async (req: VersionedRequest, res: Response, next: NextFunction) => {
    const currentVersion = req.apiVersion || extractApiVersion(req);

    if (currentVersion !== version) {
      // Skip this handler, let next middleware handle it
      return next();
    }

    // Execute version-specific handler
    return handler(req, res, next);
  };
};
