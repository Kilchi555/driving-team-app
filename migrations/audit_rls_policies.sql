-- Migration: Audit and fix RLS policies for all critical tables
-- Description: Ensure all tables with sensitive data have proper RLS policies

-- This script checks which tables need RLS policy fixes

-- Tables that likely need RLS policy reviews (based on 403 errors):
-- 1. examiners - FIXED in fix_examiners_rls_policies.sql
-- 2. exam_results - FIXED in fix_exam_results_rls_policies.sql
-- 3. Check these tables next:

-- List tables with RLS enabled but potentially missing policies:
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename NOT IN ('pg_*', '_*')
-- ORDER BY tablename;

-- Tables that should have RLS (if not already fixed):
-- - appointments (should have tenant-based access)
-- - users (should have restricted access)
-- - student_categories (should have tenant-based access)
-- - locations (should have tenant-based access)
-- - staff_working_hours (should have tenant-based access)
-- - appointments_external_busy_time (should have tenant-based access)

-- Quick fix for common RLS policy issues:
-- If you see 403 errors on any table, ensure:
-- 1. Table has RLS enabled: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- 2. Table has at least one policy that allows authenticated users
-- 3. Policies check tenant_id or auth.uid() appropriately

-- For debugging RLS issues:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- To check policies on a table:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'table_name';




