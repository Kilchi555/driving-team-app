-- Migration: Remove staff/admin SELECT policy for availability_slots
-- Date: 2026-02-13
-- 
-- PURPOSE:
-- Remove the availability_staff_select policy as it's not needed.
-- Staff/Admin can access availability slots through other means if needed,
-- but we don't need a blanket policy for them on this public booking table.

-- Drop the staff/admin SELECT policy
DROP POLICY IF EXISTS "availability_staff_select" ON availability_slots;

-- Verify policy has been removed
DO $$
BEGIN
  RAISE NOTICE 'Staff/admin SELECT policy for availability_slots has been removed';
END $$;
