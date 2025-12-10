-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_point JSONB NOT NULL,
    end_point JSONB NOT NULL,
    waypoints JSONB DEFAULT '[]'::jsonb,
    distance INTEGER NOT NULL, -- in meters
    duration INTEGER NOT NULL, -- in seconds
    price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'EUR',
    vehicle_types TEXT[] NOT NULL,
    operator_id UUID REFERENCES operators(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_routes table for storing user's route history
CREATE TABLE IF NOT EXISTS user_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id),
    origin JSONB NOT NULL,
    destination JSONB NOT NULL,
    distance INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'EUR',
    co2_emissions INTEGER NOT NULL DEFAULT 0, -- in grams
    car_baseline_emissions INTEGER NOT NULL DEFAULT 0, -- in grams
    co2_savings INTEGER NOT NULL DEFAULT 0, -- in grams
    points_earned INTEGER NOT NULL DEFAULT 0,
    sustainability_score INTEGER NOT NULL DEFAULT 0, -- 0-100
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create route_segments table for detailed route information
CREATE TABLE IF NOT EXISTS route_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_route_id UUID NOT NULL REFERENCES user_routes(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    start_point JSONB NOT NULL,
    end_point JSONB NOT NULL,
    distance INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    instructions JSONB DEFAULT '[]'::jsonb,
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    vehicle_id VARCHAR(100),
    line_number VARCHAR(20),
    co2_emissions INTEGER NOT NULL DEFAULT 0, -- in grams
    price DECIMAL(10,2) DEFAULT 0.00,
    sustainability_score INTEGER NOT NULL DEFAULT 0 -- 0-100
);

-- Create user_rewards table for tracking user rewards and achievements
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_tier VARCHAR(50) NOT NULL DEFAULT 'Eco Walker',
    total_co2_savings INTEGER NOT NULL DEFAULT 0, -- in grams
    total_distance INTEGER NOT NULL DEFAULT 0, -- in meters
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_trip_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table for tracking unlocked achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(255) NOT NULL,
    achievement_description TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_types ON routes USING GIN(vehicle_types);
CREATE INDEX IF NOT EXISTS idx_user_routes_user_id ON user_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_created_at ON user_routes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_segments_user_route_id ON route_segments(user_route_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Add update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_routes_updated_at 
    BEFORE UPDATE ON routes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rewards_updated_at 
    BEFORE UPDATE ON user_rewards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create operators table if it doesn't exist
CREATE TABLE IF NOT EXISTS operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    contact_info JSONB,
    api_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_operators_updated_at 
    BEFORE UPDATE ON operators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default operators
INSERT INTO operators (name, type, is_active) VALUES
('HVV', 'public_transport', true),
('Tier', 'shared_mobility', true),
('Voi', 'shared_mobility', true),
('HVV Switch', 'car_sharing', true)
ON CONFLICT DO NOTHING;