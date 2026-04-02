-- ============================================================
-- RLS Security Fixes – Pending Issues (FIX-11 bis FIX-16)
-- Basiert auf: docs/RLS_SECURITY_AUDIT.md (⏳ Nächster Audit-Zyklus)
-- Datum: März 2026
-- AKTUALISIERT: Mit Live-Daten aus pg_policies verifiziert
-- ============================================================

BEGIN;

-- ============================================================
-- FIX-11: cash_transactions
-- Live-Stand: cash_transactions_tenant_access (ALL, authenticated)
--   Condition: tenant_id IN (SELECT u.tenant_id FROM users WHERE u.auth_user_id = auth.uid())
--   → Tenant-isoliert, aber ALL für alle authentifizierten User inkl. Schüler
-- Fix: ALL aufteilen in staff-only SELECT / INSERT / UPDATE.
-- ============================================================

DROP POLICY IF EXISTS "cash_transactions_tenant_access" ON public.cash_transactions;

CREATE POLICY "cash_transactions_staff_select" ON public.cash_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('staff', 'admin', 'super_admin')
        AND tenant_id = cash_transactions.tenant_id
      LIMIT 1
    )
  );

CREATE POLICY "cash_transactions_staff_insert" ON public.cash_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('staff', 'admin', 'super_admin')
        AND tenant_id = cash_transactions.tenant_id
      LIMIT 1
    )
  );

CREATE POLICY "cash_transactions_staff_update" ON public.cash_transactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('staff', 'admin', 'super_admin')
        AND tenant_id = cash_transactions.tenant_id
      LIMIT 1
    )
  );


-- ============================================================
-- FIX-12: credit_transactions
-- Live-Stand:
--   credit_transactions_tenant_access (ALL, authenticated) → zu breit, droppen
--   credit_transactions_insert_own    (INSERT, public, kein WITH CHECK) → droppen
--   credit_transactions_insert_system (INSERT, public, kein WITH CHECK) → droppen
--   credit_transactions_select_own    (SELECT, public, user_id-Check) → BLEIBT (korrekt)
--   credit_transactions_select_staff  (SELECT, public, Staff-Check)    → BLEIBT (korrekt)
--   credit_transactions_update_staff  (UPDATE, public, Staff-Check)    → BLEIBT (korrekt)
-- KEINE neuen SELECT-Policies nötig – bereits vorhanden!
-- ============================================================

-- Breite ALL-Policy entfernen
DROP POLICY IF EXISTS "credit_transactions_tenant_access" ON public.credit_transactions;

-- INSERT-Policies ohne WITH CHECK entfernen (öffentlich inserierbar)
-- Alle echten Inserts laufen via getSupabaseAdmin() (service_role)
DROP POLICY IF EXISTS "credit_transactions_insert_own" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_system" ON public.credit_transactions;


-- ============================================================
-- FIX-13: discount_codes
-- Live-Stand:
--   discount_codes_tenant_access  (ALL, authenticated, tenant-Check)  → droppen
--   discount_codes_insert_policy  (INSERT, authenticated, KEIN WITH CHECK) → droppen
--   discount_codes_select_policy  (SELECT, authenticated, tenant+Bedingung) → BLEIBT
--   discount_codes_update_policy  (UPDATE, authenticated, tenant+Bedingung) → BLEIBT
-- ============================================================

-- Breite ALL-Policy entfernen
DROP POLICY IF EXISTS "discount_codes_tenant_access" ON public.discount_codes;

-- INSERT ohne WITH CHECK entfernen (kein Schutz gegen beliebige Code-Erstellung)
DROP POLICY IF EXISTS "discount_codes_insert_policy" ON public.discount_codes;

-- Saubere INSERT-Policy mit WITH CHECK (Staff/Admin only)
CREATE POLICY "discount_codes_staff_insert" ON public.discount_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('staff', 'admin', 'super_admin')
        AND tenant_id = discount_codes.tenant_id
      LIMIT 1
    )
  );


-- ============================================================
-- FIX-14: student_credits – Duplikate und unsichere INSERT-Policies
-- Live-Stand:
--   sc_select_own           (SELECT, authenticated, user_id-Check) → BLEIBT ✅
--   sc_select_staff         (SELECT, authenticated, Staff+Tenant)   → BLEIBT ✅
--   student_credits_select_own   (SELECT, public) → DUPLIKAT von sc_select_own → droppen
--   student_credits_select_staff (SELECT, public) → DUPLIKAT von sc_select_staff → droppen
--   sc_insert_own           (INSERT, authenticated, KEIN WITH CHECK) → droppen
--   sc_insert_staff         (INSERT, authenticated, KEIN WITH CHECK) → droppen
--   student_credits_insert_own   (INSERT, public, KEIN WITH CHECK)   → droppen
--   student_credits_insert_system (INSERT, public, KEIN WITH CHECK)  → droppen
--   sc_update_staff         (UPDATE, authenticated, Staff-Check)    → BLEIBT ✅
--   student_credits_update_staff (UPDATE, public, Staff-Check)      → BLEIBT ✅
-- ============================================================

-- Public-Rolle Duplikate entfernen (SELECT)
DROP POLICY IF EXISTS "student_credits_select_own" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_select_staff" ON public.student_credits;

-- ALLE INSERT-Policies ohne WITH CHECK entfernen
-- Echte Inserts laufen via getSupabaseAdmin() (service_role)
DROP POLICY IF EXISTS "sc_insert_own" ON public.student_credits;
DROP POLICY IF EXISTS "sc_insert_staff" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_insert_own" ON public.student_credits;
DROP POLICY IF EXISTS "student_credits_insert_system" ON public.student_credits;


-- ============================================================
-- FIX-15: affiliate_payout_requests
-- Live-Stand:
--   affiliate_payout_insert_own (INSERT, public, kein WITH CHECK) → gefährlich!
--   affiliate_payout_select_own (SELECT, public, user_id-Check) → korrekt
-- Admin-UPDATE-Policy fehlt; server/api/affiliate/admin-payouts.ts nutzt
-- getSupabaseAdmin() (bypasses RLS), daher funktioniert approve/reject bereits.
-- ============================================================

-- INSERT ohne WITH CHECK: Jeder könnte Auszahlungsanfragen für fremde User einfügen
DROP POLICY IF EXISTS "affiliate_payout_insert_own" ON public.affiliate_payout_requests;

-- Saubere INSERT-Policy: nur für eigene user_id
CREATE POLICY "affiliate_payout_insert_own" ON public.affiliate_payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Admin kann Auszahlungsanfragen genehmigen/ablehnen (defense-in-depth)
CREATE POLICY "affiliate_payout_admin_update" ON public.affiliate_payout_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND tenant_id = affiliate_payout_requests.tenant_id
      LIMIT 1
    )
  );


-- ============================================================
-- FIX-16: availability_slots
-- Live-Stand: select_any_slot_by_id_for_reservation (SELECT, anon, TRUE)
-- Fix: reserve-slot.post.ts liest jetzt via getSupabaseAdmin() → Policy unnötig.
-- ============================================================

DROP POLICY IF EXISTS "select_any_slot_by_id_for_reservation" ON public.availability_slots;

-- BEHALTEN: select_available_slots_for_listing (anon, gefiltert)
-- BEHALTEN: update_available_slots (anon UPDATE, atomare Reservierung)
-- BEHALTEN: release_own_reservation (anon UPDATE, Session-Check)


-- ============================================================
-- VERIFIZIERUNG
-- ============================================================

SELECT
  tablename,
  policyname,
  cmd,
  array_to_string(roles, ', ') AS roles,
  CASE
    WHEN 'anon' = ANY(roles::text[]) AND qual::text = 'true' THEN '🔴 KRITISCH'
    WHEN 'anon' = ANY(roles::text[]) THEN '🟠 HOCH: Anon hat Zugriff'
    WHEN cmd = 'INSERT' AND with_check IS NULL THEN '🟠 HOCH: INSERT ohne WITH CHECK'
    WHEN qual::text = 'true' THEN '🟡 MITTEL: Bedingung ist true'
    ELSE '✅ OK'
  END AS risk_level,
  LEFT(qual::text, 100) AS condition_preview
FROM pg_policies
WHERE tablename IN (
  'cash_transactions', 'credit_transactions', 'discount_codes',
  'student_credits', 'affiliate_payout_requests', 'availability_slots'
)
ORDER BY tablename, cmd, policyname;

COMMIT;
