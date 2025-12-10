import { UserModel, UpdateUserRequest, ChangePasswordRequest, CreateUserProfileRequest, UserWithProfile } from '../models/User';
import { User, UserRole, UserProfile } from '../types';
import { 
  NotFoundError, 
  ForbiddenError, 
  ValidationError,
  DatabaseError 
} from '../types';
import { log } from '../utils/logger';

export interface UserFilterOptions {
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  search?: string;
}

export interface UserPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserResult {
  user: User;
  message: string;
}

export interface UpdateProfileResult {
  profile: UserProfile;
  message: string;
}

export interface UserProfileResult extends User {
  profile?: UserProfile;
}

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: string, requesterId?: string, requesterRole?: UserRole): Promise<User> {
    try {
      // Check if user is requesting their own profile or is an admin
      if (requesterId && requesterId !== userId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('You can only access your own user information');
      }

      const user = await UserModel.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User');
      }

      log('info', 'User profile retrieved', { userId, requesterId });
      
      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      log('error', 'Get user by ID service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new DatabaseError('Failed to get user', error);
    }
  }

  /**
   * Get user with profile by ID
   */
  static async getUserWithProfile(userId: string, requesterId?: string, requesterRole?: UserRole): Promise<UserProfileResult> {
    try {
      // Check if user is requesting their own profile or is an admin
      if (requesterId && requesterId !== userId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('You can only access your own user information');
      }

      const userWithProfile = await UserModel.findByIdWithProfile(userId);
      
      if (!userWithProfile) {
        throw new NotFoundError('User');
      }

      log('info', 'User profile with details retrieved', { userId, requesterId });
      
      return userWithProfile;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      log('error', 'Get user with profile service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new DatabaseError('Failed to get user with profile', error);
    }
  }

  /**
   * Get user profile only
   */
  static async getUserProfile(userId: string, requesterId?: string, requesterRole?: UserRole): Promise<UserProfile | null> {
    try {
      // Check if user is requesting their own profile or is an admin
      if (requesterId && requesterId !== userId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('You can only access your own profile information');
      }

      const user = await UserModel.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User');
      }

      const profile = await UserModel.getProfile(userId);
      
      log('info', 'User profile retrieved', { userId, requesterId });
      
      return profile;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      log('error', 'Get user profile service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new DatabaseError('Failed to get user profile', error);
    }
  }

  /**
   * Get all users with pagination and filtering (Admin only)
   */
  static async getAllUsers(options: UserPaginationOptions & { filters?: UserFilterOptions }): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', filters } = options;
      
      // Convert to 1-based indexing for the model
      const adjustedPage = Math.max(1, page);
      const adjustedLimit = Math.min(100, Math.max(1, limit));

      // Get users with filters
      const { users, total } = await UserModel.findAll(adjustedPage, adjustedLimit, filters);
      
      const totalPages = Math.ceil(total / adjustedLimit);

      log('info', 'Admin retrieved all users', {
        page: adjustedPage,
        limit: adjustedLimit,
        total,
        filters,
      });

      return {
        users,
        total,
        page: adjustedPage,
        limit: adjustedLimit,
        totalPages,
      };
    } catch (error) {
      log('error', 'Get all users service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      });
      throw new DatabaseError('Failed to get users', error);
    }
  }

  /**
   * Update user information
   */
  static async updateUser(userId: string, updateData: UpdateUserRequest, requesterId: string, requesterRole: UserRole): Promise<UpdateUserResult> {
    try {
      // Check if user is updating their own profile or is an admin
      if (requesterId !== userId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('You can only update your own user information');
      }

      // Non-admin users cannot change their role or active status
      if (requesterRole !== UserRole.ADMIN) {
        const { role, isActive, ...allowedUpdateData } = updateData as any;
        updateData = allowedUpdateData;
      }

      const updatedUser = await UserModel.update(userId, updateData);
      
      log('info', 'User information updated', {
        userId,
        updatedBy: requesterId,
        updatedFields: Object.keys(updateData),
      });

      return {
        user: updatedUser,
        message: 'User information updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Update user service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to update user', error);
    }
  }

  /**
   * Update or create user profile
   */
  static async updateUserProfile(userId: string, profileData: CreateUserProfileRequest, requesterId: string, requesterRole: UserRole): Promise<UpdateProfileResult> {
    try {
      // Check if user is updating their own profile or is an admin
      if (requesterId !== userId && requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('You can only update your own profile information');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      const updatedProfile = await UserModel.upsertProfile(userId, profileData);
      
      log('info', 'User profile updated', {
        userId,
        updatedBy: requesterId,
        updatedFields: Object.keys(profileData),
      });

      return {
        profile: updatedProfile,
        message: 'User profile updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      log('error', 'Update user profile service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to update user profile', error);
    }
  }

  /**
   * Change user password
   */
  static async changeUserPassword(userId: string, passwordData: ChangePasswordRequest, requesterId: string, requesterRole: UserRole): Promise<void> {
    try {
      // Users can only change their own password
      if (requesterId !== userId) {
        throw new ForbiddenError('You can only change your own password');
      }

      await UserModel.changePassword(userId, passwordData);
      
      log('info', 'User password changed', {
        userId,
        changedBy: requesterId,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Change user password service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to change user password', error);
    }
  }

  /**
   * Deactivate user (Admin only)
   */
  static async deactivateUser(userId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    try {
      // Only admins can deactivate users
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can deactivate users');
      }

      // Admin cannot deactivate themselves
      if (requesterId === userId) {
        throw new ValidationError('Administrators cannot deactivate their own accounts');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if user is already inactive
      if (!user.isActive) {
        throw new ValidationError('User is already deactivated');
      }

      await UserModel.update(userId, { isActive: false });
      
      log('security', 'User deactivated by admin', {
        userId,
        deactivatedBy: requesterId,
        userEmail: user.email,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Deactivate user service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to deactivate user', error);
    }
  }

  /**
   * Reactivate user (Admin only)
   */
  static async reactivateUser(userId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    try {
      // Only admins can reactivate users
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can reactivate users');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if user is already active
      if (user.isActive) {
        throw new ValidationError('User is already active');
      }

      await UserModel.update(userId, { isActive: true });
      
      log('security', 'User reactivated by admin', {
        userId,
        reactivatedBy: requesterId,
        userEmail: user.email,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Reactivate user service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to reactivate user', error);
    }
  }

  /**
   * Update user role (Admin only)
   */
  static async updateUserRole(userId: string, newRole: UserRole, requesterId: string, requesterRole: UserRole): Promise<UpdateUserResult> {
    try {
      // Only admins can change user roles
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can change user roles');
      }

      // Admin cannot change their own role
      if (requesterId === userId) {
        throw new ValidationError('Administrators cannot change their own role');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if role is actually changing
      if (user.role === newRole) {
        throw new ValidationError('User already has this role');
      }

      const updatedUser = await UserModel.update(userId, { role: newRole });
      
      log('security', 'User role updated by admin', {
        userId,
        oldRole: user.role,
        newRole,
        updatedBy: requesterId,
        userEmail: user.email,
      });

      return {
        user: updatedUser,
        message: `User role updated to ${newRole} successfully`,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Update user role service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
        newRole,
      });
      throw new DatabaseError('Failed to update user role', error);
    }
  }

  /**
   * Set email verification status (Admin only)
   */
  static async setEmailVerificationStatus(userId: string, isVerified: boolean, requesterId: string, requesterRole: UserRole): Promise<void> {
    try {
      // Only admins can manually set email verification status
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can set email verification status');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if status is actually changing
      if (user.isEmailVerified === isVerified) {
        throw new ValidationError(`Email verification is already ${isVerified ? 'verified' : 'unverified'}`);
      }

      await UserModel.setEmailVerified(userId, isVerified);
      
      log('security', 'Email verification status updated by admin', {
        userId,
        isVerified,
        updatedBy: requesterId,
        userEmail: user.email,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Set email verification status service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
        isVerified,
      });
      throw new DatabaseError('Failed to set email verification status', error);
    }
  }

  /**
   * Soft delete user (Admin only)
   */
  static async deleteUser(userId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    try {
      // Only admins can delete users
      if (requesterRole !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can delete users');
      }

      // Admin cannot delete themselves
      if (requesterId === userId) {
        throw new ValidationError('Administrators cannot delete their own accounts');
      }

      await UserModel.softDelete(userId);
      
      log('security', 'User soft deleted by admin', {
        userId,
        deletedBy: requesterId,
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
        throw error;
      }
      log('error', 'Delete user service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        requesterId,
      });
      throw new DatabaseError('Failed to delete user', error);
    }
  }

  /**
   * Search users by email or name (Admin only)
   */
  static async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      // This would typically be implemented with a more sophisticated search
      // For now, we'll use a simple approach with the existing findAll method
      
      const { users } = await UserModel.findAll(1, limit, {
        isActive: true, // Only search active users
      });

      // Filter users based on search query
      const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase())
      );

      log('info', 'User search performed', {
        query,
        resultsCount: filteredUsers.length,
        limit,
      });

      return filteredUsers;
    } catch (error) {
      log('error', 'Search users service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        limit,
      });
      throw new DatabaseError('Failed to search users', error);
    }
  }

  /**
   * Get user statistics (Admin only)
   */
  static async getUserStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    emailVerified: number;
    emailUnverified: number;
    byRole: Record<UserRole, number>;
  }> {
    try {
      const totalUsers = await UserModel.findAll(1, 10000);
      const total = totalUsers.total;
      
      let active = 0;
      let inactive = 0;
      let emailVerified = 0;
      let emailUnverified = 0;
      const byRole = {
        [UserRole.USER]: 0,
        [UserRole.ADMIN]: 0,
        [UserRole.DRIVER]: 0,
      };

      // Get all users for statistics
      const allUsersResult = await UserModel.findAll(1, Math.min(10000, total));
      
      for (const user of allUsersResult.users) {
        if (user.isActive) {
          active++;
        } else {
          inactive++;
        }

        if (user.isEmailVerified) {
          emailVerified++;
        } else {
          emailUnverified++;
        }

        byRole[user.role]++;
      }

      const statistics = {
        total,
        active,
        inactive,
        emailVerified,
        emailUnverified,
        byRole,
      };

      log('info', 'User statistics retrieved', statistics);

      return statistics;
    } catch (error) {
      log('error', 'Get user statistics service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to get user statistics', error);
    }
  }

  /**
   * Validate user data for updates
   */
  private static validateUpdateData(updateData: UpdateUserRequest): void {
    // Add any custom validation logic here
    // For example, phone number format validation
    if (updateData.phone && updateData.phone.length > 20) {
      throw new ValidationError('Phone number is too long');
    }
  }

  /**
   * Validate profile data
   */
  private static validateProfileData(profileData: CreateUserProfileRequest): void {
    // Add any custom validation logic here
    if (profileData.dateOfBirth && profileData.dateOfBirth >= new Date()) {
      throw new ValidationError('Date of birth cannot be in the future');
    }

    // Validate postal code format for German addresses
    if (profileData.postalCode && !/^\d{5}$/.test(profileData.postalCode)) {
      throw new ValidationError('Invalid German postal code format');
    }
  }
}

export default UserService;