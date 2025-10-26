-- Add instructor fields to course_sessions table
-- This migration adds support for both internal staff and external instructors

-- Add new columns to course_sessions table
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS instructor_type VARCHAR(20) CHECK (instructor_type IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS external_instructor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_phone VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN course_sessions.staff_id IS 'Reference to internal staff member (users table)';
COMMENT ON COLUMN course_sessions.instructor_type IS 'Type of instructor: internal (staff) or external';
COMMENT ON COLUMN course_sessions.external_instructor_name IS 'Full name of external instructor';
COMMENT ON COLUMN course_sessions.external_instructor_email IS 'Email of external instructor';
COMMENT ON COLUMN course_sessions.external_instructor_phone IS 'Phone number of external instructor';

-- Update existing sessions to have instructor_type = 'internal' if staff_id is set
-- Note: This will only work if there are existing sessions with staff_id values
UPDATE course_sessions 
SET instructor_type = 'internal' 
WHERE staff_id IS NOT NULL AND instructor_type IS NULL;

-- Add RLS policies for the new columns
-- These columns should follow the same tenant isolation as the rest of the table
-- The existing RLS policies should already cover these columns since they're on the same table

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'course_sessions' 
  AND column_name IN ('instructor_type', 'external_instructor_name', 'external_instructor_email', 'external_instructor_phone')
ORDER BY ordinal_position;
