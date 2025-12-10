import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    connectTimeout: number;
    commandTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // JWT
  jwt: {
    secret: string;
    secretRefresh: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // API Keys
  googleMapsApiKey: string;
  hvv: {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
  };
  weatherApiKey: string;
  stripe: {
    secretKey: string;
    publishableKey: string;
  };

  // Email
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
    from: string;
  };

  // File Upload
  upload: {
    maxSize: number;
    allowedTypes: string[];
  };

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // CORS
  corsOrigin: string | string[];
  corsCredentials: boolean;

  // Logging
  logLevel: string;
  logFile: string;
  logMaxSize: string;
  logMaxFiles: string;

  // Security
  bcryptRounds: number;
  sessionSecret: string;

  // Monitoring
  healthCheckInterval: number;
}

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'hvv_mobility',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'hvv:',
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    secretRefresh: process.env.JWT_SECRET_REFRESH || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // API Keys
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  hvv: {
    apiKey: process.env.HVV_API_KEY || '',
    apiSecret: process.env.HVV_API_SECRET || '',
    baseUrl: process.env.HVV_API_BASE_URL || 'https://api.hvv.de',
  },
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@hvv-mobility.com',
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  },

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/app.log',
  logMaxSize: process.env.LOG_MAX_SIZE || '20m',
  logMaxFiles: process.env.LOG_MAX_FILES || '14d',

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',

  // Monitoring
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
};

// Validation for required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_SECRET_REFRESH',
    'SESSION_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export { config };
export type { Config };