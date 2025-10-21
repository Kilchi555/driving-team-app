-- Make email column nullable in users table
-- Email should be optional during initial student creation
-- Students can add their email during onboarding

-- Step 1: Check current constraint
DO $$
BEGIN
  -- Check if email is currently NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'email' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Email column is currently NOT NULL - will be changed to nullable';
  ELSE
    RAISE NOTICE 'Email column is already nullable - no changes needed';
  END IF;
END $$;

-- Step 2: Make email nullable
ALTER TABLE users 
  ALTER COLUMN email DROP NOT NULL;

-- Step 3: Update existing empty email values to NULL (optional, for consistency)
-- This is optional - you can keep empty strings or convert to NULL
-- UPDATE users SET email = NULL WHERE email = '';

-- Step 4: Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'email';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Email column is now nullable!';
  RAISE NOTICE 'Students can now be created without an email address';
END $$;

