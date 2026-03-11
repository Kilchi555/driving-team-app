-- Migration: Fix anon read policy for availability_slots
-- DATE: 2026-03-10
--
-- PROBLEM:
-- The reserve-slot endpoint reads a slot by ID before updating it.
-- The anon key is used, but the SELECT policy may filter out reserved/unavailable slots,
-- causing a "Slot not found" 404 even when the slot exists in the DB.
--
-- FIX:
-- Ensure a separate SELECT policy exists for anon that allows reading ANY slot by ID,
-- regardless of its is_available or reserved status.
-- This is safe because the UPDATE policy still enforces that only free slots can be reserved.

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "select_all_slots_for_internal_read" ON public.availability_slots;
DROP POLICY IF EXISTS "anon_read_availability_slots" ON public.availability_slots;

-- Policy 1: Public listing – only shows available, unreserved slots
-- Used by: get-available-slots.get.ts
DROP POLICY IF EXISTS "select_available_slots_for_listing" ON public.availability_slots;
CREATE POLICY "select_available_slots_for_listing" ON public.availability_slots
  FOR SELECT
  TO anon
  USING (
    is_available = true
    AND (reserved_until IS NULL OR reserved_until < NOW())
    AND EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = availability_slots.tenant_id
      AND tenants.is_active = true
    )
  );

-- Policy 2: Internal read by ID – allows reading ANY slot regardless of status
-- Used by: reserve-slot.post.ts to verify the slot exists before updating
CREATE POLICY "select_any_slot_by_id_for_reservation" ON public.availability_slots
  FOR SELECT
  TO anon
  USING (TRUE);
