import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, JwtPayload, UnauthorizedError, ForbiddenError, NotFoundError } from '../types';
import { UserModel } from '../models/User';
import { log } from '../utils/logger';

// Extend Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        isEmailVerified: boolean;
        isActive: boolean;
      };
      userId?: string;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user information to request object
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new UnauthorizedError('Access token is required');
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      const error = new UnauthorizedError('Access token is required');
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (tokenError) {
      if (tokenError instanceof jwt.TokenExpiredError) {
        const error = new UnauthorizedError('Access token has expired');
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: error.message,
          },
          timestamp: new Date(),
        });
        return;
      } else if (tokenError instanceof jwt.JsonWebTokenError) {
        const error = new UnauthorizedError('Invalid access token');
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: error.message,
          },
          timestamp: new Date(),
        });
        return;
      } else {
        throw tokenError;
      }
    }

    // Fetch user from database to verify they still exist and are active
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      const error = new UnauthorizedError('User not found');
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    if (!user.isActive) {
      const error = new UnauthorizedError('User account is deactivated');
      res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    };
    req.userId = user.id;

    log('auth', 'jwt_authenticated', user.id, user.email, true);
    
    next();
  } catch (error) {
    log('error', 'Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const authError = new UnauthorizedError('Authentication failed');
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: authError.message,
      },
      timestamp: new Date(),
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user information if token is valid, but doesn't fail if no token
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (tokenError) {
      // Token is invalid, continue without authentication
      next();
      return;
    }

    // Fetch user from database
    const user = await UserModel.findById(decoded.userId);
    
    if (user && user.isActive) {
      // Attach user information to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      };
      req.userId = user.id;
    }

    next();
  } catch (error) {
    log('error', 'Optional authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
    });
    
    // Continue without authentication on error
    next();
  }
};

/**
 * Authorization Middleware Factory
 * Creates middleware that checks if authenticated user has required role(s)
 * @param allowedRoles Array of roles that are allowed to access the resource
 * @param allowSameUser Optional function to allow users to access their own resources
 */
export const authorize = (
  allowedRoles: UserRole[],
  allowSameUser: boolean = false
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        const error = new UnauthorizedError('Authentication required');
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: error.message,
          },
          timestamp: new Date(),
        });
        return;
      }

      const hasRequiredRole = allowedRoles.includes(req.user.role);
      
      // Check if user has required role or is accessing their own resource
      const isOwnResource = allowSameUser && req.params.userId === req.user.id;
      
      if (!hasRequiredRole && !isOwnResource) {
        const error = new ForbiddenError('Insufficient permissions');
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message,
            requiredRoles: allowedRoles,
            userRole: req.user.role,
          },
          timestamp: new Date(),
        });
        return;
      }

      log('auth', 'authorized', req.user.id, req.user.email, true);
      
      next();
    } catch (error) {
      log('error', 'Authorization middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        allowedRoles,
        ip: req.ip,
      });

      const authError = new ForbiddenError('Authorization failed');
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_FAILED',
          message: authError.message,
        },
        timestamp: new Date(),
      });
    }
  };
};

/**
 * Email Verification Middleware
 * Ensures the authenticated user has verified their email
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      const error = new UnauthorizedError('Authentication required');
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    if (!req.user.isEmailVerified) {
      const error = new ForbiddenError('Email verification required');
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: error.message,
          details: 'Please verify your email address to access this resource',
        },
        timestamp: new Date(),
      });
      return;
    }

    next();
  } catch (error) {
    log('error', 'Email verification middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      ip: req.ip,
    });

    const authError = new ForbiddenError('Email verification check failed');
    res.status(403).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: authError.message,
      },
      timestamp: new Date(),
    });
  }
};

/**
 * Admin Only Middleware
 * Shortcut middleware that only allows admin users
 */
export const requireAdmin = authorize([UserRole.ADMIN]);

/**
 * Admin or Driver Middleware
 * Allows admin and driver roles
 */
export const requireAdminOrDriver = authorize([UserRole.ADMIN, UserRole.DRIVER]);

/**
 * Role-based access control for different endpoints
 */
export const rbac = {
  // Public endpoints (no authentication required)
  public: (req: Request, res: Response, next: NextFunction) => next(),

  // Authenticated users only
  user: [authenticate],

  // Email verified users only
  verifiedUser: [authenticate, requireEmailVerification],

  // Admin only
  admin: [authenticate, requireAdmin],

  // Admin or driver
  adminOrDriver: [authenticate, requireAdminOrDriver],

  // Optional authentication (user can be anonymous)
  optional: [optionalAuthenticate],

  // Allow users to access their own resources or admin to access any
  ownResourceOrAdmin: [authenticate, authorize([UserRole.ADMIN], true)],
};

/**
 * Refresh Token Validation Middleware
 * Validates refresh token for token refresh endpoint
 */
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new UnauthorizedError('Refresh token is required');
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    // Verify refresh token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secretRefresh) as JwtPayload;
    } catch (tokenError) {
      if (tokenError instanceof jwt.TokenExpiredError) {
        const error = new UnauthorizedError('Refresh token has expired');
        res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: error.message,
          },
          timestamp: new Date(),
        });
        return;
      } else if (tokenError instanceof jwt.JsonWebTokenError) {
        const error = new UnauthorizedError('Invalid refresh token');
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: error.message,
          },
          timestamp: new Date(),
        });
        return;
      } else {
        throw tokenError;
      }
    }

    // Verify that refresh token type is correct
    if (decoded.type !== 'refresh') {
      const error = new UnauthorizedError('Invalid token type');
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: error.message,
        },
        timestamp: new Date(),
      });
      return;
    }

    // Attach user ID to request for service layer
    req.userId = decoded.userId;

    next();
  } catch (error) {
    log('error', 'Refresh token validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
    });

    const authError = new UnauthorizedError('Refresh token validation failed');
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_VALIDATION_FAILED',
        message: authError.message,
      },
      timestamp: new Date(),
    });
  }
};

/**
 * Rate limiting middleware for sensitive auth operations
 * This would typically be implemented with express-rate-limit
 */
export const authRateLimit = {
  // General rate limiting would be implemented at the application level
  // This is a placeholder for auth-specific rate limiting logic
  login: (req: Request, res: Response, next: NextFunction) => {
    // Log login attempts for monitoring
    log('auth', 'login_attempt', undefined, req.body.email, false);
    next();
  },

  register: (req: Request, res: Response, next: NextFunction) => {
    // Log registration attempts
    log('auth', 'registration_attempt', undefined, req.body.email, false);
    next();
  },

  passwordReset: (req: Request, res: Response, next: NextFunction) => {
    // Log password reset requests
    log('auth', 'password_reset_request', undefined, req.body.email, false);
    next();
  },
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  requireEmailVerification,
  requireAdmin,
  requireAdminOrDriver,
  rbac,
  validateRefreshToken,
  authRateLimit,
};