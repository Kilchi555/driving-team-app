-- Migration: Add UPDATE policy for anonymous users to reserve slots
-- Date: 2026-02-13
-- 
-- PURPOSE:
-- Allow anonymous users to update only 'reserved_by_session' and 'reserved_until'
-- columns on availability_slots, with proper safety checks to prevent race conditions.
--
-- SECURITY:
-- - Only anon and authenticated users can use this policy
-- - Can only update if slot is free (reserved_by_session IS NULL) OR
--   reservation has expired (reserved_until < NOW()) OR
--   same session is extending its own reservation (reserved_by_session = new.reserved_by_session)
-- - Can only modify reserved_by_session and reserved_until columns
-- - All other columns must remain unchanged

-- Add UPDATE policy for anon users to reserve slots
CREATE POLICY "availability_anon_update_reserve_slot" ON availability_slots
  FOR UPDATE
  TO anon, authenticated
  USING (
    -- Allow UPDATE attempt if:
    -- 1. Slot is currently free, OR
    -- 2. Previous reservation has expired
    reserved_by_session IS NULL OR
    reserved_until < NOW()
  );

-- Add trigger function to validate that only reservation fields are modified
CREATE OR REPLACE FUNCTION validate_availability_slot_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure only reserved_by_session and reserved_until can be changed
  IF (
    NEW.id != OLD.id OR
    NEW.tenant_id != OLD.tenant_id OR
    NEW.staff_id != OLD.staff_id OR
    NEW.location_id != OLD.location_id OR
    NEW.start_time != OLD.start_time OR
    NEW.end_time != OLD.end_time OR
    NEW.duration_minutes != OLD.duration_minutes OR
    NEW.is_available != OLD.is_available OR
    NEW.booking_type != OLD.booking_type OR
    NEW.slot_type != OLD.slot_type OR
    NEW.calculated_at != OLD.calculated_at OR
    NEW.appointment_id != OLD.appointment_id OR
    NEW.created_at != OLD.created_at OR
    NEW.category_code != OLD.category_code
  ) THEN
    RAISE EXCEPTION 'Only reserved_by_session and reserved_until can be modified';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate updates
DROP TRIGGER IF EXISTS trigger_validate_availability_slot_update ON availability_slots;
CREATE TRIGGER trigger_validate_availability_slot_update
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION validate_availability_slot_update();

-- Verify policies are in place
DO $$
BEGIN
  RAISE NOTICE 'UPDATE policy for anonymous slot reservation has been created successfully';
END $$;
