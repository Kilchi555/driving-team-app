-- Add email_important_notice field to course_categories
-- This allows admins to define custom "Wichtig!" content per course type
-- that appears in the yellow notice block of enrollment confirmation emails.
-- Supports simple HTML list items like <li>...</li>

ALTER TABLE course_categories
  ADD COLUMN IF NOT EXISTS email_important_notice TEXT;

COMMENT ON COLUMN course_categories.email_important_notice IS 'HTML/Text für den gelben Wichtig-Bereich in der Bestätigungs-Email. Supports einfaches HTML wie <li>...</li>';
