-- Migration: Add custom_sessions column for flexible session selection
-- This allows users to swap individual sessions from other courses

-- Add the column
ALTER TABLE course_registrations 
ADD COLUMN IF NOT EXISTS custom_sessions JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN course_registrations.custom_sessions IS 
'JSON object mapping session positions to custom SARI session IDs. 
Example: {"3": "2110045", "4": "2110046"} means session 3 and 4 are from different courses.
NULL means use all sessions from the registered course.
Sessions on the same day are grouped and cannot be changed individually.';

-- Index for queries filtering by custom_sessions
CREATE INDEX IF NOT EXISTS idx_course_registrations_custom_sessions 
ON course_registrations USING GIN (custom_sessions) 
WHERE custom_sessions IS NOT NULL;

