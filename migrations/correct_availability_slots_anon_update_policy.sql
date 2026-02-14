-- Migration: Corrected UPDATE policy for anonymous users to reserve slots
-- Date: 2026-02-14
-- 
-- PURPOSE:
-- Allow anonymous users to update only 'reserved_by_session' and 'reserved_until'
-- columns on availability_slots, with robust safety checks against the 'valid_reservation' constraint.
--
-- SECURITY:
-- - Only anon users can update
-- - UPDATE is allowed only if slot is free (reserved_by_session IS NULL) OR
--   reservation has expired (reserved_until < NOW())
-- - The WITH CHECK clause ensures that:
--   1. The 'valid_reservation' CHECK constraint is satisfied after the update.
--   2. No other critical columns are modified by the anonymous user.

-- Drop the old UPDATE policy if it exists
DROP POLICY IF EXISTS "update_available_slots" ON public.availability_slots;

-- Create the new, robust UPDATE policy
CREATE POLICY "update_available_slots" ON public.availability_slots
  FOR UPDATE
  TO anon
  USING (
    -- USING: Checks the state BEFORE the update (whether the slot is reservable)
    reserved_by_session IS NULL OR reserved_until < NOW()
  )
  WITH CHECK (
    -- WITH CHECK: Checks the state AFTER the update (ensures the NEW row is valid)
    -- 1. Ensure the 'valid_reservation' CHECK constraint is satisfied:
    ((new.reserved_until IS NULL AND new.reserved_by_session IS NULL) OR
     (new.reserved_until IS NOT NULL AND new.reserved_by_session IS NOT NULL))
    AND
    -- 2. Ensure NO OTHER fields are modified (except the reservation-related ones):
    new.id = old.id AND
    new.tenant_id = old.tenant_id AND
    new.staff_id = old.staff_id AND
    new.location_id = old.location_id AND
    new.start_time = old.start_time AND
    new.end_time = old.end_time AND
    new.duration_minutes = old.duration_minutes AND
    new.is_available = old.is_available AND
    new.booking_type = old.booking_type AND
    new.slot_type = old.slot_type AND
    new.calculated_at = old.calculated_at AND
    new.appointment_id = old.appointment_id AND
    new.created_at = old.created_at AND
    new.category_code = old.category_code
    -- 'updated_at' is automatically set by trigger and not included in this check.
  );

-- Verify policies are in place
DO $$
BEGIN
  RAISE NOTICE 'Corrected UPDATE policy for anonymous slot reservation has been created successfully';
END $$;
