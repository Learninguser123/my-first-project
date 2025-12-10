import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ValidationError } from '../types';
import { log } from '../utils/logger';

/**
 * Middleware factory for validating request data against a Joi schema
 * @param schema Joi schema to validate against
 * @param property Request property to validate ('body', 'query', 'params')
 * @returns Express middleware function
 */
export const validate = (
  schema: Schema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[property];
      
      // If data is undefined and schema doesn't allow empty, return error
      if (data === undefined || data === null) {
        const error = new ValidationError('Request data is required');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: 'Request data is required',
          },
          timestamp: new Date(),
        });
        return;
      }

      const { error, value } = schema.validate(data, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true, // Remove unknown fields
        convert: true, // Convert types automatically
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        const validationError = new ValidationError('Validation failed', validationErrors);
        
        log('security', 'Request validation failed', {
          property,
          errors: validationErrors,
          originalData: data,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validationErrors,
          },
          timestamp: new Date(),
        });
        return;
      }

      // Replace the request property with the validated and sanitized data
      req[property] = value;
      next();
    } catch (err) {
      log('error', 'Validation middleware error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        property,
        ip: req.ip,
      });

      const validationError = new ValidationError('Validation process failed');
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError.message,
        },
        timestamp: new Date(),
      });
    }
  };
};

/**
 * Middleware for validating request body
 */
export const validateBody = (schema: Schema) => validate(schema, 'body');

/**
 * Middleware for validating request query parameters
 */
export const validateQuery = (schema: Schema) => validate(schema, 'query');

/**
 * Middleware for validating request parameters (URL params)
 */
export const validateParams = (schema: Schema) => validate(schema, 'params');

/**
 * Middleware for validating multiple request parts
 * @param schemas Object with schemas for different parts of the request
 */
export const validateMultiple = (schemas: {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationPromises: Promise<void>[] = [];

      // Create validation promises for each schema
      if (schemas.body) {
        validationPromises.push(
          new Promise<void>((resolve, reject) => {
            try {
              validateBody(schemas.body!)(req, res, (error) => {
                if (error) reject(error);
                else resolve();
              });
            } catch (error) {
              reject(error);
            }
          })
        );
      }

      if (schemas.query) {
        validationPromises.push(
          new Promise<void>((resolve, reject) => {
            try {
              validateQuery(schemas.query!)(req, res, (error) => {
                if (error) reject(error);
                else resolve();
              });
            } catch (error) {
              reject(error);
            }
          })
        );
      }

      if (schemas.params) {
        validationPromises.push(
          new Promise<void>((resolve, reject) => {
            try {
              validateParams(schemas.params!)(req, res, (error) => {
                if (error) reject(error);
                else resolve();
              });
            } catch (error) {
              reject(error);
            }
          })
        );
      }

      // Wait for all validations to complete
      await Promise.all(validationPromises);
      
      next();
    } catch (error) {
      // Error already handled by individual validation middleware
      next(error);
    }
  };
};

/**
 * Middleware to check if request contains required fields
 * @param fields Array of field names to check for
 * @param property Request property to check ('body', 'query', 'params')
 */
export const requireFields = (
  fields: string[],
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[property] || {};
      const missingFields = fields.filter(field => 
        data[field] === undefined || data[field] === null || data[field] === ''
      );

      if (missingFields.length > 0) {
        const validationError = new ValidationError(
          `Missing required fields: ${missingFields.join(', ')}`
        );

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message,
            details: missingFields.map(field => ({
              field,
              message: `${field} is required`,
            })),
          },
          timestamp: new Date(),
        });
        return;
      }

      next();
    } catch (error) {
      log('error', 'Field validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        property,
        fields,
        ip: req.ip,
      });

      const validationError = new ValidationError('Field validation failed');
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError.message,
        },
        timestamp: new Date(),
      });
    }
  };
};

/**
 * Middleware to sanitize and trim string fields
 * @param fields Array of field names to sanitize
 * @param property Request property to sanitize ('body', 'query', 'params')
 */
export const sanitizeStrings = (
  fields: string[],
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[property] || {};
      
      fields.forEach(field => {
        if (data[field] && typeof data[field] === 'string') {
          data[field] = data[field].trim();
        }
      });

      req[property] = data;
      next();
    } catch (error) {
      log('error', 'String sanitization middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        property,
        fields,
        ip: req.ip,
      });
      next();
    }
  };
};

/**
 * Middleware to validate file uploads
 * @param options File validation options
 */
export const validateFiles = (options: {
  required?: boolean;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const singleFile = req.file as Express.Multer.File | undefined;

      // Check if files are required
      if (options.required && !files && !singleFile) {
        const validationError = new ValidationError('File upload is required');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message,
          },
          timestamp: new Date(),
        });
        return;
      }

      const uploadedFiles = files ? [...files] : (singleFile ? [singleFile] : []);

      // Check max files limit
      if (options.maxFiles && uploadedFiles.length > options.maxFiles) {
        const validationError = new ValidationError(
          `Maximum ${options.maxFiles} files allowed`
        );
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message,
          },
          timestamp: new Date(),
        });
        return;
      }

      // Validate each file
      for (const file of uploadedFiles) {
        // Check file size
        if (options.maxSize && file.size > options.maxSize) {
          const maxSizeMB = options.maxSize / (1024 * 1024);
          const validationError = new ValidationError(
            `File ${file.originalname} is too large. Maximum size is ${maxSizeMB.toFixed(1)}MB`
          );
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validationError.message,
            },
            timestamp: new Date(),
          });
          return;
        }

        // Check file type
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          const validationError = new ValidationError(
            `File ${file.originalname} has invalid type. Allowed types: ${options.allowedTypes.join(', ')}`
          );
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validationError.message,
            },
            timestamp: new Date(),
          });
          return;
        }
      }

      next();
    } catch (error) {
      log('error', 'File validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
        ip: req.ip,
      });

      const validationError = new ValidationError('File validation failed');
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError.message,
        },
        timestamp: new Date(),
      });
    }
  };
};

/**
 * Middleware to validate content type
 * @param allowedTypes Array of allowed content types
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const contentType = req.get('Content-Type');

      if (!contentType) {
        const validationError = new ValidationError('Content-Type header is required');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message,
          },
          timestamp: new Date(),
        });
        return;
      }

      // Check if content type matches any allowed type (allow charset suffix)
      const isAllowed = allowedTypes.some(allowedType => {
        return contentType.startsWith(allowedType);
      });

      if (!isAllowed) {
        const validationError = new ValidationError(
          `Content-Type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        );
        res.status(415).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationError.message,
          },
          timestamp: new Date(),
        });
        return;
      }

      next();
    } catch (error) {
      log('error', 'Content type validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        allowedTypes,
        contentType: req.get('Content-Type'),
        ip: req.ip,
      });

      const validationError = new ValidationError('Content type validation failed');
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError.message,
        },
        timestamp: new Date(),
      });
    }
  };
};

/**
 * Custom validation functions for specific scenarios
 */
export const customValidators = {
  /**
   * Validate password strength (can be used with custom Joi extension)
   */
  passwordStrength: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },

  /**
   * Validate German postal code
   */
  germanPostalCode: (postalCode: string): boolean => {
    return /^\d{5}$/.test(postalCode);
  },

  /**
   * Validate German phone number
   */
  germanPhoneNumber: (phone: string): boolean => {
    const patterns = [
      /^\+49[1-9]\d{1,14}$/, // International format
      /^0[1-9]\d{1,14}$/,     // National format
    ];
    return patterns.some(pattern => pattern.test(phone));
  },

  /**
   * Validate IBAN (simplified)
   */
  iban: (iban: string): boolean => {
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/;
    return ibanRegex.test(iban.replace(/\s/g, '').toUpperCase());
  },
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
  requireFields,
  sanitizeStrings,
  validateFiles,
  validateContentType,
  customValidators,
};