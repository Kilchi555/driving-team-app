-- Migration: Add public_bookable flag to locations
-- Allows controlling internal vs external visibility independently

ALTER TABLE locations ADD COLUMN public_bookable BOOLEAN DEFAULT true;

-- Existing locations remain public by default
-- Staff can manage visibility separately

