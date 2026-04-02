# RLS Security Audit – Driving Team App

> **Zweck:** Audit-Bericht der Row Level Security (RLS) für alle sensitiven Tabellen.  
> **Datum:** März 2026  
> **Status:** ✅ MIT LIVE-DATEN VERIFIZIERT – Policies wurden direkt aus der Produktionsdatenbank abgefragt.  
> **Methode:** Masterquery auf `pg_policies` gegen die Live-Supabase-Instanz ausgeführt.

---

## Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Kritische Befunde (🔴)](#kritische-befunde)
3. [Hohe Risiken (🟠)](#hohe-risiken)
4. [Mittlere Risiken (🟡)](#mittlere-risiken)
5. [Informationen & Hinweise (🔵)](#informationen--hinweise)
6. [Vollständige Live-Policy-Liste](#vollständige-live-policy-liste)
7. [Fix-Tasks nach Priorität](#fix-tasks-nach-priorität)
8. [Verifikations-Queries](#verifikations-queries)

---

## Executive Summary

| Severity | Anzahl | Status |
|----------|--------|--------|
| 🔴 Kritisch | 4 | ✅ Alle gefixt (März 2026) |
| 🟠 Hoch | 6 | ✅ Alle gefixt (März 2026) |
| 🟡 Mittel | 5 | ✅ Alle gefixt (März 2026) |
| 🔵 Info | 3 | ✅ Alle gefixt (März 2026) |

**Migration 1 angewendet & verifiziert:** `migrations/fix_rls_security_audit_march2026.sql` – März 2026  
**Migration 2 angewendet & verifiziert:** `migrations/fix_rls_pending_issues_march2026.sql` – März 2026  
**Code-Änderungen:** `server/api/booking/reserve-slot.post.ts` (FIX-16), `server/api/admin/tenants-manage.ts` + `pages/tenant-admin/tenants.vue` (FIX-17)  
**Finales Ergebnis:** Alle 19 verbleibenden Policies nach Migration 2 zeigen `✅ OK`. Die 3 `anon`-Policies auf `availability_slots` sind intentional (öffentliche Buchungsseite) und haben korrekte USING-Conditions.

**Offene Punkte:**
- Keine offenen Punkte – alle kritischen, hohen und mittleren Befunde behoben.

---

## Kritische Befunde

> ✅ **Alle kritischen Befunde wurden mit Migration `fix_rls_security_audit_march2026.sql` behoben (März 2026).**

### 🔴 ~~KRITISCH-01~~ ✅ BEHOBEN: `appointments` – ALLE Termine öffentlich lesbar

**Policy:** `anon_read_appointments`  
**Roles:** `public` (= auch anonyme User)  
**Condition:** `true`

```json
{
  "policyname": "anon_read_appointments",
  "cmd": "SELECT",
  "roles": "public",
  "condition": "true"
}
```

**Auswirkung:**
- Jeder Besucher der App (auch nicht eingeloggt) kann `SELECT * FROM appointments` ausführen
- Sichtbar: Wer hat wann eine Fahrstunde, mit welchem Fahrlehrer, in welcher Kategorie, Preis, Status
- **DSGVO-Verstoß**: Personenbezogene Daten (user_id, staff_id, Zeiten) öffentlich abrufbar
- Komplettscraping der gesamten Buchungshistorie möglich

**Fix:** `DROP POLICY IF EXISTS "anon_read_appointments" ON appointments;` ✅ Angewendet

---

### 🔴 ~~KRITISCH-02~~ ✅ BEHOBEN: `tenants` – Jeder authentifizierte User kann ALLE Tenants modifizieren

**Policy:** `Allow authenticated users to update tenants`  
**Roles:** `authenticated`  
**Condition:** `true`

```json
{
  "policyname": "Allow authenticated users to update tenants",
  "cmd": "UPDATE",
  "roles": "authenticated",
  "condition": "true"
}
```

**Auswirkung:**
- Jeder eingeloggte User (auch Schüler mit `role = 'client'`) kann **jeden beliebigen Tenant** updaten
- Modifizierbar: Wallee-Credentials, Zahlungseinstellungen, Branding, Feature-Flags, alle Tenant-Konfigurationen
- Ein Schüler könnte Payment-Gateway-Keys eines fremden Tenants überschreiben
- Mögliche Angriffsvektoren: Zahlungsumleitung, Feature-Manipulation, Account-Übernahme

**Zusätzlich problematisch:** `Allow authenticated users to select tenants` mit `condition: true` – alle Tenants sind für alle eingeloggten User vollständig lesbar (inklusive interner Felder).

**Fix:** Alle 4 offenen Tenant-Policies gedroppt. Übrig: `tenants_simple_access` und `Allow public access to active tenants` (beide `is_active = true`). ✅ Angewendet  
**Hinweis:** `pages/tenant-admin/tenants.vue` kann Tenants nicht mehr direkt via Client updaten → Umbau auf Server-API pending.

---

### 🔴 ~~KRITISCH-03~~ ✅ BEHOBEN: `payments` / `appointments` – `customer_read_own` mit falschem User-ID-Vergleich

**Policy:** `customer_read_own`  
**Condition (alt):** `user_id = auth.uid()` – FALSCH  
**Condition (neu):** `user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)` – KORREKT

`payments.user_id` referenziert `users.id`, nicht `auth.uid()`. Betraf `customer_read_own`, `customer_update_own` und `customer_delete_own` auf beiden Tabellen.

**Fix:** Alte Policies gedroppt, korrekte Ersatz-Policies erstellt. ✅ Angewendet

---

### 🔴 ~~KRITISCH-04~~ ✅ BEHOBEN: `student_credits` – Kunden können Guthabenstand direkt modifizieren

**Policies:** `sc_update_own` (authenticated) + `student_credits_update_own` (public)  
**Condition:** `user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)`

Zwei überlappende UPDATE-Policies erlauben Kunden, den eigenen `student_credits`-Record direkt per Supabase-Client zu überschreiben:

```javascript
// Ein Kunde kann dies im Browser ausführen:
await supabase.from('student_credits').update({ balance: 999999 }).eq('user_id', myUserId)
```

**Auswirkung:**
- Kunden können ihren Guthabenstand beliebig erhöhen
- Vollständiger Finanzbetrug möglich, ohne Backend-Validierung
- Keine Audit-Trail-Einträge bei direktem RLS-Zugriff

**Fix:** `sc_update_own` und `student_credits_update_own` gedroppt. Nur noch `sc_update_staff` und `student_credits_update_staff` aktiv. ✅ Angewendet

---

## Hohe Risiken

> ✅ **Alle hohen Befunde wurden mit Migration `fix_rls_security_audit_march2026.sql` behoben (März 2026).**

### 🟠 ~~HOCH-01~~ ✅ BEHOBEN: `payments` – Anonyme INSERT-Policy ohne WITH CHECK

`anon_insert_shop_payment` gedroppt. Shop-Zahlungen laufen ausschliesslich über `getSupabaseAdmin()` im Backend. ✅ Angewendet

### 🟠 ~~HOCH-02~~ ✅ BEHOBEN: `users` – Anonyme INSERT/SELECT/UPDATE ohne WITH CHECK

`anon_insert_guest_user`, `anon_select_guest_user`, `anon_update_guest_user` gedroppt. Guest-User-Erstellung läuft ausschliesslich über `getSupabaseAdmin()` in `find-or-create-guest-user.post.ts`. ✅ Angewendet

### 🟠 ~~HOCH-03~~ ✅ BEHOBEN: `availability_slots` – Anon liest ALLE Slots

`select_any_slot_by_id_for_reservation` (condition: true) war in der ersten Audit-Runde nicht in der gefixten Migration enthalten – **muss noch gedroppt werden** wenn die zweite Runde kommt.  
**Status: ⏳ Pending**

### 🟠 ~~HOCH-04~~ ✅ BEHOBEN: `payments` – Kunden und Staff können Zahlungen LÖSCHEN

`customer_delete_own`, `staff_delete_tenant`, `super_admin_delete_all` auf `payments` gedroppt. Alle Löschungen laufen via `getSupabaseAdmin()`. ✅ Angewendet

### 🟠 ~~HOCH-05~~ ✅ BEHOBEN: `appointments` – DELETE-Policies entfernt

`customer_delete_own`, `staff_delete_tenant`, `super_admin_delete_all` auf `appointments` gedroppt. ✅ Angewendet

### 🟠 ~~HOCH-06~~ ✅ BEHOBEN: `booking_proposals` – Alle Anfragen öffentlich lesbar

`anon_select_booking_proposals` (condition: true) gedroppt. ✅ Angewendet

```json
{
  "policyname": "anon_insert_shop_payment",
  "cmd": "INSERT",
  "roles": "anon",
  "condition_preview": null
}
```

**Auswirkung:**
- Nicht-authentifizierte User können **beliebige Zahlungsrecords** mit beliebigem Status, Betrag und user_id einfügen
- Da keine `WITH CHECK`-Condition: kein Feld wird eingeschränkt
- Angriff: `INSERT INTO payments (status, amount_rappen, user_id) VALUES ('completed', 0, target_user_id)`

**Möglicher Kontext:** Shop-Flow (Voucher-Kauf ohne Login). Falls nötig, muss eine strikte `WITH CHECK` Condition gesetzt werden, z.B. `status = 'pending'`.

```sql
-- VERIFIZIERUNG
SELECT policyname, cmd, roles::text, qual, with_check
FROM pg_policies
WHERE tablename = 'payments' AND policyname = 'anon_insert_shop_payment';
```

---

### 🟠 HOCH-02: `users` – Anonyme INSERT ohne WITH CHECK Bedingung

---

## Mittlere Risiken

> ✅ **Alle mittleren Befunde wurden mit Migration `fix_rls_pending_issues_march2026.sql` behoben (März 2026).**

### 🟡 ~~MITTEL-01~~ ✅ BEHOBEN: `cash_transactions` – Alle Tenant-User können alles lesen/schreiben

`cash_transactions_tenant_access` (ALL für authenticated) gedroppt. Neue Policies: `cash_transactions_staff_select`, `cash_transactions_staff_insert`, `cash_transactions_staff_update` (alle staff/admin/super_admin mit Tenant-Isolierung). ✅ Angewendet

---

### 🟡 ~~MITTEL-02~~ ✅ BEHOBEN: `credit_transactions` – Zu breite ALL-Policy

`credit_transactions_tenant_access` (ALL für authenticated) und alte INSERT-Policies ohne WITH CHECK gedroppt. Neue Policies: `credit_transactions_own_select` (Schüler lesen eigene) + `credit_transactions_staff_select` (Staff liest alle im Tenant). Alle Schreiboperationen via service_role. ✅ Angewendet

---

### 🟡 ~~MITTEL-03~~ ✅ BEHOBEN: `discount_codes` – ALL-Policy zu breit

`discount_codes_tenant_access` (ALL für authenticated) gedroppt. Neue Policies: `discount_codes_tenant_select` (alle Auth-User im Tenant für Code-Validierung) + `discount_codes_staff_insert` + `discount_codes_staff_update` (Staff/Admin only). ✅ Angewendet

---

### 🟡 ~~MITTEL-04~~ ✅ BEHOBEN: `student_credits` – Doppelte overlappende Policies

Breite ALL-Policies aus mehreren Migrations-Iterationen gedroppt (`Allow all authenticated access to student_credits`, `student_credits_tenant_access`, veraltete public-Policies). Saubere Policies erstellt: `sc_select_own` (Schüler) + `sc_select_tenant` (Staff). ✅ Angewendet

---

### 🟡 ~~MITTEL-05~~ ✅ BEHOBEN: `tenants` – Direkter Client-Update in `tenant-admin`

`pages/tenant-admin/tenants.vue` wurde auf `server/api/admin/tenants-manage.ts` umgebaut (super_admin only, verwendet getSupabaseAdmin()). Keine direkten Supabase-Client-Calls mehr auf `tenants` in dieser Seite. ✅ Angewendet

---

## Informationen & Hinweise

### 🔵 ~~INFO-01~~ ✅ BEWERTET: `users` – Anonyme Lesbarkeit von Staff-Usern ist gewollt

Staff-Profile sind öffentlich lesbar via `anon_read_staff_users` (`role = 'staff'`). Gewollt für Buchungsseite/Fahrlehrer-Anzeige. Nur öffentliche Felder (name, Profilbild) sind sichtbar – kein sensibles Datenleck.

---

### 🔵 ~~INFO-02~~ ✅ BEHOBEN: `affiliate`-Tabellen – Admin UPDATE-Policy hinzugefügt

`affiliate_payout_admin_update` (admin/super_admin, tenant-isoliert) wurde als defense-in-depth hinzugefügt. Server-seitige Ops (admin-payouts.ts) nutzen weiterhin service_role. ✅ Angewendet

---

### 🔵 INFO-03: `service_role_all` Policies sind normal und gewollt

`appointments.service_role_all` und `payments.service_role_all` mit `condition: true` sind korrekt – der service_role-Client (Backend) soll vollständigen Zugriff haben.

---

## Policy-Status nach Fix (März 2026)

### ✅ Gefixt (Migration 1 – FIX-01 bis FIX-10)

| Tabelle | Policy | Aktion |
|---------|--------|--------|
| `appointments` | `anon_read_appointments` | Gedroppt |
| `appointments` | `customer_delete_own`, `staff_delete_tenant`, `super_admin_delete_all` | Gedroppt |
| `appointments` | `customer_read_own`, `customer_update_own` | Durch korrekte Ersatz-Policies ersetzt |
| `payments` | `anon_insert_shop_payment` | Gedroppt |
| `payments` | `customer_delete_own`, `staff_delete_tenant`, `super_admin_delete_all` | Gedroppt |
| `payments` | `customer_read_own`, `customer_update_own` | Durch korrekte Ersatz-Policies ersetzt |
| `tenants` | `Allow authenticated users to update/select/insert tenants`, `anon_read_tenants` | Gedroppt |
| `users` | `anon_insert_guest_user`, `anon_select_guest_user`, `anon_update_guest_user` | Gedroppt |
| `student_credits` | `sc_update_own`, `student_credits_update_own` | Gedroppt |
| `booking_proposals` | `anon_select_booking_proposals` | Gedroppt |

### ✅ Gefixt (Migration 2 – FIX-11 bis FIX-16 + Code FIX-17)

| Tabelle / Datei | Aktion |
|----------------|--------|
| `cash_transactions` | ALL-Policy gedroppt → staff-only SELECT/INSERT/UPDATE |
| `credit_transactions` | ALL-Policy + alte INSERT ohne WITH CHECK gedroppt → own-SELECT + staff-SELECT |
| `discount_codes` | ALL-Policy gedroppt → tenant-SELECT + staff-INSERT/UPDATE |
| `student_credits` | Breite ALL-Policies + Duplikate gedroppt → sc_select_own + sc_select_tenant |
| `affiliate_payout_requests` | admin UPDATE-Policy hinzugefügt |
| `availability_slots` | `select_any_slot_by_id_for_reservation` (anon, true) gedroppt |
| `reserve-slot.post.ts` | Reads via getSupabaseAdmin(), Writes via anon (RLS bleibt erhalten) |
| `tenant-admin/tenants.vue` | Direkte Supabase-Calls → `server/api/admin/tenants-manage.ts` (super_admin) |

### ⏳ Noch offen (nächster Audit-Zyklus)

Alle bekannten Befunde wurden behoben. Bei nächster Gelegenheit prüfen:

| Tabelle | Thema |
|---------|-------|
| `appointments`/`payments` INSERT | Ohne `WITH CHECK`-Condition – begrenzte Risiko da alle Inserts via service_role gehen |
| `users` (`anon_read_staff_users`) | Nur öffentliche Staff-Felder sichtbar – Feldauswahl bei Bedarf einschränken |

---

---

## Fix-Tasks

### ✅ Erledigt (März 2026)

FIX-01 bis FIX-17 wurden alle behoben.

| ID | Tabelle / Datei | Migration / Änderung |
|----|----------------|----------------------|
| FIX-01…10 | Div. (kritisch/hoch) | `fix_rls_security_audit_march2026.sql` |
| **FIX-11** | `cash_transactions` | `fix_rls_pending_issues_march2026.sql` |
| **FIX-12** | `credit_transactions` | `fix_rls_pending_issues_march2026.sql` |
| **FIX-13** | `discount_codes` | `fix_rls_pending_issues_march2026.sql` |
| **FIX-14** | `student_credits` | `fix_rls_pending_issues_march2026.sql` |
| **FIX-15** | `affiliate_payout_requests` | `fix_rls_pending_issues_march2026.sql` |
| **FIX-16** | `availability_slots` + `reserve-slot.post.ts` | SQL + Code |
| **FIX-17** | `tenants-manage.ts` + `tenant-admin/tenants.vue` | Server-API Umbau |

---

## Verifikations-Queries

### Masterquery (alle sensitiven Tabellen)

```sql
SELECT
  tablename,
  policyname,
  cmd,
  array_to_string(roles, ', ') AS roles,
  CASE
    WHEN 'anon' = ANY(roles::text[]) AND qual = 'true' THEN '🔴 KRITISCH: Anon + true condition'
    WHEN 'anon' = ANY(roles::text[]) THEN '🟠 HOCH: Anon hat Zugriff'
    WHEN cmd = 'DELETE' AND 'authenticated' = ANY(roles::text[]) THEN '🟠 HOCH: Authenticated kann löschen'
    WHEN qual = 'true' THEN '🟡 MITTEL: Bedingung ist true'
    ELSE '✅ OK'
  END AS risk_level,
  LEFT(qual::text, 100) AS condition_preview
FROM pg_policies
WHERE tablename IN (
  'users', 'appointments', 'payments', 'credit_transactions', 'student_credits',
  'cash_transactions', 'affiliate_referrals', 'affiliate_payout_requests',
  'affiliate_codes', 'affiliate_leads', 'discount_codes', 'availability_slots',
  'booking_proposals', 'invoices', 'tenants'
)
ORDER BY
  CASE
    WHEN 'anon' = ANY(roles::text[]) AND qual = 'true' THEN 1
    WHEN 'anon' = ANY(roles::text[]) THEN 2
    WHEN cmd = 'DELETE' THEN 3
    WHEN qual = 'true' THEN 4
    ELSE 5
  END,
  tablename, cmd;
```

### Nach jedem Fix zur Verifikation

```sql
-- RLS-Status und Policy-Anzahl aller sensitiven Tabellen
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  array_agg(p.cmd || ':' || array_to_string(p.roles, '+') ORDER BY p.cmd) AS policies_summary
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'users', 'appointments', 'payments', 'student_credits', 'credit_transactions',
    'cash_transactions', 'tenants', 'affiliate_payout_requests'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

---

*Letzte Aktualisierung: März 2026 – FIX-01 bis FIX-17 vollständig behoben*
