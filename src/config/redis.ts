import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

// Redis client instance
let redisClient: RedisClient | null = null;

/**
 * Redis connection options
 */
const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  connectTimeout: config.redis.connectTimeout,
  commandTimeout: config.redis.commandTimeout,
  retryDelayOnFailover: config.redis.retryDelay,
  maxRetriesPerRequest: config.redis.retryAttempts,
  // Enable auto-reconnect
  retryDelay: config.redis.retryDelay,
  // Lazy connect
  lazyConnect: true,
  // Keep alive
  keepAlive: 30000,
  // Family
  family: 4,
  // Connection name
  connectionName: 'hvv-mobility-platform',
};

/**
 * Create and initialize Redis connection
 */
export const connectRedis = async (): Promise<RedisClient> => {
  try {
    if (redisClient) {
      logger.info('Redis client already exists, returning existing client');
      return redisClient;
    }

    logger.info('Initializing Redis connection...');
    logger.info(`Redis: ${redisOptions.host}:${redisOptions.port}, DB: ${redisOptions.db}`);

    redisClient = new Redis(redisOptions);

    // Event listeners
    redisClient.on('connect', () => {
      logger.info('Redis connection established');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready for commands');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnection attempt');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test the connection
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      logger.info('Redis connection test successful');
    } else {
      throw new Error('Redis ping test failed');
    }

    // Get Redis info
    const info = await redisClient.info('server');
    logger.info('Redis server info:', info.split('\r\n').slice(0, 5).join(', '));

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get the Redis client instance
 * Throws error if client is not initialized
 */
export const getRedisClient = (): RedisClient => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

/**
 * Set a key-value pair in Redis with optional expiration
 */
export const set = async (
  key: string, 
  value: string, 
  ttl?: number
): Promise<void> => {
  try {
    const client = getRedisClient();
    
    if (ttl) {
      await client.setex(key, ttl, value);
      logger.debug(`Redis SETEX: ${key} with TTL ${ttl}s`);
    } else {
      await client.set(key, value);
      logger.debug(`Redis SET: ${key}`);
    }
  } catch (error) {
    logger.error('Redis SET error:', error);
    throw error;
  }
};

/**
 * Get a value from Redis by key
 */
export const get = async (key: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    
    logger.debug(`Redis GET: ${key} = ${value ? 'found' : 'not found'}`);
    return value;
  } catch (error) {
    logger.error('Redis GET error:', error);
    throw error;
  }
};

/**
 * Delete a key from Redis
 */
export const del = async (key: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.del(key);
    
    logger.debug(`Redis DEL: ${key} (${result} keys deleted)`);
    return result;
  } catch (error) {
    logger.error('Redis DEL error:', error);
    throw error;
  }
};

/**
 * Check if a key exists in Redis
 */
export const exists = async (key: string): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    
    logger.debug(`Redis EXISTS: ${key} = ${result === 1}`);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', error);
    throw error;
  }
};

/**
 * Set TTL (time to live) for a key
 */
export const expire = async (key: string, ttl: number): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.expire(key, ttl);
    
    logger.debug(`Redis EXPIRE: ${key} = ${ttl}s (${result ? 'success' : 'failed'})`);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXPIRE error:', error);
    throw error;
  }
};

/**
 * Get TTL for a key
 */
export const ttl = async (key: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.ttl(key);
    
    logger.debug(`Redis TTL: ${key} = ${result}s`);
    return result;
  } catch (error) {
    logger.error('Redis TTL error:', error);
    throw error;
  }
};

/**
 * Set a hash field in Redis
 */
export const hset = async (key: string, field: string, value: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.hset(key, field, value);
    
    logger.debug(`Redis HSET: ${key}.${field}`);
    return result;
  } catch (error) {
    logger.error('Redis HSET error:', error);
    throw error;
  }
};

/**
 * Get a hash field from Redis
 */
export const hget = async (key: string, field: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    const value = await client.hget(key, field);
    
    logger.debug(`Redis HGET: ${key}.${field} = ${value ? 'found' : 'not found'}`);
    return value;
  } catch (error) {
    logger.error('Redis HGET error:', error);
    throw error;
  }
};

/**
 * Get all hash fields from Redis
 */
export const hgetall = async (key: string): Promise<Record<string, string>> => {
  try {
    const client = getRedisClient();
    const result = await client.hgetall(key);
    
    logger.debug(`Redis HGETALL: ${key} (${Object.keys(result).length} fields)`);
    return result;
  } catch (error) {
    logger.error('Redis HGETALL error:', error);
    throw error;
  }
};

/**
 * Delete hash field from Redis
 */
export const hdel = async (key: string, field: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.hdel(key, field);
    
    logger.debug(`Redis HDEL: ${key}.${field}`);
    return result;
  } catch (error) {
    logger.error('Redis HDEL error:', error);
    throw error;
  }
};

/**
 * Add member to a Redis set
 */
export const sadd = async (key: string, member: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.sadd(key, member);
    
    logger.debug(`Redis SADD: ${key} += ${member}`);
    return result;
  } catch (error) {
    logger.error('Redis SADD error:', error);
    throw error;
  }
};

/**
 * Get all members of a Redis set
 */
export const smembers = async (key: string): Promise<string[]> => {
  try {
    const client = getRedisClient();
    const result = await client.smembers(key);
    
    logger.debug(`Redis SMEMBERS: ${key} (${result.length} members)`);
    return result;
  } catch (error) {
    logger.error('Redis SMEMBERS error:', error);
    throw error;
  }
};

/**
 * Remove member from a Redis set
 */
export const srem = async (key: string, member: string): Promise<number> => {
  try {
    const client = getRedisClient();
    const result = await client.srem(key, member);
    
    logger.debug(`Redis SREM: ${key} -= ${member}`);
    return result;
  } catch (error) {
    logger.error('Redis SREM error:', error);
    throw error;
  }
};

/**
 * Test Redis connectivity
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    
    logger.info('Redis connectivity test passed');
    return pong === 'PONG';
  } catch (error) {
    logger.error('Redis connectivity test failed:', error);
    return false;
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  } else {
    logger.info('Redis connection is already closed');
  }
};

/**
 * Get Redis client info
 */
export const getRedisInfo = async (): Promise<Record<string, string>> => {
  try {
    const client = getRedisClient();
    const info = await client.info();
    
    // Parse Redis info string into object
    const infoObject: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          infoObject[key] = value;
        }
      }
    });
    
    return infoObject;
  } catch (error) {
    logger.error('Failed to get Redis info:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});

export default {
  connectRedis,
  getRedisClient,
  set,
  get,
  del,
  exists,
  expire,
  ttl,
  hset,
  hget,
  hgetall,
  hdel,
  sadd,
  smembers,
  srem,
  testConnection,
  closeRedis,
  getRedisInfo,
};