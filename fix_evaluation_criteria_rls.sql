-- Fix evaluation_criteria table RLS to allow access
-- This table doesn't have tenant_id, so we need to allow access for all authenticated users

-- 1) Check if evaluation_criteria table exists and has RLS
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'evaluation_criteria';

-- 2) Check existing policies
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'evaluation_criteria';

-- 3) Drop existing policies if they exist
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  -- Drop all existing policies on evaluation_criteria table
  FOR rec IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'evaluation_criteria'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || rec.policyname || ' ON evaluation_criteria';
  END LOOP;
END $$;

-- 4) Create simple policy that allows all authenticated users to read evaluation_criteria
CREATE POLICY evaluation_criteria_read_authenticated ON evaluation_criteria
  FOR SELECT
  TO authenticated
  USING (true);

-- 5) Verify the policy was created
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'evaluation_criteria';

-- 6) Test access
SELECT COUNT(*) as accessible_criteria FROM evaluation_criteria;
