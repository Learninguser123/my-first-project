-- HVV Mobility Platform Database Schema
-- PostgreSQL 14+ with PostGIS Extension
-- Initial Schema Creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- ========================================
-- USER MANAGEMENT TABLES
-- ========================================

-- Users table with authentication and basic profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0
);

-- User profiles with additional personal information and preferences
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Germany',
    preferred_language VARCHAR(10) DEFAULT 'de',
    mobility_preferences JSONB, -- Stores user preferences like: preferred_transport_modes, max_walking_distance, etc.
    profile_picture_url TEXT,
    notification_preferences JSONB, -- Email, push, SMS preferences
    privacy_settings JSONB, -- Data sharing preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (date_of_birth < CURRENT_DATE)
);

-- User payment methods
CREATE TABLE user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'credit_card', 'paypal', 'sepa', 'apple_pay', 'google_pay'
    provider VARCHAR(100), -- 'visa', 'mastercard', 'paypal', etc.
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    payment_token TEXT, -- Encrypted payment token from payment provider
    last_four VARCHAR(4), -- Last 4 digits for display
    expiry_month INTEGER,
    expiry_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (expiry_month BETWEEN 1 AND 12),
    CHECK (expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE))
);

-- ========================================
-- HVV PUBLIC TRANSPORT DATA
-- ========================================

-- HVV transit stops/stations
CREATE TABLE hvv_stops (
    stop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hvv_stop_id VARCHAR(50) UNIQUE NOT NULL, -- Official HVV stop ID
    stop_name VARCHAR(255) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL, -- PostGIS point for geospatial queries
    address TEXT,
    postal_code VARCHAR(10),
    city VARCHAR(100),
    stop_type VARCHAR(50), -- 'bus_stop', 'tram_stop', 's_bahn', 'u_bahn', 'ferry'
    accessibility_features JSONB, -- Wheelchair access, elevator, etc.
    facilities JSONB, -- Parking, bike racks, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HVV transit routes
CREATE TABLE hvv_routes (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hvv_route_id VARCHAR(50) UNIQUE NOT NULL, -- Official HVV route ID
    route_short_name VARCHAR(50) NOT NULL, -- e.g., "U1", "S21", "Bus 6"
    route_long_name VARCHAR(255) NOT NULL, -- e.g., "U1: Norderstedt ↔ Ohlsdorf"
    route_type INTEGER NOT NULL, -- GTFS route_type (0=Tram, 1=Subway, 2=Rail, 3=Bus, etc.)
    agency_name VARCHAR(255) NOT NULL, -- e.g., "Hamburger Hochbahn", "DB Regio"
    color VARCHAR(7), -- Route color in hex format
    text_color VARCHAR(7), -- Text color in hex format
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (route_type BETWEEN 0 AND 12)
);

-- HVV transit trips (specific vehicle journeys)
CREATE TABLE hvv_trips (
    trip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hvv_trip_id VARCHAR(50) UNIQUE NOT NULL, -- Official HVV trip ID
    route_id UUID NOT NULL REFERENCES hvv_routes(route_id),
    service_id VARCHAR(50) NOT NULL, -- Service calendar identifier
    trip_headsign VARCHAR(255) NOT NULL, -- Destination display
    direction_id INTEGER, -- 0 or 1 for bidirectional routes
    wheelchair_accessible INTEGER DEFAULT 0, -- 0=No info, 1=Yes, 2=No
    bikes_allowed INTEGER DEFAULT 0, -- 0=No info, 1=Yes, 2=No
    start_time TIME NOT NULL, -- First departure time
    end_time TIME NOT NULL, -- Last arrival time
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (direction_id IN (0, 1)),
    CHECK (wheelchair_accessible BETWEEN 0 AND 2),
    CHECK (bikes_allowed BETWEEN 0 AND 2)
);

-- HVV stop times (schedule information)
CREATE TABLE hvv_stop_times (
    stop_time_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES hvv_trips(trip_id),
    stop_id UUID NOT NULL REFERENCES hvv_stops(stop_id),
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_sequence INTEGER NOT NULL,
    stop_headsign VARCHAR(255),
    pickup_type INTEGER DEFAULT 0, -- 0=Regular, 1=No pickup, 2=Phone, 3=Coordinate
    drop_off_type INTEGER DEFAULT 0, -- 0=Regular, 1=No drop off, 2=Phone, 3=Coordinate
    shape_dist_traveled NUMERIC(10, 3), -- Distance traveled along shape
    timepoint INTEGER DEFAULT 1, -- 0=Approximate, 1=Exact
    CHECK (pickup_type BETWEEN 0 AND 3),
    CHECK (drop_off_type BETWEEN 0 AND 3),
    CHECK (timepoint IN (0, 1)),
    UNIQUE(trip_id, stop_sequence)
);

-- ========================================
-- MOBILITY PROVIDERS AND E-SCOOTERS
-- ========================================

-- Mobility service providers
CREATE TABLE mobility_providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- 'e_scooter', 'bike_sharing', 'car_sharing', 'ride_sharing'
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website_url TEXT,
    api_endpoint TEXT, -- Integration endpoint
    api_key_encrypted TEXT, -- Encrypted API key for integration
    pricing_model JSONB, -- Pricing structure details
    service_area GEOMETRY(MULTIPOLYGON, 4326), -- Service area boundaries
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E-scooter fleet information
CREATE TABLE e_scooter_fleet (
    vehicle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES mobility_providers(provider_id),
    hvv_vehicle_id VARCHAR(100) UNIQUE, -- HVV integration ID
    vehicle_model VARCHAR(100) NOT NULL,
    battery_level INTEGER NOT NULL CHECK (battery_level BETWEEN 0 AND 100),
    last_known_location GEOMETRY(POINT, 4326),
    current_status VARCHAR(50) NOT NULL, -- 'available', 'in_use', 'maintenance', 'charging'
    last_status_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    max_speed NUMERIC(5, 2), -- Maximum speed in km/h
    range_km NUMERIC(5, 2), -- Maximum range in km
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_status IN ('available', 'in_use', 'maintenance', 'charging', 'offline'))
);

-- Real-time e-scooter status updates
CREATE TABLE e_scooter_status_history (
    status_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES e_scooter_fleet(vehicle_id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('available', 'in_use', 'maintenance', 'charging', 'offline'))
);

-- ========================================
-- RIDE-SHARING AND BOOKINGS
-- ========================================

-- Ride-sharing trips
CREATE TABLE ride_sharing_trips (
    trip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES users(id), -- Can be NULL for professional services
    provider_id UUID NOT NULL REFERENCES mobility_providers(provider_id),
    origin_location GEOMETRY(POINT, 4326) NOT NULL,
    destination_location GEOMETRY(POINT, 4326) NOT NULL,
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    route_geometry GEOMETRY(LINESTRING, 4326), -- Actual route taken
    distance_km NUMERIC(8, 3) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    vehicle_type VARCHAR(50), -- 'sedan', 'suv', 'electric', 'accessible'
    capacity INTEGER DEFAULT 4,
    current_occupancy INTEGER DEFAULT 1,
    base_price NUMERIC(10, 2),
    final_price NUMERIC(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
    CHECK (capacity > 0),
    CHECK (current_occupancy BETWEEN 1 AND capacity),
    CHECK (duration_minutes > 0),
    CHECK (distance_km > 0)
);

-- Passenger bookings for ride-sharing
CREATE TABLE ride_bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES ride_sharing_trips(trip_id),
    passenger_id UUID NOT NULL REFERENCES users(id),
    pickup_location GEOMETRY(POINT, 4326) NOT NULL,
    dropoff_location GEOMETRY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    booking_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    seats_reserved INTEGER DEFAULT 1,
    price_per_seat NUMERIC(10, 2),
    total_price NUMERIC(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_dropoff_time TIMESTAMP WITH TIME ZONE,
    actual_dropoff_time TIMESTAMP WITH TIME ZONE,
    passenger_rating INTEGER, -- 1-5 rating from passenger
    driver_rating INTEGER, -- 1-5 rating from driver
    passenger_feedback TEXT,
    driver_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (booking_status IN ('pending', 'confirmed', 'picked_up', 'dropped_off', 'cancelled', 'no_show')),
    CHECK (seats_reserved > 0),
    CHECK (passenger_rating BETWEEN 1 AND 5),
    CHECK (driver_rating BETWEEN 1 AND 5)
);

-- Payment transactions for mobility services
CREATE TABLE payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES ride_bookings(booking_id),
    payment_method_id UUID REFERENCES user_payment_methods(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'refund', 'credit', 'debit'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    provider_transaction_id VARCHAR(255), -- Transaction ID from payment provider
    payment_gateway VARCHAR(100), -- 'stripe', 'paypal', 'adyen', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (transaction_type IN ('payment', 'refund', 'credit', 'debit')),
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    CHECK (amount != 0)
);

-- ========================================
-- ROUTE PLANNING DATA
-- ========================================

-- Saved user routes
CREATE TABLE saved_routes (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    route_name VARCHAR(255) NOT NULL,
    origin_location GEOMETRY(POINT, 4326) NOT NULL,
    destination_location GEOMETRY(POINT, 4326) NOT NULL,
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    preferred_transport_modes JSONB, -- Array of preferred transport modes
    route_parameters JSONB, -- Walking distance, max transfers, etc.
    is_favorite BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (usage_count >= 0)
);

-- Route planning history/cache
CREATE TABLE route_planning_history (
    planning_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- Can be NULL for anonymous queries
    origin_location GEOMETRY(POINT, 4326) NOT NULL,
    destination_location GEOMETRY(POINT, 4326) NOT NULL,
    requested_transport_modes JSONB NOT NULL,
    planned_routes JSONB NOT NULL, -- Array of route options with details
    selected_route_index INTEGER, -- Index of the route the user selected
    total_co2_emissions NUMERIC(10, 4), -- CO2 emissions in kg
    total_cost NUMERIC(10, 2), -- Total estimated cost
    total_duration_minutes INTEGER,
    total_distance_km NUMERIC(8, 3),
    query_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_cache_entry BOOLEAN DEFAULT FALSE,
    cache_expires TIMESTAMP WITH TIME ZONE,
    CHECK (selected_route_index >= 0),
    CHECK (total_co2_emissions >= 0),
    CHECK (total_cost >= 0),
    CHECK (total_duration_minutes >= 0),
    CHECK (total_distance_km >= 0)
);

-- ========================================
-- CO₂ EMISSIONS AND SUSTAINABILITY
-- ========================================

-- CO2 emission factors for different transport modes (German UBA standards)
CREATE TABLE co2_emission_factors (
    factor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transport_mode VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    emission_factor NUMERIC(10, 4) NOT NULL, -- CO2 grams per passenger-kilometer
    unit VARCHAR(20) DEFAULT 'g/passenger-km',
    source VARCHAR(255) DEFAULT 'German UBA',
    validity_period DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (emission_factor >= 0),
    UNIQUE(transport_mode, vehicle_type)
);

-- User CO2 tracking
CREATE TABLE user_co2_tracking (
    tracking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trip_id UUID, -- Can reference various trip types
    transport_mode VARCHAR(100) NOT NULL,
    distance_km NUMERIC(8, 3) NOT NULL,
    co2_emissions NUMERIC(10, 4) NOT NULL, -- CO2 emissions in kg
    alternative_co2_emissions NUMERIC(10, 4), -- CO2 if alternative transport was used
    savings_percentage NUMERIC(5, 2), -- Percentage saved compared to car
    trip_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (distance_km > 0),
    CHECK (co2_emissions >= 0),
    CHECK (alternative_co2_emissions >= 0),
    CHECK (savings_percentage BETWEEN 0 AND 100)
);

-- Sustainability achievements and milestones
CREATE TABLE sustainability_achievements (
    achievement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    achievement_type VARCHAR(100) NOT NULL, -- 'co2_saver', 'green_traveler', 'public_transport_hero'
    achievement_title VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB, -- Conditions to earn the achievement
    progress NUMERIC(5, 2) DEFAULT 0, -- Progress percentage (0-100)
    earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (progress BETWEEN 0 AND 100),
    UNIQUE(user_id, achievement_type)
);

-- ========================================
-- REWARDS SYSTEM
-- ========================================

-- User points balance
CREATE TABLE user_points_balance (
    balance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    current_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (current_balance >= 0),
    CHECK (total_earned >= 0),
    CHECK (total_spent >= 0),
    UNIQUE(user_id)
);

-- Points transactions
CREATE TABLE points_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'expired', 'refund'
    points INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL, -- Why points were earned/spent
    reference_id UUID, -- Reference to related record (trip, achievement, etc.)
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- When earned points expire
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (points != 0),
    CHECK (transaction_type IN ('earned', 'spent', 'expired', 'refund'))
);

-- Rewards catalog
CREATE TABLE rewards_catalog (
    reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reward_type VARCHAR(100) NOT NULL, -- 'discount', 'free_ride', 'merchandise', 'voucher'
    points_cost INTEGER NOT NULL,
    monetary_value NUMERIC(10, 2), -- Monetary value in EUR
    terms_conditions TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_limited BOOLEAN DEFAULT FALSE,
    total_quantity INTEGER,
    available_quantity INTEGER,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (points_cost > 0),
    CHECK (monetary_value >= 0),
    CHECK (total_quantity > 0),
    CHECK (available_quantity >= 0),
    CHECK (available_quantity <= total_quantity)
);

-- User reward redemptions
CREATE TABLE reward_redemptions (
    redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    reward_id UUID NOT NULL REFERENCES rewards_catalog(reward_id),
    points_used INTEGER NOT NULL,
    redemption_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'used', 'expired', 'cancelled'
    voucher_code VARCHAR(100) UNIQUE, -- Generated voucher code
    redemption_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    used_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (redemption_status IN ('pending', 'confirmed', 'used', 'expired', 'cancelled')),
    CHECK (points_used > 0)
);

-- ========================================
-- SYSTEM CONFIGURATION AND LOGGING
-- ========================================

-- System configuration
CREATE TABLE system_configuration (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API usage logging
CREATE TABLE api_usage_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_size INTEGER,
    response_size INTEGER,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (request_size >= 0),
    CHECK (response_size >= 0),
    CHECK (response_time_ms >= 0)
);

-- System events and notifications
CREATE TABLE system_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    details JSONB, -- Additional event details
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (event_severity IN ('info', 'warning', 'error', 'critical'))
);

-- ========================================
-- TRIGGERS AND FUNCTIONS
-- ========================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payment_methods_updated_at BEFORE UPDATE ON user_payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvv_stops_updated_at BEFORE UPDATE ON hvv_stops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvv_routes_updated_at BEFORE UPDATE ON hvv_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvv_trips_updated_at BEFORE UPDATE ON hvv_trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_e_scooter_fleet_updated_at BEFORE UPDATE ON e_scooter_fleet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_sharing_trips_updated_at BEFORE UPDATE ON ride_sharing_trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_bookings_updated_at BEFORE UPDATE ON ride_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_routes_updated_at BEFORE UPDATE ON saved_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_co2_emission_factors_updated_at BEFORE UPDATE ON co2_emission_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sustainability_achievements_updated_at BEFORE UPDATE ON sustainability_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_points_balance_updated_at BEFORE UPDATE ON user_points_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_catalog_updated_at BEFORE UPDATE ON rewards_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_redemptions_updated_at BEFORE UPDATE ON reward_redemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Points balance update function
CREATE OR REPLACE FUNCTION update_user_points_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points_balance (user_id, current_balance, total_earned, total_spent, last_updated)
    VALUES (NEW.user_id, 
            CASE WHEN NEW.transaction_type = 'earned' THEN NEW.points 
                 WHEN NEW.transaction_type IN ('spent', 'expired') THEN -NEW.points 
                 ELSE 0 END,
            CASE WHEN NEW.transaction_type = 'earned' THEN NEW.points ELSE 0 END,
            CASE WHEN NEW.transaction_type IN ('spent', 'expired') THEN NEW.points ELSE 0 END,
            CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        current_balance = user_points_balance.current_balance + 
                         CASE WHEN NEW.transaction_type = 'earned' THEN NEW.points 
                              WHEN NEW.transaction_type IN ('spent', 'expired') THEN -NEW.points 
                              ELSE 0 END,
        total_earned = user_points_balance.total_earned + 
                      CASE WHEN NEW.transaction_type = 'earned' THEN NEW.points ELSE 0 END,
        total_spent = user_points_balance.total_spent + 
                     CASE WHEN NEW.transaction_type IN ('spent', 'expired') THEN NEW.points ELSE 0 END,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update points balance when points transactions occur
CREATE TRIGGER update_points_balance_trigger
    AFTER INSERT OR UPDATE ON points_transactions
    FOR EACH ROW EXECUTE FUNCTION update_user_points_balance();

-- User login statistics update function
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_login = CURRENT_TIMESTAMP,
        login_count = login_count + 1
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger would be called when a user successfully logs in
-- Note: This would typically be called from application logic after successful authentication