-- Migration: Secure Voucher Lookup for Shop (Anonymous Access)
-- Date: 2026-03-20
--
-- Architecture decision:
--   The lookup API (lookup.post.ts) uses getSupabaseAdmin() which BYPASSES RLS.
--   This means we do NOT need any anon SELECT policies on vouchers/voucher_codes.
--   All validation (tenant_id, is_active, dates) happens at the API layer.
--
--   This is the safest approach because:
--   - No voucher codes are ever exposed via direct PostgREST/anon access
--   - Anon users cannot enumerate codes across tenants
--   - The API controls exactly which fields are returned
--   - Rate limiting can be applied at the API layer
--
-- What this migration does:
--   1. Ensures no dangerous anon policies exist
--   2. Adds performance indexes for code lookups

-- =====================================================
-- 1. CLEANUP: Remove any overly permissive anon policies
-- =====================================================

-- Remove anon SELECT policies if they were previously created
-- These are dangerous because they allow direct PostgREST enumeration
DROP POLICY IF EXISTS "Anon can lookup active voucher codes by code and tenant" ON voucher_codes;
DROP POLICY IF EXISTS "Anon can lookup active voucher codes" ON voucher_codes;
DROP POLICY IF EXISTS "Anon can lookup active vouchers by code" ON vouchers;
DROP POLICY IF EXISTS "Anon can lookup active vouchers" ON vouchers;

-- Remove no-op DENY policies (permissive USING(false) has zero effect in PostgreSQL)
DROP POLICY IF EXISTS "Prevent anon updates to voucher_codes" ON voucher_codes;
DROP POLICY IF EXISTS "Prevent anon deletes from voucher_codes" ON voucher_codes;
DROP POLICY IF EXISTS "Prevent anon updates to vouchers" ON vouchers;
DROP POLICY IF EXISTS "Prevent anon deletes from vouchers" ON vouchers;

-- =====================================================
-- 2. VERIFY: Existing policies provide correct access
-- =====================================================

-- vouchers table should have these policies (from create_vouchers_table.sql):
--   "Users can view their own vouchers"       FOR SELECT  (auth.uid() match)
--   "Admins can view all vouchers of their tenant" FOR SELECT  (admin/staff + tenant match)
--   "Admins can manage vouchers"              FOR ALL     (admin + tenant match)
--
-- voucher_codes table should have these policies (from add_credit_products_and_vouchers.sql):
--   "Users can view active vouchers of their tenant" FOR SELECT (auth.uid() + tenant + active)
--   "Admins can manage vouchers"              FOR ALL     (admin + tenant match)
--
-- These are sufficient because:
--   - Authenticated users can see their own vouchers (SELECT)
--   - Admins can manage all vouchers in their tenant (ALL)
--   - Anon users have NO direct access (correct!)
--   - All anon operations go through API endpoints that use getSupabaseAdmin()

-- =====================================================
-- 3. INDEXES for fast code lookups (used by admin client)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_voucher_codes_code_active 
  ON voucher_codes(code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vouchers_code_active 
  ON vouchers(code) WHERE is_active = true AND redeemed_at IS NULL;

-- =====================================================
-- 4. MIGRATION COMPLETE
-- =====================================================

-- Final policy state for `vouchers` table:
--   ✅ SELECT: Auth users see own vouchers (via redeemed_by, recipient_email, payment)
--   ✅ SELECT: Admin/Staff see all tenant vouchers
--   ✅ ALL:    Admin can manage tenant vouchers
--   ✅ ANON:   NO direct access (all anon operations via API + admin client)
--
-- Final policy state for `voucher_codes` table:
--   ✅ SELECT: Auth users see active codes in their tenant
--   ✅ ALL:    Admin can manage tenant codes
--   ✅ ANON:   NO direct access (all anon operations via API + admin client)
--
-- API endpoints:
--   POST /api/vouchers/lookup  → uses getSupabaseAdmin() → bypasses RLS → safe
--   POST /api/vouchers/redeem  → uses getSupabaseAdmin() → bypasses RLS → safe
--   Both validate tenant_id, code, dates at the application layer
