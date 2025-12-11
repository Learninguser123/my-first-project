import { logger } from '../utils/logger';
import { VehicleType, RouteSegment, PlannedRouteSegment } from '../types';

/**
 * CO₂ Emission Factors based on German UBA (Umweltbundesamt) standards
 * Values are in grams CO₂ per passenger-kilometer
 * Source: German Environment Agency, 2023 data
 */
const UBA_EMISSION_FACTORS: Record<VehicleType, number> = {
  [VehicleType.BUS]: 68, // Standard city bus (diesel)
  [VehicleType.TRAM]: 35, // Electric tram
  [VehicleType.SUBWAY]: 23, // Electric subway/metro
  [VehicleType.TRAIN]: 29, // Regional train (electric)
  [VehicleType.FERRY]: 180, // Ferry
  [VehicleType.TAXI]: 164, // Taxi (average, including deadheading)
  [VehicleType.E_BIKE]: 0, // Electric bike (negligible when charged with renewable energy)
  [VehicleType.E_SCOOTER]: 0, // Electric scooter (negligible when charged with renewable energy)
  [VehicleType.CAR_SHARING]: 142, // Car sharing (average, includes various car types)
  [VehicleType.WALKING]: 0, // Walking
};

/**
 * Car baseline emission factor (average German passenger car)
 * Based on UBA data for 2023: 142 g CO₂/passenger-km
 * Assumed average occupancy: 1.5 passengers
 */
const CAR_BASELINE_EMISSION_FACTOR = 142;

/**
 * Regional electricity grid emission factors for Hamburg region
 * Values in g CO₂/kWh (2023 data from German UBA)
 */
const ELECTRICITY_GRID_FACTORS = {
  DE_HAMBURG: 267, // Hamburg electricity mix
  DE_NATIONAL: 385, // German national average
  EU_AVERAGE: 275, // EU average
};

/**
 * Sustainability scoring factors based on CO₂ reduction
 */
interface SustainabilityFactors {
  excellent: { maxEmissions: number; score: number };
  good: { maxEmissions: number; score: number };
  moderate: { maxEmissions: number; score: number };
  poor: { maxEmissions: number; score: number };
}

const SUSTAINABILITY_FACTORS: SustainabilityFactors = {
  excellent: { maxEmissions: 25, score: 100 },  // Very low emissions
  good: { maxEmissions: 60, score: 80 },        // Low emissions
  moderate: { maxEmissions: 100, score: 60 },   // Moderate emissions
  poor: { maxEmissions: 200, score: 40 },       // High emissions
};

export interface CO2CalculationResult {
  emissions: number; // grams CO₂
  baselineEmissions: number; // grams CO₂ for car
  savings: number; // grams CO₂ saved
  sustainabilityScore: number; // 0-100
  percentageReduction: number; // percentage compared to car
}

export class CO2Service {
  /**
   * Calculate CO₂ emissions for a route segment
   */
  static calculateSegmentEmissions(
    segment: RouteSegment | PlannedRouteSegment,
    passengers: number = 1
  ): CO2CalculationResult {
    try {
      const distanceInKm = segment.distance / 1000; // Convert meters to km
      const emissionFactor = UBA_EMISSION_FACTORS[segment.vehicleType];
      
      // Calculate emissions for this segment
      const emissions = Math.round(emissionFactor * distanceInKm * passengers);
      
      // Calculate baseline (car) emissions for same distance
      const baselineEmissions = Math.round(CAR_BASELINE_EMISSION_FACTOR * distanceInKm * passengers);
      
      // Calculate savings
      const savings = Math.max(0, baselineEmissions - emissions);
      
      // Calculate percentage reduction
      const percentageReduction = baselineEmissions > 0 
        ? Math.round((savings / baselineEmissions) * 100)
        : 0;

      // Calculate sustainability score
      const sustainabilityScore = this.calculateSustainabilityScore(
        emissions / passengers, // per passenger
        distanceInKm
      );

      logger.debug('CO₂ calculation for segment', {
        vehicleType: segment.vehicleType,
        distance: segment.distance,
        emissions,
        baselineEmissions,
        savings,
        sustainabilityScore,
        percentageReduction
      });

      return {
        emissions,
        baselineEmissions,
        savings,
        sustainabilityScore,
        percentageReduction
      };
    } catch (error) {
      logger.error('Error calculating segment emissions:', error);
      throw new Error(`Failed to calculate CO₂ emissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate CO₂ emissions for an entire planned route
   */
  static calculateRouteEmissions(
    segments: PlannedRouteSegment[],
    passengers: number = 1
  ): CO2CalculationResult {
    try {
      let totalEmissions = 0;
      let totalBaselineEmissions = 0;

      for (const segment of segments) {
        const segmentCalc = this.calculateSegmentEmissions(segment, passengers);
        totalEmissions += segmentCalc.emissions;
        totalBaselineEmissions += segmentCalc.baselineEmissions;
        
        // Store emissions back to segment
        segment.co2Emissions = segmentCalc.emissions;
        segment.sustainabilityScore = segmentCalc.sustainabilityScore;
      }

      const savings = Math.max(0, totalBaselineEmissions - totalEmissions);
      const percentageReduction = totalBaselineEmissions > 0 
        ? Math.round((savings / totalBaselineEmissions) * 100)
        : 0;

      // Calculate average sustainability score for the route
      const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
      const emissionsPerKm = totalDistance > 0 ? (totalEmissions / passengers) / (totalDistance / 1000) : 0;
      const sustainabilityScore = this.calculateSustainabilityScore(emissionsPerKm, totalDistance / 1000);

      return {
        emissions: totalEmissions,
        baselineEmissions: totalBaselineEmissions,
        savings,
        sustainabilityScore,
        percentageReduction
      };
    } catch (error) {
      logger.error('Error calculating route emissions:', error);
      throw new Error(`Failed to calculate route CO₂ emissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate sustainability score based on emissions
   * Score from 0-100, where 100 is most sustainable
   */
  private static calculateSustainabilityScore(
    emissionsPerKm: number,
    distanceKm: number
  ): number {
    // Very short distances get bonus points for encouraging active mobility
    const distanceBonus = distanceKm < 2 ? 10 : 0;

    if (emissionsPerKm <= SUSTAINABILITY_FACTORS.excellent.maxEmissions) {
      return Math.min(100, SUSTAINABILITY_FACTORS.excellent.score + distanceBonus);
    } else if (emissionsPerKm <= SUSTAINABILITY_FACTORS.good.maxEmissions) {
      return SUSTAINABILITY_FACTORS.good.score + distanceBonus;
    } else if (emissionsPerKm <= SUSTAINABILITY_FACTORS.moderate.maxEmissions) {
      return SUSTAINABILITY_FACTORS.moderate.score;
    } else if (emissionsPerKm <= SUSTAINABILITY_FACTORS.poor.maxEmissions) {
      return SUSTAINABILITY_FACTORS.poor.score;
    } else {
      // Very high emissions - score decreases proportionally
      return Math.max(0, 40 - Math.floor((emissionsPerKm - 200) / 50));
    }
  }

  /**
   * Get detailed CO₂ information for a vehicle type
   */
  static getVehicleCO2Info(vehicleType: VehicleType): {
    emissionFactor: number;
    category: 'zero_emission' | 'low_emission' | 'moderate_emission' | 'high_emission';
    comparisonToCar: string;
    sustainabilityRating: 'excellent' | 'good' | 'moderate' | 'poor';
  } {
    const emissionFactor = UBA_EMISSION_FACTORS[vehicleType];
    const comparisonToCar = CAR_BASELINE_EMISSION_FACTOR > 0 
      ? Math.round((1 - emissionFactor / CAR_BASELINE_EMISSION_FACTOR) * 100)
      : 0;

    let category: 'zero_emission' | 'low_emission' | 'moderate_emission' | 'high_emission';
    let sustainabilityRating: 'excellent' | 'good' | 'moderate' | 'poor';

    if (emissionFactor === 0) {
      category = 'zero_emission';
      sustainabilityRating = 'excellent';
    } else if (emissionFactor <= 40) {
      category = 'low_emission';
      sustainabilityRating = 'good';
    } else if (emissionFactor <= 100) {
      category = 'moderate_emission';
      sustainabilityRating = 'moderate';
    } else {
      category = 'high_emission';
      sustainabilityRating = 'poor';
    }

    const comparisonText = comparisonToCar >= 0 
      ? `${Math.abs(comparisonToCar)}% less emissions than car`
      : `${Math.abs(comparisonToCar)}% more emissions than car`;

    return {
      emissionFactor,
      category,
      comparisonToCar: comparisonText,
      sustainabilityRating
    };
  }

  /**
   * Convert CO₂ savings to equivalent environmental impact
   */
  static convertSavingsToImpact(co2Savings: number): {
    treesNeeded: number;
    kmByCar: number;
    householdsDaily: number;
    smartphoneCharges: number;
  } {
    // Environmental equivalents based on German UBA data
    const TREES_PER_TON_CO2 = 22; // Average tree absorbs 22kg CO2 per year
    const AVERAGE_GERMAN_CAR_EMISSIONS = 140; // g CO2 per km
    const HOUSEHOLD_DAILY_EMISSIONS = 10000; // g CO2 per household per day (Germany average)
    const SMARTPHONE_CHARGE_EMISSIONS = 8; // g CO2 per smartphone charge

    const treesNeeded = (co2Savings / 1000) / TREES_PER_TON_CO2; // Convert to tons, then divide by trees per ton
    const kmByCar = co2Savings / AVERAGE_GERMAN_CAR_EMISSIONS;
    const householdsDaily = co2Savings / HOUSEHOLD_DAILY_EMISSIONS;
    const smartphoneCharges = co2Savings / SMARTPHONE_CHARGE_EMISSIONS;

    return {
      treesNeeded: Math.round(treesNeeded * 10) / 10, // 1 decimal place
      kmByCar: Math.round(kmByCar),
      householdsDaily: Math.round(householdsDaily * 100) / 100, // 2 decimal places
      smartphoneCharges: Math.round(smartphoneCharges)
    };
  }

  /**
   * Get emission factor for electric vehicles considering electricity mix
   */
  static getElectricVehicleEmissionFactor(
    vehicleType: VehicleType,
    region: 'hamburg' | 'national' | 'eu' = 'hamburg'
  ): number {
    const baseFactor = UBA_EMISSION_FACTORS[vehicleType];
    
    // For electric vehicles, adjust based on electricity mix
    const electricVehicles = [VehicleType.TRAM, VehicleType.SUBWAY, VehicleType.TRAIN];
    
    if (!electricVehicles.includes(vehicleType)) {
      return baseFactor;
    }

    const gridFactor = ELECTRICITY_GRID_FACTORS[`DE_${region.toUpperCase()}`] || ELECTRICITY_GRID_FACTORS.DE_NATIONAL;
    
    // Calculate adjusted emissions based on electricity consumption
    // Average electricity consumption for electric public transport: ~0.15 kWh per passenger-km
    const electricityConsumption = 0.15; // kWh per passenger-km
    const electricityEmissions = gridFactor * electricityConsumption;
    
    return Math.round(baseFactor + electricityEmissions);
  }

  /**
   * Validate CO₂ calculation inputs
   */
  static validateInputs(distance: number, vehicleType: VehicleType): void {
    if (distance < 0) {
      throw new Error('Distance cannot be negative');
    }
    
    if (distance > 1000000) { // 1000 km max
      throw new Error('Distance exceeds maximum allowed limit');
    }
    
    if (!Object.values(VehicleType).includes(vehicleType)) {
      throw new Error('Invalid vehicle type');
    }
  }

  /**
   * Get weekly CO₂ reduction goal for a user
   */
  static getWeeklyReductionGoal(userActivityLevel: 'low' | 'medium' | 'high' = 'medium'): {
    targetSavings: number; // grams CO2
    targetTrips: number;
    suggestedActions: string[];
  } {
    const baseGoals = {
      low: { savings: 2000, trips: 3 },      // 2kg CO2 savings, 3 sustainable trips
      medium: { savings: 5000, trips: 5 },    // 5kg CO2 savings, 5 sustainable trips
      high: { savings: 10000, trips: 10 }     // 10kg CO2 savings, 10 sustainable trips
    };

    const goal = baseGoals[userActivityLevel];
    
    const suggestedActions = [
      'Use public transport instead of car for commuting',
      'Choose e-scooter or bike for short distances (< 3km)',
      'Combine multiple errands into one trip',
      'Share rides with others when possible',
      'Walk for distances under 1km'
    ];

    return {
      targetSavings: goal.savings,
      targetTrips: goal.trips,
      suggestedActions
    };
  }
}

export default CO2Service;