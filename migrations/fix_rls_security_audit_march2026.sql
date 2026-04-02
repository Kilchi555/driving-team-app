-- ============================================================
-- RLS Security Audit Fix – März 2026
-- Basiert auf: docs/RLS_SECURITY_AUDIT.md
-- Vorab-Analyse: Alle Policies wurden auf Code-Abhängigkeiten geprüft.
-- Alle Deletes laufen über service_role (getSupabaseAdmin), nicht über RLS.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOCK 1: appointments – Öffentliche Lesbarkeit entfernen
-- ============================================================

-- 🔴 KRITISCH-01: Alle Termine waren für anonyme User lesbar (condition: true)
DROP POLICY IF EXISTS "anon_read_appointments" ON public.appointments;

-- 🟠 HOCH-05: Hard-Delete via RLS entfernen (Cleanup läuft nur via service_role)
DROP POLICY IF EXISTS "customer_delete_own" ON public.appointments;
DROP POLICY IF EXISTS "staff_delete_tenant" ON public.appointments;
DROP POLICY IF EXISTS "super_admin_delete_all" ON public.appointments;

-- 🔴 KRITISCH-03: Falsche user_id-Checks ersetzen (user_id = auth.uid() ist FALSCH)
-- payments.user_id / appointments.user_id referenziert users.id, NICHT auth.uid()
DROP POLICY IF EXISTS "customer_read_own" ON public.appointments;
DROP POLICY IF EXISTS "customer_update_own" ON public.appointments;

-- Korrekte Ersatz-Policies mit richtigem user_id-Check:
CREATE POLICY "customer_read_own" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "customer_update_own" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );


-- ============================================================
-- BLOCK 2: payments – Anon-Insert, Delete und falschen Check entfernen
-- ============================================================

-- 🟠 HOCH-01: Anon konnte Zahlungsrecords ohne Bedingung einfügen
DROP POLICY IF EXISTS "anon_insert_shop_payment" ON public.payments;

-- 🟠 HOCH-04: Hard-Delete via RLS entfernen
DROP POLICY IF EXISTS "customer_delete_own" ON public.payments;
DROP POLICY IF EXISTS "staff_delete_tenant" ON public.payments;
DROP POLICY IF EXISTS "super_admin_delete_all" ON public.payments;

-- 🔴 KRITISCH-03: Falsche user_id-Checks ersetzen
DROP POLICY IF EXISTS "customer_read_own" ON public.payments;
DROP POLICY IF EXISTS "customer_update_own" ON public.payments;

-- Korrekte Ersatz-Policies:
CREATE POLICY "customer_read_own" ON public.payments
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "customer_update_own" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );


-- ============================================================
-- BLOCK 3: tenants – Offene Lese-/Schreibzugriffe entfernen
-- ============================================================

-- 🔴 KRITISCH-02: Jeder authentifizierte User konnte alle Tenants updaten (condition: true)
DROP POLICY IF EXISTS "Allow authenticated users to update tenants" ON public.tenants;

-- 🟡: Alle aktiven Tenants für alle lesbar (condition: true – zu weit)
DROP POLICY IF EXISTS "Allow authenticated users to select tenants" ON public.tenants;
DROP POLICY IF EXISTS "anon_read_tenants" ON public.tenants;

-- 🟡: Jeder Auth-User konnte neue Tenants anlegen
DROP POLICY IF EXISTS "Allow authenticated users to insert tenants" ON public.tenants;

-- BEHALTEN: "tenants_simple_access" (is_active = true für authenticated) ✅
-- BEHALTEN: "Allow public access to active tenants" (is_active = true für public) ✅
-- Nach diesem Fix: Tenants nur noch via service_role schreib- und nur aktive lesbar.


-- ============================================================
-- BLOCK 4: users – Anonyme Guest-User-Policies entfernen
-- ============================================================

-- 🟠 HOCH-02: Anon konnte beliebige User-Records anlegen (kein WITH CHECK)
-- Wird ausschliesslich via getSupabaseAdmin() in find-or-create-guest-user.post.ts gehandelt
DROP POLICY IF EXISTS "anon_insert_guest_user" ON public.users;
DROP POLICY IF EXISTS "anon_select_guest_user" ON public.users;
DROP POLICY IF EXISTS "anon_update_guest_user" ON public.users;


-- ============================================================
-- BLOCK 5: student_credits – Kunden-Update-Policies entfernen
-- ============================================================

-- 🔴 KRITISCH-04: Kunden konnten Guthaben direkt manipulieren
-- Alle Updates laufen über server/api/admin/credit/adjust.post.ts (service_role)
DROP POLICY IF EXISTS "sc_update_own" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_update_own" ON public.student_credits;


-- ============================================================
-- BLOCK 6: booking_proposals – Öffentliche Lesbarkeit entfernen
-- ============================================================

-- 🟠 HOCH-06: Alle Buchungsanfragen waren für jeden lesbar (condition: true)
DROP POLICY IF EXISTS "anon_select_booking_proposals" ON public.booking_proposals;


-- ============================================================
-- VERIFIZIERUNG
-- ============================================================

-- Zeige den aktuellen Stand aller geänderten Tabellen:
SELECT
  tablename,
  policyname,
  cmd,
  array_to_string(roles, ', ') AS roles,
  LEFT(qual::text, 80) AS condition_preview
FROM pg_policies
WHERE tablename IN (
  'appointments', 'payments', 'tenants', 'users',
  'student_credits', 'booking_proposals'
)
ORDER BY tablename, cmd, policyname;

COMMIT;
