-- Migration: Add missing columns to locations table
-- This script adds city, canton, postal_code, and updated_at columns to the locations table
-- Date: 2025-01-27

-- Add missing columns to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS canton VARCHAR(10),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for locations table
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON COLUMN locations.city IS 'City name for the location';
COMMENT ON COLUMN locations.canton IS 'Swiss canton abbreviation (e.g., ZH, BE, BS)';
COMMENT ON COLUMN locations.postal_code IS 'Swiss postal code';
COMMENT ON COLUMN locations.updated_at IS 'Timestamp when the record was last updated';
