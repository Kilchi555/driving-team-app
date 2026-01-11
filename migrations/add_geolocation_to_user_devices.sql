-- Migration: Add geolocation tracking to user_devices table

ALTER TABLE user_devices 
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS isp VARCHAR(255);

-- Create index for country-based queries
CREATE INDEX IF NOT EXISTS idx_user_devices_country ON user_devices(country);
CREATE INDEX IF NOT EXISTS idx_user_devices_city ON user_devices(city);

-- Add comment
COMMENT ON COLUMN user_devices.country IS 'Country name from IP geolocation';
COMMENT ON COLUMN user_devices.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN user_devices.city IS 'City name from IP geolocation';
COMMENT ON COLUMN user_devices.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN user_devices.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN user_devices.isp IS 'Internet Service Provider';

