-- Add unique constraint to notes table to ensure only one evaluation per criteria per appointment
-- This allows upsert to work properly

-- Create a unique index on (appointment_id, evaluation_criteria_id) where evaluation_criteria_id is not null
-- This ensures only one evaluation per criteria per appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_unique_evaluation ON notes (appointment_id, evaluation_criteria_id) 
WHERE evaluation_criteria_id IS NOT NULL;

-- Explanation:
-- - Before: Multiple entries with the same appointment_id + evaluation_criteria_id could exist
-- - After: upsert with onConflict: 'appointment_id,evaluation_criteria_id' will properly update old records
-- - Non-evaluation notes (without evaluation_criteria_id) are not affected by this constraint

