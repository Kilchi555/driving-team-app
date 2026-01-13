-- Make email optional in course_registrations for SARI import
-- Will be required again later for production

BEGIN;

-- Remove NOT NULL constraint from email (make it optional for SARI participants)
ALTER TABLE public.course_registrations 
ALTER COLUMN email DROP NOT NULL;

-- Also make phone optional if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_registrations' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.course_registrations 
    ALTER COLUMN phone DROP NOT NULL;
  END IF;
END $$;

COMMIT;

-- Verify changes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_registrations'
AND column_name IN ('email', 'phone')
ORDER BY column_name;

