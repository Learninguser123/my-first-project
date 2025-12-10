import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

// Database connection pool
let pool: Pool | null = null;

/**
 * Database configuration object
 */
const dbConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeout,
  connectionTimeoutMillis: config.database.connectionTimeout,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  // Add connection string for PostgreSQL
  connectionString: process.env.DATABASE_URL,
};

/**
 * Create and initialize the database connection pool
 */
export const connectDatabase = async (): Promise<Pool> => {
  try {
    if (pool) {
      logger.info('Database pool already exists, returning existing pool');
      return pool;
    }

    logger.info('Initializing database connection pool...');
    logger.info(`Database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);

    pool = new Pool(dbConfig);

    // Test the connection
    const client = await pool.connect();
    
    // Test query to verify connection
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    logger.info('Database connection test successful');
    logger.info(`Database time: ${result.rows[0].current_time}`);
    logger.info(`PostgreSQL version: ${result.rows[0].version}`);
    
    client.release();

    // Handle pool events
    pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    pool.on('acquire', () => {
      logger.debug('Database connection acquired from pool');
    });

    pool.on('remove', () => {
      logger.debug('Database connection removed from pool');
    });

    pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });

    logger.info(`Database connection pool initialized with max connections: ${dbConfig.max}`);
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get the database connection pool
 * Throws error if pool is not initialized
 */
export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic connection management
 */
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  
  try {
    const pool = getPool();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      duration: `${duration}ms`,
      rows: result.rowCount,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      duration: `${duration}ms`,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return await pool.connect();
};

/**
 * Execute a function within a database transaction
 */
export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    logger.debug('Database transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    logger.debug('Database transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database transaction rolled back', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Test database connectivity
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    const result = await client.query('SELECT 1 as test');
    client.release();
    
    logger.info('Database connectivity test passed');
    return result.rows[0].test === 1;
  } catch (error) {
    logger.error('Database connectivity test failed:', error);
    return false;
  }
};

/**
 * Close the database connection pool
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    logger.info('Closing database connection pool...');
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  } else {
    logger.info('Database connection pool is already closed');
  }
};

/**
 * Get database connection pool statistics
 */
export const getPoolStats = () => {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

export default {
  connectDatabase,
  getPool,
  query,
  getClient,
  transaction,
  testConnection,
  closeDatabase,
  getPoolStats,
};