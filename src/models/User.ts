import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { User, UserRole, UserProfile, UserPreferences, NotificationPreferences, MobilityPreferences } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseError, ConflictError, NotFoundError, ValidationError } from '../types';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserProfileRequest {
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: Date;
  preferences?: {
    language?: string;
    currency?: string;
    notifications?: Partial<NotificationPreferences>;
    mobility?: Partial<MobilityPreferences>;
  };
}

export interface UserWithProfile extends User {
  profile?: UserProfile;
}

export class UserModel {
  /**
   * Create a new user in the database
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    try {
      const { email, password, firstName, lastName, phone, role = UserRole.USER } = userData;

      // Check if user already exists
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

      const userId = uuidv4();
      const now = new Date();

      const createQuery = `
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, phone, 
          role, is_active, is_email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, email, first_name, last_name, phone, role, 
                  is_active, is_email_verified, created_at, updated_at
      `;

      const result = await query(createQuery, [
        userId, email, passwordHash, firstName, lastName, phone,
        role, true, false, now, now
      ]);

      const user = result.rows[0];
      
      logger.auth('user_registered', user.id, email, true);
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as User;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error creating user', { error, email: userData.email });
      throw new DatabaseError('Failed to create user', error);
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const queryText = `
        SELECT id, email, first_name, last_name, phone, role, 
               is_active, is_email_verified, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as User;
    } catch (error) {
      logger.error('Error finding user by ID', { error, userId: id });
      throw new DatabaseError('Failed to find user', error);
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const queryText = `
        SELECT id, email, first_name, last_name, phone, role, 
               is_active, is_email_verified, created_at, updated_at
        FROM users 
        WHERE email = $1
      `;

      const result = await query(queryText, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as User;
    } catch (error) {
      logger.error('Error finding user by email', { error, email });
      throw new DatabaseError('Failed to find user', error);
    }
  }

  /**
   * Find user by email with password hash (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const queryText = `
        SELECT id, email, password_hash, first_name, last_name, phone, role, 
               is_active, is_email_verified, created_at, updated_at
        FROM users 
        WHERE email = $1
      `;

      const result = await query(queryText, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as User & { passwordHash: string };
    } catch (error) {
      logger.error('Error finding user by email with password', { error, email });
      throw new DatabaseError('Failed to find user', error);
    }
  }

  /**
   * Update user information
   */
  static async update(id: string, updateData: UpdateUserRequest): Promise<User> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      const { firstName, lastName, phone, isActive } = updateData;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        return existingUser;
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(id);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, phone, role, 
                  is_active, is_email_verified, created_at, updated_at
      `;

      const result = await query(updateQuery, values);
      const user = result.rows[0];
      
      logger.auth('user_updated', user.id, user.email, true);
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as User;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating user', { error, userId: id });
      throw new DatabaseError('Failed to update user', error);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(id: string, passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const { currentPassword, newPassword } = passwordData;

      // Get current user with password
      const userQuery = `
        SELECT id, email, password_hash
        FROM users 
        WHERE id = $1
      `;

      const userResult = await query(userQuery, [id]);
      if (userResult.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = userResult.rows[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

      // Update password
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = $2
        WHERE id = $3
      `;

      await query(updateQuery, [newPasswordHash, new Date(), id]);
      
      logger.auth('password_changed', user.id, user.email, true);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error changing password', { error, userId: id });
      throw new DatabaseError('Failed to change password', error);
    }
  }

  /**
   * Set email verification status
   */
  static async setEmailVerified(id: string, verified: boolean): Promise<void> {
    try {
      const updateQuery = `
        UPDATE users 
        SET is_email_verified = $1, updated_at = $2
        WHERE id = $3
      `;

      await query(updateQuery, [verified, new Date(), id]);
      
      logger.auth('email_verification_updated', id, undefined, true);
    } catch (error) {
      logger.error('Error updating email verification', { error, userId: id });
      throw new DatabaseError('Failed to update email verification', error);
    }
  }

  /**
   * Delete user (soft delete by setting is_active = false)
   */
  static async softDelete(id: string): Promise<void> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User');
      }

      const updateQuery = `
        UPDATE users 
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `;

      await query(updateQuery, [new Date(), id]);
      
      logger.auth('user_soft_deleted', id, existingUser.email, true);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error soft deleting user', { error, userId: id });
      throw new DatabaseError('Failed to soft delete user', error);
    }
  }

  /**
   * Get users with pagination
   */
  static async findAll(page: number = 1, limit: number = 50, filters?: { role?: UserRole; isActive?: boolean }): Promise<{ users: User[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (filters?.role) {
        whereConditions.push(`role = $${paramIndex++}`);
        queryParams.push(filters.role);
      }

      if (filters?.isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(filters.isActive);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get users
      queryParams.push(limit, offset);
      const usersQuery = `
        SELECT id, email, first_name, last_name, phone, role, 
               is_active, is_email_verified, created_at, updated_at
        FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const usersResult = await query(usersQuery, queryParams);
      
      const users = usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })) as User[];

      return { users, total };
    } catch (error) {
      logger.error('Error finding users', { error, page, limit, filters });
      throw new DatabaseError('Failed to find users', error);
    }
  }

  /**
   * Create or update user profile
   */
  static async upsertProfile(userId: string, profileData: CreateUserProfileRequest): Promise<UserProfile> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      const { address, city, postalCode, country, dateOfBirth, preferences } = profileData;

      const profileQuery = `
        INSERT INTO user_profiles (
          user_id, address, city, postal_code, country, date_of_birth, 
          preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          postal_code = EXCLUDED.postal_code,
          country = EXCLUDED.country,
          date_of_birth = EXCLUDED.date_of_birth,
          preferences = EXCLUDED.preferences,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const result = await query(profileQuery, [
        userId, address, city, postalCode, country, dateOfBirth,
        preferences ? JSON.stringify(preferences) : null,
        new Date(), new Date()
      ]);

      const profile = result.rows[0];
      
      return {
        userId: profile.user_id,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postal_code,
        country: profile.country,
        dateOfBirth: profile.date_of_birth,
        preferences: profile.preferences,
      } as UserProfile;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error upserting user profile', { error, userId });
      throw new DatabaseError('Failed to upsert user profile', error);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const queryText = `
        SELECT user_id, address, city, postal_code, country, date_of_birth, preferences
        FROM user_profiles 
        WHERE user_id = $1
      `;

      const result = await query(queryText, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const profile = result.rows[0];
      
      return {
        userId: profile.user_id,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postal_code,
        country: profile.country,
        dateOfBirth: profile.date_of_birth,
        preferences: profile.preferences,
      } as UserProfile;
    } catch (error) {
      logger.error('Error getting user profile', { error, userId });
      throw new DatabaseError('Failed to get user profile', error);
    }
  }

  /**
   * Get user with profile
   */
  static async findByIdWithProfile(id: string): Promise<UserWithProfile | null> {
    try {
      const user = await this.findById(id);
      if (!user) {
        return null;
      }

      const profile = await this.getProfile(id);

      return {
        ...user,
        profile,
      };
    } catch (error) {
      logger.error('Error finding user with profile', { error, userId: id });
      throw new DatabaseError('Failed to find user with profile', error);
    }
  }
}