-- Fix RLS policies for cancellation_policies and cancellation_rules
-- Allow public/anonymous access (unauthenticated) to read cancellation policies
-- This is needed for onboarding flow where users are not yet authenticated

-- =====================================================
-- DROP EXISTING POLICIES
-- =====================================================

-- Cancellation policies policies
DROP POLICY IF EXISTS "Public read active policies" ON cancellation_policies;
DROP POLICY IF EXISTS "Public read cancellation policies" ON cancellation_policies;
DROP POLICY IF EXISTS "Service role manage policies" ON cancellation_policies;

-- Cancellation rules policies  
DROP POLICY IF EXISTS "Public read rules" ON cancellation_rules;
DROP POLICY IF EXISTS "Service role manage rules" ON cancellation_rules;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE NEW POLICIES - ALLOW PUBLIC READ
-- =====================================================

-- Policy 1: ANYONE (authenticated or anonymous) can SELECT active policies
-- This is safe because policies are tenant-specific configuration, not sensitive data
CREATE POLICY "cancellation_policies_public_read" ON cancellation_policies
  FOR SELECT
  USING (is_active = true OR auth.role() = 'service_role');

-- Policy 2: Service role can do everything (admin management)
CREATE POLICY "cancellation_policies_service_role" ON cancellation_policies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 3: ANYONE (authenticated or anonymous) can SELECT rules
-- This is safe because rules belong to policies and are configuration data
CREATE POLICY "cancellation_rules_public_read" ON cancellation_rules
  FOR SELECT
  USING (true);

-- Policy 4: Service role can do everything on rules (admin management)
CREATE POLICY "cancellation_rules_service_role" ON cancellation_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- VERIFY
-- =====================================================

SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('cancellation_policies', 'cancellation_rules')
ORDER BY tablename, policyname;

