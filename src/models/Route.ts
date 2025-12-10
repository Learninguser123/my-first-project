import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { logger } from '../utils/logger';
import { 
  Route, 
  RouteType, 
  VehicleType, 
  GeoLocation, 
  RouteSegment,
  ApiResponse,
  AppError,
  DatabaseError 
} from '../types';

// Extended interfaces for route planning
export interface RouteRequest {
  origin: GeoLocation;
  destination: GeoLocation;
  departureTime?: Date;
  arrivalTime?: Date;
  preferences?: RoutePreferences;
}

export interface RoutePreferences {
  optimizeFor?: 'fastest' | 'cheapest' | 'most_sustainable';
  maxWalkingDistance?: number;
  wheelchairAccessible?: boolean;
  avoidTolls?: boolean;
  vehicleTypes?: VehicleType[];
}

export interface PlannedRoute extends Route {
  co2Emissions: number; // in grams
  carBaselineEmissions: number; // in grams
  co2Savings: number; // in grams
  pointsEarned: number;
  segments: PlannedRouteSegment[];
  sustainabilityScore: number; // 0-100
}

export interface PlannedRouteSegment extends RouteSegment {
  co2Emissions: number; // in grams
  price?: number;
  sustainabilityScore: number; // 0-100
}

export interface RouteSearchResult {
  routes: PlannedRoute[];
  metadata: {
    totalRoutes: number;
    searchTime: number;
    origin: GeoLocation;
    destination: GeoLocation;
  };
}

export class RouteModel {
  /**
   * Create a new route in the database
   */
  static async create(routeData: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    try {
      const id = uuidv4();
      const now = new Date();

      const sql = `
        INSERT INTO routes (
          id, name, type, start_point, end_point, waypoints,
          distance, duration, price, currency, vehicle_types,
          operator_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        id,
        routeData.name,
        routeData.type,
        JSON.stringify(routeData.startPoint),
        JSON.stringify(routeData.endPoint),
        JSON.stringify(routeData.waypoints),
        routeData.distance,
        routeData.duration,
        routeData.price,
        routeData.currency,
        JSON.stringify(routeData.vehicleTypes),
        routeData.operatorId,
        routeData.isActive,
        now,
        now
      ];

      const result = await query(sql, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create route');
      }

      const row = result.rows[0];
      return this.mapRowToRoute(row);
    } catch (error) {
      logger.error('Error creating route:', error);
      throw new DatabaseError('Failed to create route', error);
    }
  }

  /**
   * Find route by ID
   */
  static async findById(id: string): Promise<Route | null> {
    try {
      const sql = 'SELECT * FROM routes WHERE id = $1';
      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRoute(result.rows[0]);
    } catch (error) {
      logger.error('Error finding route by ID:', error);
      throw new DatabaseError('Failed to find route', error);
    }
  }

  /**
   * Find routes by user preferences and location
   */
  static async searchRoutes(request: RouteRequest): Promise<Route[]> {
    try {
      const { origin, destination, preferences } = request;
      
      // For now, return all active routes (in a real system, this would use geospatial queries)
      const sql = `
        SELECT * FROM routes 
        WHERE is_active = true 
        AND vehicle_types && $1
        ORDER BY duration ASC
        LIMIT 10
      `;

      const vehicleTypes = preferences?.vehicleTypes || Object.values(VehicleType);
      const result = await query(sql, [vehicleTypes]);

      return result.rows.map(row => this.mapRowToRoute(row));
    } catch (error) {
      logger.error('Error searching routes:', error);
      throw new DatabaseError('Failed to search routes', error);
    }
  }

  /**
   * Save planned route with CO2 and rewards data
   */
  static async savePlannedRoute(
    userId: string, 
    plannedRoute: PlannedRoute
  ): Promise<void> {
    try {
      await transaction(async (client) => {
        // Save the main route
        const routeSql = `
          INSERT INTO user_routes (
            id, user_id, route_id, origin, destination, distance,
            duration, price, co2_emissions, car_baseline_emissions,
            co2_savings, points_earned, sustainability_score, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        const routeId = uuidv4();
        const routeValues = [
          routeId,
          userId,
          plannedRoute.id,
          JSON.stringify(plannedRoute.startPoint),
          JSON.stringify(plannedRoute.endPoint),
          plannedRoute.distance,
          plannedRoute.duration,
          plannedRoute.price,
          plannedRoute.co2Emissions,
          plannedRoute.carBaselineEmissions,
          plannedRoute.co2Savings,
          plannedRoute.pointsEarned,
          plannedRoute.sustainabilityScore,
          new Date()
        ];

        await client.query(routeSql, routeValues);

        // Save route segments
        for (const segment of plannedRoute.segments) {
          const segmentSql = `
            INSERT INTO route_segments (
              id, user_route_id, vehicle_type, start_point, end_point,
              distance, duration, instructions, departure_time, arrival_time,
              vehicle_id, line_number, co2_emissions, price, sustainability_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `;

          const segmentValues = [
            uuidv4(),
            routeId,
            segment.vehicleType,
            JSON.stringify(segment.startPoint),
            JSON.stringify(segment.endPoint),
            segment.distance,
            segment.duration,
            JSON.stringify(segment.instructions),
            segment.departureTime,
            segment.arrivalTime,
            segment.vehicleId,
            segment.lineNumber,
            segment.co2Emissions,
            segment.price,
            segment.sustainabilityScore
          ];

          await client.query(segmentSql, segmentValues);
        }
      });
    } catch (error) {
      logger.error('Error saving planned route:', error);
      throw new DatabaseError('Failed to save planned route', error);
    }
  }

  /**
   * Get user's route history
   */
  static async getUserRoutes(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<{ routes: any[], total: number }> {
    try {
      const countSql = 'SELECT COUNT(*) FROM user_routes WHERE user_id = $1';
      const countResult = await query(countSql, [userId]);
      const total = parseInt(countResult.rows[0].count);

      const routesSql = `
        SELECT * FROM user_routes 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const routesResult = await query(routesSql, [userId, limit, offset]);

      return {
        routes: routesResult.rows,
        total
      };
    } catch (error) {
      logger.error('Error getting user routes:', error);
      throw new DatabaseError('Failed to get user routes', error);
    }
  }

  /**
   * Map database row to Route object
   */
  private static mapRowToRoute(row: any): Route {
    return {
      id: row.id,
      name: row.name,
      type: row.type as RouteType,
      startPoint: JSON.parse(row.start_point),
      endPoint: JSON.parse(row.end_point),
      waypoints: JSON.parse(row.waypoints || '[]'),
      distance: row.distance,
      duration: row.duration,
      price: row.price,
      currency: row.currency,
      vehicleTypes: JSON.parse(row.vehicle_types),
      operatorId: row.operator_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Calculate approximate distance between two points (Haversine formula)
   */
  static calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get route statistics for a user
   */
  static async getUserStatistics(userId: string): Promise<{
    totalRoutes: number;
    totalDistance: number;
    totalCO2Savings: number;
    totalPointsEarned: number;
    averageSustainabilityScore: number;
  }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_routes,
          SUM(distance) as total_distance,
          SUM(co2_savings) as total_co2_savings,
          SUM(points_earned) as total_points_earned,
          AVG(sustainability_score) as avg_sustainability_score
        FROM user_routes 
        WHERE user_id = $1
      `;

      const result = await query(sql, [userId]);
      const row = result.rows[0];

      return {
        totalRoutes: parseInt(row.total_routes) || 0,
        totalDistance: parseFloat(row.total_distance) || 0,
        totalCO2Savings: parseFloat(row.total_co2_savings) || 0,
        totalPointsEarned: parseInt(row.total_points_earned) || 0,
        averageSustainabilityScore: parseFloat(row.avg_sustainability_score) || 0
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw new DatabaseError('Failed to get user statistics', error);
    }
  }
}

export default RouteModel;