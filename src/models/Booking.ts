import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { 
  Booking, 
  BookingStatus, 
  PaymentStatus, 
  CreateBookingRequest, 
  UpdateBookingRequest,
  DatabaseError, 
  NotFoundError, 
  ValidationError 
} from '../types';
import { logger } from '../utils/logger';

export interface BookingWithRoute extends Booking {
  route?: {
    id: string;
    name: string;
    startPoint: any;
    endPoint: any;
    distance: number;
    duration: number;
  };
}

export class BookingModel {
  /**
   * Create a new booking in the database
   */
  static async create(bookingData: CreateBookingRequest): Promise<Booking> {
    try {
      const { 
        userId, 
        routeId, 
        startTime, 
        endTime, 
        totalPrice, 
        currency, 
        passengers, 
        specialRequests 
      } = bookingData;

      const bookingId = uuidv4();
      const now = new Date();

      const createQuery = `
        INSERT INTO bookings (
          id, user_id, route_id, status, start_time, end_time, 
          total_price, currency, payment_status, passengers, 
          points_earned, special_requests, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, user_id, route_id, status, start_time, end_time,
                  total_price, currency, payment_status, passengers,
                  points_earned, special_requests, created_at, updated_at
      `;

      const result = await query(createQuery, [
        bookingId, 
        userId, 
        routeId, 
        BookingStatus.PENDING, 
        startTime, 
        endTime,
        totalPrice, 
        currency, 
        PaymentStatus.PENDING, 
        passengers,
        0, // points_earned starts at 0
        specialRequests && specialRequests.length > 0 ? specialRequests : null,
        now, 
        now
      ]);

      const booking = result.rows[0];
      
      logger.info('Booking created', { bookingId, userId, routeId });
      
      return {
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      } as Booking;
    } catch (error) {
      logger.error('Error creating booking', { error, bookingData });
      throw new DatabaseError('Failed to create booking', error);
    }
  }

  /**
   * Find booking by ID
   */
  static async findById(id: string): Promise<Booking | null> {
    try {
      const queryText = `
        SELECT id, user_id, route_id, status, start_time, end_time,
               total_price, currency, payment_status, passengers,
               points_earned, special_requests, created_at, updated_at
        FROM bookings 
        WHERE id = $1
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const booking = result.rows[0];
      
      return {
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      } as Booking;
    } catch (error) {
      logger.error('Error finding booking by ID', { error, bookingId: id });
      throw new DatabaseError('Failed to find booking', error);
    }
  }

  /**
   * Find booking by ID with route information
   */
  static async findByIdWithRoute(id: string): Promise<BookingWithRoute | null> {
    try {
      const queryText = `
        SELECT b.id, b.user_id, b.route_id, b.status, b.start_time, b.end_time,
               b.total_price, b.currency, b.payment_status, b.passengers,
               b.points_earned, b.special_requests, b.created_at, b.updated_at,
               r.name as route_name, r.start_point, r.end_point, 
               r.distance, r.duration
        FROM bookings b
        LEFT JOIN routes r ON b.route_id = r.id
        WHERE b.id = $1
      `;

      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const booking = result.rows[0];
      
      return {
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
        route: booking.route_id ? {
          id: booking.route_id,
          name: booking.route_name,
          startPoint: booking.start_point,
          endPoint: booking.end_point,
          distance: booking.distance,
          duration: booking.duration,
        } : undefined,
      } as BookingWithRoute;
    } catch (error) {
      logger.error('Error finding booking with route by ID', { error, bookingId: id });
      throw new DatabaseError('Failed to find booking with route', error);
    }
  }

  /**
   * Update booking information
   */
  static async update(id: string, updateData: UpdateBookingRequest): Promise<Booking> {
    try {
      const existingBooking = await this.findById(id);
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }

      const { status, paymentStatus, pointsEarned, specialRequests } = updateData;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (paymentStatus !== undefined) {
        updates.push(`payment_status = $${paramIndex++}`);
        values.push(paymentStatus);
      }
      if (pointsEarned !== undefined) {
        updates.push(`points_earned = $${paramIndex++}`);
        values.push(pointsEarned);
      }
      if (specialRequests !== undefined) {
        updates.push(`special_requests = $${paramIndex++}`);
        values.push(specialRequests && specialRequests.length > 0 ? specialRequests : null);
      }

      if (updates.length === 0) {
        return existingBooking;
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(id);

      const updateQuery = `
        UPDATE bookings 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, user_id, route_id, status, start_time, end_time,
                  total_price, currency, payment_status, passengers,
                  points_earned, special_requests, created_at, updated_at
      `;

      const result = await query(updateQuery, values);
      const booking = result.rows[0];
      
      logger.info('Booking updated', { bookingId: id, updateData });
      
      return {
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      } as Booking;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating booking', { error, bookingId: id });
      throw new DatabaseError('Failed to update booking', error);
    }
  }

  /**
   * Get bookings by user ID with pagination
   */
  static async findByUserId(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    filters?: { status?: BookingStatus }
  ): Promise<{ bookings: Booking[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const whereConditions: string[] = ['user_id = $1'];
      const queryParams: any[] = [userId];
      let paramIndex = 2;

      if (filters?.status) {
        whereConditions.push(`status = $${paramIndex++}`);
        queryParams.push(filters.status);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM bookings WHERE ${whereClause}`;
      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get bookings
      queryParams.push(limit, offset);
      const bookingsQuery = `
        SELECT id, user_id, route_id, status, start_time, end_time,
               total_price, currency, payment_status, passengers,
               points_earned, special_requests, created_at, updated_at
        FROM bookings 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const bookingsResult = await query(bookingsQuery, queryParams);
      
      const bookings = bookingsResult.rows.map(booking => ({
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      })) as Booking[];

      return { bookings, total };
    } catch (error) {
      logger.error('Error finding bookings by user', { error, userId, page, limit });
      throw new DatabaseError('Failed to find bookings by user', error);
    }
  }

  /**
   * Get active bookings for a user
   */
  static async findActiveByUserId(userId: string): Promise<Booking[]> {
    try {
      const queryText = `
        SELECT id, user_id, route_id, status, start_time, end_time,
               total_price, currency, payment_status, passengers,
               points_earned, special_requests, created_at, updated_at
        FROM bookings 
        WHERE user_id = $1 AND status IN ($2, $3)
        ORDER BY start_time ASC
      `;

      const result = await query(queryText, [
        userId, 
        BookingStatus.CONFIRMED, 
        BookingStatus.IN_PROGRESS
      ]);
      
      return result.rows.map(booking => ({
        id: booking.id,
        userId: booking.user_id,
        routeId: booking.route_id,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: parseFloat(booking.total_price),
        currency: booking.currency,
        paymentStatus: booking.payment_status,
        passengers: booking.passengers,
        pointsEarned: booking.points_earned,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      })) as Booking[];
    } catch (error) {
      logger.error('Error finding active bookings by user', { error, userId });
      throw new DatabaseError('Failed to find active bookings by user', error);
    }
  }

  /**
   * Get completed bookings for trip history
   */
  static async findCompletedByUserId(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ bookings: Booking[]; total: number }> {
    return this.findByUserId(userId, page, limit, { status: BookingStatus.COMPLETED });
  }

  /**
   * Cancel a booking
   */
  static async cancel(id: string): Promise<Booking> {
    try {
      const existingBooking = await this.findById(id);
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }

      if (existingBooking.status === BookingStatus.COMPLETED) {
        throw new ValidationError('Cannot cancel a completed booking');
      }

      if (existingBooking.status === BookingStatus.CANCELLED) {
        throw new ValidationError('Booking is already cancelled');
      }

      return await this.update(id, { status: BookingStatus.CANCELLED });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error cancelling booking', { error, bookingId: id });
      throw new DatabaseError('Failed to cancel booking', error);
    }
  }

  /**
   * Start a trip (change status to in_progress)
   */
  static async startTrip(id: string): Promise<Booking> {
    try {
      const existingBooking = await this.findById(id);
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }

      if (existingBooking.status !== BookingStatus.CONFIRMED) {
        throw new ValidationError('Trip can only be started from confirmed status');
      }

      return await this.update(id, { status: BookingStatus.IN_PROGRESS });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error starting trip', { error, bookingId: id });
      throw new DatabaseError('Failed to start trip', error);
    }
  }

  /**
   * Complete a trip and award points
   */
  static async completeTrip(id: string, pointsEarned: number): Promise<Booking> {
    try {
      const existingBooking = await this.findById(id);
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }

      if (existingBooking.status !== BookingStatus.IN_PROGRESS) {
        throw new ValidationError('Trip can only be completed from in_progress status');
      }

      return await this.update(id, { 
        status: BookingStatus.COMPLETED, 
        pointsEarned,
        paymentStatus: PaymentStatus.PAID 
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error completing trip', { error, bookingId: id });
      throw new DatabaseError('Failed to complete trip', error);
    }
  }

  /**
   * Delete a booking (hard delete)
   */
  static async delete(id: string): Promise<void> {
    try {
      const existingBooking = await this.findById(id);
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }

      const deleteQuery = `DELETE FROM bookings WHERE id = $1`;
      await query(deleteQuery, [id]);
      
      logger.info('Booking deleted', { bookingId: id });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting booking', { error, bookingId: id });
      throw new DatabaseError('Failed to delete booking', error);
    }
  }

  /**
   * Get booking statistics for a user
   */
  static async getUserStats(userId: string): Promise<{
    totalBookings: number;
    completedTrips: number;
    cancelledTrips: number;
    totalPointsEarned: number;
    upcomingTrips: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
          COALESCE(SUM(points_earned), 0) as total_points_earned,
          COUNT(CASE WHEN status IN ('confirmed', 'in_progress') THEN 1 END) as upcoming_trips
        FROM bookings 
        WHERE user_id = $1
      `;

      const result = await query(statsQuery, [userId]);
      const stats = result.rows[0];

      return {
        totalBookings: parseInt(stats.total_bookings),
        completedTrips: parseInt(stats.completed_trips),
        cancelledTrips: parseInt(stats.cancelled_trips),
        totalPointsEarned: parseInt(stats.total_points_earned),
        upcomingTrips: parseInt(stats.upcoming_trips),
      };
    } catch (error) {
      logger.error('Error getting user booking stats', { error, userId });
      throw new DatabaseError('Failed to get user booking stats', error);
    }
  }
}