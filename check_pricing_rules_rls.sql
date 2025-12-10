-- Check RLS status for pricing_rules table
-- This table is used by the services page to show available services

SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'pricing_rules';

-- Check current policies
SELECT 
    policyname,
    permissive,
    roles,
    CASE 
        WHEN roles = '{public}' THEN '⚠️ WARNING: public access'
        WHEN roles = '{authenticated}' THEN '✅ PASS: authenticated only'
        ELSE '❓ UNKNOWN'
    END as status
FROM pg_policies 
WHERE tablename = 'pricing_rules'
ORDER BY policyname;

-- Count total policies
SELECT COUNT(*) as total_policies 
FROM pg_policies 
WHERE tablename = 'pricing_rules';

