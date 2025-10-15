-- Clean up overlapping RLS policies for discounts table
-- Remove duplicate policies and keep only the comprehensive one

-- First, let's check current policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'discounts';

-- Drop individual operation policies (they overlap with the ALL policy)
DROP POLICY IF EXISTS "discounts_select_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_insert_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_update_policy" ON discounts;
DROP POLICY IF EXISTS "discounts_delete_policy" ON discounts;

-- Keep only the comprehensive "discounts_tenant_isolation" policy
-- This policy already handles all operations (ALL) and includes voucher logic

-- Verify only the comprehensive policy remains
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'discounts'
ORDER BY policyname;

