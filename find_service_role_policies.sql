-- CRITICAL: Find all policies designed for or compatible with Service Role

-- Service Role Key:
-- - Bypasses ALL RLS policies
-- - Can access any table without restrictions
-- - But we should TRACK where we're using it

-- These queries help you find:
-- 1. Policies that might have been created for Service Role access
-- 2. Tables that are vulnerable because they have permissive policies
-- 3. Potential security issues

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  qual,
  with_check,
  CASE 
    WHEN qual = 'true' AND with_check = 'true' THEN '🔓 FULLY OPEN - Service Role friendly'
    WHEN qual = 'true' THEN '⚠️ SELECT open to Service Role'
    WHEN roles::text LIKE '%public%' AND qual = 'true' THEN '🔓 PUBLIC can do this'
    WHEN policyname ILIKE '%service%' THEN '🔧 Explicitly for Service Role'
    ELSE '✅ Restricted'
  END as security_note
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Alternative: Find tables we're likely using Service Role for (in our codebase)
-- Look for these patterns in your code:
-- - getSupabaseAdmin() 
-- - getSupabase().from('table_name').select()
-- - Any .from().insert/update/delete without .eq('user_id', userId)

-- Tables we know use Service Role (based on code review):
-- - webhook_logs (created in webhook handler)
-- - payments (updated by Wallee webhook)
-- - course_registrations (updated by webhook)
-- - external_calendars (accessed by /api endpoints)
-- - appointments (accessed by various endpoints)
-- - staff_locations (accessed by /api/staff endpoints)

-- Check policies for these specific tables:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'webhook_logs',
    'payments', 
    'course_registrations',
    'external_calendars',
    'appointments',
    'staff_locations',
    'audit_logs',
    'users'
  )
ORDER BY tablename, policyname;
