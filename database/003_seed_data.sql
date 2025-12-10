-- HVV Mobility Platform Database Seed Data
-- Initial seed data for system configuration and reference data
-- PostgreSQL 14+ with PostGIS Extension

-- ========================================
-- CO₂ EMISSION FACTORS (German UBA Standards)
-- ========================================

-- Public transport emission factors (grams CO2 per passenger-km)
INSERT INTO co2_emission_factors (transport_mode, vehicle_type, emission_factor, unit, source, validity_period) VALUES
('public_transport', 'bus_diesel', 68.4, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'bus_electric', 28.5, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'bus_hybrid', 45.2, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'tram', 23.8, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'u_bahn', 18.5, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 's_bahn', 32.7, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'regional_train', 41.3, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'intercity_train', 29.8, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('public_transport', 'ferry', 112.5, 'g/passenger-km', 'German UBA 2022', '2024-12-31');

-- Private transport emission factors
INSERT INTO co2_emission_factors (transport_mode, vehicle_type, emission_factor, unit, source, validity_period) VALUES
('private_transport', 'car_gasoline', 152.3, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('private_transport', 'car_diesel', 128.7, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('private_transport', 'car_electric', 47.2, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('private_transport', 'car_hybrid', 98.4, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('private_transport', 'motorcycle', 108.6, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('private_transport', 'bicycle', 0.0, 'g/passenger-km', 'German UBA 2022', '2024-12-31');

-- Shared mobility emission factors
INSERT INTO co2_emission_factors (transport_mode, vehicle_type, emission_factor, unit, source, validity_period) VALUES
('shared_mobility', 'e_scooter', 18.5, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('shared_mobility', 'bike_sharing', 0.0, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('shared_mobility', 'e_bike_sharing', 8.2, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('shared_mobility', 'car_sharing', 95.7, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('shared_mobility', 'e_car_sharing', 35.8, 'g/passenger-km', 'German UBA 2022', '2024-12-31');

-- Non-motorized transport
INSERT INTO co2_emission_factors (transport_mode, vehicle_type, emission_factor, unit, source, validity_period) VALUES
('non_motorized', 'walking', 0.0, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('non_motorized', 'cycling', 0.0, 'g/passenger-km', 'German UBA 2022', '2024-12-31'),
('non_motorized', 'skateboarding', 0.0, 'g/passenger-km', 'German UBA 2022', '2024-12-31');

-- ========================================
-- DEFAULT MOBILITY PROVIDERS
-- ========================================

-- E-scooter providers
INSERT INTO mobility_providers (provider_name, provider_type, contact_email, website_url, pricing_model, is_active) VALUES
('Tier Mobility', 'e_scooter', 'support@tier.app', 'https://www.tier.app', 
 '{"base_fee": 1.00, "per_minute": 0.19, "currency": "EUR", "unlock_fee": 1.00}', TRUE),
('Voi Technology', 'e_scooter', 'support@voiapp.io', 'https://www.voi.com',
 '{"base_fee": 1.00, "per_minute": 0.24, "currency": "EUR", "unlock_fee": 1.00}', TRUE),
('Lime', 'e_scooter', 'support@li.me', 'https://www.li.me',
 '{"base_fee": 1.00, "per_minute": 0.23, "currency": "EUR", "unlock_fee": 1.00}', TRUE),
('Circ', 'e_scooter', 'support@ridecirc.com', 'https://www.ridecirc.com',
 '{"base_fee": 1.00, "per_minute": 0.20, "currency": "EUR", "unlock_fee": 1.00}', TRUE);

-- Bike sharing providers
INSERT INTO mobility_providers (provider_name, provider_type, contact_email, website_url, pricing_model, is_active) VALUES
('StadtRAD Hamburg', 'bike_sharing', 'info@stadtrad.hamburg', 'https://www.stadtrad.hamburg',
 '{"subscription_monthly": 9.00, "per_30min_free": true, "currency": "EUR"}', TRUE),
('Donkey Republic', 'bike_sharing', 'support@donkey.bike', 'https://www.donkey.bike',
 '{"base_fee": 1.00, "per_hour": 3.00, "currency": "EUR", "unlock_fee": 1.00}', TRUE),
('Nextbike', 'bike_sharing', 'info@nextbike.de', 'https://www.nextbike.de',
 '{"per_30min": 1.50, "daily_max": 15.00, "currency": "EUR"}', TRUE);

-- Car sharing providers
INSERT INTO mobility_providers (provider_name, provider_type, contact_email, website_url, pricing_model, is_active) VALUES
('Share Now', 'car_sharing', 'support@share-now.com', 'https://www.share-now.com',
 '{"base_fee": 0.00, "per_minute": 0.79, "per_hour": 29.00, "currency": "EUR"}', TRUE),
('Sixt Share', 'car_sharing', 'info@sixt.com', 'https://www.sixt.com',
 '{"base_fee": 0.00, "per_minute": 0.69, "per_hour": 25.00, "currency": "EUR"}', TRUE),
('Miles', 'car_sharing', 'service@miles-mobility.com', 'https://www.miles-mobility.com',
 '{"base_fee": 0.00, "per_km": 0.79, "per_minute": 0.39, "currency": "EUR"}', TRUE);

-- Ride sharing providers
INSERT INTO mobility_providers (provider_name, provider_type, contact_email, website_url, pricing_model, is_active) VALUES
('Uber', 'ride_sharing', 'support@uber.com', 'https://www.uber.com',
 '{"base_fee": 2.50, "per_km": 1.70, "per_minute": 0.35, "currency": "EUR"}', TRUE),
('Bolt', 'ride_sharing', 'support@bolt.eu', 'https://www.bolt.eu',
 '{"base_fee": 1.50, "per_km": 1.40, "per_minute": 0.25, "currency": "EUR"}', TRUE),
('Free Now', 'ride_sharing', 'support@free-now.com', 'https://www.free-now.com',
 '{"base_fee": 2.00, "per_km": 1.60, "per_minute": 0.30, "currency": "EUR"}', TRUE);

-- ========================================
-- SAMPLE REWARDS CATALOG
-- ========================================

-- Travel discounts
INSERT INTO rewards_catalog (reward_name, description, reward_type, points_cost, monetary_value, terms_conditions, is_active, valid_until) VALUES
('10% OFF - Next HVV Ticket', 'Get 10% discount on your next HVV public transport ticket', 'discount', 500, 2.50, 'Valid for single tickets up to €25. Excludes monthly passes.', TRUE, '2025-12-31'),
('FREE 30-min E-Scooter Ride', 'Enjoy a free 30-minute ride on any partner e-scooter', 'free_ride', 750, 7.50, 'Valid for Tier, Voi, Lime, and Circ scooters. Maximum value €7.50.', TRUE, '2025-12-31'),
('€5 Car Sharing Credit', 'Get €5 credit for any car sharing service', 'discount', 1000, 5.00, 'Valid for Share Now, Sixt Share, and Miles. No minimum booking required.', TRUE, '2025-12-31'),
('HVV Monthly Pass Discount', 'Save €15 on your next HVV monthly pass', 'discount', 2000, 15.00, 'Valid for HVV Profi-Ticket or Klima-Ticket. One-time use only.', TRUE, '2025-12-31');

-- Merchandise
INSERT INTO rewards_catalog (reward_name, description, reward_type, points_cost, monetary_value, terms_conditions, is_active, valid_until) VALUES
('HVV Water Bottle', 'Reusable stainless steel water bottle with HVV logo', 'merchandise', 1500, 12.99, 'Eco-friendly 500ml bottle. Delivery within 7-10 business days.', TRUE, '2025-06-30'),
('Sustainable Tote Bag', 'Cotton tote bag with sustainable mobility design', 'merchandise', 800, 8.99, 'Organic cotton, machine washable. Perfect for shopping.', TRUE, '2025-12-31'),
('Bike Lock', 'High-security U-lock for bicycle protection', 'merchandise', 2500, 29.99, 'Extra-heavy duty lock with mounting bracket. Weather resistant.', TRUE, '2025-12-31'),
('Phone Mount for Bikes', 'Universal phone mount for bicycles and e-scooters', 'merchandise', 1800, 19.99, 'Adjustable clamp design. Fits phones 4-7 inches.', TRUE, '2025-12-31');

-- Vouchers
INSERT INTO rewards_catalog (reward_name, description, reward_type, points_cost, monetary_value, terms_conditions, is_active, valid_until) VALUES
('Coffee Shop Voucher', '€5 voucher for participating coffee shops near HVV stops', 'voucher', 600, 5.00, 'Valid at 50+ partner locations. Check app for participating shops.', TRUE, '2025-12-31'),
('Restaurant Discount', '15% off at partner restaurants', 'voucher', 1200, 10.00, 'Maximum discount €10. Valid for dine-in only.', TRUE, '2025-12-31'),
('Sports Store Voucher', '€10 voucher for sports and outdoor equipment', 'voucher', 2200, 10.00, 'Valid at major sports retailers. Some exclusions apply.', TRUE, '2025-12-31');

-- Premium rewards (limited quantity)
INSERT INTO rewards_catalog (reward_name, description, reward_type, points_cost, monetary_value, terms_conditions, is_limited, total_quantity, available_quantity, valid_until) VALUES
('Annual HVV Pass', 'Free annual HVV Profi-Ticket (value €828)', 'free_ride', 50000, 828.00, 'Full year of unlimited public transport. Non-transferable.', TRUE, TRUE, 10, 10, '2025-03-31'),
('Electric Scooter', 'High-quality electric scooter for personal use', 'merchandise', 25000, 499.00, 'Premium e-scooter with 25km range. Includes charger and accessories.', TRUE, TRUE, 5, 5, '2025-12-31');

-- ========================================
-- SYSTEM CONFIGURATION
-- ========================================

-- Application settings
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('app_version', '"1.0.0"', 'Current application version'),
('maintenance_mode', 'false', 'Whether the application is in maintenance mode'),
('max_booking_distance_km', '100', 'Maximum allowed booking distance in kilometers'),
('max_trip_duration_hours', '24', 'Maximum allowed trip duration in hours'),
('points_expiration_days', '365', 'Number of days before earned points expire'),
('co2_tracking_enabled', 'true', 'Whether CO2 emission tracking is enabled'),
('real_time_updates_enabled', 'true', 'Whether real-time vehicle updates are enabled');

-- Points system configuration
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('points_per_km_public_transport', '10', 'Points earned per km using public transport'),
('points_per_km_shared_mobility', '5', 'Points earned per km using shared mobility'),
('points_per_km_walking_cycling', '20', 'Points earned per km walking or cycling'),
('points_co2_saving_multiplier', '2', 'Multiplier for points based on CO2 savings percentage'),
('daily_points_limit', '500', 'Maximum points a user can earn in a single day'),
('booking_completion_points', '25', 'Points earned for completing any booking');

-- Notification settings
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('email_notifications_enabled', 'true', 'Whether email notifications are enabled'),
('push_notifications_enabled', 'true', 'Whether push notifications are enabled'),
('sms_notifications_enabled', 'false', 'Whether SMS notifications are enabled'),
('booking_reminder_minutes', '15', 'Minutes before booking to send reminder'),
('trip_completion_feedback_enabled', 'true', 'Whether to request feedback after trip completion');

-- Rate limiting
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('api_rate_limit_per_minute', '100', 'Maximum API requests per minute per user'),
('route_planning_rate_limit_per_hour', '50', 'Maximum route planning requests per hour per user'),
('booking_rate_limit_per_hour', '20', 'Maximum booking requests per hour per user'),
('search_rate_limit_per_minute', '30', 'Maximum search requests per minute per user');

-- Geospatial settings
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('default_search_radius_km', '2', 'Default search radius for nearby vehicles in km'),
('max_search_radius_km', '10', 'Maximum search radius for nearby vehicles in km'),
('hvv_service_bounds', '{"type":"Polygon","coordinates":[[[9.7,53.4],[10.2,53.4],[10.2,53.7],[9.7,53.7],[9.7,53.4]]]}', 'Geographic bounds for HVV service area'),
('walking_speed_kmh', '5', 'Assumed walking speed in km/h for route calculations');

-- Payment settings
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('supported_currencies', '["EUR"]', 'List of supported currencies'),
('default_currency', '"EUR"', 'Default currency for all transactions'),
('min_booking_amount_eur', '1.00', 'Minimum booking amount in EUR'),
('max_booking_amount_eur', '500.00', 'Maximum booking amount in EUR'),
('refund_window_hours', '24', 'Hours after booking during which refund is possible');

-- ========================================
-- SAMPLE SUSTAINABILITY ACHIEVEMENTS
-- ========================================

-- Achievement templates (these will be copied to user achievements when earned)
-- Note: These would typically be managed through application logic, but including as reference

-- First eco-friendly trip achievement criteria example
-- This is just reference data - actual achievements are created per user

-- ========================================
-- SAMPLE HVV STOP DATA (Limited sample for testing)
-- ========================================

-- Note: In production, this would be loaded from official HVV GTFS data
-- Including just a few sample stops for development/testing

INSERT INTO hvv_stops (hvv_stop_id, stop_name, location, address, postal_code, city, stop_type) VALUES
('1001', 'Hauptbahnhof', ST_GeomFromText('POINT(9.993682 53.552739)', 4326), 'Hachmannplatz 16', '20099', 'Hamburg', 's_bahn'),
('1002', 'Mönckebergstraße', ST_GeomFromText('POINT(9.991053 53.550658)', 4326), 'Mönckebergstraße', '20095', 'Hamburg', 'u_bahn'),
('1003', 'Jungfernstieg', ST_GeomFromText('POINT(9.993375 53.551441)', 4326), 'Jungfernstieg', '20095', 'Hamburg', 'u_bahn'),
('1004', 'Rathaus', ST_GeomFromText('POINT(9.992438 53.550476)', 4326), 'Rathausmarkt', '20095', 'Hamburg', 'u_bahn'),
('1005', 'Stephansplatz', ST_GeomFromText('POINT(9.993682 53.552739)', 4326), 'Stephansplatz', '20095', 'Hamburg', 'u_bahn'),
('1006', 'Dammtor', ST_GeomFromText('POINT(9.983278 53.566667)', 4326), 'Dammtorwall 15', '20354', 'Hamburg', 's_bahn'),
('1007', 'Altona', ST_GeomFromText('POINT(9.933302 53.546961)', 4326), 'Schauburgstraße 1', '22767', 'Hamburg', 's_bahn'),
('1008', 'Landungsbrücken', ST_GeomFromText('POINT(9.998848 53.545789)', 4326), 'Brückenstraße', '20359', 'Hamburg', 'ferry'),
('1009', 'Reeperbahn', ST_GeomFromText('POINT(9.965847 53.549563)', 4326), 'Reeperbahn', '20359', 'Hamburg', 'u_bahn'),
('1010', 'Schanze', ST_GeomFromText('POINT(9.964476 53.564191)', 4326), 'Sternschanze', '20357', 'Hamburg', 's_bahn');

-- ========================================
-- SAMPLE HVV ROUTE DATA
-- ========================================

INSERT INTO hvv_routes (hvv_route_id, route_short_name, route_long_name, route_type, agency_name, color, text_color) VALUES
('U1', 'U1', 'U1: Norderstedt ↔ Ohlsdorf ↔ Großhansdorf', 1, 'Hamburger Hochbahn AG', '#3B7EA1', '#FFFFFF'),
('U2', 'U2', 'U2: Niendorf Nord ↔ Mümmelmannsberg', 1, 'Hamburger Hochbahn AG', '#DB241F', '#FFFFFF'),
('U3', 'U3', 'U3: Wandsbek-Gartenstadt ↔ Barmbek ↔ Uhlenhorst ↔ Hauptbahnhof ↔ Harburg', 1, 'Hamburger Hochbahn AG', '#FFCD00', '#000000'),
('U4', 'U4', 'U4: Billstedt ↔ HafenCity Universität', 1, 'Hamburger Hochbahn AG', '#00A651', '#FFFFFF'),
('S1', 'S1', 'S1: Wedel ↔ Poppenbüttel ↔ Hamburg Airport', 2, 'S-Bahn Hamburg GmbH', '#008754', '#FFFFFF'),
('S2', 'S2', 'S2: Bergedorf ↔ Altona', 2, 'S-Bahn Hamburg GmbH', '#B51E1E', '#FFFFFF'),
('S3', 'S3', 'S3: Pinneberg ↔ Stade', 2, 'S-Bahn Hamburg GmbH', '#7E2F8A', '#FFFFFF'),
('S11', 'S11', 'S11: Blankenese ↔ Airport', 2, 'S-Bahn Hamburg GmbH', '#008754', '#FFFFFF'),
('S21', 'S21', 'S21: Elbgaustraße ↔ Aumühle', 2, 'S-Bahn Hamburg GmbH', '#B51E1E', '#FFFFFF'),
('S31', 'S31', 'S31: Altona ↔ Neugraben', 2, 'S-Bahn Hamburg GmbH', '#7E2F8A', '#FFFFFF'),
('Bus6', 'Bus 6', 'Bus 6: Alsterdorf ↔ SÜD', 3, 'Hamburger Hochbahn AG', '#0066CC', '#FFFFFF'),
('Bus109', 'Bus 109', 'Bus 109: U Niendorf Markt ↔ U Alsterdorf', 3, 'Hamburger Hochbahn AG', '#FF6600', '#FFFFFF');

-- ========================================
-- SAMPLE E-SCOOTER FLEET DATA
-- ========================================

-- Sample e-scooter data for different providers
INSERT INTO e_scooter_fleet (provider_id, hvv_vehicle_id, vehicle_model, battery_level, last_known_location, current_status, max_speed, range_km) VALUES
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Tier Mobility'), 'HV-TIER-001', 'Tier 3.5', 85, ST_GeomFromText('POINT(9.993682 53.552739)', 4326), 'available', 20, 30),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Tier Mobility'), 'HV-TIER-002', 'Tier 3.5', 92, ST_GeomFromText('POINT(9.991053 53.550658)', 4326), 'available', 20, 30),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Voi Technology'), 'HV-VOI-001', 'Voi X 2', 78, ST_GeomFromText('POINT(9.993375 53.551441)', 4326), 'available', 20, 25),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Lime'), 'HV-LIME-001', 'Lime-S', 65, ST_GeomFromText('POINT(9.992438 53.550476)', 4326), 'charging', 20, 28),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Circ'), 'HV-CIRC-001', 'Circ Plus', 88, ST_GeomFromText('POINT(9.983278 53.566667)', 4326), 'available', 25, 35),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Tier Mobility'), 'HV-TIER-003', 'Tier 3.5', 45, ST_GeomFromText('POINT(9.933302 53.546961)', 4326), 'maintenance', 20, 30),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Voi Technology'), 'HV-VOI-002', 'Voi X 2', 94, ST_GeomFromText('POINT(9.998848 53.545789)', 4326), 'available', 20, 25),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Lime'), 'HV-LIME-002', 'Lime-S', 71, ST_GeomFromText('POINT(9.965847 53.549563)', 4326), 'in_use', 20, 28),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Circ'), 'HV-CIRC-002', 'Circ Plus', 58, ST_GeomFromText('POINT(9.964476 53.564191)', 4326), 'available', 25, 35),
((SELECT provider_id FROM mobility_providers WHERE provider_name = 'Voi Technology'), 'HV-VOI-003', 'Voi X 2', 33, ST_GeomFromText('POINT(9.975478 53.558405)', 4326), 'charging', 20, 25);

-- ========================================
-- SAMPLE USER FOR TESTING
-- ========================================

-- Create a test user (in production, users would register through the application)
INSERT INTO users (email, password_hash, phone_number, is_verified, is_active) VALUES
('test.user@hvv-mobility.de', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', '+49 40 12345678', TRUE, TRUE);

-- Create user profile for test user
INSERT INTO user_profiles (user_id, first_name, last_name, address, postal_code, city, country, preferred_language, mobility_preferences) VALUES
((SELECT id FROM users WHERE email = 'test.user@hvv-mobility.de'), 'Max', 'Mustermann', 'Mönckebergstraße 1', '20095', 'Hamburg', 'Germany', 'de', 
 '{"preferred_transport_modes": ["public_transport", "e_scooter", "walking"], "max_walking_distance": 1000, "avoid_stairs": false, "wheelchair_accessible": false, "eco_mode": true}');

-- Create initial points balance for test user
INSERT INTO user_points_balance (user_id, current_balance, total_earned, total_spent) VALUES
((SELECT id FROM users WHERE email = 'test.user@hvv-mobility.de'), 0, 0, 0);

-- ========================================
-- DATA VALIDATION AND COMPLETENESS CHECKS
-- ========================================

-- Verify that all required reference data is loaded
DO $$
DECLARE
    missing_emission_factors INTEGER;
    missing_providers INTEGER;
    missing_rewards INTEGER;
    missing_config INTEGER;
BEGIN
    -- Check emission factors
    SELECT COUNT(*) INTO missing_emission_factors 
    FROM co2_emission_factors 
    WHERE transport_mode IN ('public_transport', 'shared_mobility', 'non_motorized');
    
    -- Check mobility providers
    SELECT COUNT(*) INTO missing_providers 
    FROM mobility_providers 
    WHERE is_active = TRUE;
    
    -- Check rewards
    SELECT COUNT(*) INTO missing_rewards 
    FROM rewards_catalog 
    WHERE is_active = TRUE;
    
    -- Check system configuration
    SELECT COUNT(*) INTO missing_config 
    FROM system_configuration 
    WHERE is_active = TRUE;
    
    RAISE NOTICE 'Seed data validation completed:';
    RAISE NOTICE '  Emission factors loaded: %', missing_emission_factors;
    RAISE NOTICE '  Active mobility providers: %', missing_providers;
    RAISE NOTICE '  Active rewards: %', missing_rewards;
    RAISE NOTICE '  Active configuration items: %', missing_config;
END $$;

-- ========================================
-- POST-SEEDING NOTES
-- ========================================

-- Note: This seed data is intended for development and initial setup
-- Production environment should use:
--   - Official HVV GTFS data for stops, routes, and schedules
--   - Real-time data feeds for vehicle locations
--   - Production API keys and endpoints
--   - Full set of rewards and promotional items
--   - Actual service area boundaries for mobility providers

-- Recommended next steps after seeding:
--   1. Load full GTFS data from HVV
--   2. Set up real-time data integration
--   3. Configure payment gateway integration
--   4. Test geospatial queries with sample data
--   5. Verify trigger functionality
--   6. Run performance benchmarks