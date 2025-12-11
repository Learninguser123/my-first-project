import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { authService } from '../../services/auth';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!authService.validateEmail(formData.email)) {
      newErrors.email = 'Bitte gültige E-Mail eingeben';
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({
        email: formData.email,
        password: formData.password,
      });
      // Navigation will be handled automatically by AppNavigator
    } catch (error) {
      Alert.alert(
        'Anmeldung fehlgeschlagen',
        error instanceof Error ? error.message : 'Bitte versuchen Sie es später erneut'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="leaf" 
              size={48} 
              color={colors.primary} 
            />
          </View>
          <Text style={styles.title}>HVV Mobility</Text>
          <Text style={styles.subtitle}>
            Nachhaltige Mobilität für Hamburg
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Input
            label="E-Mail"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="ihre@email.de"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            leftIcon={
              <Ionicons 
                name="mail" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />

          <Input
            label="Passwort"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            leftIcon={
              <Ionicons 
                name="lock-closed" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />

          <Button
            title="Anmelden"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginButton}
          />
        </View>

        {/* Register Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Noch kein Konto?
          </Text>
          <Button
            title="Jetzt registrieren"
            onPress={() => navigation.navigate('Register')}
            variant="text"
            textStyle={styles.registerButton}
          />
        </View>

        {/* Eco Features */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>
            🌱 Nachhaltige Features:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• CO₂-Einsparungen tracken</Text>
            <Text style={styles.featureItem}>• Öko-Punkte sammeln</Text>
            <Text style={styles.featureItem}>• Grünstrecken entdecken</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  title: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  form: {
    marginBottom: 32,
  },
  
  loginButton: {
    marginTop: 8,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginRight: 8,
  },
  
  registerButton: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  features: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  
  featuresTitle: {
    ...typography.h5,
    color: colors.ecoGreen,
    marginBottom: 12,
    textAlign: 'center',
  },
  
  featureList: {
    gap: 4,
  },
  
  featureItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default LoginScreen;