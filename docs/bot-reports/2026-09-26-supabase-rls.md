## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-09-26T01:05Z (Cron)
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
- Tabellen `public`: **228** — RLS an: **228** / aus: **0**
- Views `public`: **11** — alle `security_invoker` (on/true)
- Policies: **415**
- Security Advisors: **90** (ERROR **0**, WARN **47**, INFO **43**)
  - WARN-Aufschlüsselung: `function_search_path_mutable` 27, `anon_security_definer_function_executable` 9, `authenticated_security_definer_function_executable` 10, `vulnerable_postgres_version` 1
  - INFO: `rls_enabled_no_policy` 43
- Performance (security-relevant): `auth_rls_initplan` WARN **335**, `multiple_permissive_policies` WARN **277**, `unindexed_foreign_keys` INFO **169**
- Auth/API-Logs: `query_logs` (Fenster 24h bis 2026-09-26T01:00Z) — 0 Treffer für RLS-/«row-level security»-Meldungen; keine zusätzliche RLS-Erklärung.

### Kritisch
- Keine aktuellen kritischen Findings.
- Die früheren Kritischen (`staff_invitations_token_read`, `tenant_settings.anon_read_tenant_settings`) bleiben **behoben**.

### Hoch
- **Objekt:** `public.staff_locations` / Policy `anon_read_staff_locations`  
  **Problem:** `SELECT` für `{public}` mit `USING (true)`.  
  **Warum riskant:** Offenlegung von `staff_id`, `location_id`, `tenant_id`, Buchbarkeitsflags und `available_categories` über alle Tenants (49 Zeilen); `anon` hat zusätzlich volle Table-Grants (SELECT/INSERT/UPDATE/DELETE/…).  
  **Evidence:** `pg_policy` (`qual = true`, `polroles = {0}`); Grants via `information_schema.role_table_grants`; Spalten via `information_schema.columns`.

- **Objekt:** Postgres-Version  
  **Problem:** Advisor `vulnerable_postgres_version` — `supabase-postgres-17.4.1.043` mit ausstehenden Security-Patches.  
  **Warum riskant:** Bekannte Plattform-Schwachstellen bis zum Upgrade.  
  **Evidence:** `get_advisors` type=security, lint `vulnerable_postgres_version`.

- **Objekt:** SECURITY DEFINER RPCs mit `EXECUTE` für `anon`  
  **Problem:** `get_current_user_id`, `is_active_tenant`, `is_client_user_for_tenant`, `is_staff_or_admin_in_tenant`, `is_staff_user_for_tenant`, `log_sms_link_click`, `prevent_discounts_usage_count_client_mutation`, `prevent_voucher_codes_redemptions_client_mutation`, `release_checkout_benefits_on_payment_close`.  
  **Warum riskant:** Unnötige Angriffsfläche / Rollen-Info-Leak; `log_sms_link_click` erlaubt anon Writes in `sms_link_clicks`; Trigger-/Guard-Funktionen (`prevent_*`, `release_checkout_*`) sollten nicht als Data-API-RPC für `anon` erreichbar sein.  
  **Evidence:** `get_advisors` `anon_security_definer_function_executable` (9); `HAS_FUNCTION_PRIVILEGE('anon', …, 'EXECUTE')`.

### Mittel / Info
- **43 Tabellen mit RLS an, 0 Policies** (Advisor `rls_enabled_no_policy`, INFO): u.a. `leads`, `password_reset_tokens`, `mfa_login_codes`, `passkey_backup_codes`, `guest_otps`/`guest_sessions`, `payment_access_grants`, `impersonation_sessions`, `website_revisions`/`website_lifecycle_events`/`website_prospects`, Accounting-/Marketing-Tabellen. Wirkung für API-Rollen = Deny-all — gut, sofern absichtlich. Viele haben trotzdem volle Grants an `anon`/`authenticated` (z.B. `leads`, `mfa_login_codes`, `passkey_backup_codes`, `tenant_secrets`) → Grants bereinigen (Defense in Depth).
- **`function_search_path_mutable`** WARN **27** (Trigger-/Helper-Funktionen ohne fixed `search_path`).
- **`authenticated_security_definer_function_executable`** WARN **10** (inkl. `can_read_tenant_users` + dieselben anon-exponierten Hilfsfunktionen).
- **`customer_payment_methods`:** weiterhin **12** Policies, teils redundant/fehlerhaft (`(user_id)::text = (auth.uid())::text` mischt interne User-ID mit Auth-UID). Zusätzlich korrekte Own-Policies — Chaos erhöht Fehlerrisiko bei künftigen Edits.
- **Weitere offene Public-/Auth-Reads mit literal `true` (12 non-service):** `staff_locations` (Hoch); `cancellation_rules_public_read`; `evaluation_categories`/`criteria`/`scale` SELECT true; sowie authenticated Katalog-Reads (`business_types`, `business_type_presets`, `categories`, `event_types`, `plz_distance_cache`, `reminder_providers`, `user_document_categories`) — eher Katalogdaten, aber ohne Tenant-Filter.
- **`products_public_read`:** `SELECT` für public mit `is_active = true` (kein Tenant-Filter) — Katalog-Leak über Tenants hinweg.
- **Performance→Security:** `auth_rls_initplan` (335) und `multiple_permissive_policies` (277) — RLS-Ausdrücke mit `auth.uid()` pro Zeile + viele permissive Policies können unter Last Bypass-Druck/Fehleranfälligkeit erhöhen.
- Nicht ausgeführt (Write): `apply_migration`, Schema-Fixes, Policy-Änderungen, Postgres-Upgrade, Grant-Revokes.

### Positiv / OK
- **0 Tabellen ohne RLS** (seit Baseline 2026-08-22 behoben und stabil).
- Alle **11 Views** `security_invoker` (keine SECURITY DEFINER Views).
- Security Advisors: **0 ERROR**.
- **`staff_invitations`:** nur `staff_invitations_admin_access` (authenticated Admin/Tenant) — kein anon Token-Read.
- **`tenant_settings`:** kein `anon_read_*`; SELECT nur authenticated + Non-Secret-Key-Filter.
- **`payments`:** Client nur SELECT (own/staff/superadmin); Writes laut Table-Comment Slice A (2026-09-17) via service_role; Policy `service_role_all` + Read-Policies bestätigt.
- **`fahrlehrer_leads`**, **`session_confirmation_tokens`:** service_role-gated; **`password_reset_tokens`:** RLS ohne Policy (Deny-all für API-Rollen).
- Frühere Hoch-Fixes bleiben stabil: `course_waitlist` ohne INSERT true; Voucher ohne anon Voll-Listen; `course_sessions_public_read` an `courses.is_public`.

### Delta seit letztem Lauf
Vergleich zu 2026-09-19 (`docs/bot-reports/2026-09-19-supabase-rls.md`, PR #244):

| Metrik | 2026-09-19 | 2026-09-26 | Delta |
|--------|------------|------------|-------|
| Tabellen / RLS off | 226 / 0 | 228 / 0 | +2 Tabellen |
| Policies | 415 | 415 | unverändert |
| Zero-Policy-Tabellen | 41 | 43 | +2 |
| Security Advisors | 84 (0/43/41) | 90 (0/47/43) | +6 WARN-/INFO-Findings |
| Views security_invoker | 11/11 | 11/11 | unverändert |
| `auth_rls_initplan` | 335 | 335 | unverändert |
| `multiple_permissive_policies` | 277 | 277 | unverändert |
| anon DEFINER EXECUTE | 7 | 9 | +2 (`prevent_discounts_*`, `prevent_voucher_codes_*`) |

- **Unverändert (Hoch):** `staff_locations.anon_read_staff_locations` (`SELECT true`); Postgres-Patch; Kern-DEFINER-Hilfs-RPCs für anon.
- **Neu (Mittel):** +2 Tabellen mit RLS/0 Policies (Deny-by-default); Advisor-Count `anon`/`authenticated` DEFINER +2 durch Guard-Trigger-Funktionen.
- **Behoben:** keine weiteren kritischen/Hoch-Objekte seit 2026-09-19.
- **Logs:** `query_logs` diesmal erfolgreich (0 RLS-Meldungen); Vorwoche Backend-Fehler.

### Empfehlungen (nur Text, keine Umsetzung)
1. `anon_read_staff_locations` auf `is_online_bookable`/`is_active` + Tenant-Kontext einschränken oder durch `availability_slots`-Pfad ersetzen; interne IDs aus Public-Projektion nehmen; überflüssige Grants an `anon` revoken.
2. Postgres auf gepatchte Supabase-Version upgraden (Dashboard → Infrastructure).
3. `REVOKE EXECUTE … FROM anon, authenticated` für nicht-öffentliche DEFINER-Funktionen; Trigger-/Guard-Funktionen (`prevent_*`, `release_checkout_benefits_on_payment_close`) nicht im Data-API-Schema exponieren; `log_sms_link_click` nur service_role/Edge.
4. Zero-Policy-Tabellen: überflüssige Grants an `anon`/`authenticated` revoken (Defense in Depth), besonders Tokens/MFA/`tenant_secrets`/`leads`/`guest_*`.
5. `customer_payment_methods`: doppelte/kaputte Policies entfernen, eine klare Own+Staff-Policy-Matrix behalten.
6. Public-Reads mit `true` (`cancellation_rules`, Evaluation-Kataloge) und `products_public_read` tenant- oder bewusst öffentlich scoping.
7. `auth.uid()` in Policies in `(select auth.uid())` wrappen (InitPlan) und fehlende Indexes an Filterspalten nachziehen.

---
*Auditor-Lauf: READ-ONLY. Keine DB-Writes, keine App-Code-Fixes, keine Secrets/PII im Report.*
