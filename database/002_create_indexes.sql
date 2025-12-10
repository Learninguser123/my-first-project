-- HVV Mobility Platform Database Indexes
-- Performance Optimization Indexes
-- PostgreSQL 14+ with PostGIS Extension

-- ========================================
-- GEOSPATIAL INDEXES
-- ========================================

-- PostGIS GIST indexes for location-based queries
CREATE INDEX idx_hvv_stops_location ON hvv_stops USING GIST (location);

CREATE INDEX idx_e_scooter_fleet_location ON e_scooter_fleet USING GIST (last_known_location) 
    WHERE current_status = 'available';

CREATE INDEX idx_e_scooter_status_history_location ON e_scooter_status_history USING GIST (location);

CREATE INDEX idx_ride_sharing_trips_origin ON ride_sharing_trips USING GIST (origin_location);

CREATE INDEX idx_ride_sharing_trips_destination ON ride_sharing_trips USING GIST (destination_location);

CREATE INDEX idx_ride_sharing_trips_route ON ride_sharing_trips USING GIST (route_geometry);

CREATE INDEX idx_ride_bookings_pickup ON ride_bookings USING GIST (pickup_location);

CREATE INDEX idx_ride_bookings_dropoff ON ride_bookings USING GIST (dropoff_location);

CREATE INDEX idx_saved_routes_origin ON saved_routes USING GIST (origin_location);

CREATE INDEX idx_saved_routes_destination ON saved_routes USING GIST (destination_location);

CREATE INDEX idx_route_planning_origin ON route_planning_history USING GIST (origin_location);

CREATE INDEX idx_route_planning_destination ON route_planning_history USING GIST (destination_location);

CREATE INDEX idx_mobility_providers_service_area ON mobility_providers USING GIST (service_area)
    WHERE is_active = TRUE;

-- ========================================
-- USER MANAGEMENT INDEXES
-- ========================================

-- Users table indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_phone ON users (phone_number);
CREATE INDEX idx_users_is_active ON users (is_active);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_last_login ON users (last_login);

-- User profiles indexes
CREATE INDEX idx_user_profiles_postal_code ON user_profiles (postal_code);
CREATE INDEX idx_user_profiles_city ON user_profiles (city);
CREATE INDEX idx_user_profiles_country ON user_profiles (country);
CREATE INDEX idx_user_profiles_language ON user_profiles (preferred_language);

-- User payment methods indexes
CREATE INDEX idx_user_payment_methods_user_id ON user_payment_methods (user_id);
CREATE INDEX idx_user_payment_methods_type ON user_payment_methods (method_type);
CREATE INDEX idx_user_payment_methods_is_default ON user_payment_methods (is_default);
CREATE INDEX idx_user_payment_methods_is_active ON user_payment_methods (is_active);

-- ========================================
-- HVV PUBLIC TRANSPORT INDEXES
-- ========================================

-- HVV stops indexes
CREATE INDEX idx_hvv_stops_hvv_id ON hvv_stops (hvv_stop_id);
CREATE INDEX idx_hvv_stops_name ON hvv_stops (stop_name);
CREATE INDEX idx_hvv_stops_type ON hvv_stops (stop_type);
CREATE INDEX idx_hvv_stops_city ON hvv_stops (city);
CREATE INDEX idx_hvv_stops_is_active ON hvv_stops (is_active);

-- HVV routes indexes
CREATE INDEX idx_hvv_routes_hvv_id ON hvv_routes (hvv_route_id);
CREATE INDEX idx_hvv_routes_short_name ON hvv_routes (route_short_name);
CREATE INDEX idx_hvv_routes_type ON hvv_routes (route_type);
CREATE INDEX idx_hvv_routes_agency ON hvv_routes (agency_name);
CREATE INDEX idx_hvv_routes_is_active ON hvv_routes (is_active);

-- HVV trips indexes
CREATE INDEX idx_hvv_trips_hvv_id ON hvv_trips (hvv_trip_id);
CREATE INDEX idx_hvv_trips_route_id ON hvv_trips (route_id);
CREATE INDEX idx_hvv_trips_service_id ON hvv_trips (service_id);
CREATE INDEX idx_hvv_trips_headsign ON hvv_trips (trip_headsign);
CREATE INDEX idx_hvv_trips_direction ON hvv_trips (direction_id);
CREATE INDEX idx_hvv_trips_start_time ON hvv_trips (start_time);
CREATE INDEX idx_hvv_trips_is_active ON hvv_trips (is_active);

-- HVV stop times indexes
CREATE INDEX idx_hvv_stop_times_trip_id ON hvv_stop_times (trip_id);
CREATE INDEX idx_hvv_stop_times_stop_id ON hvv_stop_times (stop_id);
CREATE INDEX idx_hvv_stop_times_sequence ON hvv_stop_times (trip_id, stop_sequence);
CREATE INDEX idx_hvv_stop_times_arrival ON hvv_stop_times (arrival_time);
CREATE INDEX idx_hvv_stop_times_departure ON hvv_stop_times (departure_time);

-- ========================================
-- MOBILITY PROVIDERS AND E-SCOOTERS INDEXES
-- ========================================

-- Mobility providers indexes
CREATE INDEX idx_mobility_providers_type ON mobility_providers (provider_type);
CREATE INDEX idx_mobility_providers_name ON mobility_providers (provider_name);
CREATE INDEX idx_mobility_providers_is_active ON mobility_providers (is_active);
CREATE INDEX idx_mobility_providers_created_at ON mobility_providers (created_at);

-- E-scooter fleet indexes
CREATE INDEX idx_e_scooter_fleet_provider_id ON e_scooter_fleet (provider_id);
CREATE INDEX idx_e_scooter_fleet_hvv_vehicle_id ON e_scooter_fleet (hvv_vehicle_id);
CREATE INDEX idx_e_scooter_fleet_model ON e_scooter_fleet (vehicle_model);
CREATE INDEX idx_e_scooter_fleet_status ON e_scooter_fleet (current_status);
CREATE INDEX idx_e_scooter_fleet_battery ON e_scooter_fleet (battery_level);
CREATE INDEX idx_e_scooter_fleet_available ON e_scooter_fleet (current_status) 
    WHERE current_status = 'available';
CREATE INDEX idx_e_scooter_fleet_updated_at ON e_scooter_fleet (updated_at);

-- E-scooter status history indexes
CREATE INDEX idx_e_scooter_status_history_vehicle_id ON e_scooter_status_history (vehicle_id);
CREATE INDEX idx_e_scooter_status_history_timestamp ON e_scooter_status_history (timestamp);
CREATE INDEX idx_e_scooter_status_history_status ON e_scooter_status_history (status);
CREATE INDEX idx_e_scooter_status_history_battery ON e_scooter_status_history (battery_level);

-- ========================================
-- RIDE-SHARING AND BOOKINGS INDEXES
-- ========================================

-- Ride-sharing trips indexes
CREATE INDEX idx_ride_sharing_trips_driver_id ON ride_sharing_trips (driver_id);
CREATE INDEX idx_ride_sharing_trips_provider_id ON ride_sharing_trips (provider_id);
CREATE INDEX idx_ride_sharing_trips_status ON ride_sharing_trips (status);
CREATE INDEX idx_ride_sharing_trips_departure_time ON ride_sharing_trips (departure_time);
CREATE INDEX idx_ride_sharing_trips_arrival_time ON ride_sharing_trips (arrival_time);
CREATE INDEX idx_ride_sharing_trips_vehicle_type ON ride_sharing_trips (vehicle_type);
CREATE INDEX idx_ride_sharing_trips_created_at ON ride_sharing_trips (created_at);
CREATE INDEX idx_ride_sharing_trips_active ON ride_sharing_trips (status)
    WHERE status IN ('requested', 'accepted', 'in_progress');

-- Ride bookings indexes
CREATE INDEX idx_ride_bookings_trip_id ON ride_bookings (trip_id);
CREATE INDEX idx_ride_bookings_passenger_id ON ride_bookings (passenger_id);
CREATE INDEX idx_ride_bookings_status ON ride_bookings (booking_status);
CREATE INDEX idx_ride_bookings_booking_time ON ride_bookings (booking_time);
CREATE INDEX idx_ride_bookings_pickup_time ON ride_bookings (estimated_pickup_time);
CREATE INDEX idx_ride_bookings_dropoff_time ON ride_bookings (estimated_dropoff_time);
CREATE INDEX idx_ride_bookings_passenger_rating ON ride_bookings (passenger_rating);
CREATE INDEX idx_ride_bookings_driver_rating ON ride_bookings (driver_rating);
CREATE INDEX idx_ride_bookings_active ON ride_bookings (booking_status)
    WHERE booking_status IN ('pending', 'confirmed', 'picked_up');

-- Payment transactions indexes
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions (user_id);
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions (booking_id);
CREATE INDEX idx_payment_transactions_payment_method_id ON payment_transactions (payment_method_id);
CREATE INDEX idx_payment_transactions_type ON payment_transactions (transaction_type);
CREATE INDEX idx_payment_transactions_status ON payment_transactions (status);
CREATE INDEX idx_payment_transactions_gateway ON payment_transactions (payment_gateway);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions (created_at);
CREATE INDEX idx_payment_transactions_amount ON payment_transactions (amount);

-- ========================================
-- ROUTE PLANNING INDEXES
-- ========================================

-- Saved routes indexes
CREATE INDEX idx_saved_routes_user_id ON saved_routes (user_id);
CREATE INDEX idx_saved_routes_name ON saved_routes (route_name);
CREATE INDEX idx_saved_routes_is_favorite ON saved_routes (is_favorite);
CREATE INDEX idx_saved_routes_usage_count ON saved_routes (usage_count);
CREATE INDEX idx_saved_routes_last_used ON saved_routes (last_used);
CREATE INDEX idx_saved_routes_created_at ON saved_routes (created_at);

-- Route planning history indexes
CREATE INDEX idx_route_planning_user_id ON route_planning_history (user_id);
CREATE INDEX idx_route_planning_timestamp ON route_planning_history (query_timestamp);
CREATE INDEX idx_route_planning_cache_expires ON route_planning_history (cache_expires);
CREATE INDEX idx_route_planning_is_cache ON route_planning_history (is_cache_entry);
CREATE INDEX idx_route_planning_co2_emissions ON route_planning_history (total_co2_emissions);
CREATE INDEX idx_route_planning_total_cost ON route_planning_history (total_cost);
CREATE INDEX idx_route_planning_duration ON route_planning_history (total_duration_minutes);
CREATE INDEX idx_route_planning_distance ON route_planning_history (total_distance_km);

-- ========================================
-- CO₂ EMISSIONS AND SUSTAINABILITY INDEXES
-- ========================================

-- CO2 emission factors indexes
CREATE INDEX idx_co2_emission_factors_transport_mode ON co2_emission_factors (transport_mode);
CREATE INDEX idx_co2_emission_factors_vehicle_type ON co2_emission_factors (vehicle_type);
CREATE INDEX idx_co2_emission_factors_source ON co2_emission_factors (source);
CREATE INDEX idx_co2_emission_factors_validity ON co2_emission_factors (validity_period);

-- User CO2 tracking indexes
CREATE INDEX idx_user_co2_tracking_user_id ON user_co2_tracking (user_id);
CREATE INDEX idx_user_co2_tracking_trip_id ON user_co2_tracking (trip_id);
CREATE INDEX idx_user_co2_tracking_transport_mode ON user_co2_tracking (transport_mode);
CREATE INDEX idx_user_co2_tracking_trip_date ON user_co2_tracking (trip_date);
CREATE INDEX idx_user_co2_tracking_emissions ON user_co2_tracking (co2_emissions);
CREATE INDEX idx_user_co2_tracking_savings ON user_co2_tracking (savings_percentage);
CREATE INDEX idx_user_co2_tracking_created_at ON user_co2_tracking (created_at);

-- Sustainability achievements indexes
CREATE INDEX idx_sustainability_achievements_user_id ON sustainability_achievements (user_id);
CREATE INDEX idx_sustainability_achievements_type ON sustainability_achievements (achievement_type);
CREATE INDEX idx_sustainability_achievements_progress ON sustainability_achievements (progress);
CREATE INDEX idx_sustainability_achievements_earned_at ON sustainability_achievements (earned_at);
CREATE INDEX idx_sustainability_achievements_created_at ON sustainability_achievements (created_at);

-- ========================================
-- REWARDS SYSTEM INDEXES
-- ========================================

-- User points balance indexes
CREATE INDEX idx_user_points_balance_current ON user_points_balance (current_balance);
CREATE INDEX idx_user_points_balance_total_earned ON user_points_balance (total_earned);
CREATE INDEX idx_user_points_balance_last_updated ON user_points_balance (last_updated);

-- Points transactions indexes
CREATE INDEX idx_points_transactions_user_id ON points_transactions (user_id);
CREATE INDEX idx_points_transactions_type ON points_transactions (transaction_type);
CREATE INDEX idx_points_transaction_points ON points_transactions (points);
CREATE INDEX idx_points_transaction_reason ON points_transactions (reason);
CREATE INDEX idx_points_transaction_reference_id ON points_transactions (reference_id);
CREATE INDEX idx_points_transaction_date ON points_transactions (transaction_date);
CREATE INDEX idx_points_transaction_expires_at ON points_transactions (expires_at);
CREATE INDEX idx_points_transaction_created_at ON points_transactions (created_at);

-- Rewards catalog indexes
CREATE INDEX idx_rewards_catalog_name ON rewards_catalog (reward_name);
CREATE INDEX idx_rewards_catalog_type ON rewards_catalog (reward_type);
CREATE INDEX idx_rewards_catalog_points_cost ON rewards_catalog (points_cost);
CREATE INDEX idx_rewards_catalog_monetary_value ON rewards_catalog (monetary_value);
CREATE INDEX idx_rewards_catalog_is_active ON rewards_catalog (is_active);
CREATE INDEX idx_rewards_catalog_is_limited ON rewards_catalog (is_limited);
CREATE INDEX idx_rewards_catalog_available_quantity ON rewards_catalog (available_quantity);
CREATE INDEX idx_rewards_catalog_valid_from ON rewards_catalog (valid_from);
CREATE INDEX idx_rewards_catalog_valid_until ON rewards_catalog (valid_until);

-- Reward redemptions indexes
CREATE INDEX idx_reward_redemptions_user_id ON reward_redemptions (user_id);
CREATE INDEX idx_reward_redemptions_reward_id ON reward_redemptions (reward_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions (redemption_status);
CREATE INDEX idx_reward_redemptions_voucher_code ON reward_redemptions (voucher_code);
CREATE INDEX idx_reward_redemptions_redemption_date ON reward_redemptions (redemption_date);
CREATE INDEX idx_reward_redemptions_expiry_date ON reward_redemptions (expiry_date);
CREATE INDEX idx_reward_redemptions_used_date ON reward_redemptions (used_date);

-- ========================================
-- SYSTEM CONFIGURATION AND LOGGING INDEXES
-- ========================================

-- System configuration indexes
CREATE INDEX idx_system_configuration_is_active ON system_configuration (is_active);
CREATE INDEX idx_system_configuration_updated_at ON system_configuration (updated_at);

-- API usage logs indexes
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs (user_id);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs (endpoint);
CREATE INDEX idx_api_usage_logs_method ON api_usage_logs (method);
CREATE INDEX idx_api_usage_logs_response_status ON api_usage_logs (response_status);
CREATE INDEX idx_api_usage_logs_response_time ON api_usage_logs (response_time_ms);
CREATE INDEX idx_api_usage_logs_ip_address ON api_usage_logs (ip_address);
CREATE INDEX idx_api_usage_logs_timestamp ON api_usage_logs (timestamp);

-- System events indexes
CREATE INDEX idx_system_events_type ON system_events (event_type);
CREATE INDEX idx_system_events_severity ON system_events (event_severity);
CREATE INDEX idx_system_events_user_id ON system_events (user_id);
CREATE INDEX idx_system_events_is_resolved ON system_events (is_resolved);
CREATE INDEX idx_system_events_created_at ON system_events (created_at);
CREATE INDEX idx_system_events_resolved_at ON system_events (resolved_at);

-- ========================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ========================================

-- User-related composite indexes
CREATE INDEX idx_users_email_active ON users (email, is_active);
CREATE INDEX idx_user_profiles_location ON user_profiles (city, postal_code);

-- HVV transit composite indexes
CREATE INDEX idx_hvv_stop_times_trip_sequence ON hvv_stop_times (trip_id, stop_sequence);
CREATE INDEX idx_hvv_trips_route_direction ON hvv_trips (route_id, direction_id, is_active);

-- E-scooter composite indexes
CREATE INDEX idx_e_scooter_fleet_status_battery ON e_scooter_fleet (current_status, battery_level)
    WHERE current_status = 'available';
CREATE INDEX idx_e_scooter_status_history_vehicle_timestamp ON e_scooter_status_history (vehicle_id, timestamp DESC);

-- Ride-sharing composite indexes
CREATE INDEX idx_ride_sharing_trips_status_time ON ride_sharing_trips (status, departure_time)
    WHERE status IN ('requested', 'accepted', 'in_progress');
CREATE INDEX idx_ride_bookings_status_time ON ride_bookings (booking_status, booking_time)
    WHERE booking_status IN ('pending', 'confirmed', 'picked_up');
CREATE INDEX idx_payment_transactions_user_status_created ON payment_transactions (user_id, status, created_at DESC);

-- Route planning composite indexes
CREATE INDEX idx_route_planning_user_timestamp ON route_planning_history (user_id, query_timestamp DESC);
CREATE INDEX idx_route_planning_cache_expires_timestamp ON route_planning_history (is_cache_entry, cache_expires);

-- CO2 tracking composite indexes
CREATE INDEX idx_user_co2_tracking_user_date ON user_co2_tracking (user_id, trip_date DESC);
CREATE INDEX idx_user_co2_tracking_mode_date ON user_co2_tracking (transport_mode, trip_date DESC);

-- Points system composite indexes
CREATE INDEX idx_points_transactions_user_type_date ON points_transactions (user_id, transaction_type, transaction_date DESC);
CREATE INDEX idx_reward_redemptions_user_status_date ON reward_redemptions (user_id, redemption_status, redemption_date DESC);

-- Performance monitoring composite indexes
CREATE INDEX idx_api_usage_logs_user_timestamp ON api_usage_logs (user_id, timestamp DESC);
CREATE INDEX idx_system_events_severity_created ON system_events (event_severity, created_at DESC);

-- ========================================
-- PARTIAL INDEXES FOR OPTIMIZATION
-- ========================================

-- Partial indexes for commonly filtered active records
CREATE INDEX idx_hvv_stops_active ON hvv_stops (stop_name, location) WHERE is_active = TRUE;
CREATE INDEX idx_hvv_routes_active ON hvv_routes (route_short_name, route_type) WHERE is_active = TRUE;
CREATE INDEX idx_mobility_providers_active ON mobility_providers (provider_name, provider_type) WHERE is_active = TRUE;
CREATE INDEX idx_rewards_catalog_active ON rewards_catalog (reward_name, points_cost) WHERE is_active = TRUE;
CREATE INDEX idx_system_config_active ON system_configuration (config_key, config_value) WHERE is_active = TRUE;

-- Partial indexes for recent data (last 30 days)
CREATE INDEX idx_ride_sharing_trips_recent ON ride_sharing_trips (created_at, status) 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX idx_payment_transactions_recent ON payment_transactions (created_at, user_id) 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX idx_points_transactions_recent ON points_transactions (transaction_date, user_id) 
    WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days';

-- ========================================
-- INDEX MAINTENANCE NOTES
-- ========================================

-- Note: These indexes should be monitored for performance impact
-- Consider using BRIN indexes for very large tables with natural sorting (time-based)
-- Periodic index maintenance may be required:
--   REINDEX INDEX CONCURRENTLY index_name;
--   ANALYZE table_name;

-- Recommended monitoring queries:
--   - Index usage statistics: pg_stat_user_indexes
--   - Index size: pg_relation_size
--   - Unused indexes: Identify indexes with low or zero usage

-- Consider adding additional indexes based on actual query patterns and performance analysis