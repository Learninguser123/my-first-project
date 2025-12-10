import Joi from 'joi';
import { UserRole } from '../types';

// Common validation patterns
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[1-9]\d{1,14}$/;

// Password validation with custom error messages
const passwordValidation = Joi.string()
  .min(8)
  .max(128)
  .pattern(passwordPattern)
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  });

// Email validation
const emailValidation = Joi.string()
  .email()
  .max(255)
  .required()
  .messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email must not exceed 255 characters',
  });

// Name validation
const nameValidation = Joi.string()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-Z\s\-']+$/)
  .required()
  .messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
  });

// Phone validation (optional)
const phoneValidation = Joi.string()
  .pattern(phonePattern)
  .optional()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number (E.164 format: +1234567890)',
  });

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match password',
      'string.empty': 'Password confirmation is required',
    }),
  firstName: nameValidation.messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
    'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
  }),
  lastName: nameValidation.messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
    'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  }),
  phone: phoneValidation,
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .default(UserRole.USER)
    .messages({
      'any.only': 'Invalid user role',
    }),
  acceptTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'boolean.base': 'You must accept the terms and conditions',
    }),
}).options({
  abortEarly: false, // Return all validation errors
  stripUnknown: true, // Remove unknown fields
});

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
  email: emailValidation,
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
  rememberMe: Joi.boolean()
    .optional()
    .default(false),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Password change validation schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
    }),
  newPassword: passwordValidation.label('New password'),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match new password',
      'string.empty': 'Password confirmation is required',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Password reset request validation schema
 */
export const forgotPasswordSchema = Joi.object({
  email: emailValidation,
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Password reset confirmation validation schema
 */
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
    }),
  password: passwordValidation,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match password',
      'string.empty': 'Password confirmation is required',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Email verification validation schema
 */
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Verification token is required',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Resend email verification validation schema
 */
export const resendEmailVerificationSchema = Joi.object({
  email: emailValidation,
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Update user profile validation schema
 */
export const updateProfileSchema = Joi.object({
  firstName: nameValidation.optional(),
  lastName: nameValidation.optional(),
  phone: phoneValidation.optional(),
  profile: Joi.object({
    address: Joi.string().max(255).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    postalCode: Joi.string().max(20).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future',
      }),
    preferences: Joi.object({
      language: Joi.string().max(10).optional(),
      currency: Joi.string().max(3).optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        marketing: Joi.boolean().optional(),
      }).optional(),
      mobility: Joi.object({
        preferredVehicleTypes: Joi.array().items(
          Joi.string().valid('bus', 'tram', 'subway', 'train', 'ferry', 'taxi', 'e_bike', 'e_scooter', 'car_sharing', 'walking')
        ).optional(),
        maxWalkingDistance: Joi.number().min(0).max(5000).optional(),
        avoidTolls: Joi.boolean().optional(),
        avoidHighways: Joi.boolean().optional(),
        wheelchairAccessible: Joi.boolean().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Update user role validation schema (Admin only)
 */
export const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required()
    .messages({
      'string.empty': 'Role is required',
      'any.only': 'Invalid user role',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Pagination validation schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'firstName', 'lastName', 'email')
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'Invalid sort field',
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * User filter validation schema
 */
export const userFilterSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional(),
  isActive: Joi.boolean().optional(),
  isEmailVerified: Joi.boolean().optional(),
  search: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term must not exceed 100 characters',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * UUID validation schema
 */
export const uuidSchema = Joi.string()
  .uuid()
  .required()
  .messages({
    'string.empty': 'ID is required',
    'string.guid': 'Invalid ID format',
  });

/**
 * Generic ID validation with UUID pattern
 */
export const idSchema = Joi.object({
  id: uuidSchema,
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Validation schema for admin actions (requires admin context)
 */
export const adminActionSchema = Joi.object({
  userId: uuidSchema,
  reason: Joi.string()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Reason is required',
      'string.min': 'Reason must be at least 5 characters long',
      'string.max': 'Reason must not exceed 500 characters',
    }),
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Email validation for general use
 */
export const emailOnlySchema = Joi.object({
  email: emailValidation,
}).options({
  abortEarly: false,
  stripUnknown: true,
});

/**
 * Export all validation schemas
 */
export const validationSchemas = {
  register: registerSchema,
  login: loginSchema,
  refreshToken: refreshTokenSchema,
  changePassword: changePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  verifyEmail: verifyEmailSchema,
  resendEmailVerification: resendEmailVerificationSchema,
  updateProfile: updateProfileSchema,
  updateRole: updateRoleSchema,
  pagination: paginationSchema,
  userFilter: userFilterSchema,
  uuid: idSchema,
  adminAction: adminActionSchema,
  emailOnly: emailOnlySchema,
};