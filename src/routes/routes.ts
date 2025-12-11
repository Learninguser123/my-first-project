import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import RouteController from '../controllers/RouteController';

const router = Router();

// Route planning endpoints
router.post('/search', [
  body('origin')
    .isObject()
    .withMessage('Origin must be a valid coordinate object'),
  body('origin.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Origin latitude must be between -90 and 90'),
  body('origin.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Origin longitude must be between -180 and 180'),
  body('destination')
    .isObject()
    .withMessage('Destination must be a valid coordinate object'),
  body('destination.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Destination latitude must be between -90 and 90'),
  body('destination.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Destination longitude must be between -180 and 180'),
  body('departureTime')
    .optional()
    .isISO8601()
    .withMessage('Departure time must be a valid ISO 8601 date'),
  body('arrivalTime')
    .optional()
    .isISO8601()
    .withMessage('Arrival time must be a valid ISO 8601 date'),
  body('preferences.optimizeFor')
    .optional()
    .isIn(['fastest', 'cheapest', 'most_sustainable'])
    .withMessage('Optimization preference must be fastest, cheapest, or most_sustainable'),
  body('preferences.maxWalkingDistance')
    .optional()
    .isInt({ min: 0, max: 5000 })
    .withMessage('Max walking distance must be between 0 and 5000 meters'),
  body('preferences.wheelchairAccessible')
    .optional()
    .isBoolean()
    .withMessage('Wheelchair accessible preference must be boolean'),
  body('preferences.vehicleTypes')
    .optional()
    .isArray()
    .withMessage('Vehicle types must be an array'),
  validateRequest
], RouteController.searchRoutes);

// Route details
router.get('/:routeId', [
  param('routeId')
    .isUUID()
    .withMessage('Route ID must be a valid UUID'),
  validateRequest
], RouteController.getRouteDetails);

// Save planned route
router.post('/save', [
  authenticateToken,
  body('route')
    .isObject()
    .withMessage('Route data is required'),
  body('route.id')
    .isUUID()
    .withMessage('Route ID must be a valid UUID'),
  body('route.name')
    .notEmpty()
    .withMessage('Route name is required'),
  body('route.startPoint')
    .isObject()
    .withMessage('Route start point is required'),
  body('route.endPoint')
    .isObject()
    .withMessage('Route end point is required'),
  body('route.distance')
    .isInt({ min: 0 })
    .withMessage('Route distance must be a non-negative integer'),
  body('route.duration')
    .isInt({ min: 0 })
    .withMessage('Route duration must be a non-negative integer'),
  body('route.co2Emissions')
    .isInt({ min: 0 })
    .withMessage('CO₂ emissions must be a non-negative integer'),
  body('route.pointsEarned')
    .isInt({ min: 0 })
    .withMessage('Points earned must be a non-negative integer'),
  validateRequest
], RouteController.saveRoute);

// User route history
router.get('/history', [
  authenticateToken,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  validateRequest
], RouteController.getUserRoutes);

// User statistics and sustainability impact
router.get('/statistics', [
  authenticateToken
], RouteController.getUserStatistics);

// CO₂ information
router.get('/co2-info', [
  query('vehicleType')
    .optional()
    .isIn(['bus', 'tram', 'subway', 'train', 'ferry', 'taxi', 'e_bike', 'e_scooter', 'car_sharing', 'walking'])
    .withMessage('Invalid vehicle type'),
  validateRequest
], RouteController.getCO2Info);

// Calculate CO₂ for custom route
router.post('/calculate-co2', [
  body('segments')
    .isArray({ min: 1 })
    .withMessage('At least one segment is required'),
  body('segments.*.vehicleType')
    .isIn(['bus', 'tram', 'subway', 'train', 'ferry', 'taxi', 'e_bike', 'e_scooter', 'car_sharing', 'walking'])
    .withMessage('Invalid vehicle type in segment'),
  body('segments.*.distance')
    .isInt({ min: 0 })
    .withMessage('Segment distance must be a non-negative integer'),
  body('segments.*.duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Segment duration must be a non-negative integer'),
  body('passengers')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of passengers must be between 1 and 10'),
  validateRequest
], RouteController.calculateCO2);

// Rewards information
router.get('/rewards', [
  authenticateToken,
  query('type')
    .optional()
    .isIn(['tiers', 'achievements', 'redemption'])
    .withMessage('Rewards type must be tiers, achievements, or redemption'),
  validateRequest
], RouteController.getRewardsInfo);

// Hamburg demo locations
router.get('/locations', RouteController.getHamburgLocations);

// Route suggestions (requires authentication)
router.get('/suggestions', [
  authenticateToken
], RouteController.getRouteSuggestions);

export default router;