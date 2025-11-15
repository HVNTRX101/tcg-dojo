import { PrismaClient } from '@prisma/client';
import { getRedisClient, isRedisConnected } from '../config/redis';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  uptime: number;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  version?: string;
}

export interface DependencyStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  error?: string;
}

/**
 * Health Check Service
 * Validates all critical dependencies and returns comprehensive health status
 */
export class HealthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Check all dependencies in parallel
    const [databaseStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    // Determine overall health status
    const overallStatus = this.determineOverallStatus(databaseStatus, redisStatus);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      dependencies: {
        database: databaseStatus,
        redis: redisStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Attempt a simple query to verify database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      // Consider degraded if response time > 1000ms
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Database responding slowly',
        };
      }

      return {
        status: 'up',
        responseTime,
        message: 'Database connection healthy',
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      const redisClient = getRedisClient();

      if (!redisClient || !isRedisConnected()) {
        return {
          status: 'down',
          message: 'Redis client not initialized or not connected',
        };
      }

      // Perform a ping to check connectivity
      const pingResponse = await redisClient.ping();
      const responseTime = Date.now() - startTime;

      if (pingResponse !== 'PONG') {
        return {
          status: 'degraded',
          responseTime,
          message: 'Redis ping returned unexpected response',
        };
      }

      // Consider degraded if response time > 500ms
      if (responseTime > 500) {
        return {
          status: 'degraded',
          responseTime,
          message: 'Redis responding slowly',
        };
      }

      return {
        status: 'up',
        responseTime,
        message: 'Redis connection healthy',
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  /**
   * Determine overall health status based on dependencies
   */
  private determineOverallStatus(
    databaseStatus: DependencyStatus,
    redisStatus: DependencyStatus
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // If database is down, system is unhealthy (database is critical)
    if (databaseStatus.status === 'down') {
      return 'unhealthy';
    }

    // If Redis is down, system is degraded (Redis is important but not critical)
    if (redisStatus.status === 'down') {
      return 'degraded';
    }

    // If any dependency is degraded, overall status is degraded
    if (databaseStatus.status === 'degraded' || redisStatus.status === 'degraded') {
      return 'degraded';
    }

    // All dependencies are up
    return 'healthy';
  }

  /**
   * Quick liveness check (minimal validation)
   * Used for Kubernetes liveness probes
   */
  async checkLiveness(): Promise<boolean> {
    try {
      // Just check if the service can respond
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Readiness check (validates critical dependencies)
   * Used for Kubernetes readiness probes
   */
  async checkReadiness(): Promise<boolean> {
    try {
      const databaseStatus = await this.checkDatabase();
      // Service is ready if database is accessible
      return databaseStatus.status !== 'down';
    } catch {
      return false;
    }
  }
}
