-- Add missing registered_at column to course_registrations table
-- This fixes the schema mismatch error when enrolling users in courses

-- Check if the column already exists
DO $$ 
BEGIN
  -- Add registered_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_registrations' 
    AND column_name = 'registered_at'
  ) THEN
    ALTER TABLE course_registrations 
    ADD COLUMN registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Update existing records to have registered_at = registration_date
    UPDATE course_registrations 
    SET registered_at = registration_date 
    WHERE registered_at IS NULL AND registration_date IS NOT NULL;
    
    RAISE NOTICE 'Column registered_at added to course_registrations table';
  ELSE
    RAISE NOTICE 'Column registered_at already exists in course_registrations table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'course_registrations' 
AND column_name IN ('registered_at', 'registration_date')
ORDER BY column_name;
