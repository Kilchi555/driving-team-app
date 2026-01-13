-- Migration: Add RLS Policies for Payments Table
-- Date: 2025-02-24
-- Purpose: Enable RLS on payments table and create appropriate policies
-- Issue: After enabling RLS globally, payments couldn't be fetched in CustomerDashboard

-- ============================================
-- PART 1: Enable RLS on payments table
-- ============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Create RLS Policies for Payments
-- ============================================

-- Clients can view their own payments
CREATE POLICY "payments_select_own" ON payments FOR SELECT TO authenticated
USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Staff can view payments for their tenant (for appointments they manage)
CREATE POLICY "payments_select_staff" ON payments FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
  AND (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('admin', 'staff', 'tenant_admin')
);

-- Clients can insert their own payments (for payment processing)
CREATE POLICY "payments_insert_own" ON payments FOR INSERT TO authenticated
WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Staff can insert payments for their tenant
CREATE POLICY "payments_insert_staff" ON payments FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
  AND (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('admin', 'staff', 'tenant_admin')
);

-- Clients can update their own payments
CREATE POLICY "payments_update_own" ON payments FOR UPDATE TO authenticated
USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Staff can update payments in their tenant
CREATE POLICY "payments_update_staff" ON payments FOR UPDATE TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
  AND (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('admin', 'staff', 'tenant_admin')
)
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
);

-- Clients can delete their own payments (soft delete via status)
CREATE POLICY "payments_delete_own" ON payments FOR DELETE TO authenticated
USING (
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Staff can delete payments in their tenant
CREATE POLICY "payments_delete_staff" ON payments FOR DELETE TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
  AND (SELECT role FROM users WHERE auth_user_id = auth.uid()) IN ('admin', 'staff', 'tenant_admin')
);

-- ============================================
-- PART 3: Verification
-- ============================================

-- Verify RLS is enabled on payments
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'payments' AND schemaname = 'public';

-- Verify policies exist on payments
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

