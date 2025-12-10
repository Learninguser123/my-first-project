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
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import RouteCard, { Route } from '../../components/route/RouteCard';
import Button from '../../components/common/Button';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { apiService } from '../../services/api';

type RootStackParamList = {
  RouteResults: { from: string; to: string; ecoMode?: boolean };
  RouteDetails: { route: Route };
};

type RouteResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RouteResults'>;

interface Props {
  navigation: RouteResultsScreenNavigationProp;
  route: RootStackParamList['RouteResults'];
}

const RouteResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { from, to, ecoMode = false } = route.params;
  
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'fastest' | 'cheapest' | 'eco'>('fastest');

  useEffect(() => {
    searchRoutes();
  }, [from, to, ecoMode]);

  const searchRoutes = async () => {
    try {
      setIsLoading(true);
      const results = await apiService.searchRoutes({
        from,
        to,
        ecoMode,
      });
      
      // Process results and add mock CO₂ data for demo
      const processedResults = results.map((routeData: any) => ({
        ...routeData,
        co2Savings: ecoMode 
          ? Math.random() * 8 + 2 // Higher CO₂ savings for eco mode
          : Math.random() * 4 + 0.5,
      }));

      setSearchResults(processedResults);
    } catch (error) {
      console.error('Search failed:', error);
      // Mock data for demo purposes
      const mockRoutes = generateMockRoutes(from, to);
      setSearchResults(mockRoutes);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockRoutes = (from: string, to: string): Route[] => {
    return [
      {
        id: '1',
        from,
        to,
        departureTime: '14:30',
        arrivalTime: '14:55',
        duration: '25 Min',
        price: 2.80,
        co2Savings: ecoMode ? 6.2 : 1.8,
        type: 'eco-bus',
        operator: 'HVV Eco Bus',
        transfers: 0,
      },
      {
        id: '2',
        from,
        to,
        departureTime: '14:45',
        arrivalTime: '15:05',
        duration: '20 Min',
        price: 3.40,
        co2Savings: ecoMode ? 4.5 : 1.2,
        type: 'train',
        operator: 'S-Bahn',
        transfers: 0,
      },
      {
        id: '3',
        from,
        to,
        departureTime: '15:00',
        arrivalTime: '15:40',
        duration: '40 Min',
        price: 2.20,
        co2Savings: ecoMode ? 7.8 : 2.1,
        type: 'bus',
        operator: 'Bus',
        transfers: 2,
      },
      {
        id: '4',
        from,
        to,
        departureTime: '15:15',
        arrivalTime: '16:00',
        duration: '45 Min',
        price: 0.00,
        co2Savings: ecoMode ? 12.5 : 8.2,
        type: 'bike',
        operator: 'Stadtrad',
        transfers: 0,
      },
    ];
  };

  const sortRoutes = (routes: Route[]): Route[] => {
    return [...routes].sort((a, b) => {
      switch (sortBy) {
        case 'fastest':
          return a.duration.localeCompare(b.duration);
        case 'cheapest':
          return a.price - b.price;
        case 'eco':
          return b.co2Savings - a.co2Savings;
        default:
          return 0;
      }
    });
  };

  const handleRoutePress = (route: Route) => {
    navigation.navigate('RouteDetails', { route });
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
  };

  const getSortButtons = () => [
    { key: 'fastest', label: 'Schnellste', icon: 'flash' },
    { key: 'cheapest', label: 'Günstigste', icon: 'wallet' },
    { key: 'eco', label: 'Öko', icon: 'leaf' },
  ];

  const totalCO2Savings = searchResults.reduce((sum, route) => sum + route.co2Savings, 0);
  const averagePrice = searchResults.length > 0 
    ? searchResults.reduce((sum, route) => sum + route.price, 0) / searchResults.length 
    : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await searchRoutes();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Suche Verbindungen...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Search Summary */}
      <View style={styles.searchSummary}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>{from}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
          <Text style={styles.routeText}>{to}</Text>
        </View>
        
        {ecoMode && (
          <View style={styles.ecoBadge}>
            <Ionicons name="leaf" size={16} color={colors.textLight} />
            <Text style={styles.ecoBadgeText}>Eco-Modus</Text>
          </View>
        )}
      </View>

      {/* Statistics */}
      {searchResults.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{searchResults.length}</Text>
            <Text style={styles.statLabel}>Verbindungen</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCO2Savings.toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>CO₂ gespart</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>€{averagePrice.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Ø Preis</Text>
          </View>
        </View>
      )}

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortTitle}>Sortieren nach:</Text>
        <View style={styles.sortButtons}>
          {getSortButtons().map((button) => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.sortButton,
                sortBy === button.key && styles.sortButtonActive,
              ]}
              onPress={() => handleSortChange(button.key as typeof sortBy)}
            >
              <Ionicons 
                name={button.icon as any} 
                size={16} 
                color={sortBy === button.key ? colors.textLight : colors.textSecondary} 
              />
              <Text style={[
                styles.sortButtonText,
                sortBy === button.key && styles.sortButtonTextActive,
              ]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {sortRoutes(searchResults).length === 0 ? (
          <View style={styles.noResults}>
            <Ionicons name="search" size={48} color={colors.textSecondary} />
            <Text style={styles.noResultsTitle}>Keine Verbindungen gefunden</Text>
            <Text style={styles.noResultsText}>
              Versuchen Sie es mit anderen Suchkriterien oder einem späteren Zeitpunkt.
            </Text>
            <Button
              title="Neue Suche"
              onPress={() => navigation.goBack()}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <>
            <Text style={styles.resultsTitle}>
              {sortRoutes(searchResults).length} Verbindung{sortRoutes(searchResults).length !== 1 ? 'en' : ''} gefunden
            </Text>
            
            {sortRoutes(searchResults).map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onPress={handleRoutePress}
                showFullDetails={ecoMode}
              />
            ))}
          </>
        )}
      </View>
    </ScrollView>
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
  
  searchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  routeText: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.co2Green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  ecoBadgeText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: colors.surfaceVariant,
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  sortContainer: {
    padding: 16,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  
  sortTitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  sortButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  sortButtonTextActive: {
    color: colors.textLight,
  },
  
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  
  resultsTitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '500',
  },
  
  noResults: {
    alignItems: 'center',
    padding: 40,
  },
  
  noResultsTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  noResultsText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  retryButton: {
    minWidth: 150,
  },
});

export default RouteResultsScreen;