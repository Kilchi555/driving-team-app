-- Migration: Fix RLS for Student Credits and Credit Transactions
-- Purpose: Enable both authenticated users and guest users to redeem vouchers securely
-- Security: Uses user_id check (works for both auth and guest users)

-- =====================================================
-- 1. Ensure RLS is enabled on both tables
-- =====================================================

ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Drop all conflicting policies
-- =====================================================

DROP POLICY IF EXISTS "Allow all authenticated access to student_credits" ON student_credits;
DROP POLICY IF EXISTS "Allow all authenticated access to credit_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view their own credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can view their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can view all credits" ON student_credits;
DROP POLICY IF EXISTS "Staff can manage their students credits" ON student_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON student_credits;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON student_credits;
DROP POLICY IF EXISTS "student_credits_select_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_select_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_tenant_access" ON student_credits;
DROP POLICY IF EXISTS "student_credits_select_policy" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_policy" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_policy" ON student_credits;

DROP POLICY IF EXISTS "Users can view their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can view their students credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can create credit transactions for their students" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can create all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON credit_transactions;

-- =====================================================
-- 3. STUDENT_CREDITS: Secure RLS Policies
-- =====================================================

-- SELECT: Users can view their own credits
-- Works for: authenticated users and guest users (both have user_id)
CREATE POLICY "student_credits_select_own"
  ON student_credits FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()  -- Direct match if user_id IS the auth.uid()
  );

-- SELECT: Staff/Admins can view their tenant's credits
CREATE POLICY "student_credits_select_staff"
  ON student_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = student_credits.user_id
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin')
      )
    )
  );

-- INSERT: Users/API can insert their own credit records
-- This allows both authenticated and guest users to have their credit initialized
CREATE POLICY "student_credits_insert_own"
  ON student_credits FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- INSERT: API with admin role can insert (for system operations)
CREATE POLICY "student_credits_insert_system"
  ON student_credits FOR INSERT
  WITH CHECK (
    -- Only allow if the user_id belongs to the current authenticated user or is guest
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
    -- Note: Admin API bypasses this via getSupabaseAdmin()
  );

-- UPDATE: Users can update their own credits
-- Note: Actual updates happen via admin API, but policy allows it for their own records
CREATE POLICY "student_credits_update_own"
  ON student_credits FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- UPDATE: Staff/Admins can update their tenant's credits
CREATE POLICY "student_credits_update_staff"
  ON student_credits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = student_credits.user_id
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = student_credits.user_id
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin')
      )
    )
  );

-- =====================================================
-- 4. CREDIT_TRANSACTIONS: Secure RLS Policies
-- =====================================================

-- SELECT: Users can view their own transactions
CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- SELECT: Staff/Admins can view their tenant's transactions
CREATE POLICY "credit_transactions_select_staff"
  ON credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = credit_transactions.user_id
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin')
      )
    )
  );

-- INSERT: Users/API can create their own transactions
CREATE POLICY "credit_transactions_insert_own"
  ON credit_transactions FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- INSERT: System/Admin can insert (for API operations)
CREATE POLICY "credit_transactions_insert_system"
  ON credit_transactions FOR INSERT
  WITH CHECK (
    -- Only allow if the user_id belongs to the current authenticated user or is guest
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    OR user_id = auth.uid()
    -- Note: Admin API bypasses this via getSupabaseAdmin()
  );

-- UPDATE: Staff/Admins can update their tenant's transactions
CREATE POLICY "credit_transactions_update_staff"
  ON credit_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = credit_transactions.user_id
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND role IN ('staff', 'admin')
      )
    )
  );

-- =====================================================
-- 5. INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_student_credits_user_id ON student_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_student_credits_tenant_id ON student_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);

-- =====================================================
-- 6. MIGRATION COMPLETE
-- =====================================================

-- Summary of changes:
-- ✅ Removed overly permissive "Allow all authenticated" policies
-- ✅ Added user_id-based policies (works for auth AND guest users)
-- ✅ Added staff/admin tenant-scoped policies
-- ✅ Both authenticated users and guest users can now:
--    - Have their own credit records created
--    - View and update their own records
--    - Redeem vouchers for credit via API
-- ✅ Staff/Admins can manage their tenant's data
-- ✅ API calls with admin client bypass RLS entirely

-- Security notes:
-- - Admin API (getSupabaseAdmin) bypasses all RLS policies
-- - Used by: /api/vouchers/redeem.post.ts for credit operations
-- - Guest users (auth_user_id=null) can still operate via user_id matches
-- - Tenant isolation maintained for staff/admin operations
