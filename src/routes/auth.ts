import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authenticate, authRateLimit, validateRefreshToken } from '../middleware/auth';
import { AuthService } from '../services/AuthService';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
  authRateLimit.register,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('role')
      .optional()
      .isIn(['user', 'driver'])
      .withMessage('Role must be either user or driver'),
    body('acceptTerms')
      .isBoolean()
      .equals('true')
      .withMessage('You must accept the terms and conditions'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      // Validate password strength
      if (!AuthService.validatePasswordStrength(req.body.password)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet security requirements',
          },
          timestamp: new Date(),
        });
      }

      await AuthController.register(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  authRateLimit.login,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.login(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh',
  validateRefreshToken,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.refreshTokens(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authenticate,
  [
    body('refreshToken')
      .optional()
      .notEmpty()
      .withMessage('Refresh token cannot be empty if provided'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.logout(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      // Validate new password strength
      if (!AuthService.validatePasswordStrength(req.body.newPassword)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'New password does not meet security requirements',
          },
          timestamp: new Date(),
        });
      }

      await AuthController.changePassword(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  authRateLimit.passwordReset,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.forgotPassword(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FORGOT_PASSWORD_ERROR',
          message: 'Password reset request failed',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      // Validate password strength
      if (!AuthService.validatePasswordStrength(req.body.password)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet security requirements',
          },
          timestamp: new Date(),
        });
      }

      await AuthController.resetPassword(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post('/verify-email',
  [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.verifyEmail(req, res);
    } catch (error) {
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
);

/**
 * @route   POST /api/auth/request-email-verification
 * @desc    Request email verification
 * @access  Public
 */
router.post('/request-email-verification',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors.array(),
          },
          timestamp: new Date(),
        });
      }

      await AuthController.requestEmailVerification(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'REQUEST_EMAIL_VERIFICATION_ERROR',
          message: 'Email verification request failed',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await AuthController.getCurrentUser(req, res);
    } catch (error) {
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
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate access token
 * @access  Public
 */
router.get('/validate',
  async (req: Request, res: Response) => {
    try {
      await AuthController.validateToken(req, res);
    } catch (error) {
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
);

export default router;