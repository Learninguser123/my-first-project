import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  VehicleType, 
  GeoLocation, 
  RouteSegment, 
  PlannedRoute, 
  PlannedRouteSegment,
  RouteRequest,
  RoutePreferences,
  RouteSearchResult
} from '../types';
import { RouteModel } from '../models/Route';
import CO2Service from './CO2Service';
import RewardsService from './RewardsService';

// Mock Hamburg location data for demo purposes
const HAMBURG_LOCATIONS = {
  hauptbahnhof: {
    name: 'Hamburg Hauptbahnhof',
    coords: { latitude: 53.5527, longitude: 10.0068 }
  },
  altona: {
    name: 'Hamburg-Altona',
    coords: { latitude: 53.5503, longitude: 9.9333 }
  },
  st_pauli: {
    name: 'St. Pauli',
    coords: { latitude: 53.5495, longitude: 9.9695 }
  },
  uhlenhorst: {
    name: 'Uhlenhorst',
    coords: { latitude: 53.5679, longitude: 10.0229 }
  },
  eppendorf: {
    name: 'Eppendorf',
    coords: { latitude: 53.5932, longitude: 9.9871 }
  },
  winterhude: {
    name: 'Winterhude',
    coords: { latitude: 53.5967, longitude: 10.0087 }
  },
  harburg: {
    name: 'Harburg',
    coords: { latitude: 53.4587, longitude: 9.9798 }
  },
  bergedorf: {
    name: 'Bergedorf',
    coords: { latitude: 53.4859, longitude: 10.2163 }
  },
  airport: {
    name: 'Hamburg Airport (HAM)',
    coords: { latitude: 53.6304, longitude: 9.9883 }
  },
  landungsbrucken: {
    name: 'Landungsbrücken',
    coords: { latitude: 53.5465, longitude: 9.9697 }
  }
};

// Mock public transport lines
const HVV_LINES = {
  U1: { type: VehicleType.SUBWAY, color: '#0066CC' },
  U2: { type: VehicleType.SUBWAY, color: '#DB0000' },
  U3: { type: VehicleType.SUBWAY, color: '#FFD700' },
  U4: { type: VehicleType.SUBWAY, color: '#00A652' },
  S1: { type: VehicleType.TRAIN, color: '#0080C0' },
  S2: { type: VehicleType.TRAIN, color: '#80FF00' },
  S3: { type: VehicleType.TRAIN, color: '#DE3163' },
  S11: { type: VehicleType.TRAIN, color: '#FF8C00' },
  S21: { type: VehicleType.TRAIN, color: '#9370DB' },
  S31: { type: VehicleType.TRAIN, color: '#20B2AA' },
  BUS3: { type: VehicleType.BUS, color: '#DC143C' },
  BUS6: { type: VehicleType.BUS, color: '#FF1493' },
  BUS15: { type: VehicleType.BUS, color: '#32CD32' },
  BUS35: { type: VehicleType.BUS, color: '#FFD700' }
};

// Mock route templates between key Hamburg locations
const MOCK_ROUTES = [
  {
    from: 'hauptbahnhof',
    to: 'altona',
    routes: [
      {
        name: 'Fast Route - U-Bahn',
        segments: [
          {
            type: VehicleType.WALKING,
            distance: 200,
            duration: 180,
            instructions: ['Walk to U-Bahn station'],
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords
          },
          {
            type: VehicleType.SUBWAY,
            distance: 6800,
            duration: 720,
            instructions: ['Take U2 towards Niendorf Nord', '2 stops to Altona'],
            lineNumber: 'U2',
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.altona.coords,
            price: 3.20
          },
          {
            type: VehicleType.WALKING,
            distance: 150,
            duration: 120,
            instructions: ['Walk to destination'],
            startPoint: HAMBURG_LOCATIONS.altona.coords,
            endPoint: HAMBURG_LOCATIONS.altona.coords
          }
        ],
        totalDuration: 1020,
        totalDistance: 7150,
        price: 3.20
      },
      {
        name: 'Scenic Route - S-Bahn',
        segments: [
          {
            type: VehicleType.WALKING,
            distance: 200,
            duration: 180,
            instructions: ['Walk to S-Bahn station'],
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords
          },
          {
            type: VehicleType.TRAIN,
            distance: 8500,
            duration: 960,
            instructions: ['Take S21 towards Elbgaustraße', '4 stops to Altona'],
            lineNumber: 'S21',
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.altona.coords,
            price: 3.20
          },
          {
            type: VehicleType.WALKING,
            distance: 100,
            duration: 90,
            instructions: ['Walk to destination'],
            startPoint: HAMBURG_LOCATIONS.altona.coords,
            endPoint: HAMBURG_LOCATIONS.altona.coords
          }
        ],
        totalDuration: 1230,
        totalDistance: 8800,
        price: 3.20
      },
      {
        name: 'Sustainable - E-Bike',
        segments: [
          {
            type: VehicleType.E_BIKE,
            distance: 7200,
            duration: 1200,
            instructions: ['Take E-Bike along the Elbe', 'Scenic route through parks'],
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.altona.coords,
            price: 4.50
          }
        ],
        totalDuration: 1200,
        totalDistance: 7200,
        price: 4.50
      }
    ]
  },
  {
    from: 'hauptbahnhof',
    to: 'airport',
    routes: [
      {
        name: 'Direct - S-Bahn',
        segments: [
          {
            type: VehicleType.WALKING,
            distance: 150,
            duration: 120,
            instructions: ['Walk to S-Bahn platform'],
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords
          },
          {
            type: VehicleType.TRAIN,
            distance: 11200,
            duration: 1500,
            instructions: ['Take S1 towards Airport', '25 minutes to airport'],
            lineNumber: 'S1',
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.airport.coords,
            price: 3.80
          }
        ],
        totalDuration: 1620,
        totalDistance: 11350,
        price: 3.80
      },
      {
        name: 'Comfort - Taxi',
        segments: [
          {
            type: VehicleType.TAXI,
            distance: 11000,
            duration: 1200,
            instructions: ['Direct taxi to Hamburg Airport'],
            startPoint: HAMBURG_LOCATIONS.hauptbahnhof.coords,
            endPoint: HAMBURG_LOCATIONS.airport.coords,
            price: 35.00
          }
        ],
        totalDuration: 1200,
        totalDistance: 11000,
        price: 35.00
      }
    ]
  },
  {
    from: 'st_pauli',
    to: 'winterhude',
    routes: [
      {
        name: 'Mixed - Bus + Walking',
        segments: [
          {
            type: VehicleType.WALKING,
            distance: 300,
            duration: 240,
            instructions: ['Walk to bus stop'],
            startPoint: HAMBURG_LOCATIONS.st_pauli.coords,
            endPoint: { latitude: 53.5485, longitude: 9.9695 }
          },
          {
            type: VehicleType.BUS,
            distance: 4800,
            duration: 1080,
            instructions: ['Take Bus 6 towards Alstertal', '12 stops to Winterhude'],
            lineNumber: 'BUS6',
            startPoint: { latitude: 53.5485, longitude: 9.9695 },
            endPoint: { latitude: 53.5950, longitude: 10.0080 },
            price: 3.20
          },
          {
            type: VehicleType.WALKING,
            distance: 200,
            duration: 180,
            instructions: ['Short walk to destination'],
            startPoint: { latitude: 53.5950, longitude: 10.0080 },
            endPoint: HAMBURG_LOCATIONS.winterhude.coords
          }
        ],
        totalDuration: 1500,
        totalDistance: 5300,
        price: 3.20
      },
      {
        name: 'Eco - E-Scooter',
        segments: [
          {
            type: VehicleType.E_SCOOTER,
            distance: 5200,
            duration: 960,
            instructions: ['Take E-Scooter through city center', 'Pass by Planten un Blomen park'],
            startPoint: HAMBURG_LOCATIONS.st_pauli.coords,
            endPoint: HAMBURG_LOCATIONS.winterhude.coords,
            price: 3.00
          }
        ],
        totalDuration: 960,
        totalDistance: 5200,
        price: 3.00
      }
    ]
  }
];

export class RouteService {
  /**
   * Find routes between origin and destination
   */
  static async findRoutes(request: RouteRequest): Promise<RouteSearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Finding routes', {
        origin: request.origin,
        destination: request.destination,
        preferences: request.preferences
      });

      // Check if this is a predefined Hamburg route
      const mockRoutes = this.findMockRoutes(request.origin, request.destination);
      
      if (mockRoutes.length > 0) {
        // Convert mock routes to PlannedRoute objects
        const plannedRoutes = await Promise.all(
          mockRoutes.map(mockRoute => this.convertMockToPlannedRoute(mockRoute, request))
        );

        // Sort routes based on user preferences
        const sortedRoutes = this.sortRoutesByPreferences(plannedRoutes, request.preferences);

        const searchTime = Date.now() - startTime;
        
        return {
          routes: sortedRoutes,
          metadata: {
            totalRoutes: sortedRoutes.length,
            searchTime,
            origin: request.origin,
            destination: request.destination
          }
        };
      }

      // Fallback: Generate generic routes for any location
      const genericRoutes = await this.generateGenericRoutes(request);
      
      const searchTime = Date.now() - startTime;
      
      return {
        routes: genericRoutes,
        metadata: {
          totalRoutes: genericRoutes.length,
          searchTime,
          origin: request.origin,
          destination: request.destination
        }
      };
    } catch (error) {
      logger.error('Error finding routes:', error);
      throw new Error(`Failed to find routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find predefined mock routes for Hamburg locations
   */
  private static findMockRoutes(origin: GeoLocation, destination: GeoLocation): any[] {
    // Simple proximity check to find matching locations
    const findLocationKey = (coords: GeoLocation): string | null => {
      for (const [key, location] of Object.entries(HAMBURG_LOCATIONS)) {
        const distance = RouteModel.calculateDistance(coords, location.coords);
        if (distance < 500) { // Within 500 meters
          return key;
        }
      }
      return null;
    };

    const fromKey = findLocationKey(origin);
    const toKey = findLocationKey(destination);

    if (fromKey && toKey) {
      // Check direct routes
      const directRoute = MOCK_ROUTES.find(route => 
        (route.from === fromKey && route.to === toKey) ||
        (route.from === toKey && route.to === fromKey)
      );

      if (directRoute) {
        // Reverse routes if needed
        if (directRoute.to === fromKey) {
          return directRoute.routes.map(route => this.reverseRoute(route, origin, destination));
        }
        return directRoute.routes;
      }
    }

    return [];
  }

  /**
   * Convert mock route data to PlannedRoute with CO2 calculations
   */
  private static async convertMockToPlannedRoute(
    mockRoute: any,
    request: RouteRequest
  ): Promise<PlannedRoute> {
    const segments: PlannedRouteSegment[] = mockRoute.segments.map((segment: any) => ({
      id: uuidv4(),
      routeId: '', // Will be set later
      vehicleType: segment.type,
      startPoint: segment.startPoint,
      endPoint: segment.endPoint,
      distance: segment.distance,
      duration: segment.duration,
      instructions: segment.instructions,
      departureTime: request.departureTime || new Date(),
      arrivalTime: request.arrivalTime || new Date(Date.now() + segment.duration * 1000),
      vehicleId: segment.lineNumber ? `${segment.type}_${segment.lineNumber}` : undefined,
      lineNumber: segment.lineNumber,
      co2Emissions: 0, // Will be calculated
      price: segment.price,
      sustainabilityScore: 0 // Will be calculated
    }));

    // Calculate CO2 emissions
    const co2Calculation = CO2Service.calculateRouteEmissions(segments);
    
    // Calculate rewards points
    const pointsEarned = RewardsService.calculatePoints(co2Calculation.savings, mockRoute.totalDuration);

    return {
      id: uuidv4(),
      name: mockRoute.name,
      type: this.determineRouteType(segments),
      startPoint: request.origin,
      endPoint: request.destination,
      waypoints: [],
      distance: mockRoute.totalDistance,
      duration: mockRoute.totalDuration,
      price: mockRoute.price || 0,
      currency: 'EUR',
      vehicleTypes: [...new Set(segments.map(s => s.vehicleType))],
      operatorId: 'hvv-demo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      co2Emissions: co2Calculation.emissions,
      carBaselineEmissions: co2Calculation.baselineEmissions,
      co2Savings: co2Calculation.savings,
      pointsEarned,
      segments,
      sustainabilityScore: co2Calculation.sustainabilityScore
    };
  }

  /**
   * Generate generic routes for any location (fallback)
   */
  private static async generateGenericRoutes(request: RouteRequest): Promise<PlannedRoute[]> {
    const distance = RouteModel.calculateDistance(request.origin, request.destination);
    const routes: PlannedRoute[] = [];

    // Route 1: Public Transport (fastest)
    if (distance > 1000) {
      const publicTransportDuration = Math.round(distance * 3.6); // ~3.6 min per km
      const publicTransportRoute = await this.createPublicTransportRoute(request, distance, publicTransportDuration, 'Fastest Public Transport');
      routes.push(publicTransportRoute);
    }

    // Route 2: E-Bike (balanced)
    if (distance > 500 && distance < 15000) {
      const bikeDuration = Math.round(distance * 2.4); // ~2.4 min per km
      const bikeRoute = await this.createEBikeRoute(request, distance, bikeDuration, 'E-Bike Route');
      routes.push(bikeRoute);
    }

    // Route 3: Walking (short distances)
    if (distance < 3000) {
      const walkingDuration = Math.round(distance * 7.2); // ~7.2 min per km (12 min per mile)
      const walkingRoute = await this.createWalkingRoute(request, distance, walkingDuration, 'Walking Route');
      routes.push(walkingRoute);
    }

    // Route 4: E-Scooter (medium distances)
    if (distance > 800 && distance < 8000) {
      const scooterDuration = Math.round(distance * 2.0); // ~2 min per km
      const scooterRoute = await this.createEScooterRoute(request, distance, scooterDuration, 'E-Scooter Route');
      routes.push(scooterRoute);
    }

    // Sort by user preferences
    return this.sortRoutesByPreferences(routes, request.preferences);
  }

  /**
   * Create public transport route
   */
  private static async createPublicTransportRoute(
    request: RouteRequest,
    distance: number,
    duration: number,
    name: string
  ): Promise<PlannedRoute> {
    const segments: PlannedRouteSegment[] = [
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.WALKING,
        startPoint: request.origin,
        endPoint: { latitude: request.origin.latitude + 0.001, longitude: request.origin.longitude + 0.001 },
        distance: 200,
        duration: 180,
        instructions: ['Walk to public transport stop'],
        departureTime: request.departureTime || new Date(),
        co2Emissions: 0,
        price: 0,
        sustainabilityScore: 0
      },
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.SUBWAY,
        startPoint: { latitude: request.origin.latitude + 0.001, longitude: request.origin.longitude + 0.001 },
        endPoint: { latitude: request.destination.latitude - 0.001, longitude: request.destination.longitude - 0.001 },
        distance: distance - 400,
        duration: duration - 360,
        instructions: ['Take public transport towards destination'],
        lineNumber: 'U1',
        departureTime: new Date((request.departureTime?.getTime() || Date.now()) + 180000),
        co2Emissions: 0,
        price: 3.20,
        sustainabilityScore: 0
      },
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.WALKING,
        startPoint: { latitude: request.destination.latitude - 0.001, longitude: request.destination.longitude - 0.001 },
        endPoint: request.destination,
        distance: 200,
        duration: 180,
        instructions: ['Walk to destination'],
        departureTime: new Date((request.departureTime?.getTime() || Date.now()) + (duration - 180) * 1000),
        co2Emissions: 0,
        price: 0,
        sustainabilityScore: 0
      }
    ];

    const co2Calculation = CO2Service.calculateRouteEmissions(segments);
    const pointsEarned = RewardsService.calculatePoints(co2Calculation.savings, duration);

    return {
      id: uuidv4(),
      name,
      type: 'public_transport' as any,
      startPoint: request.origin,
      endPoint: request.destination,
      waypoints: [],
      distance,
      duration,
      price: 3.20,
      currency: 'EUR',
      vehicleTypes: [VehicleType.WALKING, VehicleType.SUBWAY],
      operatorId: 'hvv-demo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      co2Emissions: co2Calculation.emissions,
      carBaselineEmissions: co2Calculation.baselineEmissions,
      co2Savings: co2Calculation.savings,
      pointsEarned,
      segments,
      sustainabilityScore: co2Calculation.sustainabilityScore
    };
  }

  /**
   * Create E-Bike route
   */
  private static async createEBikeRoute(
    request: RouteRequest,
    distance: number,
    duration: number,
    name: string
  ): Promise<PlannedRoute> {
    const segments: PlannedRouteSegment[] = [
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.E_BIKE,
        startPoint: request.origin,
        endPoint: request.destination,
        distance,
        duration,
        instructions: ['Take E-Bike route to destination'],
        departureTime: request.departureTime || new Date(),
        co2Emissions: 0,
        price: 4.50,
        sustainabilityScore: 0
      }
    ];

    const co2Calculation = CO2Service.calculateRouteEmissions(segments);
    const pointsEarned = RewardsService.calculatePoints(co2Calculation.savings, duration);

    return {
      id: uuidv4(),
      name,
      type: 'shared_mobility' as any,
      startPoint: request.origin,
      endPoint: request.destination,
      waypoints: [],
      distance,
      duration,
      price: 4.50,
      currency: 'EUR',
      vehicleTypes: [VehicleType.E_BIKE],
      operatorId: 'hvv-demo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      co2Emissions: co2Calculation.emissions,
      carBaselineEmissions: co2Calculation.baselineEmissions,
      co2Savings: co2Calculation.savings,
      pointsEarned,
      segments,
      sustainabilityScore: co2Calculation.sustainabilityScore
    };
  }

  /**
   * Create walking route
   */
  private static async createWalkingRoute(
    request: RouteRequest,
    distance: number,
    duration: number,
    name: string
  ): Promise<PlannedRoute> {
    const segments: PlannedRouteSegment[] = [
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.WALKING,
        startPoint: request.origin,
        endPoint: request.destination,
        distance,
        duration,
        instructions: ['Walk to destination'],
        departureTime: request.departureTime || new Date(),
        co2Emissions: 0,
        price: 0,
        sustainabilityScore: 0
      }
    ];

    const co2Calculation = CO2Service.calculateRouteEmissions(segments);
    const pointsEarned = RewardsService.calculatePoints(co2Calculation.savings, duration);

    return {
      id: uuidv4(),
      name,
      type: 'walking' as any,
      startPoint: request.origin,
      endPoint: request.destination,
      waypoints: [],
      distance,
      duration,
      price: 0,
      currency: 'EUR',
      vehicleTypes: [VehicleType.WALKING],
      operatorId: 'hvv-demo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      co2Emissions: co2Calculation.emissions,
      carBaselineEmissions: co2Calculation.baselineEmissions,
      co2Savings: co2Calculation.savings,
      pointsEarned,
      segments,
      sustainabilityScore: co2Calculation.sustainabilityScore
    };
  }

  /**
   * Create E-Scooter route
   */
  private static async createEScooterRoute(
    request: RouteRequest,
    distance: number,
    duration: number,
    name: string
  ): Promise<PlannedRoute> {
    const segments: PlannedRouteSegment[] = [
      {
        id: uuidv4(),
        routeId: '',
        vehicleType: VehicleType.E_SCOOTER,
        startPoint: request.origin,
        endPoint: request.destination,
        distance,
        duration,
        instructions: ['Take E-Scooter route to destination'],
        departureTime: request.departureTime || new Date(),
        co2Emissions: 0,
        price: 3.00,
        sustainabilityScore: 0
      }
    ];

    const co2Calculation = CO2Service.calculateRouteEmissions(segments);
    const pointsEarned = RewardsService.calculatePoints(co2Calculation.savings, duration);

    return {
      id: uuidv4(),
      name,
      type: 'shared_mobility' as any,
      startPoint: request.origin,
      endPoint: request.destination,
      waypoints: [],
      distance,
      duration,
      price: 3.00,
      currency: 'EUR',
      vehicleTypes: [VehicleType.E_SCOOTER],
      operatorId: 'hvv-demo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      co2Emissions: co2Calculation.emissions,
      carBaselineEmissions: co2Calculation.baselineEmissions,
      co2Savings: co2Calculation.savings,
      pointsEarned,
      segments,
      sustainabilityScore: co2Calculation.sustainabilityScore
    };
  }

  /**
   * Determine route type based on vehicle types
   */
  private static determineRouteType(segments: PlannedRouteSegment[]): string {
    const vehicleTypes = [...new Set(segments.map(s => s.vehicleType))];
    
    if (vehicleTypes.length === 1) {
      switch (vehicleTypes[0]) {
        case VehicleType.WALKING:
          return 'walking';
        case VehicleType.E_BIKE:
        case VehicleType.E_SCOOTER:
          return 'shared_mobility';
        case VehicleType.SUBWAY:
        case VehicleType.TRAIN:
        case VehicleType.BUS:
        case VehicleType.TRAM:
          return 'public_transport';
        default:
          return 'mixed';
      }
    }
    
    return 'mixed';
  }

  /**
   * Sort routes based on user preferences
   */
  private static sortRoutesByPreferences(
    routes: PlannedRoute[],
    preferences?: RoutePreferences
  ): PlannedRoute[] {
    if (!preferences?.optimizeFor) {
      return routes.sort((a, b) => a.duration - b.duration); // Default: fastest
    }

    switch (preferences.optimizeFor) {
      case 'fastest':
        return routes.sort((a, b) => a.duration - b.duration);
      case 'cheapest':
        return routes.sort((a, b) => a.price - b.price);
      case 'most_sustainable':
        return routes.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
      default:
        return routes.sort((a, b) => a.duration - b.duration);
    }
  }

  /**
   * Reverse a route for opposite direction
   */
  private static reverseRoute(route: any, newOrigin: GeoLocation, newDestination: GeoLocation): any {
    const reversedSegments = [...route.segments].reverse().map((segment: any) => ({
      ...segment,
      startPoint: segment.endPoint,
      endPoint: segment.startPoint,
      instructions: segment.instructions.map((instruction: string, index: number) => {
        if (instruction.includes('to')) {
          return instruction.replace('to', 'from');
        }
        if (instruction.includes('towards')) {
          return instruction.replace('towards', 'from');
        }
        return instruction;
      })
    }));

    return {
      ...route,
      segments: reversedSegments
    };
  }

  /**
   * Get all available Hamburg locations
   */
  static getHamburgLocations() {
    return HAMBURG_LOCATIONS;
  }

  /**
   * Get route suggestions based on user history
   */
  static async getRouteSuggestions(userId: string): Promise<string[]> {
    try {
      // This would integrate with user history in a real system
      // For demo, return popular routes
      return [
        'Hauptbahnhof → Altona',
        'Hauptbahnhof → Airport',
        'St. Pauli → Winterhude',
        'Landungsbrücken → Eppendorf',
        'Altona → Bergedorf'
      ];
    } catch (error) {
      logger.error('Error getting route suggestions:', error);
      return [];
    }
  }
}

export default RouteService;