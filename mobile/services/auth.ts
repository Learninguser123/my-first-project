import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, User, LoginRequest, RegisterRequest } from './api';

class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginRequest): Promise<User> {
    try {
      const response = await apiService.login(credentials);
      return response.user;
    } catch (error) {
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<User> {
    try {
      const response = await apiService.register(userData);
      return response.user;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch (error) {
      throw error;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const user = await AsyncStorage.getItem('user');
      
      // Check if both token and user data exist
      if (!token || !user) {
        return false;
      }
      
      // Optionally verify the token is still valid by making a request
      try {
        await this.getCurrentUser();
        return true;
      } catch (error) {
        // Token is invalid, clear storage
        await this.clearStorage();
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiService.getCurrentUser();
      return user;
    } catch (error) {
      // If we can't get the current user, try to get from storage
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (parseError) {
          console.error('Failed to parse stored user data:', parseError);
        }
      }
      return null;
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  async updateUserProfile(userData: Partial<User>): Promise<User> {
    try {
      const updatedUser = await apiService.updateProfile(userData);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async clearStorage(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  // Helper methods for validation
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return {
        isValid: false,
        message: 'Passwort muss mindestens 6 Zeichen lang sein',
      };
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: 'Passwort muss einen Kleinbuchstaben enthalten',
      };
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: 'Passwort muss einen Großbuchstaben enthalten',
      };
    }
    
    return { isValid: true };
  }

  validateName(name: string): { isValid: boolean; message?: string } {
    if (!name.trim()) {
      return {
        isValid: false,
        message: 'Name darf nicht leer sein',
      };
    }
    
    if (name.length < 2) {
      return {
        isValid: false,
        message: 'Name muss mindestens 2 Zeichen lang sein',
      };
    }
    
    return { isValid: true };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Also export the class for testing
export { AuthService };