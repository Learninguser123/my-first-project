// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DRIVER = 'driver',
}

export interface UserProfile {
  userId: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: NotificationPreferences;
  mobility: MobilityPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

export interface MobilityPreferences {
  preferredVehicleTypes: VehicleType[];
  maxWalkingDistance: number; // in meters
  avoidTolls: boolean;
  avoidHighways: boolean;
  wheelchairAccessible: boolean;
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Vehicle and transportation types
export enum VehicleType {
  BUS = 'bus',
  TRAM = 'tram',
  SUBWAY = 'subway',
  TRAIN = 'train',
  FERRY = 'ferry',
  TAXI = 'taxi',
  E_BIKE = 'e_bike',
  E_SCOOTER = 'e_scooter',
  CAR_SHARING = 'car_sharing',
  WALKING = 'walking',
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  operatorId: string;
  capacity: number;
  currentLocation?: GeoLocation;
  status: VehicleStatus;
  features?: VehicleFeatures;
  lastUpdated: Date;
}

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service',
}

export interface VehicleFeatures {
  wheelchairAccessible: boolean;
  airConditioned: boolean;
  wifiAvailable: boolean;
  chargingPorts: boolean;
  bicycleAllowed: boolean;
}

// Route and navigation types
export interface Route {
  id: string;
  name: string;
  type: RouteType;
  startPoint: GeoLocation;
  endPoint: GeoLocation;
  waypoints: GeoLocation[];
  distance: number; // in meters
  duration: number; // in seconds
  price: number;
  currency: string;
  vehicleTypes: VehicleType[];
  operatorId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RouteType {
  PUBLIC_TRANSPORT = 'public_transport',
  SHARED_MOBILITY = 'shared_mobility',
  MIXED = 'mixed',
  WALKING = 'walking',
  CYCLING = 'cycling',
}

export interface RouteSegment {
  id: string;
  routeId: string;
  vehicleType: VehicleType;
  startPoint: GeoLocation;
  endPoint: GeoLocation;
  distance: number;
  duration: number;
  instructions: string[];
  departureTime?: Date;
  arrivalTime?: Date;
  vehicleId?: string;
  lineNumber?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

// Booking types
export interface Booking {
  id: string;
  userId: string;
  routeId: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  passengers: number;
  pointsEarned?: number;
  specialRequests?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingRequest {
  userId: string;
  routeId: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  currency: string;
  passengers: number;
  specialRequests?: string[];
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  pointsEarned?: number;
  specialRequests?: string[];
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

// Payment types
export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
}

// Operator types
export interface Operator {
  id: string;
  name: string;
  type: OperatorType;
  contactInfo: ContactInfo;
  apiConfig?: ApiConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum OperatorType {
  PUBLIC_TRANSPORT = 'public_transport',
  SHARED_MOBILITY = 'shared_mobility',
  TAXI_SERVICE = 'taxi_service',
  RENTAL_SERVICE = 'rental_service',
}

export interface ContactInfo {
  email: string;
  phone: string;
  website?: string;
  address?: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  timeout?: number;
  retryAttempts?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Real-time tracking types
export interface VehicleTracking {
  vehicleId: string;
  location: GeoLocation;
  speed: number; // km/h
  heading: number; // degrees
  timestamp: Date;
  nextStop?: string;
  estimatedArrival?: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  ROUTE_DELAY = 'route_delay',
  VEHICLE_ARRIVAL = 'vehicle_arrival',
  SYSTEM_UPDATE = 'system_update',
}

// External API types (HVV integration)
export interface HvvRouteRequest {
  origin: GeoLocation;
  destination: GeoLocation;
  departureTime?: Date;
  arrivalTime?: Date;
  vehicleTypes?: VehicleType[];
  wheelchairAccessible?: boolean;
}

export interface HvvRouteResponse {
  routes: HvvRoute[];
  metadata: HvvMetadata;
}

export interface HvvRoute {
  id: string;
  duration: number;
  distance: number;
  segments: HvvSegment[];
  price?: HvvPrice;
}

export interface HvvSegment {
  type: VehicleType;
  lineNumber?: string;
  departure: HvvStop;
  arrival: HvvStop;
  duration: number;
  distance: number;
}

export interface HvvStop {
  name: string;
  id: string;
  location: GeoLocation;
  time: Date;
}

export interface HvvPrice {
  amount: number;
  currency: string;
  ticketType: string;
}

export interface HvvMetadata {
  requestId: string;
  timestamp: Date;
  currency: string;
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: ServiceHealth[];
  uptime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

// Configuration types
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  externalApis: ExternalApiConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: string;
  corsOrigins: string[];
  rateLimiting: RateLimitConfig;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  keyPrefix: string;
  connectTimeout: number;
  retryAttempts: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface ExternalApiConfig {
  hvv: HvvApiConfig;
  googleMaps: GoogleMapsConfig;
  weather: WeatherApiConfig;
  stripe: StripeConfig;
}

export interface HvvApiConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  timeout: number;
}

export interface GoogleMapsConfig {
  apiKey: string;
  baseUrl: string;
}

export interface WeatherApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, true, 'DATABASE_ERROR');
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class ExternalApiError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} API error: ${message}`, 502, true, 'EXTERNAL_API_ERROR');
  }
}