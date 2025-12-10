import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { authService } from '../../services/auth';
import { apiService } from '../../services/api';

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
  });
  const [stats, setStats] = useState({
    points: 0,
    co2Saved: 0,
    tripsCount: 0,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [userData, userStats] = await Promise.all([
        authService.getCurrentUser(),
        apiService.getUserStats(),
      ]);
      
      setUser(userData);
      setStats(userStats);
      setEditForm({
        name: userData?.name || '',
        email: userData?.email || '',
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Mock data for demo purposes
      const mockUser: User = {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        points: 245,
        co2Saved: 12.8,
        createdAt: '2024-01-01T00:00:00Z',
      };
      setUser(mockUser);
      setStats({
        points: 245,
        co2Saved: 12.8,
        tripsCount: 18,
      });
      setEditForm({
        name: mockUser.name,
        email: mockUser.email,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const updatedUser = await authService.updateProfile({
        name: editForm.name,
        email: editForm.email,
      });
      setUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Erfolg', 'Profil wurde aktualisiert');
    } catch (error) {
      Alert.alert(
        'Fehler',
        error instanceof Error ? error.message : 'Profil konnte nicht aktualisiert werden'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Sind Sie sicher, dass Sie sich abmelden möchten?',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              // Navigation will be handled by AppNavigator
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ]
    );
  };

  const getAchievements = () => [
    {
      icon: 'leaf',
      title: 'Umweltfreundlich',
      description: '10+ kg CO₂ eingespart',
      unlocked: stats.co2Saved >= 10,
      color: colors.co2Green,
    },
    {
      icon: 'star',
      title: 'Punkte-Sammler',
      description: '200+ Punkte gesammelt',
      unlocked: stats.points >= 200,
      color: colors.warning,
    },
    {
      icon: 'footsteps',
      title: 'Reisender',
      description: '15+ Fahrten',
      unlocked: stats.tripsCount >= 15,
      color: colors.primary,
    },
    {
      icon: 'rocket',
      title: 'Eco-Pionier',
      description: '25+ Eco-Fahrten',
      unlocked: false, // Would need to track eco trips
      color: colors.ecoGreen,
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Lade Profil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorText}>Profil konnte nicht geladen werden</Text>
        <Button title="Erneut versuchen" onPress={loadUserData} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={colors.textLight} />
          </View>
          <TouchableOpacity style={styles.editButton} onPress={isEditing ? handleCancelEdit : handleEdit}>
            <Ionicons 
              name={isEditing ? "close" : "create"} 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {isEditing ? (
          <View style={styles.editForm}>
            <Input
              label="Name"
              value={editForm.name}
              onChangeText={(value) => setEditForm(prev => ({ ...prev, name: value }))}
              placeholder="Ihr Name"
            />
            <Input
              label="E-Mail"
              value={editForm.email}
              onChangeText={(value) => setEditForm(prev => ({ ...prev, email: value }))}
              placeholder="Ihre E-Mail"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <Button
                title="Speichern"
                onPress={handleSave}
                style={styles.saveButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.memberSince}>
              Mitglied seit {formatDate(user.createdAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Meine Erfolge</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{user.points}</Text>
            <Text style={styles.statLabel}>Punkte</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="leaf" size={24} color={colors.co2Green} />
            <Text style={styles.statValue}>{user.co2Saved.toFixed(1)}</Text>
            <Text style={styles.statLabel}>kg CO₂</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="map" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.tripsCount}</Text>
            <Text style={styles.statLabel}>Fahrten</Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Abzeichen</Text>
        <View style={styles.achievementsGrid}>
          {getAchievements().map((achievement, index) => (
            <View
              key={index}
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementCardLocked,
              ]}
            >
              <View style={[
                styles.achievementIcon,
                { backgroundColor: achievement.unlocked ? achievement.color + '20' : colors.surfaceVariant }
              ]}>
                <Ionicons
                  name={achievement.icon as any}
                  size={24}
                  color={achievement.unlocked ? achievement.color : colors.textSecondary}
                />
              </View>
              <Text style={[
                styles.achievementTitle,
                !achievement.unlocked && styles.achievementTitleLocked,
              ]}>
                {achievement.title}
              </Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
              {achievement.unlocked && (
                <View style={styles.achievementBadge}>
                  <Ionicons name="checkmark" size={12} color={colors.textLight} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Einstellungen</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications" size={20} color={colors.textSecondary} />
          <Text style={styles.settingText}>Benachrichtigungen</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
          <Text style={styles.settingText}>Datenschutz</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle" size={20} color={colors.textSecondary} />
          <Text style={styles.settingText}>Hilfe & Support</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
          <Text style={styles.settingText}>Über HVV Mobility</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Abmelden"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        />
      </View>

      <View style={styles.bottomSpacing} />
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
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  
  errorText: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
  },
  
  header: {
    backgroundColor: colors.primary,
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 100,
    backgroundColor: colors.surface,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  
  editForm: {
    gap: 16,
  },
  
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  
  saveButton: {
    flex: 1,
  },
  
  profileInfo: {
    alignItems: 'center',
  },
  
  userName: {
    ...typography.h2,
    color: colors.textLight,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  userEmail: {
    ...typography.body1,
    color: colors.textLight + 'CC',
    marginBottom: 8,
  },
  
  memberSince: {
    ...typography.caption,
    color: colors.textLight + '99',
  },
  
  statsSection: {
    padding: 20,
  },
  
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginVertical: 8,
  },
  
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  achievementsSection: {
    padding: 20,
    paddingTop: 0,
  },
  
  achievementsGrid: {
    gap: 12,
  },
  
  achievementCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  achievementCardLocked: {
    opacity: 0.6,
  },
  
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  achievementTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  
  achievementTitleLocked: {
    color: colors.textSecondary,
  },
  
  achievementDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    marginTop: 2,
  },
  
  achievementBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  settingsSection: {
    padding: 20,
    paddingTop: 0,
  },
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  
  settingText: {
    ...typography.body1,
    color: colors.text,
    flex: 1,
    marginLeft: 16,
  },
  
  logoutSection: {
    padding: 20,
    paddingTop: 0,
  },
  
  logoutButton: {
    width: '100%',
  },
  
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;