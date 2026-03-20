-- Migration: Fix RLS for Student Credits and Credit Transactions
-- Date: 2026-03-20
--
-- Context:
--   The voucher redemption API (redeem.post.ts) uses getSupabaseAdmin() which
--   bypasses all RLS. These policies only affect direct Supabase client access
--   from the frontend (e.g. customer dashboard, admin panel).
--
--   Guest users (auth_user_id = NULL) never access these tables directly.
--   Their operations always go through server-side API endpoints with admin client.
--
-- Design:
--   - Authenticated users: can see/modify their OWN records
--   - Staff/Admin: can see/modify records in their TENANT
--   - Anonymous/Guest: NO direct access (all operations via admin API)

-- =====================================================
-- 1. Enable RLS
-- =====================================================

ALTER TABLE student_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Drop ALL existing policies (clean slate)
-- =====================================================

-- student_credits
DROP POLICY IF EXISTS "Allow all authenticated access to student_credits" ON student_credits;
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
DROP POLICY IF EXISTS "student_credits_insert_system" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_own" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_staff" ON student_credits;
DROP POLICY IF EXISTS "student_credits_tenant_access" ON student_credits;
DROP POLICY IF EXISTS "student_credits_select_policy" ON student_credits;
DROP POLICY IF EXISTS "student_credits_insert_policy" ON student_credits;
DROP POLICY IF EXISTS "student_credits_update_policy" ON student_credits;

-- credit_transactions
DROP POLICY IF EXISTS "Allow all authenticated access to credit_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can view their students credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can create credit transactions for their students" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can create all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_own" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_staff" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_own" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_system" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_update_staff" ON credit_transactions;

-- =====================================================
-- 3. STUDENT_CREDITS policies
-- =====================================================

-- SELECT: Authenticated user can view their own credits
CREATE POLICY "sc_select_own" ON student_credits FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- SELECT: Staff/Admin can view all credits in their tenant
CREATE POLICY "sc_select_tenant" ON student_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = student_credits.tenant_id
    )
  );

-- INSERT: Staff/Admin can create credit records in their tenant
CREATE POLICY "sc_insert_tenant" ON student_credits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = student_credits.tenant_id
    )
  );

-- UPDATE: Authenticated user can update their own credits
CREATE POLICY "sc_update_own" ON student_credits FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- UPDATE: Staff/Admin can update credits in their tenant
CREATE POLICY "sc_update_tenant" ON student_credits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = student_credits.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = student_credits.tenant_id
    )
  );

-- =====================================================
-- 4. CREDIT_TRANSACTIONS policies
-- =====================================================

-- SELECT: Authenticated user can view their own transactions
CREATE POLICY "ct_select_own" ON credit_transactions FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- SELECT: Staff/Admin can view all transactions in their tenant
CREATE POLICY "ct_select_tenant" ON credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = credit_transactions.tenant_id
    )
  );

-- INSERT: Staff/Admin can create transactions in their tenant
CREATE POLICY "ct_insert_tenant" ON credit_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = credit_transactions.tenant_id
    )
  );

-- UPDATE: Staff/Admin can update transactions in their tenant
CREATE POLICY "ct_update_tenant" ON credit_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('staff', 'admin')
        AND u.tenant_id = credit_transactions.tenant_id
    )
  );

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_student_credits_user_id ON student_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_student_credits_tenant_id ON student_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);

-- =====================================================
-- 6. MIGRATION COMPLETE
-- =====================================================

-- Final policy matrix:
--
-- STUDENT_CREDITS:
--   Role          | SELECT | INSERT | UPDATE | DELETE
--   ──────────────|────────|────────|────────|───────
--   Anonymous     |   ✗    |   ✗    |   ✗    |   ✗
--   Auth (own)    |   ✓    |   ✗    |   ✓    |   ✗
--   Staff/Admin   |   ✓    |   ✓    |   ✓    |   ✗
--   Admin API     |   ✓    |   ✓    |   ✓    |   ✓  (bypasses RLS)
--
-- CREDIT_TRANSACTIONS:
--   Role          | SELECT | INSERT | UPDATE | DELETE
--   ──────────────|────────|────────|────────|───────
--   Anonymous     |   ✗    |   ✗    |   ✗    |   ✗
--   Auth (own)    |   ✓    |   ✗    |   ✗    |   ✗
--   Staff/Admin   |   ✓    |   ✓    |   ✓    |   ✗
--   Admin API     |   ✓    |   ✓    |   ✓    |   ✓  (bypasses RLS)
--
-- Key design decisions:
--   - No DELETE policies: records are immutable audit trail
--   - Regular users cannot INSERT credits (only admin API or staff)
--   - Regular users CAN update their own credits (for balance display)
--   - All voucher redemption goes through admin API → bypasses RLS
--   - Guest users have NO direct table access → all via admin API
--   - Tenant isolation enforced for staff/admin operations
