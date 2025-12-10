import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which transports the logger must use
const transports: winston.transport[] = [];

// Console transport (always included)
transports.push(
  new winston.transports.Console({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  })
);

// File transports (only in production or when explicitly enabled)
if (config.nodeEnv === 'production' || process.env.LOG_TO_FILE === 'true') {
  // Ensure logs directory exists
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.dirname(config.logFile);
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Combined log file with daily rotation
  transports.push(
    new DailyRotateFile({
      filename: config.logFile.replace('.log', '-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logMaxSize,
      maxFiles: config.logMaxFiles,
      format: fileFormat,
      level: config.logLevel,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Error-only log file with daily rotation
  transports.push(
    new DailyRotateFile({
      filename: config.logFile.replace('.log', '-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logMaxSize,
      maxFiles: config.logMaxFiles,
      format: fileFormat,
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  format: winston.format.errors({ stack: true }),
  defaultMeta: {
    service: 'hvv-mobility-platform',
    environment: config.nodeEnv,
  },
  transports,
  exitOnError: false,
});

// Add request context helper
const addRequestContext = (req: any, extra?: any) => {
  const context = {
    requestId: req.id || req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    ...extra,
  };
  
  return context;
};

// Enhanced logging methods with context support
const logWithContext = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  
  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },

  // Request-specific logging
  request: (req: any, message: string = 'HTTP Request', extra?: any) => {
    logger.http(message, addRequestContext(req, extra));
  },

  response: (req: any, statusCode: number, duration?: number, extra?: any) => {
    const context = addRequestContext(req, {
      statusCode,
      duration,
      ...extra,
    });
    
    const level = statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `HTTP Response ${statusCode}`, context);
  },

  errorWithReq: (req: any, error: Error, extra?: any) => {
    const context = addRequestContext(req, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...extra,
    });

    logger.error('Request Error', context);
  },

  // Database logging
  query: (query: string, duration?: number, params?: any) => {
    logger.debug('Database Query', {
      query: query.length > 200 ? query.substring(0, 200) + '...' : query,
      duration,
      params: params ? JSON.stringify(params).substring(0, 100) : undefined,
    });
  },

  // Redis logging
  redis: (command: string, key?: string, duration?: number) => {
    logger.debug('Redis Command', {
      command,
      key,
      duration,
    });
  },

  // External API logging
  externalApi: (service: string, method: string, url: string, statusCode?: number, duration?: number) => {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `External API Call: ${service}`, {
      service,
      method,
      url,
      statusCode,
      duration,
    });
  },

  // Authentication logging
  auth: (action: string, userId?: string, email?: string, success?: boolean) => {
    const level = success === false ? 'warn' : 'info';
    logger.log(level, `Auth: ${action}`, {
      action,
      userId,
      email,
      success,
    });
  },

  // Business logic logging
  booking: (action: string, bookingId?: string, userId?: string, amount?: number) => {
    logger.info(`Booking: ${action}`, {
      action,
      bookingId,
      userId,
      amount,
    });
  },

  payment: (action: string, paymentId?: string, amount?: number, status?: string) => {
    const level = status === 'failed' ? 'warn' : 'info';
    logger.log(level, `Payment: ${action}`, {
      action,
      paymentId,
      amount,
      status,
    });
  },

  // Performance logging
  performance: (operation: string, duration: number, metadata?: any) => {
    const level = duration > 5000 ? 'warn' : duration > 1000 ? 'http' : 'debug';
    logger.log(level, `Performance: ${operation}`, {
      operation,
      duration,
      ...metadata,
    });
  },

  // Security logging
  security: (event: string, details?: any) => {
    logger.warn(`Security: ${event}`, details);
  },
};

// Stream for Morgan HTTP logger
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper to create child logger with additional context
const child = (defaultMeta: any) => {
  return logger.child(defaultMeta);
};

// Health check for logging system
const healthCheck = () => {
  try {
    logger.info('Logger health check passed');
    return true;
  } catch (error) {
    console.error('Logger health check failed:', error);
    return false;
  }
};

// Graceful shutdown
const close = () => {
  return new Promise<void>((resolve) => {
    logger.info('Closing logger...');
    logger.end(() => {
      resolve();
    });
  });
};

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

logger.rejections.handle(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

// Production-specific optimizations
if (config.nodeEnv === 'production') {
  // Set higher performance mode in production
  logger.exitOnError = false;
  
  // Add performance monitoring
  logger.on('data', (info) => {
    if (info.level === 'error' && info.duration && info.duration > 10000) {
      logger.warn('Slow operation detected', {
        operation: info.operation || 'unknown',
        duration: info.duration,
      });
    }
  });
}

export {
  logger,
  logWithContext as log,
  stream,
  child,
  healthCheck,
  close,
};

// Default export for backward compatibility
export default logger;