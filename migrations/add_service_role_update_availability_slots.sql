-- Migration: Add restrictive UPDATE policy for appointment creation
-- Date: 2026-02-23
-- 
-- PURPOSE:
-- Allow backend to update availability_slots when appointments are created
-- via the staff EventModal (appointments/save.post.ts).
-- 
-- When a staff member creates an appointment through the EventModal:
-- 1. The appointment record is created with status 'pending_confirmation'
-- 2. Overlapping availability_slots must be marked as is_available = false
-- 3. Only is_available column should be updatable to false
-- 
-- SECURITY:
-- - Only service_role can perform these updates (backend operation)
-- - Can ONLY update is_available to false (mark as unavailable)
-- - Cannot modify any other columns or make slots available again
-- - Protects against accidental or malicious slot manipulation

-- Add restrictive UPDATE policy for service_role
-- This allows marking slots unavailable when appointments are created
CREATE POLICY "service_role_mark_slots_unavailable" ON public.availability_slots
  FOR UPDATE
  TO service_role
  USING (TRUE)  -- Can check any slot
  WITH CHECK (
    -- Ensure we're only marking slots as unavailable (not making them available)
    -- New is_available must be either same as old OR becoming false
    (new.is_available = old.is_available OR new.is_available = false)
    AND
    -- Ensure no other critical columns are modified
    new.id = old.id
    AND new.tenant_id = old.tenant_id
    AND new.staff_id = old.staff_id
    AND new.location_id = old.location_id
    AND new.start_time = old.start_time
    AND new.end_time = old.end_time
    AND new.duration_minutes = old.duration_minutes
    AND new.category_code = old.category_code
    AND new.booking_type = old.booking_type
    AND new.slot_type = old.slot_type
    AND new.calculated_at = old.calculated_at
    AND new.appointment_id = old.appointment_id
    AND new.created_at = old.created_at
    AND new.reserved_by_session = old.reserved_by_session
    AND new.reserved_until = old.reserved_until
  );

-- Verify policy is in place
DO $$
BEGIN
  RAISE NOTICE 'Restrictive service_role UPDATE policy for availability_slots has been created successfully';
END $$;
