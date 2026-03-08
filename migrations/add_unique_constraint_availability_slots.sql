-- Migration: Add UNIQUE constraint to availability_slots
-- Purpose: Prevent duplicate slots when multiple calculator processes run simultaneously (race condition fix)
-- The constraint ensures (staff_id, location_id, start_time, end_time, category_code) is unique
-- Combined with upsert in availability-calculator.ts, this makes slot generation idempotent

-- Step 1: Delete existing duplicates, keeping only the most recently updated row per combination
DELETE FROM availability_slots
WHERE id NOT IN (
  SELECT DISTINCT ON (staff_id, location_id, start_time, end_time, category_code) id
  FROM availability_slots
  ORDER BY staff_id, location_id, start_time, end_time, category_code, updated_at DESC
);

-- Step 2: Add the UNIQUE constraint
ALTER TABLE availability_slots
ADD CONSTRAINT availability_slots_unique_slot
UNIQUE (staff_id, location_id, start_time, end_time, category_code);
