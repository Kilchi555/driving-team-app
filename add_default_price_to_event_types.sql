-- SQL: Add default_price and default_fee to event_types table
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS default_price_rappen INTEGER DEFAULT 0;

ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS default_fee_rappen INTEGER DEFAULT 0;

-- Update existing event types with default prices
UPDATE event_types 
SET default_price_rappen = 9500 
WHERE code = 'lesson' AND default_price_rappen = 0;

UPDATE event_types 
SET default_price_rappen = 8500 
WHERE code = 'theory' AND default_price_rappen = 0;

UPDATE event_types 
SET default_price_rappen = 0 
WHERE code = 'meeting' AND default_price_rappen = 0;

UPDATE event_types 
SET default_price_rappen = 0 
WHERE code = 'sonstiges' AND default_price_rappen = 0;
