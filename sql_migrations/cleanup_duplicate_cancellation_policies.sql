-- CLEAN UP DUPLICATE POLICIES FOR CANCELLATION_POLICIES AND RULES
-- Keep only essential policies to avoid conflicts

-- =====================================================
-- DROP REDUNDANT POLICIES
-- =====================================================

-- Delete duplicate/conflicting SELECT policies
DROP POLICY IF EXISTS "cancellation_policies_select" ON cancellation_policies;
DROP POLICY IF EXISTS "cancellation_rules_select" ON cancellation_rules;

-- =====================================================
-- VERIFY REMAINING POLICIES
-- =====================================================

SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('cancellation_policies', 'cancellation_rules')
ORDER BY tablename, policyname;

-- After deletion you should have:
-- cancellation_policies:
--   - cancellation_policies_delete (admins)
--   - cancellation_policies_insert (admins)
--   - cancellation_policies_public_read (anyone - active only)
--   - cancellation_policies_service_role (service role)
--   - cancellation_policies_update (admins)
--
-- cancellation_rules:
--   - cancellation_rules_delete (admins)
--   - cancellation_rules_insert (admins)
--   - cancellation_rules_public_read (anyone)
--   - cancellation_rules_service_role (service role)
--   - cancellation_rules_update (admins)

