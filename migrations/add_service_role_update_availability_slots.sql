-- Migration: Add service_role UPDATE policy for availability_slots
-- Date: 2026-02-23
-- 
-- PURPOSE:
-- Allow service_role to update availability_slots when appointments are created
-- via the staff EventModal (appointments/save.post.ts).
-- 
-- When a staff member creates an appointment through the EventModal:
-- 1. The appointment record is created with status 'pending_confirmation'
-- 2. Overlapping availability_slots must be marked as is_available = false
-- 3. This requires UPDATE permission via service_role (backend API)
--
-- SECURITY:
-- - Only service_role can perform these updates
-- - This is a backend operation (staff creating appointments)
-- - Ensures public booking page respects staff-created appointments

-- Add UPDATE policy for service_role to mark slots as unavailable
CREATE POLICY "service_role_update_availability_slots" ON public.availability_slots
  FOR UPDATE
  TO service_role
  USING (TRUE)  -- service_role can update any slot
  WITH CHECK (TRUE);  -- No restrictions on the new row state

-- Verify policy is in place
DO $$
BEGIN
  RAISE NOTICE 'service_role UPDATE policy for availability_slots has been created successfully';
END $$;
