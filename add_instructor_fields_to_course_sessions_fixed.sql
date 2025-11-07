-- Add instructor fields to course_sessions table
-- This migration adds support for both internal staff and external instructors

-- Step 1: Add staff_id column first (if it doesn't exist)
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES users(id);

-- Step 2: Add instructor type and external instructor fields
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS instructor_type VARCHAR(20) CHECK (instructor_type IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS external_instructor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_instructor_phone VARCHAR(50);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN course_sessions.staff_id IS 'Reference to internal staff member (users table)';
COMMENT ON COLUMN course_sessions.instructor_type IS 'Type of instructor: internal (staff) or external';
COMMENT ON COLUMN course_sessions.external_instructor_name IS 'Full name of external instructor';
COMMENT ON COLUMN course_sessions.external_instructor_email IS 'Email of external instructor';
COMMENT ON COLUMN course_sessions.external_instructor_phone IS 'Phone number of external instructor';

-- Step 4: Update existing sessions to have instructor_type = 'internal' if staff_id is set
-- Note: This will only work if there are existing sessions with staff_id values
UPDATE course_sessions 
SET instructor_type = 'internal' 
WHERE staff_id IS NOT NULL AND instructor_type IS NULL;

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'course_sessions' 
  AND column_name IN ('staff_id', 'instructor_type', 'external_instructor_name', 'external_instructor_email', 'external_instructor_phone')
ORDER BY ordinal_position;

-- Step 6: Check if there are any existing sessions
SELECT COUNT(*) as total_sessions, 
       COUNT(staff_id) as sessions_with_staff,
       COUNT(instructor_type) as sessions_with_instructor_type
FROM course_sessions;


