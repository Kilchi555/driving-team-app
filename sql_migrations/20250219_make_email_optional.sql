-- Make email optional in course_registrations for SARI import
-- Will be required again later for production

ALTER TABLE public.course_registrations 
ALTER COLUMN email DROP NOT NULL;

-- Also make phone optional if it exists
ALTER TABLE public.course_registrations 
ALTER COLUMN phone DROP NOT NULL;

-- Verify changes
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_registrations'
AND column_name IN ('email', 'phone', 'status')
ORDER BY column_name;

