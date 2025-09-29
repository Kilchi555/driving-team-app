-- Completely disable RLS on evaluation_criteria table
-- This is a temporary fix to allow access to evaluation criteria

-- 1) Disable RLS completely
ALTER TABLE evaluation_criteria DISABLE ROW LEVEL SECURITY;

-- 2) Verify the change
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'evaluation_criteria';

-- 3) Test access
SELECT COUNT(*) as total_criteria FROM evaluation_criteria;
SELECT id, name FROM evaluation_criteria LIMIT 5;

-- 4) Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'evaluation_criteria'
ORDER BY ordinal_position;
