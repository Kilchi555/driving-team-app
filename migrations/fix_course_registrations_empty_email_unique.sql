/**
 * Migration: Empty email must not collide on course enrollments
 *
 * Problem:
 *   idx_course_registrations_unique_email is UNIQUE (course_id, email)
 *   for confirmed/enrolled rows. PostgreSQL treats '' as a real value, so
 *   the first enrollment with email='' occupies the slot and every later
 *   admin enroll of a phone-only / no-email client fails with duplicate key.
 *
 *   users_email_tenant_unique already excludes blank emails; this aligns
 *   course_registrations with that pattern.
 *
 * Seen in prod (Fahrschule Gemperli VKU Wangen September): Manuel Good
 * enrolled with email='', blocking further no-email admin enrollments.
 */

-- Normalize blank emails to NULL (NULLs do not collide in unique indexes)
UPDATE course_registrations
SET email = NULL
WHERE email IS NOT NULL AND btrim(email) = '';

-- Recreate unique email index so only real addresses are unique per course
DROP INDEX IF EXISTS idx_course_registrations_unique_email;

CREATE UNIQUE INDEX idx_course_registrations_unique_email
ON course_registrations (course_id, email)
WHERE status IN ('confirmed', 'enrolled')
  AND email IS NOT NULL
  AND btrim(email) <> '';

-- Same hardening for empty faberids (defensive; currently none in prod)
UPDATE course_registrations
SET sari_faberid = NULL
WHERE sari_faberid IS NOT NULL AND btrim(sari_faberid) = '';

DROP INDEX IF EXISTS idx_course_registrations_unique_faberid;

CREATE UNIQUE INDEX idx_course_registrations_unique_faberid
ON course_registrations (course_id, sari_faberid)
WHERE status IN ('confirmed', 'enrolled')
  AND sari_faberid IS NOT NULL
  AND btrim(sari_faberid) <> '';

-- NOTE: Do NOT add a unique (course_id, user_id) index here.
-- Wallee webhook / credit / individual-session paths can create multiple
-- rows or race on the same user; app-level checks cover the admin UI case.

COMMENT ON INDEX idx_course_registrations_unique_email IS
  'One active enrollment per real email per course; blank/NULL emails allowed multiple times';
