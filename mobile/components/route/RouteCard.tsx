import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';

export interface Route {
  id: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  co2Savings: number;
  type: 'bus' | 'train' | 'bike' | 'walk' | 'eco-bus';
  operator: string;
  transfers?: number;
}

interface RouteCardProps {
  route: Route;
  onPress: (route: Route) => void;
  style?: ViewStyle;
  showFullDetails?: boolean;
}

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onPress,
  style,
  showFullDetails = false,
}) => {
  const getTransportIcon = (type: Route['type']) => {
    const iconMap = {
      bus: 'bus',
      train: 'train',
      bike: 'bicycle',
      walk: 'walk',
      'eco-bus': 'bus',
    };
    return iconMap[type] || 'help-circle';
  };

  const getTransportColor = (type: Route['type']) => {
    const colorMap = {
      bus: colors.secondary,
      train: colors.primary,
      bike: colors.ecoGreen,
      walk: colors.textSecondary,
      'eco-bus': colors.co2Green,
    };
    return colorMap[type] || colors.textSecondary;
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;
  const formatCO2 = (co2: number) => `${co2.toFixed(1)} kg CO₂`;

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={() => onPress(route)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.routeInfo}>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>{route.from}</Text>
            <View style={styles.arrowContainer}>
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={colors.textSecondary} 
              />
            </View>
            <Text style={styles.locationText}>{route.to}</Text>
          </View>
          
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{route.departureTime}</Text>
            <Text style={styles.durationText}>{route.duration}</Text>
            <Text style={styles.timeText}>{route.arrivalTime}</Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>{formatPrice(route.price)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.transportInfo}>
          <View 
            style={[
              styles.iconContainer, 
              { backgroundColor: getTransportColor(route.type) }
            ]}
          >
            <Ionicons 
              name={getTransportIcon(route.type)} 
              size={20} 
              color={colors.textLight} 
            />
          </View>
          
          <Text style={styles.operatorText}>
            {route.operator}
            {route.transfers !== undefined && ` • ${route.transfers} ${route.transfers === 1 ? 'Umstieg' : 'Umstiege'}`}
          </Text>
        </View>

        <View style={styles.sustainabilityInfo}>
          <View style={styles.co2Container}>
            <Ionicons 
              name="leaf" 
              size={16} 
              color={colors.co2Green} 
            />
            <Text style={styles.co2Text}>
              {formatCO2(route.co2Savings)}
            </Text>
          </View>
          
          {route.type === 'eco-bus' && (
            <View style={styles.ecoBadge}>
              <Text style={styles.ecoBadgeText}>ECO</Text>
            </View>
          )}
        </View>
      </View>

      {showFullDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Nachhaltige Alternative • {route.co2Savings > 0 ? `${route.co2Savings.toFixed(1)} kg CO₂ eingespart` : 'CO₂-neutral'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  
  routeInfo: {
    flex: 1,
    marginRight: 16,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  locationText: {
    ...typography.h5,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  
  arrowContainer: {
    marginHorizontal: 8,
  },
  
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  timeText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  
  priceContainer: {
    alignItems: 'flex-end',
  },
  
  priceText: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  transportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  
  operatorText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  
  sustainabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  co2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.co2Green + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  co2Text: {
    ...typography.caption,
    color: colors.co2Green,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  ecoBadge: {
    backgroundColor: colors.ecoGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  
  ecoBadgeText: {
    ...typography.small,
    color: colors.textLight,
    fontWeight: '700',
  },
  
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  
  detailsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default RouteCard;