-- Fix deleted_by foreign key to reference users.id instead of auth.users.id
-- This makes it consistent with other user references in the app

-- 1. Drop the old FK
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_deleted_by_fkey;

-- 2. Create new FK pointing to users.id (business users)
ALTER TABLE appointments
ADD CONSTRAINT appointments_deleted_by_fkey 
FOREIGN KEY (deleted_by) 
REFERENCES users(id)
ON DELETE SET NULL;  -- If user is deleted, just set to NULL

-- 3. Do the same for created_by if it exists
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;

ALTER TABLE appointments
ADD CONSTRAINT appointments_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id)
ON DELETE SET NULL;

-- 4. Verify the new constraints
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND conrelid = 'appointments'::regclass
  AND a.attname IN ('deleted_by', 'created_by');

