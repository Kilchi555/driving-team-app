-- Remove duplicate evaluations, keeping only the most recent one per appointment + criteria
-- This must be run BEFORE add_unique_constraint_notes.sql

BEGIN;

-- Step 1: Identify and delete duplicates, keeping only the latest one per (appointment_id, evaluation_criteria_id)
DELETE FROM notes n1
WHERE evaluation_criteria_id IS NOT NULL
  AND id NOT IN (
    -- Keep the most recent entry for each appointment_id + evaluation_criteria_id
    SELECT DISTINCT ON (appointment_id, evaluation_criteria_id) id
    FROM notes
    WHERE evaluation_criteria_id IS NOT NULL
    ORDER BY appointment_id, evaluation_criteria_id, created_at DESC
  );

-- Step 2: Verify the cleanup
-- SELECT appointment_id, evaluation_criteria_id, COUNT(*) as count
-- FROM notes
-- WHERE evaluation_criteria_id IS NOT NULL
-- GROUP BY appointment_id, evaluation_criteria_id
-- HAVING COUNT(*) > 1;
-- If this returns 0 rows, the cleanup was successful

COMMIT;

-- After running this, run add_unique_constraint_notes.sql

