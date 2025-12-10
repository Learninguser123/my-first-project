import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import RouteCard, { Route } from '../../components/route/RouteCard';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { authService } from '../../services/auth';
import { apiService } from '../../services/api';

type RootStackParamList = {
  MainTabs: undefined;
  RouteResults: { from: string; to: string; ecoMode?: boolean };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface UserStats {
  points: number;
  co2Saved: number;
  tripsCount: number;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
  });
  const [userStats, setUserStats] = useState<UserStats>({
    points: 0,
    co2Saved: 0,
    tripsCount: 0,
  });
  const [popularRoutes, setPopularRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
    loadPopularRoutes();
  }, []);

  const loadUserData = async () => {
    try {
      const stats = await apiService.getUserStats();
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadPopularRoutes = async () => {
    try {
      const routes = await apiService.getPopularRoutes();
      setPopularRoutes(routes.map((route: any) => ({
        ...route,
        co2Savings: route.co2Savings || Math.random() * 5,
      })));
    } catch (error) {
      console.error('Failed to load popular routes:', error);
      // Mock data for demo purposes
      setPopularRoutes([
        {
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
        {
          id: '2',
          from: 'Altona',
          to: 'Blankenese',
          departureTime: '15:00',
          arrivalTime: '15:25',
          duration: '25 Min',
          price: 3.20,
          co2Savings: 3.8,
          type: 'train',
          operator: 'S-Bahn',
          transfers: 0,
        },
      ]);
    }
  };

  const handleSearch = () => {
    if (!searchData.from.trim() || !searchData.to.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie Start- und Zielort ein');
      return;
    }

    navigation.navigate('RouteResults', {
      from: searchData.from,
      to: searchData.to,
      ecoMode: false,
    });
  };

  const handleEcoSearch = () => {
    if (!searchData.from.trim() || !searchData.to.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie Start- und Zielort ein');
      return;
    }

    navigation.navigate('RouteResults', {
      from: searchData.from,
      to: searchData.to,
      ecoMode: true,
    });
  };

  const handleRoutePress = (route: Route) => {
    Alert.alert(
      'Verbindung ausgewählt',
      `${route.from} → ${route.to}\nPreis: €${route.price.toFixed(2)}\nCO₂-Einsparung: ${route.co2Savings.toFixed(1)} kg`,
      [
        {
          text: 'Stornieren',
          style: 'cancel',
        },
        {
          text: 'Buchen',
          onPress: () => {
            Alert.alert('Erfolg', 'Verbindung wurde zur Buchung hinzugefügt');
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadPopularRoutes(),
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with User Stats */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hallo! 👋</Text>
            <Text style={styles.subtitle}>Ihre nachhaltige Reise beginnt hier</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="leaf" size={20} color={colors.co2Green} />
              <Text style={styles.statValue}>{userStats.co2Saved.toFixed(1)}kg</Text>
              <Text style={styles.statLabel}>CO₂</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color={colors.warning} />
              <Text style={styles.statValue}>{userStats.points}</Text>
              <Text style={styles.statLabel}>Punkte</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Verbindung suchen</Text>
        
        <View style={styles.searchInputs}>
          <Input
            value={searchData.from}
            onChangeText={(value) => setSearchData(prev => ({ ...prev, from: value }))}
            placeholder="Von..."
            leftIcon={
              <Ionicons 
                name="location" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />
          
          <View style={styles.swapButtonContainer}>
            <Button
              title=""
              onPress={() => setSearchData(prev => ({
                from: prev.to,
                to: prev.from
              }))}
              variant="outline"
              style={styles.swapButton}
            >
              <Ionicons 
                name="swap-vertical" 
                size={20} 
                color={colors.primary} 
              />
            </Button>
          </View>
          
          <Input
            value={searchData.to}
            onChangeText={(value) => setSearchData(prev => ({ ...prev, to: value }))}
            placeholder="Nach..."
            leftIcon={
              <Ionicons 
                name="navigate" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />
        </View>

        <View style={styles.searchButtons}>
          <Button
            title="Suchen"
            onPress={handleSearch}
            loading={isLoading}
            style={styles.searchButton}
          />
          <Button
            title="🌱 Eco-Suche"
            onPress={handleEcoSearch}
            variant="outline"
            style={styles.ecoButton}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Schnellaktionen</Text>
        <View style={styles.actionGrid}>
          <View style={styles.actionCard}>
            <Ionicons name="bicycle" size={32} color={colors.ecoGreen} />
            <Text style={styles.actionTitle}>Fahrrad</Text>
            <Text style={styles.actionSubtitle}>0.0 kg CO₂</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="walk" size={32} color={colors.textSecondary} />
            <Text style={styles.actionTitle}>Zu Fuß</Text>
            <Text style={styles.actionSubtitle}>0.0 kg CO₂</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="bus" size={32} color={colors.secondary} />
            <Text style={styles.actionTitle}>Bus</Text>
            <Text style={styles.actionSubtitle}>1.2 kg CO₂</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="train" size={32} color={colors.primary} />
            <Text style={styles.actionTitle}>Zug</Text>
            <Text style={styles.actionSubtitle}>0.8 kg CO₂</Text>
          </View>
        </View>
      </View>

      {/* Popular Routes */}
      {popularRoutes.length > 0 && (
        <View style={styles.popularRoutes}>
          <Text style={styles.sectionTitle}>Beliebte Verbindungen</Text>
          {popularRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onPress={handleRoutePress}
              showFullDetails={false}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  contentContainer: {
    padding: 16,
  },
  
  header: {
    marginBottom: 24,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  greeting: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  
  statItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  
  statValue: {
    ...typography.h5,
    color: colors.text,
    fontWeight: '600',
    marginVertical: 2,
  },
  
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  
  searchSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  
  searchInputs: {
    marginBottom: 16,
  },
  
  swapButtonContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  
  searchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  searchButton: {
    flex: 1,
  },
  
  ecoButton: {
    flex: 1,
  },
  
  quickActions: {
    marginBottom: 24,
  },
  
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  actionTitle: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
    marginTop: 8,
  },
  
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  popularRoutes: {
    marginBottom: 20,
  },
});

export default HomeScreen;