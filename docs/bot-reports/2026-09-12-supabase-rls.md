## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-09-12T01:08Z (Cron)
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
- Tabellen `public`: **226** — RLS an: **226** / aus: **0**
- Views `public`: **11** — alle `security_invoker=true`
- Policies: **431**
- Security Advisors: **84** (ERROR **0**, WARN **43**, INFO **41**)
- Performance (security-relevant): `auth_rls_initplan` WARN **341**, `multiple_permissive_policies` WARN **305**
- Auth/API-Logs: `query_logs` gelesen (postgres_logs, RLS-Meldungen letzte 24h: **0**); keine Fixes

### Kritisch
- Keine aktuellen kritischen Findings.
- Die beiden Vorwochen-Kritischen sind **behoben** (siehe Delta).

### Hoch
- **Objekt:** `public.course_waitlist` / Policy `course_waitlist_public_insert`  
  **Problem:** `INSERT` für `anon,authenticated` mit `WITH CHECK (true)`.  
  **Warum riskant:** Beliebige Spam-/PII-Einträge ohne Tenant-/Kursbindung über die Data API.  
  **Evidence:** `pg_policies` (`with_check = true`); Grants anon/authenticated inkl. INSERT; 14 Zeilen.

- **Objekt:** `public.voucher_codes`, `public.vouchers`  
  **Problem:** Mehrere `public`/`anon`-SELECT-Policies listen **alle** aktiven Codes/Gutscheine (`is_active` + Datumsfenster), ohne Code-Gleichheit.  
  **Warum riskant:** Enumerierung/Harvesting von Rabattcodes über REST.  
  **Evidence:** Policies `Anon can lookup active voucher codes(+ by code and tenant)`, `Anon can lookup active vouchers(+ by code)`; 1 aktive Code-Vorlage, 3 aktive Vouchers.

- **Objekt:** `public.staff_locations` / Policy `anon_read_staff_locations`  
  **Problem:** `SELECT` für `{public}` mit `USING (true)`.  
  **Warum riskant:** Offenlegung von `staff_id`, `location_id`, `tenant_id`, Buchbarkeitsflags und `available_categories` (48 Zeilen).  
  **Evidence:** `pg_policies`; Advisor nicht nötig — SQL-Direktnachweis.

- **Objekt:** `public.course_sessions` / Policy `course_sessions_public_read`  
  **Problem:** `SELECT` für `{public}` mit `USING (true)`.  
  **Warum riskant:** Vollständiger Session-Katalog (149 Zeilen) inkl. interner/nicht öffentlicher Sessions, sofern Spalten das hergeben.  
  **Evidence:** `pg_policies`; Grants anon SELECT vorhanden.

- **Objekt:** Postgres-Version  
  **Problem:** Advisor `vulnerable_postgres_version` — `supabase-postgres-17.4.1.043` mit ausstehenden Security-Patches.  
  **Warum riskant:** Bekannte Plattform-Schwachstellen bis zum Upgrade.  
  **Evidence:** `get_advisors` type=security, lint `vulnerable_postgres_version`.

- **Objekt:** SECURITY DEFINER RPCs mit `EXECUTE` für `anon`  
  **Problem:** u.a. `get_current_user_id`, `is_active_tenant`, `is_client_user_for_tenant`, `is_staff_or_admin_in_tenant`, `is_staff_user_for_tenant`, `log_sms_link_click`, `release_checkout_benefits_on_payment_close`.  
  **Warum riskant:** Unnötige Angriffsfläche / Info-Leak über Rollenhilfen; `release_checkout_benefits_*` ist Trigger-Funktion, aber RPC-EXECUTE bleibt gewährleistbar laut Advisor.  
  **Evidence:** `get_advisors` `anon_security_definer_function_executable` (7); `pg_proc` + ACL.

### Mittel / Info
- **41 Tabellen mit RLS an, 0 Policies** (Advisor `rls_enabled_no_policy`, INFO): u.a. `leads`, `password_reset_tokens`, `mfa_login_codes`, `passkey_backup_codes`, `guest_otps`, Accounting-/Marketing-Tabellen. Wirkung für API-Rollen = Deny-all — gut, sofern absichtlich. Viele haben trotzdem noch Grants an `anon`/`authenticated` (z.B. `leads`, `mfa_*`, Accounting) → Grants bereinigen.
- **`function_search_path_mutable`** WARN **27** (Trigger-/Helper-Funktionen ohne fixed `search_path`).
- **`customer_payment_methods`:** 12 Policies, teils redundant/fehlerhaft (`(user_id)::text = (auth.uid())::text` mischt interne User-ID mit Auth-UID). Zusätzlich korrekte Own-Policies — Chaos erhöht Fehlerrisiko bei künftigen Edits.
- **Weitere offene Public-Reads mit `true`:** `cancellation_rules_public_read`, `evaluation_categories/criteria/scale` SELECT true — eher Katalogdaten, aber ohne Tenant-Filter.
- **Performance→Security:** `auth_rls_initplan` (341) und `multiple_permissive_policies` (305) — RLS-Ausdrücke mit `auth.uid()` pro Zeile + viele permissive Policies können unter Last Bypass-Druck/Fehleranfälligkeit erhöhen (Indexes an Policy-Spalten prüfen).
- **`tenant_secrets`:** volle DML-Grants an `anon`/`authenticated`, aber Policies nur `service_role` + Admin-Tenant — RLS schützt; Grants sollten trotzdem revoziert werden.
- Nicht ausgeführt (Write): `apply_migration`, Schema-Fixes, Policy-Änderungen, Postgres-Upgrade.

### Positiv / OK
- **0 Tabellen ohne RLS** (seit Baseline 2026-08-22 behoben und stabil).
- Alle **11 Views** `security_invoker` (keine SECURITY DEFINER Views mehr).
- **Kritische RPCs** `get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`: `EXECUTE` nicht mehr für anon/authenticated.
- **`staff_invitations`:** nur noch `staff_invitations_admin_access` (authenticated Admin/Tenant) — kein anon Token-Read mehr; pending Invites: 7.
- **`tenant_settings`:** kein `anon_read_*` mehr; SELECT nur authenticated + Non-Secret-Key-Filter; Stripe-ähnliche Keys: 0 Zeilen.
- **`payments`:** kein Client-`UPDATE`; nur Staff/Super-Admin/service_role; Comment F-05a weiterhin gültig.
- **`fahrlehrer_leads`**, **`session_confirmation_tokens`**, **`password_reset_tokens`:** service_role-only bzw. RLS ohne Policy + ohne anon/auth Grants.
- Security Advisors: **0 ERROR**.

### Delta seit letztem Lauf
Vergleich zu 2026-09-05 (`docs/bot-reports/2026-09-05-supabase-rls.md`, PR #155):

| Metrik | 2026-09-05 | 2026-09-12 | Delta |
|--------|------------|------------|-------|
| Tabellen / RLS off | 226 / 0 | 226 / 0 | unverändert |
| Policies | 445 | 431 | −14 |
| Zero-Policy-Tabellen | 41 | 41 | unverändert |
| Security Advisors | 86 (0/45/41) | 84 (0/43/41) | −2 WARN |
| Views security_invoker | 11/11 | 11/11 | unverändert |

- **Behoben:** `staff_invitations_token_read` (anon SELECT pending Invites/Tokens) — Policy entfernt.  
- **Behoben:** `tenant_settings.anon_read_tenant_settings` (`SELECT true` für anon) — Policy entfernt / durch tenant-scoped Non-Secret SELECT ersetzt.  
- **Unverändert (Hoch):** `course_waitlist` INSERT true; Voucher-Anon-Listen; `staff_locations` public true; `course_sessions` public true; Postgres-Patch; DEFINER EXECUTE für anon an Hilfs-RPCs.  
- **Neu:** keine neuen kritischen Objekte; Policy-Count gesunken (vermutlich Aufräumen rund um die beiden Fixes).

### Empfehlungen (nur Text, keine Umsetzung)
1. `course_waitlist_public_insert`: `WITH CHECK` auf `tenant_id`/`course_id`-Existenz + Rate-Limit/Captcha serverseitig; idealerweise nur Edge Function + service_role.
2. Voucher-Policies: Anon-SELECT auf exakte Code-Gleichheit (`code = requested`) oder RPC mit Rate-Limit — keine Voll-Liste aktiver Codes.
3. `anon_read_staff_locations` und `course_sessions_public_read` auf `is_public`/`is_online_bookable` bzw. Tenant+öffentlich einschränken; interne Spalten aus Public-Projektion nehmen.
4. Postgres auf gepatchte Supabase-Version upgraden (Dashboard → Infrastructure).
5. `REVOKE EXECUTE … FROM anon, authenticated` für nicht-öffentliche DEFINER-Funktionen; Trigger-Funktionen nicht im Data-API-Schema exponieren.
6. Zero-Policy-Tabellen: überflüssige Grants an `anon`/`authenticated` revoken (Defense in Depth).
7. `customer_payment_methods`: doppelte/kaputte Policies entfernen, eine klare Own+Staff-Policy-Matrix behalten.
8. `auth.uid()` in Policies in `(select auth.uid())` wrappen (InitPlan) und fehlende Indexes an Filterspalten nachziehen.

---
*Auditor-Lauf: READ-ONLY. Keine DB-Writes, keine App-Code-Fixes, keine Secrets/PII im Report.*
