import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse, GeoLocation, RoutePreferences, JwtPayload } from '../types';
import RouteService, { RouteRequest } from '../services/RouteService';
import { RouteModel } from '../models/Route';
import CO2Service from '../services/CO2Service';
import RewardsService from '../services/RewardsService';

/**
 * Controller for handling route planning and related operations
 */
export class RouteController {
  /**
   * Find routes between origin and destination
   * POST /api/routes/search
   */
  static async searchRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, departureTime, arrivalTime, preferences } = req.body;

      // Validate required fields
      if (!origin || !destination) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Origin and destination are required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      // Validate coordinates
      if (!this.isValidCoordinates(origin) || !this.isValidCoordinates(destination)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid coordinates provided'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const routeRequest: RouteRequest = {
        origin,
        destination,
        departureTime: departureTime ? new Date(departureTime) : undefined,
        arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
        preferences
      };

      const result = await RouteService.findRoutes(routeRequest);

      logger.info('Routes found successfully', {
        userId: (req.user as JwtPayload)?.userId,
        origin,
        destination,
        totalRoutes: result.routes.length,
        searchTime: result.metadata.searchTime
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Found ${result.routes.length} routes`,
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error searching routes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROUTE_SEARCH_ERROR',
          message: 'Failed to search routes',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get details for a specific route
   * GET /api/routes/:routeId
   */
  static async getRouteDetails(req: Request, res: Response): Promise<void> {
    try {
      const { routeId } = req.params;

      if (!routeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route ID is required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const route = await RouteModel.findById(routeId);

      if (!route) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      logger.info('Route details retrieved', {
        userId: (req.user as JwtPayload)?.userId,
        routeId
      });

      res.status(200).json({
        success: true,
        data: route,
        message: 'Route details retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting route details:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROUTE_DETAILS_ERROR',
          message: 'Failed to get route details',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Save a planned route for the user
   * POST /api/routes/save
   */
  static async saveRoute(req: Request, res: Response): Promise<void> {
    try {
      const { route } = req.body;
      const userId = (req.user as JwtPayload)?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      if (!route) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route data is required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      await RouteModel.savePlannedRoute(userId, route);

      logger.info('Route saved successfully', {
        userId,
        routeId: route.id,
        co2Savings: route.co2Savings,
        pointsEarned: route.pointsEarned
      });

      res.status(201).json({
        success: true,
        data: {
          saved: true,
          pointsEarned: route.pointsEarned,
          co2Savings: route.co2Savings
        },
        message: 'Route saved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error saving route:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ROUTE_SAVE_ERROR',
          message: 'Failed to save route',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get user's route history
   * GET /api/routes/history
   */
  static async getUserRoutes(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as JwtPayload)?.userId;
      const { limit = 20, offset = 0 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);

      const result = await RouteModel.getUserRoutes(userId, limitNum, offsetNum);

      logger.info('User routes retrieved', {
        userId,
        limit: limitNum,
        offset: offsetNum,
        totalRoutes: result.total
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'User routes retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting user routes:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ROUTES_ERROR',
          message: 'Failed to get user routes',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get user's route statistics and sustainability impact
   * GET /api/routes/statistics
   */
  static async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as JwtPayload)?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const stats = await RouteModel.getUserStatistics(userId);

      // Calculate additional metrics
      const environmentalImpact = CO2Service.convertSavingsToImpact(stats.totalCO2Savings);
      const currentTier = RewardsService.getUserTier(stats.totalPointsEarned);
      const nextTier = RewardsService.getNextTier(stats.totalPointsEarned);
      const pointsToNextTier = RewardsService.getPointsToNextTier(stats.totalPointsEarned);

      const detailedStats = {
        ...stats,
        environmentalImpact,
        rewards: {
          currentTier,
          nextTier,
          pointsToNextTier,
          totalPoints: stats.totalPointsEarned
        },
        weeklyGoal: CO2Service.getWeeklyReductionGoal('medium')
      };

      logger.info('User statistics retrieved', {
        userId,
        totalRoutes: stats.totalRoutes,
        totalCO2Savings: stats.totalCO2Savings,
        totalPointsEarned: stats.totalPointsEarned
      });

      res.status(200).json({
        success: true,
        data: detailedStats,
        message: 'User statistics retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting user statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_STATISTICS_ERROR',
          message: 'Failed to get user statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get CO₂ information for vehicle types
   * GET /api/routes/co2-info
   */
  static async getCO2Info(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleType } = req.query;

      if (vehicleType) {
        // Get info for specific vehicle type
        const vehicleInfo = CO2Service.getVehicleCO2Info(vehicleType as any);
        
        res.status(200).json({
          success: true,
          data: vehicleInfo,
          message: 'Vehicle CO₂ information retrieved successfully',
          timestamp: new Date()
        } as ApiResponse);
      } else {
        // Get info for all vehicle types
        const { VehicleType } = require('../types');
        const allVehicleInfo = {};
        for (const vt of Object.values(VehicleType)) {
          allVehicleInfo[vt] = CO2Service.getVehicleCO2Info(vt);
        }

        res.status(200).json({
          success: true,
          data: allVehicleInfo,
          message: 'All vehicle CO₂ information retrieved successfully',
          timestamp: new Date()
        } as ApiResponse);
      }

    } catch (error) {
      logger.error('Error getting CO₂ info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CO2_INFO_ERROR',
          message: 'Failed to get CO₂ information',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get rewards and gamification information
   * GET /api/routes/rewards
   */
  static async getRewardsInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as JwtPayload)?.userId;
      const { type } = req.query;

      let response;

      switch (type) {
        case 'tiers':
          response = RewardsService.getAllTiers();
          break;

        case 'achievements':
          if (!userId) {
            res.status(401).json({
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'User authentication required for achievements'
              },
              timestamp: new Date()
            } as ApiResponse);
            return;
          }

          // Mock user stats for demo - in real system, this would come from database
          const mockUserStats = {
            totalDistance: 25000, // 25km
            totalCO2Savings: 8000, // 8kg
            tripsCompleted: 15,
            consistentDays: 7,
            vehicleTypesUsed: ['subway', 'bus', 'walking', 'e_bike'],
            earlyMorningTrips: 3,
            eveningTrips: 2
          };

          response = RewardsService.getUserAchievements(mockUserStats);
          break;

        case 'redemption':
          if (!userId) {
            res.status(401).json({
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'User authentication required for redemption options'
              },
              timestamp: new Date()
            } as ApiResponse);
            return;
          }

          // Mock user points for demo
          const mockUserPoints = 350;
          response = RewardsService.getRewardOptions(mockUserPoints);
          break;

        default:
          // Get user's current rewards info
          if (!userId) {
            res.status(401).json({
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'User authentication required'
              },
              timestamp: new Date()
            } as ApiResponse);
            return;
          }

          // Mock user points for demo
          const mockPoints = 350;
          const currentTier = RewardsService.getUserTier(mockPoints);
          const nextTier = RewardsService.getNextTier(mockPoints);
          const pointsToNextTier = RewardsService.getPointsToNextTier(mockPoints);

          response = {
            currentTier,
            nextTier,
            pointsToNextTier,
            totalPoints: mockPoints,
            weeklyChallenge: RewardsService.getWeeklyChallengeProgress({
              trips: 8,
              co2Savings: 6000,
              points: 120,
              sustainableDays: 4
            })
          };
          break;
      }

      res.status(200).json({
        success: true,
        data: response,
        message: 'Rewards information retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting rewards info:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REWARDS_INFO_ERROR',
          message: 'Failed to get rewards information',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get available Hamburg locations for demo
   * GET /api/routes/locations
   */
  static async getHamburgLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = RouteService.getHamburgLocations();

      res.status(200).json({
        success: true,
        data: locations,
        message: 'Hamburg locations retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting Hamburg locations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOCATIONS_ERROR',
          message: 'Failed to get Hamburg locations',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Get route suggestions based on user history
   * GET /api/routes/suggestions
   */
  static async getRouteSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as JwtPayload)?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      const suggestions = await RouteService.getRouteSuggestions(userId);

      res.status(200).json({
        success: true,
        data: { suggestions },
        message: 'Route suggestions retrieved successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error getting route suggestions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get route suggestions',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Calculate CO₂ emissions for a custom route
   * POST /api/routes/calculate-co2
   */
  static async calculateCO2(req: Request, res: Response): Promise<void> {
    try {
      const { segments, passengers = 1 } = req.body;

      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid segments array is required'
          },
          timestamp: new Date()
        } as ApiResponse);
        return;
      }

      // Validate each segment
      for (const segment of segments) {
        if (!segment.vehicleType || !segment.distance) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each segment must have vehicleType and distance'
            },
            timestamp: new Date()
          } as ApiResponse);
          return;
        }
      }

      const co2Calculation = CO2Service.calculateRouteEmissions(segments, passengers);

      // Calculate points for this route
      const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
      const totalDuration = segments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
      const points = RewardsService.calculatePoints(
        co2Calculation.savings,
        totalDuration,
        totalDistance,
        segments[0].vehicleType // Use first segment's vehicle type for points calculation
      );

      const result = {
        ...co2Calculation,
        points,
        passengers,
        environmentalImpact: CO2Service.convertSavingsToImpact(co2Calculation.savings)
      };

      res.status(200).json({
        success: true,
        data: result,
        message: 'CO₂ calculation completed successfully',
        timestamp: new Date()
      } as ApiResponse);

    } catch (error) {
      logger.error('Error calculating CO₂:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CO2_CALCULATION_ERROR',
          message: 'Failed to calculate CO₂ emissions',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      } as ApiResponse);
    }
  }

  /**
   * Validate coordinate format
   */
  private static isValidCoordinates(coords: GeoLocation): boolean {
    return (
      coords &&
      typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number' &&
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      coords.longitude >= -180 &&
      coords.longitude <= 180
    );
  }
}

export default RouteController;