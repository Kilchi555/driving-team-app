-- Update vehicles table schema: name -> marke, type -> modell, add new columns

-- Rename columns
ALTER TABLE vehicles RENAME COLUMN name TO marke;
ALTER TABLE vehicles RENAME COLUMN type TO modell;

-- Add new columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS getriebe VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS aufbau VARCHAR(50);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS farbe VARCHAR(50);

-- Update existing data with default values for new columns
UPDATE vehicles SET 
  getriebe = 'Automatik' 
WHERE getriebe IS NULL;

UPDATE vehicles SET 
  aufbau = 'Limousine' 
WHERE aufbau IS NULL;

UPDATE vehicles SET 
  farbe = 'Weiss' 
WHERE farbe IS NULL;

-- Make new columns NOT NULL
ALTER TABLE vehicles ALTER COLUMN getriebe SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN aufbau SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN farbe SET NOT NULL;






