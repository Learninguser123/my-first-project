import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the base URL - in a real app, this would be your backend URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Types for API responses
export interface User {
  id: string;
  email: string;
  name: string;
  points: number;
  co2Saved: number;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RouteSearchParams {
  from: string;
  to: string;
  date?: string;
  time?: string;
  ecoMode?: boolean;
}

export interface BookingRequest {
  routeId: string;
  seats: number;
  price: number;
}

export interface Booking {
  id: string;
  routeId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;
  createdAt: string;
  route: any;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage
          await AsyncStorage.multiRemove(['authToken', 'user']);
          // In a real app, you might want to navigate to login screen here
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/login', credentials);
      
      // Store token and user data
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/register', userData);
      
      // Store token and user data
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local storage
      console.warn('Logout request failed:', error);
    } finally {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.client.get<User>('/auth/me');
      
      // Update stored user data
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Route endpoints
  async searchRoutes(params: RouteSearchParams): Promise<any[]> {
    try {
      const response = await this.client.get<any[]>('/routes/search', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getRouteById(routeId: string): Promise<any> {
    try {
      const response = await this.client.get(`/routes/${routeId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPopularRoutes(): Promise<any[]> {
    try {
      const response = await this.client.get<any[]>('/routes/popular');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Booking endpoints
  async createBooking(bookingData: BookingRequest): Promise<Booking> {
    try {
      const response = await this.client.post<Booking>('/bookings', bookingData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      const response = await this.client.get<Booking[]>('/bookings');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await this.client.get<Booking>(`/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelBooking(bookingId: string): Promise<void> {
    try {
      await this.client.patch(`/bookings/${bookingId}/cancel`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User profile endpoints
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await this.client.patch<User>('/users/profile', userData);
      
      // Update stored user data
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserStats(): Promise<{ points: number; co2Saved: number; tripsCount: number }> {
    try {
      const response = await this.client.get('/users/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Server error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error - please check your connection');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Also export the class for testing or creating multiple instances
export { ApiService };