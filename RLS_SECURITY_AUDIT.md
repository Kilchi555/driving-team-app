-- =====================================================
-- CRITICAL RLS SECURITY AUDIT RESULTS
-- =====================================================

-- 1. PRODUCT_SALES - KRITISCH! 🚨🚨🚨
--    Problem: "Enable select/insert/update/delete for authenticated users"
--    Impact: JEDER authenticated User kann ALLE product_sales sehen/ändern!
--    Risk: Cross-tenant data leak & manipulation
--    Solution: LÖSCHEN! Nur "product_sales_tenant_access" halten & überprüfen

-- 2. STUDENT_CREDITS - DUPLICATE POLICIES! ⚠️
--    Probleme:
--    a) "student_credits_select_policy" - auth.uid() sollte users.id sein!
--       (tenant_id IN (SELECT users.tenant_id FROM users WHERE ...auth.uid()))
--       Problem: auth.uid() gibt auth.users.id zurück, nicht users.id!
--    
--    b) "student_credits_tenant_access" - WRONG!
--       (tenant_id IN (SELECT users.tenant_id FROM users WHERE users.id = auth.uid()))
--       Problem: auth.uid() ist NICHT in der users tabelle! Es ist in auth.users!
--
--    c) Mehrere duplicate policies mit unterschiedlicher Logic!
--       "Staff and Admins can view credits" vs "student_credits_select_policy"
--       "Users can view their own credits" vs "student_credits_insert_policy"

-- 3. PAYMENTS - FEHLENDE super_admin! ⚠️
--    Policies beziehen sich auf auth.uid() korrekt
--    ABER: Kein super_admin Policy! Super_admin kann payments von anderen tenants nicht verwalten!
--    Sollte: "super_admin_select_all_payments", "super_admin_manage_all_payments" haben

-- 4. APPOINTMENTS - FEHLENDE super_admin! ⚠️
--    Policies erlauben nur admin/staff/tenant_admin
--    ABER: Kein super_admin Policy! Super_admin kann keine appointments verwalten!
--    Sollte: "super_admin_read_all_appointments", "super_admin_manage_all_appointments" haben

-- =====================================================
-- QUICK ANALYSIS
-- =====================================================

/*
TIER 1 - CRITICAL (Sofort fixen):
1. product_sales - 4 "Enable for authenticated" Policies LÖSCHEN
2. student_credits - auth.uid() vs users.id confusion

TIER 2 - HIGH (Heute fixen):
3. Alle Tables: super_admin nicht inkludiert!
4. Appointments: customers können nicht lesen

TIER 3 - MEDIUM:
5. Duplicate policies in mehreren Tables
*/

