-- =====================================================
-- FIX: users RLS - Staff/Admin können Tenant-Users verwalten (OHNE Recursion)
-- =====================================================
-- Solution: Nutzen wir NICHT die users-Tabelle in der Policy
-- Stattdessen: Nutzen wir einen einfachen Backend-Check

BEGIN;

-- Keep only the safe policies:
-- 1. user_read_own_profile - User kann sein Profil lesen
-- 2. insert_users - Self-registration + Admin create
-- 3. service_role_bypass - Backend operations

-- Für Staff/Admin User-Management: Backend-API verwenden!
-- Der API Endpoint prüft:
-- - Ob der User staff/admin/tenant_admin ist
-- - Ob er im gleichen Tenant ist
-- - Dann gibts die Users zurück

-- Damit brauchen wir KEINE RLS Policies die selbst Users queryen!

COMMIT;

