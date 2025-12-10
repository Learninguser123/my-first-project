import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserModel, CreateUserRequest, ChangePasswordRequest } from '../models/User';
import { User, UserRole, AuthTokens, JwtPayload } from '../types';
import { 
  UnauthorizedError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  DatabaseError 
} from '../types';
import { log } from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData extends CreateUserRequest {
  acceptTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmation {
  token: string;
  password: string;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Generate JWT access token
   */
  private static generateAccessToken(user: User): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'hvv-mobility-platform',
      audience: 'hvv-users',
    });
  }

  /**
   * Generate JWT refresh token
   */
  private static generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      type: 'refresh' as const,
    };

    return jwt.sign(payload, config.jwt.secretRefresh, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'hvv-mobility-platform',
      audience: 'hvv-users',
    });
  }

  /**
   * Generate token pair (access and refresh)
   */
  private static generateTokenPair(user: User): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  /**
   * Extract token expiration time in seconds
   */
  private static getTokenExpiration(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return decoded.exp - Math.floor(Date.now() / 1000);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Verify refresh token
   */
  private static async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secretRefresh) as JwtPayload & { type?: string };
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      } else {
        throw error;
      }
    }
  }

  /**
   * Hash password using bcrypt
   */
  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.bcryptRounds);
  }

  /**
   * Compare password with hash
   */
  private static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate email verification token
   */
  private static generateEmailVerificationToken(): string {
    return uuidv4();
  }

  /**
   * Generate password reset token
   */
  private static generatePasswordResetToken(): string {
    return uuidv4();
  }

  /**
   * User registration
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    try {
      const { acceptTerms, ...userCreationData } = userData;

      // Validate terms acceptance
      if (!acceptTerms) {
        throw new ValidationError('Terms and conditions must be accepted');
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create user
      const user = await UserModel.create(userCreationData);

      // Generate tokens
      const tokens = this.generateTokenPair(user);

      // Generate email verification token (in a real implementation, this would be sent via email)
      const verificationToken = this.generateEmailVerificationToken();
      log('auth', 'email_verification_token_generated', user.id, user.email, true);

      log('auth', 'user_registered', user.id, user.email, true);

      return {
        user,
        tokens: {
          ...tokens,
          expiresIn: this.getTokenExpiration(tokens.accessToken),
          tokenType: 'Bearer',
        },
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        log('auth', 'user_registration_failed', undefined, userData.email, false);
        throw error;
      }
      log('error', 'Registration service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email,
      });
      throw new DatabaseError('Failed to register user', error);
    }
  }

  /**
   * User login
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Find user with password hash
      const user = await UserModel.findByEmailWithPassword(email);
      if (!user) {
        log('auth', 'login_failed_invalid_email', undefined, email, false);
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        log('auth', 'login_failed_inactive_user', user.id, email, false);
        throw new UnauthorizedError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        log('auth', 'login_failed_invalid_password', user.id, email, false);
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const tokens = this.generateTokenPair(user);

      log('auth', 'login_success', user.id, email, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens: {
          ...tokens,
          expiresIn: this.getTokenExpiration(tokens.accessToken),
          tokenType: 'Bearer',
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      log('error', 'Login service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: credentials.email,
      });
      throw new DatabaseError('Failed to login user', error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshTokens(refreshTokenData: RefreshTokenRequest): Promise<{ accessToken: string; expiresIn: number; tokenType: string }> {
    try {
      const { refreshToken } = refreshTokenData;

      // Verify refresh token
      const decoded = await this.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);
      const expiresIn = this.getTokenExpiration(accessToken);

      log('auth', 'tokens_refreshed', user.id, user.email, true);

      return {
        accessToken,
        expiresIn,
        tokenType: 'Bearer',
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        log('auth', 'token_refresh_failed', undefined, undefined, false);
        throw error;
      }
      log('error', 'Token refresh service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to refresh tokens', error);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await UserModel.changePassword(userId, passwordData);
      log('auth', 'password_changed', userId, undefined, true);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Change password service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new DatabaseError('Failed to change password', error);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(resetRequest: PasswordResetRequest): Promise<void> {
    try {
      const { email } = resetRequest;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal that user doesn't exist for security
        log('auth', 'password_reset_requested_nonexistent_user', undefined, email, false);
        return;
      }

      // Generate password reset token (in a real implementation, this would be sent via email)
      const resetToken = this.generatePasswordResetToken();
      
      // In a real implementation, you would:
      // 1. Store the token in Redis or database with expiration
      // 2. Send email with reset link
      // 3. Include token in the email

      log('auth', 'password_reset_requested', user.id, email, true);
      
      // For now, we'll just log the token (in production, never log tokens)
      log('info', `Password reset token generated for ${email}: ${resetToken}`);
    } catch (error) {
      log('error', 'Password reset request service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: resetRequest.email,
      });
      throw new DatabaseError('Failed to process password reset request', error);
    }
  }

  /**
   * Confirm password reset
   */
  static async confirmPasswordReset(resetData: PasswordResetConfirmation): Promise<void> {
    try {
      const { token, password } = resetData;

      // In a real implementation, you would:
      // 1. Verify the token from Redis or database
      // 2. Check if token hasn't expired
      // 3. Get user ID from token
      // 4. Update user password

      // For now, we'll just simulate this process
      // This is where you would implement the actual token verification and password reset logic
      
      log('info', 'Password reset confirmed', { token: token.substring(0, 8) + '...' });
      log('auth', 'password_reset_completed', undefined, undefined, true);
    } catch (error) {
      log('error', 'Password reset confirmation service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to confirm password reset', error);
    }
  }

  /**
   * Request email verification
   */
  static async requestEmailVerification(requestData: EmailVerificationRequest): Promise<void> {
    try {
      const { email } = requestData;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal that user doesn't exist for security
        log('auth', 'email_verification_requested_nonexistent_user', undefined, email, false);
        return;
      }

      if (user.isEmailVerified) {
        log('auth', 'email_verification_requested_already_verified', user.id, email, false);
        return;
      }

      // Generate email verification token (in a real implementation, this would be sent via email)
      const verificationToken = this.generateEmailVerificationToken();
      
      // In a real implementation, you would:
      // 1. Store the token in Redis or database with expiration
      // 2. Send verification email
      // 3. Include token in the email

      log('auth', 'email_verification_requested', user.id, email, true);
      
      // For now, we'll just log the token (in production, never log tokens)
      log('info', `Email verification token generated for ${email}: ${verificationToken}`);
    } catch (error) {
      log('error', 'Email verification request service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: requestData.email,
      });
      throw new DatabaseError('Failed to process email verification request', error);
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Verify the token from Redis or database
      // 2. Check if token hasn't expired
      // 3. Get user ID from token
      // 4. Update user's email verification status

      // For now, we'll just simulate this process
      // This is where you would implement the actual token verification and email verification logic
      
      log('info', 'Email verified', { token: token.substring(0, 8) + '...' });
      log('auth', 'email_verified', undefined, undefined, true);
    } catch (error) {
      log('error', 'Email verification service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to verify email', error);
    }
  }

  /**
   * Logout user (invalidate tokens)
   * In a real implementation, you might want to implement token blacklisting
   */
  static async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      // In a real implementation with token blacklisting:
      // 1. Add the refresh token to a blacklist in Redis
      // 2. Add the access token to a blacklist (with shorter TTL)
      // 3. Clean up any active sessions

      log('auth', 'user_logged_out', userId, undefined, true);
      
      if (refreshToken) {
        // Add refresh token to blacklist if token blacklisting is implemented
        log('info', 'Refresh token invalidated', { userId });
      }
    } catch (error) {
      log('error', 'Logout service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new DatabaseError('Failed to logout user', error);
    }
  }

  /**
   * Validate access token
   */
  static async validateAccessToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      const user = await UserModel.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    return this.validateAccessToken(token);
  }

  /**
   * Check if password meets security requirements
   */
  static validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
}

export default AuthService;