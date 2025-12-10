import { logger } from '../utils/logger';
import { VehicleType } from '../types';

/**
 * Rewards and gamification system for sustainable mobility choices
 * Points are awarded based on CO₂ savings, distance, and vehicle type
 */

interface PointsCalculation {
  basePoints: number;
  vehicleBonus: number;
  distanceBonus: number;
  sustainabilityBonus: number;
  totalPoints: number;
  breakdown: {
    co2SavingsPoints: number;
    distancePoints: number;
    vehicleTypePoints: number;
    sustainabilityMultiplier: number;
  };
}

interface RewardTier {
  name: string;
  minPoints: number;
  benefits: string[];
  color: string;
  icon: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'distance' | 'sustainability' | 'consistency' | 'exploration';
  unlockedAt?: Date;
}

interface UserRewardStats {
  totalPoints: number;
  currentTier: RewardTier;
  nextTier?: RewardTier;
  pointsToNextTier: number;
  totalCO2Savings: number; // in kg
  totalDistance: number; // in km
  achievements: Achievement[];
  streakDays: number;
  currentWeekPoints: number;
  weeklyRank?: number;
}

/**
 * Reward tiers based on accumulated points
 */
const REWARD_TIERS: RewardTier[] = [
  {
    name: 'Eco Walker',
    minPoints: 0,
    benefits: ['Basic route planning', 'CO₂ tracking'],
    color: '#90EE90',
    icon: '🚶'
  },
  {
    name: 'Green Commuter',
    minPoints: 100,
    benefits: ['Advanced route options', 'Monthly sustainability report', 'Priority support'],
    color: '#32CD32',
    icon: '🚌'
  },
  {
    name: 'Sustainability Champion',
    minPoints: 500,
    benefits: ['Real-time vehicle tracking', 'Exclusive mobility discounts', 'Personal CO₂ dashboard'],
    color: '#228B22',
    icon: '🚲'
  },
  {
    name: 'Climate Hero',
    minPoints: 1500,
    benefits: ['Premium mobility features', 'Partner discounts', 'Carbon offset contributions', 'Early access to new features'],
    color: '#006400',
    icon: '🌟'
  },
  {
    name: 'Mobility Master',
    minPoints: 5000,
    benefits: ['All benefits', 'VIP support', 'Exclusive events', 'Custom mobility insights'],
    color: '#FFD700',
    icon: '👑'
  }
];

/**
 * Vehicle type multipliers for rewards
 */
const VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
  [VehicleType.WALKING]: 3.0,      // Highest bonus for walking
  [VehicleType.E_BIKE]: 2.5,       // High bonus for e-bikes
  [VehicleType.E_SCOOTER]: 2.2,    // Good bonus for e-scooters
  [VehicleType.SUBWAY]: 1.8,       // Good bonus for electric rail
  [VehicleType.TRAIN]: 1.8,        // Good bonus for electric rail
  [VehicleType.TRAM]: 1.8,         // Good bonus for electric rail
  [VehicleType.BUS]: 1.5,          // Moderate bonus for buses
  [VehicleType.FERRY]: 1.3,        // Small bonus for ferry
  [VehicleType.CAR_SHARING]: 0.8,  // Small penalty for cars (even sharing)
  [VehicleType.TAXI]: 0.5          // Penalty for taxis
};

/**
 * Achievement definitions
 */
const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  // Distance achievements
  {
    id: 'first_km',
    name: 'First Steps',
    description: 'Complete your first sustainable trip',
    points: 10,
    category: 'distance'
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete 7 sustainable trips in one week',
    points: 50,
    category: 'consistency'
  },
  {
    id: 'marathon_walker',
    name: 'Marathon Walker',
    description: 'Walk 42km total distance',
    points: 100,
    category: 'distance'
  },
  {
    id: 'century_rider',
    name: 'Century Rider',
    description: 'Travel 100km by bike or e-scooter',
    points: 150,
    category: 'distance'
  },
  // Sustainability achievements
  {
    id: 'carbon_saver',
    name: 'Carbon Saver',
    description: 'Save 10kg CO₂ in one week',
    points: 75,
    category: 'sustainability'
  },
  {
    id: 'zero_emission_hero',
    name: 'Zero Emission Hero',
    description: 'Complete 10 trips with zero emissions',
    points: 60,
    category: 'sustainability'
  },
  {
    id: 'public_transport_master',
    name: 'Public Transport Master',
    description: 'Use all types of public transport (Bus, Tram, Subway, Train)',
    points: 80,
    category: 'exploration'
  },
  // Consistency achievements
  {
    id: 'monthly_champion',
    name: 'Monthly Champion',
    description: 'Use sustainable transport every day for a month',
    points: 200,
    category: 'consistency'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 5 trips before 8 AM',
    points: 40,
    category: 'consistency'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete 5 trips after 8 PM',
    points: 40,
    category: 'consistency'
  }
];

export class RewardsService {
  /**
   * Calculate points for a completed trip
   */
  static calculatePoints(
    co2Savings: number, // in grams
    tripDuration: number, // in seconds
    distance: number, // in meters
    vehicleType: VehicleType
  ): number {
    try {
      const calculation = this.getDetailedPointsCalculation(co2Savings, tripDuration, distance, vehicleType);
      
      logger.debug('Points calculated', {
        co2Savings,
        tripDuration,
        distance,
        vehicleType,
        totalPoints: calculation.totalPoints,
        breakdown: calculation.breakdown
      });

      return calculation.totalPoints;
    } catch (error) {
      logger.error('Error calculating points:', error);
      return 0;
    }
  }

  /**
   * Get detailed points calculation with breakdown
   */
  static getDetailedPointsCalculation(
    co2Savings: number, // in grams
    tripDuration: number, // in seconds
    distance: number, // in meters
    vehicleType: VehicleType
  ): PointsCalculation {
    // Base points from CO₂ savings (1 point per 10g CO₂ saved)
    const co2SavingsPoints = Math.floor(co2Savings / 10);

    // Distance points (1 point per 100m for sustainable transport)
    const distancePoints = Math.floor(distance / 100);

    // Vehicle type bonus multiplier
    const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0;
    const vehicleTypePoints = Math.floor(distancePoints * vehicleMultiplier) - distancePoints;

    // Base points
    const basePoints = co2SavingsPoints + distancePoints;

    // Apply sustainability multiplier based on CO₂ savings percentage
    const sustainabilityMultiplier = this.calculateSustainabilityMultiplier(co2Savings, distance);
    const sustainabilityBonus = Math.floor(basePoints * (sustainabilityMultiplier - 1));

    const totalPoints = Math.max(1, basePoints + vehicleTypePoints + sustainabilityBonus);

    return {
      basePoints,
      vehicleBonus: vehicleTypePoints,
      distanceBonus: distancePoints,
      sustainabilityBonus,
      totalPoints,
      breakdown: {
        co2SavingsPoints,
        distancePoints,
        vehicleTypePoints,
        sustainabilityMultiplier
      }
    };
  }

  /**
   * Calculate sustainability multiplier based on CO₂ savings
   */
  private static calculateSustainabilityMultiplier(co2Savings: number, distance: number): number {
    if (distance === 0) return 1.0;

    const co2SavingsPerKm = (co2Savings / distance) * 1000; // g CO₂ per km

    if (co2SavingsPerKm > 100) return 2.0;  // Excellent: 2x multiplier
    if (co2SavingsPerKm > 50) return 1.5;   // Good: 1.5x multiplier
    if (co2SavingsPerKm > 20) return 1.2;   // Moderate: 1.2x multiplier
    return 1.0; // Standard: no multiplier
  }

  /**
   * Get user's current reward tier
   */
  static getUserTier(totalPoints: number): RewardTier {
    // Find the highest tier the user qualifies for
    for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
      if (totalPoints >= REWARD_TIERS[i].minPoints) {
        return REWARD_TIERS[i];
      }
    }
    return REWARD_TIERS[0]; // Default to first tier
  }

  /**
   * Get user's next reward tier
   */
  static getNextTier(totalPoints: number): RewardTier | null {
    const currentTier = this.getUserTier(totalPoints);
    const currentIndex = REWARD_TIERS.findIndex(tier => tier.name === currentTier.name);
    
    if (currentIndex < REWARD_TIERS.length - 1) {
      return REWARD_TIERS[currentIndex + 1];
    }
    
    return null; // User is at highest tier
  }

  /**
   * Get points needed to reach next tier
   */
  static getPointsToNextTier(totalPoints: number): number {
    const nextTier = this.getNextTier(totalPoints);
    if (!nextTier) return 0; // Already at highest tier
    
    return nextTier.minPoints - totalPoints;
  }

  /**
   * Get all available reward tiers
   */
  static getAllTiers(): RewardTier[] {
    return [...REWARD_TIERS];
  }

  /**
   * Get achievements for a user
   */
  static getUserAchievements(userStats: {
    totalDistance: number;
    totalCO2Savings: number;
    tripsCompleted: number;
    consistentDays: number;
    vehicleTypesUsed: VehicleType[];
    earlyMorningTrips: number;
    eveningTrips: number;
  }): Achievement[] {
    const unlockedAchievements: Achievement[] = [];

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (this.isAchievementUnlocked(achievement, userStats)) {
        unlockedAchievements.push({
          ...achievement,
          unlockedAt: new Date()
        });
      }
    }

    return unlockedAchievements;
  }

  /**
   * Check if a specific achievement is unlocked
   */
  private static isAchievementUnlocked(
    achievement: Omit<Achievement, 'unlockedAt'>,
    userStats: {
      totalDistance: number;
      totalCO2Savings: number;
      tripsCompleted: number;
      consistentDays: number;
      vehicleTypesUsed: VehicleType[];
      earlyMorningTrips: number;
      eveningTrips: number;
    }
  ): boolean {
    switch (achievement.id) {
      case 'first_km':
        return userStats.totalDistance >= 1000; // 1km
      
      case 'week_warrior':
        return userStats.tripsCompleted >= 7;
      
      case 'marathon_walker':
        return userStats.totalDistance >= 42000; // 42km
      
      case 'century_rider':
        return userStats.totalDistance >= 100000; // 100km
      
      case 'carbon_saver':
        return userStats.totalCO2Savings >= 10000; // 10kg
      
      case 'zero_emission_hero':
        return userStats.tripsCompleted >= 10 && 
               userStats.vehicleTypesUsed.some(v => 
                 [VehicleType.WALKING, VehicleType.E_BIKE, VehicleType.E_SCOOTER].includes(v)
               );
      
      case 'public_transport_master':
        const publicTransportTypes = [VehicleType.BUS, VehicleType.TRAM, VehicleType.SUBWAY, VehicleType.TRAIN];
        return publicTransportTypes.every(type => userStats.vehicleTypesUsed.includes(type));
      
      case 'monthly_champion':
        return userStats.consistentDays >= 30;
      
      case 'early_bird':
        return userStats.earlyMorningTrips >= 5;
      
      case 'night_owl':
        return userStats.eveningTrips >= 5;
      
      default:
        return false;
    }
  }

  /**
   * Calculate weekly challenge completion
   */
  static getWeeklyChallengeProgress(
    weeklyStats: {
      trips: number;
      co2Savings: number;
      points: number;
      sustainableDays: number;
    }
  ): {
    completed: boolean;
    progress: number;
    challenge: string;
    reward: number;
    nextMilestone?: string;
  } {
    const challenges = [
      {
        name: 'Sustainable Starter',
        requirement: 3,
        metric: 'trips' as const,
        reward: 25,
        description: 'Complete 3 sustainable trips'
      },
      {
        name: 'CO₂ Crusher',
        requirement: 5000, // 5kg
        metric: 'co2Savings' as const,
        reward: 50,
        description: 'Save 5kg CO₂'
      },
      {
        name: 'Points Master',
        requirement: 200,
        metric: 'points' as const,
        reward: 30,
        description: 'Earn 200 points'
      },
      {
        name: 'Daily Hero',
        requirement: 5,
        metric: 'sustainableDays' as const,
        reward: 75,
        description: 'Use sustainable transport 5 days'
      }
    ];

    // Find the most appropriate challenge based on current progress
    const activeChallenge = challenges.find(challenge => {
      const currentProgress = weeklyStats[challenge.metric];
      return currentProgress < challenge.requirement;
    }) || challenges[0]; // Default to first challenge

    const currentProgress = weeklyStats[activeChallenge.metric];
    const progress = Math.min(100, (currentProgress / activeChallenge.requirement) * 100);
    const completed = currentProgress >= activeChallenge.requirement;

    return {
      completed,
      progress,
      challenge: activeChallenge.description,
      reward: activeChallenge.reward,
      nextMilestone: completed ? undefined : `${currentProgress}/${activeChallenge.requirement} ${activeChallenge.metric}`
    };
  }

  /**
   * Get vehicle type information for rewards
   */
  static getVehicleRewardInfo(vehicleType: VehicleType): {
    multiplier: number;
    category: 'excellent' | 'good' | 'moderate' | 'poor';
    description: string;
    pointsPerKm: number;
  } {
    const multiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0;
    
    let category: 'excellent' | 'good' | 'moderate' | 'poor';
    let description: string;
    
    if (multiplier >= 2.0) {
      category = 'excellent';
      description = 'Maximum points - excellent choice for sustainability!';
    } else if (multiplier >= 1.5) {
      category = 'good';
      description = 'Good points - sustainable transport option';
    } else if (multiplier >= 1.0) {
      category = 'moderate';
      description = 'Standard points - better than driving alone';
    } else {
      category = 'poor';
      description = 'Reduced points - consider more sustainable options';
    }

    // Base points per km = 10 points per km
    const pointsPerKm = Math.round(10 * multiplier);

    return {
      multiplier,
      category,
      description,
      pointsPerKm
    };
  }

  /**
   * Get leaderboard ranking for users
   */
  static getLeaderboardRanking(
    userPoints: number,
    allUserPoints: number[]
  ): {
    rank: number;
    totalUsers: number;
    percentile: number;
    topPercentage: number;
  } {
    const sortedPoints = [...allUserPoints].sort((a, b) => b - a);
    const userIndex = sortedPoints.findIndex(points => points === userPoints);
    
    // Rank is 1-based (1 = highest score)
    const rank = userIndex >= 0 ? userIndex + 1 : sortedPoints.length + 1;
    const totalUsers = sortedPoints.length;
    const percentile = Math.round(((totalUsers - rank) / totalUsers) * 100);
    const topPercentage = Math.round((rank / totalUsers) * 100);

    return {
      rank,
      totalUsers,
      percentile,
      topPercentage
    };
  }

  /**
   * Get reward redemption options
   */
  static getRewardOptions(userPoints: number): Array<{
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: 'mobility' | 'lifestyle' | 'environmental';
    available: boolean;
  }> {
    return [
      {
        id: 'hvvticket_week',
        name: 'HVV Weekly Ticket',
        description: 'One week of free public transport',
        pointsCost: 500,
        category: 'mobility',
        available: userPoints >= 500
      },
      {
        id: 'escooter_credit',
        name: 'E-Scooter Credit',
        description: '€10 credit for e-scooter sharing',
        pointsCost: 300,
        category: 'mobility',
        available: userPoints >= 300
      },
      {
        id: 'coffee_discount',
        name: 'Sustainable Coffee',
        description: 'Free coffee at eco-friendly cafés',
        pointsCost: 150,
        category: 'lifestyle',
        available: userPoints >= 150
      },
      {
        id: 'tree_donation',
        name: 'Plant a Tree',
        description: 'Donate to plant trees in Hamburg',
        pointsCost: 200,
        category: 'environmental',
        available: userPoints >= 200
      },
      {
        id: 'bike_rental',
        name: 'Bike Rental Day',
        description: 'Free bike rental for one day',
        pointsCost: 250,
        category: 'mobility',
        available: userPoints >= 250
      }
    ];
  }
}

export default RewardsService;