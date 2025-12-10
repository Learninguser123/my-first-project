import { BookingModel, BookingWithRoute } from '../models/Booking';
import { RouteModel } from '../models/Route';
import { UserModel } from '../models/User';
import { RewardsService } from './RewardsService';
import { 
  Booking, 
  BookingStatus, 
  PaymentStatus, 
  CreateBookingRequest, 
  NotFoundError, 
  ValidationError,
  DatabaseError 
} from '../types';
import { logger } from '../utils/logger';

export interface BookingRequestData {
  routeId: string;
  startTime: Date;
  endTime: Date;
  passengers: number;
  specialRequests?: string[];
}

export interface BookingResponse {
  booking: BookingWithRoute;
  message: string;
}

export interface BookingStats {
  totalBookings: number;
  completedTrips: number;
  cancelledTrips: number;
  totalPointsEarned: number;
  upcomingTrips: number;
}

export class BookingService {
  /**
   * Create a new booking from a selected route
   */
  static async createBooking(
    userId: string, 
    bookingData: BookingRequestData
  ): Promise<BookingResponse> {
    try {
      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Verify route exists and is active
      const route = await RouteModel.findById(bookingData.routeId);
      if (!route) {
        throw new NotFoundError('Route');
      }

      if (!route.isActive) {
        throw new ValidationError('Route is not available for booking');
      }

      // Validate booking times
      const now = new Date();
      if (bookingData.startTime < now) {
        throw new ValidationError('Start time cannot be in the past');
      }

      if (bookingData.endTime <= bookingData.startTime) {
        throw new ValidationError('End time must be after start time');
      }

      // Calculate pricing (simple calculation for demo)
      const basePrice = route.price;
      const passengerMultiplier = Math.max(1, bookingData.passengers);
      const totalPrice = basePrice * passengerMultiplier;

      // Create the booking
      const createBookingData: CreateBookingRequest = {
        userId,
        routeId: bookingData.routeId,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        totalPrice,
        currency: route.currency,
        passengers: bookingData.passengers,
        specialRequests: bookingData.specialRequests,
      };

      const booking = await BookingModel.create(createBookingData);

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(booking.id);

      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve created booking with route details');
      }

      logger.info('Booking created successfully', { 
        bookingId: booking.id, 
        userId, 
        routeId: bookingData.routeId,
        totalPrice 
      });

      return {
        booking: bookingWithRoute,
        message: 'Booking created successfully. Please confirm to proceed.'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error creating booking', { error, userId, bookingData });
      throw new DatabaseError('Failed to create booking', error);
    }
  }

  /**
   * Confirm a booking (change status from pending to confirmed)
   */
  static async confirmBooking(bookingId: string, userId: string): Promise<BookingResponse> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only confirm your own bookings');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new ValidationError('Only pending bookings can be confirmed');
      }

      // Update booking status to confirmed
      const updatedBooking = await BookingModel.update(bookingId, {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID // For demo, auto-mark as paid
      });

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve updated booking with route details');
      }

      logger.info('Booking confirmed', { bookingId, userId });

      return {
        booking: bookingWithRoute,
        message: 'Booking confirmed successfully. Your trip is ready!'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error confirming booking', { error, bookingId, userId });
      throw new DatabaseError('Failed to confirm booking', error);
    }
  }

  /**
   * Start a trip (change status from confirmed to in_progress)
   */
  static async startTrip(bookingId: string, userId: string): Promise<BookingResponse> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only start your own trips');
      }

      // Start the trip
      const updatedBooking = await BookingModel.startTrip(bookingId);

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve updated booking with route details');
      }

      logger.info('Trip started', { bookingId, userId });

      return {
        booking: bookingWithRoute,
        message: 'Trip started! Have a safe journey.'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error starting trip', { error, bookingId, userId });
      throw new DatabaseError('Failed to start trip', error);
    }
  }

  /**
   * Complete a trip and award points
   */
  static async completeTrip(bookingId: string, userId: string): Promise<BookingResponse> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only complete your own trips');
      }

      // Calculate points to award (simple calculation for demo)
      const pointsEarned = Math.round(booking.totalPrice * 10); // 10 points per currency unit

      // Complete the trip and award points
      const updatedBooking = await BookingModel.completeTrip(bookingId, pointsEarned);

      // Award points to user
      await RewardsService.awardPoints(userId, pointsEarned, `Trip completion: ${bookingId}`);

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve updated booking with route details');
      }

      logger.info('Trip completed and points awarded', { 
        bookingId, 
        userId, 
        pointsEarned,
        totalPrice: booking.totalPrice 
      });

      return {
        booking: bookingWithRoute,
        message: `Trip completed successfully! You earned ${pointsEarned} points.`
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error completing trip', { error, bookingId, userId });
      throw new DatabaseError('Failed to complete trip', error);
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, userId: string): Promise<BookingResponse> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only cancel your own bookings');
      }

      // Cancel the booking
      const updatedBooking = await BookingModel.cancel(bookingId);

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve updated booking with route details');
      }

      logger.info('Booking cancelled', { bookingId, userId });

      return {
        booking: bookingWithRoute,
        message: 'Booking cancelled successfully.'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error cancelling booking', { error, bookingId, userId });
      throw new DatabaseError('Failed to cancel booking', error);
    }
  }

  /**
   * Get booking by ID with route details
   */
  static async getBookingById(bookingId: string, userId: string): Promise<BookingWithRoute> {
    try {
      const booking = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Verify ownership (users can only see their own bookings)
      if (booking.userId !== userId) {
        throw new ValidationError('You can only view your own bookings');
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error getting booking by ID', { error, bookingId, userId });
      throw new DatabaseError('Failed to get booking', error);
    }
  }

  /**
   * Get all bookings for a user with pagination
   */
  static async getUserBookings(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: BookingStatus
  ): Promise<{ bookings: Booking[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      const filters = status ? { status } : undefined;
      const { bookings, total } = await BookingModel.findByUserId(userId, page, limit, filters);
      const totalPages = Math.ceil(total / limit);

      return {
        bookings,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting user bookings', { error, userId, page, limit });
      throw new DatabaseError('Failed to get user bookings', error);
    }
  }

  /**
   * Get active bookings for a user (confirmed and in_progress)
   */
  static async getActiveBookings(userId: string): Promise<Booking[]> {
    try {
      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      return await BookingModel.findActiveByUserId(userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting active bookings', { error, userId });
      throw new DatabaseError('Failed to get active bookings', error);
    }
  }

  /**
   * Get trip history (completed bookings) for a user
   */
  static async getTripHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ bookings: Booking[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getUserBookings(userId, page, limit, BookingStatus.COMPLETED);
  }

  /**
   * Get booking statistics for a user
   */
  static async getUserBookingStats(userId: string): Promise<BookingStats> {
    try {
      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      return await BookingModel.getUserStats(userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting user booking stats', { error, userId });
      throw new DatabaseError('Failed to get user booking stats', error);
    }
  }

  /**
   * Update booking details (for demo purposes - limited functionality)
   */
  static async updateBooking(
    bookingId: string,
    userId: string,
    updateData: { specialRequests?: string[] }
  ): Promise<BookingResponse> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only update your own bookings');
      }

      // Only allow updates for pending bookings
      if (booking.status !== BookingStatus.PENDING) {
        throw new ValidationError('Only pending bookings can be updated');
      }

      // Update the booking
      const updatedBooking = await BookingModel.update(bookingId, updateData);

      // Get booking with route details for response
      const bookingWithRoute = await BookingModel.findByIdWithRoute(bookingId);
      
      if (!bookingWithRoute) {
        throw new DatabaseError('Failed to retrieve updated booking with route details');
      }

      logger.info('Booking updated', { bookingId, userId, updateData });

      return {
        booking: bookingWithRoute,
        message: 'Booking updated successfully.'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error updating booking', { error, bookingId, userId });
      throw new DatabaseError('Failed to update booking', error);
    }
  }

  /**
   * Delete a booking (hard delete - for demo/admin purposes)
   */
  static async deleteBooking(bookingId: string, userId: string): Promise<{ message: string }> {
    try {
      // Get booking and verify ownership
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking');
      }

      if (booking.userId !== userId) {
        throw new ValidationError('You can only delete your own bookings');
      }

      // Only allow deletion of pending bookings
      if (booking.status !== BookingStatus.PENDING) {
        throw new ValidationError('Only pending bookings can be deleted');
      }

      await BookingModel.delete(bookingId);

      logger.info('Booking deleted', { bookingId, userId });

      return {
        message: 'Booking deleted successfully.'
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error deleting booking', { error, bookingId, userId });
      throw new DatabaseError('Failed to delete booking', error);
    }
  }
}