import { Request, Response, NextFunction } from 'express';
import { BookingService, BookingRequestData, BookingStats } from '../services/BookingService';
import { ApiResponse, BookingStatus, JwtPayload } from '../types';
import { logger } from '../utils/logger';
import { ValidationError } from '../types';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Validation middleware for booking creation
 */
export const validateCreateBooking = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { routeId, startTime, endTime, passengers, specialRequests } = req.body;

    // Basic validation
    if (!routeId || typeof routeId !== 'string') {
      throw new ValidationError('Route ID is required and must be a string');
    }

    if (!startTime || !endTime) {
      throw new ValidationError('Start time and end time are required');
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format for start or end time');
    }

    if (passengers !== undefined) {
      if (!Number.isInteger(passengers) || passengers < 1 || passengers > 10) {
        throw new ValidationError('Passengers must be a number between 1 and 10');
      }
    }

    if (specialRequests && !Array.isArray(specialRequests)) {
      throw new ValidationError('Special requests must be an array');
    }

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        },
        timestamp: new Date()
      } as ApiResponse);
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      },
      timestamp: new Date()
    } as ApiResponse);
  }
};

/**
 * Validation middleware for pagination parameters
 */
export const validatePagination = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (page < 1) {
      throw new ValidationError('Page must be a positive integer');
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        },
        timestamp: new Date()
      } as ApiResponse);
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      },
      timestamp: new Date()
    } as ApiResponse);
  }
};

/**
 * Create a new booking
 */
export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { routeId, startTime, endTime, passengers = 1, specialRequests } = req.body;

    const bookingData: BookingRequestData = {
      routeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      passengers,
      specialRequests
    };

    const result = await BookingService.createBooking(req.user.userId, bookingData);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.status(201).json(response);
    logger.info('Booking created via API', { 
      bookingId: result.booking.id, 
      userId: req.user.userId,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm a booking
 */
export const confirmBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.confirmBooking(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Booking confirmed via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a trip
 */
export const startTrip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.startTrip(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Trip started via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a trip
 */
export const completeTrip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.completeTrip(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Trip completed via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.cancelBooking(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Booking cancelled via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const booking = await BookingService.getBookingById(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: booking,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user bookings with pagination
 */
export const getUserBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as BookingStatus | undefined;

    const result = await BookingService.getUserBookings(req.user.userId, page, limit, status);

    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get active bookings
 */
export const getActiveBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const bookings = await BookingService.getActiveBookings(req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: bookings,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get trip history (completed bookings)
 */
export const getTripHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await BookingService.getTripHistory(req.user.userId, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user booking statistics
 */
export const getUserBookingStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const stats = await BookingService.getUserBookingStats(req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: stats,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking (limited functionality for demo)
 */
export const updateBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;
    const { specialRequests } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    if (specialRequests && !Array.isArray(specialRequests)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Special requests must be an array'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.updateBooking(bookingId, req.user.userId, { specialRequests });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Booking updated via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete booking (hard delete for demo purposes)
 */
export const deleteBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Booking ID is required'
        },
        timestamp: new Date()
      } as ApiResponse);
    }

    const result = await BookingService.deleteBooking(bookingId, req.user.userId);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date()
    };

    res.json(response);
    logger.info('Booking deleted via API', { 
      bookingId, 
      userId: req.user.userId 
    });
  } catch (error) {
    next(error);
  }
};