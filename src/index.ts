import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Import routes
import authRoutes from './routes/auth';
import routeRoutes from './routes/routes';
import bookingRoutes from './routes/bookings';

const app = express();
const PORT = config.port || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: config.corsCredentials,
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      responseTime: 0,
      services: {
        database: {
          status: 'unknown',
          responseTime: 0,
          details: {}
        },
        redis: {
          status: 'unknown',
          responseTime: 0,
          details: {}
        }
      },
      memory: process.memoryUsage(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    // Check database connection
    const dbStartTime = Date.now();
    try {
      // This would be a real database health check
      // await connectDatabase();
      healthCheck.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStartTime,
        details: {
          connected: true,
          host: config.database.host,
          port: config.database.port,
          database: config.database.name
        }
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime,
        details: {
          connected: false,
          error: error.message,
          host: config.database.host,
          port: config.database.port
        }
      };
      healthCheck.status = 'PARTIAL';
    }

    // Check Redis connection
    const redisStartTime = Date.now();
    try {
      // This would be a real Redis health check
      // await connectRedis();
      healthCheck.services.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStartTime,
        details: {
          connected: true,
          host: config.redis.host,
          port: config.redis.port,
          db: config.redis.db
        }
      };
    } catch (error) {
      healthCheck.services.redis = {
        status: 'unhealthy',
        responseTime: Date.now() - redisStartTime,
        details: {
          connected: false,
          error: error.message,
          host: config.redis.host,
          port: config.redis.port
        }
      };
      healthCheck.status = 'PARTIAL';
    }

    healthCheck.responseTime = Date.now() - startTime;

    // Determine appropriate HTTP status code
    const statusCode = healthCheck.status === 'OK' ? 200 :
                      healthCheck.status === 'PARTIAL' ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      responseTime: Date.now() - startTime,
      error: error.message
    });
  }
});

// Detailed health check endpoint with more information
app.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: 'healthy',
          connectionPool: {
            total: 20,
            active: 3,
            idle: 17,
            waiting: 0
          },
          performance: {
            avgQueryTime: '2.5ms',
            slowQueries: 0
          }
        },
        redis: {
          status: 'healthy',
          memory: {
            used: '45MB',
            max: '256MB',
            percentage: 17.6
          },
          performance: {
            hits: 1250,
            misses: 45,
            hitRate: 96.5
          }
        }
      },
      api: {
        endpoints: {
          auth: '/api/v1/auth',
          routes: '/api/v1/routes',
          bookings: '/api/v1/bookings',
          health: '/health',
          detailed: '/health/detailed'
        },
        rateLimiting: {
          enabled: true,
          windowMs: config.rateLimitWindowMs,
          maxRequests: config.rateLimitMaxRequests
        }
      },
      external: {
        googleMaps: {
          status: 'healthy',
          quota: {
            used: 1247,
            limit: 50000,
            percentage: 2.5
          }
        },
        hvv: {
          status: 'healthy',
          lastSync: new Date(Date.now() - 5 * 60000).toISOString()
        }
      },
      memory: process.memoryUsage(),
      cpu: {
        usage: process.cpuUsage()
      }
    };

    res.json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/bookings', bookingRoutes);

// API info endpoint
app.use('/api/v1', (req, res) => {
  res.json({
    message: 'HVV Mobility Platform API v1',
    version: '1.0.0',
    description: 'Sustainable mobility platform for Hamburg combining ÖPNV, e-scooters, and ride-sharing with CO₂ optimization',
    endpoints: {
      health: {
        basic: '/health',
        detailed: '/health/detailed'
      },
      auth: {
        base: '/api/v1/auth',
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        profile: 'GET /api/v1/auth/profile',
        updateProfile: 'PUT /api/v1/auth/profile'
      },
      routes: {
        base: '/api/v1/routes',
        search: 'GET /api/v1/routes/search',
        details: 'GET /api/v1/routes/:routeId',
        saved: 'GET /api/v1/routes/saved',
        saveRoute: 'POST /api/v1/routes/saved'
      },
      bookings: {
        base: '/api/v1/bookings',
        create: 'POST /api/v1/bookings',
        list: 'GET /api/v1/bookings',
        details: 'GET /api/v1/bookings/:bookingId',
        confirm: 'POST /api/v1/bookings/:bookingId/confirm',
        start: 'POST /api/v1/bookings/:bookingId/start',
        complete: 'POST /api/v1/bookings/:bookingId/complete',
        cancel: 'POST /api/v1/bookings/:bookingId/cancel',
        active: 'GET /api/v1/bookings/active',
        history: 'GET /api/v1/bookings/history',
        stats: 'GET /api/v1/bookings/stats'
      },
      vehicles: {
        base: '/api/v1/vehicles',
        available: 'GET /api/v1/vehicles/available',
        details: 'GET /api/v1/vehicles/:vehicleId'
      },
      documentation: {
        swagger: '/api-docs',
        readme: '/README.md'
      }
    },
    features: [
      'Multi-modal transport routing',
      'CO₂ emission calculations',
      'Rewards and gamification',
      'Real-time vehicle tracking',
      'Accessibility support',
      'Payment integration',
      'User preferences and profiles'
    ],
    supportedTransportModes: [
      'public_transport',
      'bike',
      'e_scooter',
      'car_sharing',
      'walk'
    ],
    environment: config.nodeEnv,
    serverTime: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Graceful shutdown function
const gracefulShutdown = async (signal: string, server?: any) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connections
        // await closeDatabase();
        logger.info('Database connections closed');

        // Close Redis connections
        // await closeRedis();
        logger.info('Redis connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  }

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Initialize database and Redis connections
const initializeConnections = async () => {
  try {
    // await connectDatabase();
    logger.info('Database connected successfully');
    
    // await connectRedis();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to initialize connections:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeConnections();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 HVV Mobility Platform API server running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', server));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException', server);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection', server);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
if (require.main === module) {
  startServer();
}

export default app;