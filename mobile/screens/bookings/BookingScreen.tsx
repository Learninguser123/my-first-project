import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../../services/api';
import Button from '../../components/common/Button';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { apiService } from '../../services/api';

const BookingScreen: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async () => {
    try {
      const bookingsData = await apiService.getBookings();
      
      // Process bookings based on filter
      let filteredBookings = bookingsData;
      const now = new Date();
      
      if (filter === 'upcoming') {
        filteredBookings = bookingsData.filter(booking => 
          new Date(booking.route?.departureTime || booking.createdAt) > now &&
          booking.status === 'confirmed'
        );
      } else if (filter === 'past') {
        filteredBookings = bookingsData.filter(booking => 
          new Date(booking.route?.arrivalTime || booking.createdAt) < now ||
          booking.status === 'confirmed'
        );
      } else if (filter === 'cancelled') {
        filteredBookings = bookingsData.filter(booking => 
          booking.status === 'cancelled'
        );
      }
      
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      // Mock data for demo purposes
      const mockBookings = generateMockBookings();
      setBookings(mockBookings);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockBookings = (): Booking[] => {
    return [
      {
        id: '1',
        routeId: '1',
        userId: 'user1',
        status: 'confirmed',
        price: 2.80,
        createdAt: '2024-01-15T10:00:00Z',
        route: {
          id: '1',
          from: 'Hauptbahnhof',
          to: 'Mundsburg',
          departureTime: '14:30',
          arrivalTime: '14:45',
          duration: '15 Min',
          price: 2.80,
          co2Savings: 2.1,
          type: 'eco-bus',
          operator: 'HVV Eco Bus',
          transfers: 0,
        },
      },
      {
        id: '2',
        routeId: '2',
        userId: 'user1',
        status: 'confirmed',
        price: 3.40,
        createdAt: '2024-01-14T09:30:00Z',
        route: {
          id: '2',
          from: 'Altona',
          to: 'Blankenese',
          departureTime: '15:00',
          arrivalTime: '15:25',
          duration: '25 Min',
          price: 3.40,
          co2Savings: 3.8,
          type: 'train',
          operator: 'S-Bahn',
          transfers: 0,
        },
      },
      {
        id: '3',
        routeId: '3',
        userId: 'user1',
        status: 'cancelled',
        price: 2.20,
        createdAt: '2024-01-13T14:15:00Z',
        route: {
          id: '3',
          from: 'Eimsbüttel',
          to: 'Winterhude',
          departureTime: '10:30',
          arrivalTime: '11:10',
          duration: '40 Min',
          price: 2.20,
          co2Savings: 2.1,
          type: 'bus',
          operator: 'Bus',
          transfers: 2,
        },
      },
    ];
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert(
      'Buchung stornieren',
      'Sind Sie sicher, dass Sie diese Buchung stornieren möchten?',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.cancelBooking(bookingId);
              setBookings(prev =>
                prev.map(booking =>
                  booking.id === bookingId
                    ? { ...booking, status: 'cancelled' as const }
                    : booking
                )
              );
              Alert.alert('Erfolg', 'Buchung wurde storniert');
            } catch (error) {
              Alert.alert(
                'Fehler',
                'Buchung konnte nicht storniert werden'
              );
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Bestätigt';
      case 'pending':
        return 'Ausstehend';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getFilterButtons = () => [
    { key: 'all', label: 'Alle', icon: 'list' },
    { key: 'upcoming', label: 'Bevorstehend', icon: 'time' },
    { key: 'past', label: 'Vergangen', icon: 'checkmark-circle' },
    { key: 'cancelled', label: 'Storniert', icon: 'close-circle' },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Lade Buchungen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meine Buchungen</Text>
        <Text style={styles.subtitle}>
          {bookings.length} Buchung{bookings.length !== 1 ? 'en' : ''} gefunden
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {getFilterButtons().map((button) => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.filterButton,
                filter === button.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(button.key as typeof filter)}
            >
              <Ionicons 
                name={button.icon as any}
                size={16}
                color={filter === button.key ? colors.textLight : colors.textSecondary}
              />
              <Text style={[
                styles.filterButtonText,
                filter === button.key && styles.filterButtonTextActive,
              ]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.bookingsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Keine Buchungen gefunden</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'Sie haben noch keine Buchungen getätigt.'
                : `Keine ${getFilterButtons().find(b => b.key === filter)?.label.toLowerCase()} Buchungen gefunden.`
              }
            </Text>
            <Button
              title="Verbindung suchen"
              onPress={() => {}}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingRoute}>
                    {booking.route?.from} → {booking.route?.to}
                  </Text>
                  <Text style={styles.bookingDate}>
                    {formatDate(booking.createdAt)}
                  </Text>
                </View>
                <View style={styles.bookingStatus}>
                  <View 
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(booking.status) + '20' }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.statusText,
                        { color: getStatusColor(booking.status) }
                      ]}
                    >
                      {getStatusText(booking.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {booking.route?.departureTime} - {booking.route?.arrivalTime}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="bus" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {booking.route?.operator}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="leaf" size={16} color={colors.co2Green} />
                  <Text style={styles.detailText}>
                    {booking.route?.co2Savings?.toFixed(1)} kg CO₂ eingespart
                  </Text>
                </View>
              </View>

              <View style={styles.bookingFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Preis</Text>
                  <Text style={styles.priceValue}>
                    €{booking.price.toFixed(2)}
                  </Text>
                </View>

                {booking.status === 'confirmed' && (
                  <View style={styles.bookingActions}>
                    <Button
                      title="Stornieren"
                      onPress={() => handleCancelBooking(booking.id)}
                      variant="outline"
                      size="small"
                    />
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: 16,
  },
  
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  
  filterContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  filterScroll: {
    paddingRight: 16,
  },
  
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    marginRight: 8,
  },
  
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  
  filterButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  
  filterButtonTextActive: {
    color: colors.textLight,
  },
  
  bookingsContainer: {
    flex: 1,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  emptyText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  emptyButton: {
    minWidth: 150,
  },
  
  bookingCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  
  bookingInfo: {
    flex: 1,
  },
  
  bookingRoute: {
    ...typography.h5,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  bookingDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  bookingStatus: {
    marginLeft: 12,
  },
  
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  
  priceContainer: {
    alignItems: 'flex-start',
  },
  
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  
  priceValue: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  bottomSpacing: {
    height: 20,
  },
});

export default BookingScreen;