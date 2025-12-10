-- Check RLS and policies for user_documents table
-- This is used during registration to track uploaded documents

-- 1. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_documents';

-- 2. Check current policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    CASE 
        WHEN roles = '{public}' THEN '⚠️ public access'
        WHEN roles = '{authenticated}' THEN '✅ authenticated only'
        ELSE '❓ UNKNOWN'
    END as status
FROM pg_policies 
WHERE tablename = 'user_documents'
ORDER BY cmd, policyname;

-- 3. Count total policies
SELECT COUNT(*) as total_policies 
FROM pg_policies 
WHERE tablename = 'user_documents';

