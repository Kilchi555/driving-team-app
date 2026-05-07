-- Run this once in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/sql/new

-- 1. Add booking_handle column
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS booking_handle TEXT UNIQUE;

-- 2. Auto-generate handles for all staff/admin (lowercase, hyphens, no special chars)
UPDATE users
SET booking_handle = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(first_name || '-' || last_name, '[äÄ]', 'ae', 'g'),
    '[^a-z0-9-]', '-', 'g'
  )
)
WHERE role IN ('staff', 'admin', 'tenant_admin')
  AND booking_handle IS NULL
  AND deleted_at IS NULL;

-- 3. Verify result
SELECT id, first_name, last_name, booking_handle FROM users
WHERE role = 'staff' ORDER BY first_name;
