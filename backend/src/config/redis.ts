import Redis from 'ioredis';

/**
 * Redis Configuration
 * Used for caching, Socket.io adapter, and background jobs
 */

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

let mainRedisClient: Redis | null = null;

/**
 * Initialize main Redis client
 */
export const initializeRedis = (): Redis => {
  if (mainRedisClient) {
    return mainRedisClient;
  }

  mainRedisClient = new Redis(redisOptions);

  mainRedisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  mainRedisClient.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  mainRedisClient.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
  });

  mainRedisClient.on('close', () => {
    console.warn('⚠️  Redis connection closed');
  });

  mainRedisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  return mainRedisClient;
};

/**
 * Get main Redis client instance
 */
export const getRedisClient = (): Redis | null => {
  return mainRedisClient;
};

/**
 * Create Redis client for Socket.io adapter
 */
export const createRedisClient = () => {
  const client = new Redis(redisOptions);

  client.on('connect', () => {
    console.log('✅ Redis Socket.io client connected');
  });

  client.on('error', (error) => {
    console.error('❌ Redis Socket.io client error:', error);
  });

  return client;
};

/**
 * Create Redis clients for Socket.io adapter (pub/sub pattern)
 */
export const createRedisAdapterClients = () => {
  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();

  return { pubClient, subClient };
};

/**
 * Close all Redis connections
 */
export const closeRedis = async (): Promise<void> => {
  if (mainRedisClient) {
    await mainRedisClient.quit();
    mainRedisClient = null;
    console.log('✅ Redis connection closed');
  }
};

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  return mainRedisClient?.status === 'ready';
};

// Export singleton instance for Bull queues and other uses
export const redisConnection = mainRedisClient;

export default mainRedisClient;
