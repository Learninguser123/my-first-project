import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { 
  createBooking,
  confirmBooking,
  startTrip,
  completeTrip,
  cancelBooking,
  getBookingById,
  getUserBookings,
  getActiveBookings,
  getTripHistory,
  getUserBookingStats,
  updateBooking,
  deleteBooking,
  validateCreateBooking,
  validatePagination
} from '../controllers/BookingController';
import { BookingStatus } from '../types';

const router = Router();

// Apply authentication middleware to all booking routes
router.use(authenticate);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking from selected route
 * @access  Private
 */
router.post('/',
  validateCreateBooking,
  [
    body('routeId')
      .isUUID()
      .withMessage('Invalid route ID format'),
    body('startTime')
      .isISO8601()
      .withMessage('Start time must be a valid ISO 8601 date'),
    body('endTime')
      .isISO8601()
      .withMessage('End time must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    body('passengers')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Passengers must be between 1 and 10'),
    body('specialRequests')
      .optional()
      .isArray()
      .withMessage('Special requests must be an array'),
    body('specialRequests.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Each special request must be between 1 and 500 characters'),
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

      await createBooking(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_BOOKING_ERROR',
          message: 'Failed to create booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:bookingId/confirm
 * @desc    Confirm a pending booking
 * @access  Private
 */
router.post('/:bookingId/confirm',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await confirmBooking(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIRM_BOOKING_ERROR',
          message: 'Failed to confirm booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:bookingId/start
 * @desc    Start a trip (change booking to in_progress)
 * @access  Private
 */
router.post('/:bookingId/start',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await startTrip(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'START_TRIP_ERROR',
          message: 'Failed to start trip',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:bookingId/complete
 * @desc    Complete a trip and award points
 * @access  Private
 */
router.post('/:bookingId/complete',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await completeTrip(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'COMPLETE_TRIP_ERROR',
          message: 'Failed to complete trip',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   POST /api/bookings/:bookingId/cancel
 * @desc    Cancel a booking
 * @access  Private
 */
router.post('/:bookingId/cancel',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await cancelBooking(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_BOOKING_ERROR',
          message: 'Failed to cancel booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/bookings
 * @desc    Get user bookings with pagination and optional status filter
 * @access  Private
 */
router.get('/',
  validatePagination,
  [
    query('status')
      .optional()
      .isIn(Object.values(BookingStatus))
      .withMessage('Invalid booking status'),
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

      await getUserBookings(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_BOOKINGS_ERROR',
          message: 'Failed to get bookings',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/bookings/active
 * @desc    Get active bookings (confirmed and in_progress)
 * @access  Private
 */
router.get('/active',
  async (req: Request, res: Response) => {
    try {
      await getActiveBookings(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ACTIVE_BOOKINGS_ERROR',
          message: 'Failed to get active bookings',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/bookings/history
 * @desc    Get trip history (completed bookings)
 * @access  Private
 */
router.get('/history',
  validatePagination,
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

      await getTripHistory(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TRIP_HISTORY_ERROR',
          message: 'Failed to get trip history',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/bookings/stats
 * @desc    Get user booking statistics
 * @access  Private
 */
router.get('/stats',
  async (req: Request, res: Response) => {
    try {
      await getUserBookingStats(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_BOOKING_STATS_ERROR',
          message: 'Failed to get booking statistics',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:bookingId',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await getBookingById(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_BOOKING_ERROR',
          message: 'Failed to get booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   PUT /api/bookings/:bookingId
 * @desc    Update booking details (limited functionality for demo)
 * @access  Private
 */
router.put('/:bookingId',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
    body('specialRequests')
      .optional()
      .isArray()
      .withMessage('Special requests must be an array'),
    body('specialRequests.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Each special request must be between 1 and 500 characters'),
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

      await updateBooking(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_BOOKING_ERROR',
          message: 'Failed to update booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

/**
 * @route   DELETE /api/bookings/:bookingId
 * @desc    Delete a booking (hard delete for demo purposes)
 * @access  Private
 */
router.delete('/:bookingId',
  [
    param('bookingId')
      .isUUID()
      .withMessage('Invalid booking ID format'),
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

      await deleteBooking(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_BOOKING_ERROR',
          message: 'Failed to delete booking',
        },
        timestamp: new Date(),
      });
    }
  }
);

export default router;