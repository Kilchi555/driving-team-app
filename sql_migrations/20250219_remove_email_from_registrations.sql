-- Remove email field from course_registrations (now in course_participants)
-- This field is causing NULL constraint violations for SARI participants

BEGIN;

-- Remove the email column (it's now in course_participants table)
ALTER TABLE public.course_registrations 
DROP COLUMN IF EXISTS email;

-- Also remove phone if it exists (also moved to course_participants)
ALTER TABLE public.course_registrations 
DROP COLUMN IF EXISTS phone;

COMMIT;

