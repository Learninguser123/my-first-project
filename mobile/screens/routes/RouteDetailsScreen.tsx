import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import RouteCard, { Route } from '../../components/route/RouteCard';
import Button from '../../components/common/Button';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { apiService } from '../../services/api';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  RouteDetails: { route: Route };
  RouteResults: undefined;
};

type RouteDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RouteDetails'>;

interface Props {
  navigation: RouteDetailsScreenNavigationProp;
  route: RootStackParamList['RouteDetails'];
}

const RouteDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { route: routeData } = route.params;
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState(1);

  const handleBooking = async () => {
    setIsBooking(true);
    
    try {
      await apiService.createBooking({
        routeId: routeData.id,
        seats: selectedSeats,
        price: routeData.price,
      });
      
      Alert.alert(
        'Erfolg!',
        `Ihre Buchung für ${routeData.from} → ${routeData.to} wurde bestätigt.\n\nSie haben ${routeData.co2Savings.toFixed(1)} kg CO₂ eingespart und 20 Öko-Punkte verdient!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Buchung fehlgeschlagen',
        error instanceof Error ? error.message : 'Bitte versuchen Sie es später erneut'
      );
    } finally {
      setIsBooking(false);
    }
  };

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

  const getEcoRating = (co2Savings: number) => {
    if (co2Savings >= 8) return { rating: 5, label: 'Exzellent', color: colors.ecoGreen };
    if (co2Savings >= 5) return { rating: 4, label: 'Sehr gut', color: colors.co2Green };
    if (co2Savings >= 3) return { rating: 3, label: 'Gut', color: colors.success };
    if (co2Savings >= 1) return { rating: 2, label: 'Fair', color: colors.warning };
    return { rating: 1, label: 'Kann verbessert werden', color: colors.textSecondary };
  };

  const ecoRating = getEcoRating(routeData.co2Savings);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Route Card */}
      <View style={styles.header}>
        <RouteCard
          route={routeData}
          onPress={() => {}}
          showFullDetails={true}
          style={styles.routeCard}
        />
      </View>

      {/* Detailed Information */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Verbindungsdetails</Text>
        
        {/* Transport Type */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View 
              style={[
                styles.transportIconContainer, 
                { backgroundColor: getTransportColor(routeData.type) }
              ]}
            >
              <Ionicons 
                name={getTransportIcon(routeData.type)} 
                size={24} 
                color={colors.textLight} 
              />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailTitle}>Transportmittel</Text>
              <Text style={styles.detailValue}>{routeData.operator}</Text>
            </View>
          </View>
        </View>

        {/* Schedule Details */}
        <View style={styles.detailCard}>
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>Abfahrt</Text>
              <Text style={styles.scheduleTime}>{routeData.departureTime}</Text>
              <Text style={styles.scheduleLocation}>{routeData.from}</Text>
            </View>
            
            <View style={styles.scheduleArrow}>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{routeData.duration}</Text>
              </View>
              <Ionicons name="arrow-down" size={20} color={colors.textSecondary} />
            </View>
            
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>Ankunft</Text>
              <Text style={styles.scheduleTime}>{routeData.arrivalTime}</Text>
              <Text style={styles.scheduleLocation}>{routeData.to}</Text>
            </View>
          </View>
          
          {routeData.transfers !== undefined && routeData.transfers > 0 && (
            <View style={styles.transfersInfo}>
              <Ionicons name="swap-horizontal" size={16} color={colors.info} />
              <Text style={styles.transfersText}>
                {routeData.transfers} {routeData.transfers === 1 ? 'Umstieg' : 'Umstiege'}
              </Text>
            </View>
          )}
        </View>

        {/* Sustainability Score */}
        <View style={styles.detailCard}>
          <View style={styles.ecoScoreHeader}>
            <Ionicons name="leaf" size={24} color={ecoRating.color} />
            <Text style={styles.ecoScoreTitle}>Nachhaltigkeits-Bewertung</Text>
          </View>
          
          <View style={styles.ecoScoreContent}>
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, index) => (
                  <Ionicons
                    key={index}
                    name={index < ecoRating.rating ? 'star' : 'star-outline'}
                    size={24}
                    color={index < ecoRating.rating ? ecoRating.color : colors.border}
                  />
                ))}
              </View>
              <Text style={styles.ratingLabel}>{ecoRating.label}</Text>
            </View>
            
            <View style={styles.co2Details}>
              <View style={styles.co2Item}>
                <Text style={styles.co2Value}>{routeData.co2Savings.toFixed(1)}</Text>
                <Text style={styles.co2Unit}>kg CO₂</Text>
                <Text style={styles.co2Description}>eingespart</Text>
              </View>
              
              <View style={styles.co2Comparison}>
                <Text style={styles.comparisonText}>
                  Das entspricht{' '}
                  <Text style={styles.comparisonHighlight}>
                    {(routeData.co2Savings * 3.7).toFixed(1)} km Autofahrt
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price and Benefits */}
        <View style={styles.detailCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Preis</Text>
            <Text style={styles.priceValue}>
              {routeData.price === 0 ? 'Kostenlos' : `€${routeData.price.toFixed(2)}`}
            </Text>
          </View>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="star" size={16} color={colors.warning} />
              <Text style={styles.benefitText}>+20 Öko-Punkte</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="leaf" size={16} color={colors.co2Green} />
              <Text style={styles.benefitText}>Nachhaltige Alternative</Text>
            </View>
            {routeData.type === 'eco-bus' && (
              <View style={styles.benefitItem}>
                <Ionicons name="ribbon" size={16} color={colors.ecoGreen} />
                <Text style={styles.benefitText}>Premium Eco-Fahrzeug</Text>
              </View>
            )}
          </View>
        </View>

        {/* Seat Selection (if applicable) */}
        {routeData.type !== 'bike' && routeData.type !== 'walk' && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Anzahl Plätze</Text>
            <View style={styles.seatSelector}>
              {[1, 2, 3, 4].map((seats) => (
                <TouchableOpacity
                  key={seats}
                  style={[
                    styles.seatButton,
                    selectedSeats === seats && styles.seatButtonSelected,
                  ]}
                  onPress={() => setSelectedSeats(seats)}
                >
                  <Text style={[
                    styles.seatButtonText,
                    selectedSeats === seats && styles.seatButtonTextSelected,
                  ]}>
                    {seats}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Booking Actions */}
      <View style={styles.bookingSection}>
        <Button
          title={isBooking ? "Wird gebucht..." : "Jetzt buchen"}
          onPress={handleBooking}
          loading={isBooking}
          disabled={isBooking}
          style={styles.bookButton}
        />
        
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingNote}>
            🌱 Mit dieser Buchung sparen Sie{' '}
            <Text style={styles.bookingHighlight}>
              {routeData.co2Savings.toFixed(1)} kg CO₂
            </Text>
            {' '}und erhalten{' '}
            <Text style={styles.bookingHighlight}>20 Öko-Punkte</Text>!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  
  routeCard: {
    margin: 0,
  },
  
  detailsSection: {
    padding: 16,
  },
  
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  transportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  detailInfo: {
    flex: 1,
  },
  
  detailTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  
  detailValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
  },
  
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  scheduleItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  scheduleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  
  scheduleTime: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  scheduleLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  scheduleArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  
  durationContainer: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  
  durationText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  
  transfersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  
  transfersText: {
    ...typography.caption,
    color: colors.info,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  ecoScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  ecoScoreTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  ecoScoreContent: {
    alignItems: 'center',
  },
  
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  
  ratingLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  co2Details: {
    alignItems: 'center',
    backgroundColor: colors.co2Green + '10',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  
  co2Item: {
    alignItems: 'center',
    marginBottom: 8,
  },
  
  co2Value: {
    ...typography.h2,
    color: colors.co2Green,
    fontWeight: '700',
  },
  
  co2Unit: {
    ...typography.body2,
    color: colors.co2Green,
    fontWeight: '500',
  },
  
  co2Description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  co2Comparison: {
    alignItems: 'center',
  },
  
  comparisonText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  comparisonHighlight: {
    color: colors.co2Green,
    fontWeight: '600',
  },
  
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  priceLabel: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '500',
  },
  
  priceValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  
  benefitsList: {
    gap: 8,
  },
  
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  benefitText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  
  seatSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  
  seatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  
  seatButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  
  seatButtonText: {
    ...typography.h4,
    color: colors.text,
  },
  
  seatButtonTextSelected: {
    color: colors.textLight,
  },
  
  bookingSection: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  
  bookButton: {
    marginBottom: 16,
  },
  
  bookingInfo: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
  },
  
  bookingNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  
  bookingHighlight: {
    color: colors.co2Green,
    fontWeight: '600',
  },
});

export default RouteDetailsScreen;