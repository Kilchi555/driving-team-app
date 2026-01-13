-- Migration: Check and Fix Payments RLS Policies
-- Date: 2025-02-24
-- Purpose: Verify payments table RLS and fix any issues
-- Issue: Prices not showing in confirmation modal due to RLS

-- ============================================
-- PART 1: Check current RLS status
-- ============================================

-- Check if RLS is enabled on payments
SELECT 'RLS Status' as check_name, 
  CASE WHEN rowsecurity THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END as status
FROM pg_tables 
WHERE tablename = 'payments' AND schemaname = 'public';

-- Check existing policies on payments
SELECT 'Existing Policies' as check_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'payments';

-- List all existing policies with details
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- ============================================
-- PART 2: Enable RLS if not already enabled
-- ============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: Drop existing policies and recreate correctly
-- ============================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "payments_select_own" ON payments;
DROP POLICY IF EXISTS "payments_select_staff" ON payments;
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
DROP POLICY IF EXISTS "payments_insert_staff" ON payments;
DROP POLICY IF EXISTS "payments_update_own" ON payments;
DROP POLICY IF EXISTS "payments_update_staff" ON payments;
DROP POLICY IF EXISTS "payments_delete_own" ON payments;
DROP POLICY IF EXISTS "payments_delete_staff" ON payments;

-- DROP any other legacy policies
DROP POLICY IF EXISTS "staff_can_view_payments" ON payments;
DROP POLICY IF EXISTS "users_can_view_own_payments" ON payments;
DROP POLICY IF EXISTS "payments_tenant_isolation" ON payments;

-- ============================================
-- PART 4: Create NEW RLS Policies for Payments
-- ============================================

-- Policy 1: Clients can view their own payments
CREATE POLICY "payments_select_client" ON payments 
FOR SELECT TO authenticated
USING (
  -- User can see their own payment
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 2: Staff/Admins can view payments in their tenant
CREATE POLICY "payments_select_staff_admin" ON payments 
FOR SELECT TO authenticated
USING (
  -- Only for staff/admin roles
  (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('admin', 'staff', 'tenant_admin')
  -- Must be same tenant
  AND tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 3: Clients can insert their own payments
CREATE POLICY "payments_insert_client" ON payments 
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 4: Staff can insert payments
CREATE POLICY "payments_insert_staff_admin" ON payments 
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('admin', 'staff', 'tenant_admin')
  AND tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 5: Clients can update their own payments
CREATE POLICY "payments_update_client" ON payments 
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 6: Staff can update payments in their tenant
CREATE POLICY "payments_update_staff_admin" ON payments 
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('admin', 'staff', 'tenant_admin')
  AND tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('admin', 'staff', 'tenant_admin')
  AND tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 7: Clients can delete their own payments
CREATE POLICY "payments_delete_client" ON payments 
FOR DELETE TO authenticated
USING (
  user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Policy 8: Staff can delete payments
CREATE POLICY "payments_delete_staff_admin" ON payments 
FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1) IN ('admin', 'staff', 'tenant_admin')
  AND tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- ============================================
-- PART 5: Verification
-- ============================================

-- Verify RLS is enabled
SELECT '✓ RLS Enabled' as result
FROM pg_tables 
WHERE tablename = 'payments' AND rowsecurity = true;

-- Verify all policies were created
SELECT 'Policies Created: ' || COUNT(*) as result
FROM pg_policies
WHERE tablename = 'payments';

-- List final policies
SELECT 
  policyname,
  CASE WHEN cmd = 'SELECT' THEN '📖 READ'
       WHEN cmd = 'INSERT' THEN '✍️  WRITE'
       WHEN cmd = 'UPDATE' THEN '✏️  UPDATE'
       WHEN cmd = 'DELETE' THEN '🗑️  DELETE'
       ELSE cmd END as operation,
  roles
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

