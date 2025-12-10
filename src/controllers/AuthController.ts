import { Request, Response } from 'express';
import { AuthService, LoginCredentials, RegisterData } from '../services/AuthService';
import { ApiResponse, UnauthorizedError, ForbiddenError } from '../types';
import { log } from '../utils/logger';

export class AuthController {
  /**
   * User registration endpoint
   * POST /auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: RegisterData = req.body;
      
      // Register the user
      const authResult = await AuthService.register(registerData);

      const response: ApiResponse = {
        success: true,
        data: {
          user: authResult.user,
          tokens: authResult.tokens,
          message: 'User registered successfully. Please check your email for verification.',
        },
        timestamp: new Date(),
      };

      res.status(201).json(response);
      
      log('http', 'User registration successful', {
        userId: authResult.user.id,
        email: authResult.user.email,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Registration failed'));
      
      if (error instanceof Error) {
        const statusCode = error.message.includes('already exists') ? 409 : 
                          error.message.includes('required') ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: {
            code: 'REGISTRATION_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'REGISTRATION_ERROR',
            message: 'Registration failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * User login endpoint
   * POST /auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginCredentials = req.body;
      
      // Authenticate user
      const authResult = await AuthService.login(credentials);

      const response: ApiResponse = {
        success: true,
        data: {
          user: authResult.user,
          tokens: authResult.tokens,
          message: 'Login successful',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'User login successful', {
        userId: authResult.user.id,
        email: authResult.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Login failed'));
      
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'LOGIN_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'LOGIN_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'LOGIN_ERROR',
            message: 'Login failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Refresh access token endpoint
   * POST /auth/refresh
   */
  static async refreshTokens(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      const tokenResult = await AuthService.refreshTokens({ refreshToken });

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: tokenResult.accessToken,
          expiresIn: tokenResult.expiresIn,
          tokenType: tokenResult.tokenType,
          message: 'Tokens refreshed successfully',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Tokens refreshed successfully', {
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Token refresh failed'));
      
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REFRESH_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOKEN_REFRESH_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'TOKEN_REFRESH_ERROR',
            message: 'Token refresh failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * User logout endpoint
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'LOGOUT_ERROR',
            message: 'User not authenticated',
          },
          timestamp: new Date(),
        });
        return;
      }

      // Logout user and invalidate tokens
      await AuthService.logout(userId, refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Logout successful',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'User logout successful', {
        userId,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Logout failed'));
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'LOGOUT_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'LOGOUT_ERROR',
            message: 'Logout failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Change password endpoint
   * POST /auth/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_ERROR',
            message: 'User not authenticated',
          },
          timestamp: new Date(),
        });
        return;
      }

      const passwordData = req.body;
      
      // Change user password
      await AuthService.changePassword(userId, passwordData);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Password changed successfully',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Password changed successfully', {
        userId,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Change password failed'));
      
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_ERROR',
            message: 'Change password failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Request password reset endpoint
   * POST /auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      // Request password reset
      await AuthService.requestPasswordReset({ email });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Password reset requested', {
        email,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Password reset request failed'));
      
      // Always return success for password reset to prevent email enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Confirm password reset endpoint
   * POST /auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      
      // Confirm password reset
      await AuthService.confirmPasswordReset({ token, password });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Password reset successfully',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Password reset confirmed', {
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Password reset confirmation failed'));
      
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'RESET_PASSWORD_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'RESET_PASSWORD_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'RESET_PASSWORD_ERROR',
            message: 'Password reset failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Request email verification endpoint
   * POST /auth/request-email-verification
   */
  static async requestEmailVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      // Request email verification
      await AuthService.requestEmailVerification({ email });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'If an account with this email exists, a verification email has been sent',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Email verification requested', {
        email,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Email verification request failed'));
      
      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a verification email has been sent',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Verify email endpoint
   * POST /auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      
      // Verify email
      await AuthService.verifyEmail(token);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Email verified successfully',
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Email verified successfully', {
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Email verification failed'));
      
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'VERIFY_EMAIL_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFY_EMAIL_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'VERIFY_EMAIL_ERROR',
            message: 'Email verification failed',
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Get current user info endpoint
   * GET /auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'GET_CURRENT_USER_ERROR',
            message: 'User not authenticated',
          },
          timestamp: new Date(),
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
          },
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Current user info retrieved', {
        userId: user.id,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Get current user failed'));
      
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CURRENT_USER_ERROR',
          message: 'Failed to get current user information',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Validate token endpoint
   * GET /auth/validate
   */
  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'VALIDATE_TOKEN_ERROR',
            message: 'No token provided',
          },
          timestamp: new Date(),
        });
        return;
      }

      const token = authHeader.substring(7);
      
      // Validate token and get user
      const user = await AuthService.validateAccessToken(token);
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'VALIDATE_TOKEN_ERROR',
            message: 'Invalid or expired token',
          },
          timestamp: new Date(),
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          },
        },
        timestamp: new Date(),
      };

      res.status(200).json(response);
      
      log('http', 'Token validated successfully', {
        userId: user.id,
        ip: req.ip,
      });
    } catch (error) {
      log('errorWithReq', req, error instanceof Error ? error : new Error('Token validation failed'));
      
      res.status(401).json({
        success: false,
        error: {
          code: 'VALIDATE_TOKEN_ERROR',
          message: 'Token validation failed',
        },
        timestamp: new Date(),
      });
    }
  }
}

export default AuthController;