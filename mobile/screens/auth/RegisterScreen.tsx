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

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    // Name validation
    const nameValidation = authService.validateName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message;
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!authService.validateEmail(formData.email)) {
      newErrors.email = 'Bitte gültige E-Mail eingeben';
    }

    // Password validation
    const passwordValidation = authService.validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwort bestätigen ist erforderlich';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      // Navigation will be handled automatically by AppNavigator
    } catch (error) {
      Alert.alert(
        'Registrierung fehlgeschlagen',
        error instanceof Error ? error.message : 'Bitte versuchen Sie es später erneut'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordRequirements = () => {
    const requirements = [
      { test: formData.password.length >= 6, text: 'Mindestens 6 Zeichen' },
      { test: /(?=.*[a-z])/.test(formData.password), text: 'Ein Kleinbuchstabe' },
      { test: /(?=.*[A-Z])/.test(formData.password), text: 'Ein Großbuchstabe' },
    ];
    return requirements;
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
          <Text style={styles.title}>Konto erstellen</Text>
          <Text style={styles.subtitle}>
            Starten Sie Ihre nachhaltige Reise
          </Text>
        </View>

        {/* Register Form */}
        <View style={styles.form}>
          <Input
            label="Vollständiger Name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Max Mustermann"
            autoCapitalize="words"
            error={errors.name}
            leftIcon={
              <Ionicons 
                name="person" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />

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

          {/* Password Requirements */}
          {formData.password && (
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Passwort-Anforderungen:</Text>
              {getPasswordRequirements().map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Ionicons
                    name={req.test ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={req.test ? colors.success : colors.textSecondary}
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: req.test ? colors.success : colors.textSecondary }
                  ]}>
                    {req.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Input
            label="Passwort bestätigen"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="••••••••"
            secureTextEntry
            error={errors.confirmPassword}
            leftIcon={
              <Ionicons 
                name="lock-closed" 
                size={20} 
                color={colors.textSecondary} 
              />
            }
          />

          <Button
            title="Konto erstellen"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.registerButton}
          />
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bereits ein Konto?
          </Text>
          <Button
            title="Anmelden"
            onPress={() => navigation.navigate('Login')}
            variant="text"
            textStyle={styles.loginButton}
          />
        </View>

        {/* Eco Benefits */}
        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>
            🌱 Ihre Vorteile:
          </Text>
          <View style={styles.benefitList}>
            <Text style={styles.benefitItem}>• Bonus: 50 Öko-Punkte für Neukunden</Text>
            <Text style={styles.benefitItem}>• Personalisierte Grünstrecken</Text>
            <Text style={styles.benefitItem}>• CO₂-Progress verfolgen</Text>
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
    marginBottom: 32,
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
    marginBottom: 24,
  },
  
  passwordRequirements: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginVertical: 8,
  },
  
  requirementsTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  requirementText: {
    ...typography.caption,
    marginLeft: 8,
  },
  
  registerButton: {
    marginTop: 8,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginRight: 8,
  },
  
  loginButton: {
    color: colors.primary,
    fontWeight: '600',
  },
  
  benefits: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  
  benefitsTitle: {
    ...typography.h5,
    color: colors.ecoGreen,
    marginBottom: 12,
    textAlign: 'center',
  },
  
  benefitList: {
    gap: 4,
  },
  
  benefitItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default RegisterScreen;