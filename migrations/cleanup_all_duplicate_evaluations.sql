-- Clean up ALL duplicate evaluations comprehensively
-- This removes ALL but the LATEST evaluation for each appointment + criteria combination

BEGIN;

-- Step 1: Create a temporary table with only the IDs to keep (latest per appointment+criteria)
CREATE TEMP TABLE notes_to_keep AS
SELECT DISTINCT ON (appointment_id, evaluation_criteria_id) id
FROM notes
WHERE evaluation_criteria_id IS NOT NULL
ORDER BY appointment_id, evaluation_criteria_id, created_at DESC;

-- Step 2: Delete all evaluations that are NOT in the keep list
DELETE FROM notes
WHERE evaluation_criteria_id IS NOT NULL
  AND id NOT IN (SELECT id FROM notes_to_keep);

-- Step 3: Verify - should return 0 rows if successful
SELECT appointment_id, evaluation_criteria_id, COUNT(*) as duplicate_count
FROM notes
WHERE evaluation_criteria_id IS NOT NULL
GROUP BY appointment_id, evaluation_criteria_id
HAVING COUNT(*) > 1;

COMMIT;

