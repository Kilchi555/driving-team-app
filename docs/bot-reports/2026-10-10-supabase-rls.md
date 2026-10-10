## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-10-10T01:05Z (Cron)
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
- Tabellen `public`: **235** — RLS an: **235** / aus: **0**
- Views `public`: **11** — alle `security_invoker` (on/true)
- Policies: **423**
- Security Advisors: **97** (ERROR **0**, WARN **49**, INFO **48**)
  - WARN-Aufschlüsselung: `function_search_path_mutable` 28, `anon_security_definer_function_executable` 9, `authenticated_security_definer_function_executable` 11, `vulnerable_postgres_version` 1
  - INFO: `rls_enabled_no_policy` 48
- Performance (security-relevant): `auth_rls_initplan` WARN **343**, `multiple_permissive_policies` WARN **277**, `unindexed_foreign_keys` INFO **184**
- Auth/API-Logs: `query_logs` (Fenster ~24h bis 2026-10-10T01:00Z) — 7× `permission denied` (`tenants` 4, `tenant_settings` 3); keine «row-level security»-Bypass-Indizien.

### Kritisch
- Keine aktuellen kritischen Findings.
- Die früheren Kritischen (`staff_invitations_token_read`, `tenant_settings.anon_read_tenant_settings`) bleiben **behoben**.

### Hoch
- **Objekt:** `public.staff_locations` / Policy `anon_read_staff_locations`  
  **Problem:** `SELECT` für `{public}` mit `USING (true)`.  
  **Warum riskant:** Offenlegung von `staff_id`, `location_id`, `tenant_id`, Buchbarkeitsflags und `available_categories` über alle Tenants (62 Zeilen); `anon` hat zusätzlich Table-Grants.  
  **Evidence:** `pg_policy` (`qual = true`); `count(*)` auf `staff_locations`; SQL-Audit 2026-10-10.

- **Objekt:** Postgres-Version  
  **Problem:** Advisor `vulnerable_postgres_version` — `supabase-postgres-17.4.1.043` mit ausstehenden Security-Patches.  
  **Warum riskant:** Bekannte Plattform-Schwachstellen bis zum Upgrade.  
  **Evidence:** `get_advisors` type=security, lint `vulnerable_postgres_version`.

- **Objekt:** SECURITY DEFINER RPCs mit `EXECUTE` für `anon`  
  **Problem:** `get_current_user_id`, `is_active_tenant`, `is_client_user_for_tenant`, `is_staff_or_admin_in_tenant`, `is_staff_user_for_tenant`, `log_sms_link_click`, `prevent_discounts_usage_count_client_mutation`, `prevent_voucher_codes_redemptions_client_mutation`, `release_checkout_benefits_on_payment_close`.  
  **Warum riskant:** Unnötige Angriffsfläche / Rollen-Info-Leak; `log_sms_link_click` erlaubt anon Writes in `sms_link_clicks`; Trigger-/Guard-Funktionen (`prevent_*`, `release_checkout_*`) sollten nicht als Data-API-RPC für `anon` erreichbar sein.  
  **Evidence:** `get_advisors` `anon_security_definer_function_executable` (9).

### Mittel / Info
- **48 Tabellen mit RLS an, 0 Policies** (Advisor `rls_enabled_no_policy`, INFO): u.a. `leads`, `password_reset_tokens`, `mfa_login_codes`, `passkey_backup_codes`, `guest_otps`/`guest_sessions`, `payment_access_grants`, `impersonation_sessions`, `sales_pipeline_profiles`/`sales_contact_logs`, `registration_sari_memberships`, `course_invoice_bindings`, `public_course_invoice_mail_claims`, Website-/Accounting-/Marketing-Tabellen. Wirkung für API-Rollen = Deny-all — gut, sofern absichtlich.
  - **27/48** haben trotzdem Client-Grants an `anon` und/oder `authenticated` (z.B. `leads`, `mfa_login_codes`, `passkey_backup_codes`, `webauthn_challenges`, Accounting/Marketing) → Grants bereinigen (Defense in Depth).
  - **21/48** ohne Client-Grants (besser): u.a. `password_reset_tokens`, `guest_*`, `impersonation_sessions`, `payment_access_grants`, `sales_*`, `companies`, `public_course_invoice_mail_claims`.
- **Neu seit letztem Lauf (DEFINER):** `cash_transactions_protect_attribution` ist für `authenticated` per Advisor als SECURITY DEFINER EXECUTE markiert (Advisor-Count authenticated DEFINER 10→11) — Trigger-/Guard-Funktion, nicht als Data-API-RPC gedacht.
- **`function_search_path_mutable`** WARN **28** (Trigger-/Helper-Funktionen ohne fixed `search_path`).
- **`customer_payment_methods`:** weiterhin **12** Policies, teils redundant/fehlerhaft (`(user_id)::text = (auth.uid())::text` mischt interne User-ID mit Auth-UID). Zusätzlich korrekte Own-Policies — Chaos erhöht Fehlerrisiko bei künftigen Edits.
- **Weitere offene Public-/Auth-Reads mit literal `true` (non-service):** `staff_locations` (Hoch); `cancellation_rules_public_read`; `evaluation_categories`/`criteria`/`scale` SELECT true; sowie authenticated Katalog-Reads (`business_types`, `business_type_presets`, `categories`, `event_types`, `plz_distance_cache`, `reminder_providers`, `user_document_categories`) — eher Katalogdaten, aber ohne Tenant-Filter.
- **`products_public_read`:** `SELECT` für public mit `is_active = true` (kein Tenant-Filter) — Katalog-Leak über Tenants hinweg.
- **Performance→Security:** `auth_rls_initplan` (343) und `multiple_permissive_policies` (277) — RLS-Ausdrücke mit `auth.uid()` pro Zeile + viele permissive Policies können unter Last Bypass-Druck/Fehleranfälligkeit erhöhen; `unindexed_foreign_keys` 184 (teilweise Policy-relevante FKs).
- Nicht ausgeführt (Write): `apply_migration`, Schema-Fixes, Policy-Änderungen, Postgres-Upgrade, Grant-Revokes.

### Positiv / OK
- **0 Tabellen ohne RLS** (seit Baseline 2026-08-22 behoben und stabil).
- Alle **11 Views** `security_invoker` (keine SECURITY DEFINER Views).
- Security Advisors: **0 ERROR**.
- **`staff_invitations`:** nur `staff_invitations_admin_access` (authenticated Admin/Tenant) — kein anon Token-Read.
- **`tenant_settings`:** kein `anon_read_*`; SELECT nur authenticated + Non-Secret-Key-Filter.
- **`payments`:** Client nur SELECT (own/staff/superadmin); Writes laut Table-Comment Slice A via service_role; Policy `service_role_all` + Read-Policies bestätigt.
- **`fahrlehrer_leads`**, **`session_confirmation_tokens`:** service_role-gated; **`password_reset_tokens`:** RLS ohne Policy + keine Client-Grants.
- Neue Zero-Policy-Tabelle `public_course_invoice_mail_claims` Deny-by-default (keine Client-Grants).
- Frühere Hoch-Fixes bleiben stabil: `course_waitlist` ohne INSERT true; Voucher ohne anon Voll-Listen; `course_sessions_public_read` an `courses.is_public`.

### Delta seit letztem Lauf
Vergleich zu 2026-10-03 (`docs/bot-reports/2026-10-03-supabase-rls.md`, PR #355):

| Metrik | 2026-10-03 | 2026-10-10 | Delta |
|--------|------------|------------|-------|
| Tabellen / RLS off | 234 / 0 | 235 / 0 | +1 Tabelle |
| Policies | 423 | 423 | unverändert |
| Zero-Policy-Tabellen | 47 | 48 | +1 |
| Security Advisors | 95 (0/48/47) | 97 (0/49/48) | +2 Findings |
| Views security_invoker | 11/11 | 11/11 | unverändert |
| `auth_rls_initplan` | 343 | 343 | unverändert |
| `multiple_permissive_policies` | 277 | 277 | unverändert |
| `unindexed_foreign_keys` | 178 | 184 | +6 |
| anon DEFINER EXECUTE | 9 | 9 | unverändert |
| authenticated DEFINER EXECUTE | 10 | 11 | +1 (`cash_transactions_protect_attribution`) |

- **Unverändert (Hoch):** `staff_locations.anon_read_staff_locations` (`SELECT true`); Postgres-Patch; 9 DEFINER-Hilfs-RPCs für anon.
- **Neu (Mittel):** +1 Tabelle / +1 Zero-Policy (`public_course_invoice_mail_claims`) — Deny-by-default, ohne Client-Grants; +1 authenticated DEFINER-Advisor (`cash_transactions_protect_attribution`).
- **Behoben:** keine weiteren kritischen/Hoch-Objekte seit 2026-10-03.
- **Logs:** 7 Permission-Denied-Meldungen (erwartetes Lockdown-Verhalten), keine RLS-Bypass-Hinweise.

### Empfehlungen (nur Text, keine Umsetzung)
1. `anon_read_staff_locations` auf `is_online_bookable`/`is_active` + Tenant-Kontext einschränken oder durch `availability_slots`-Pfad ersetzen; interne IDs aus Public-Projektion nehmen; überflüssige Grants an `anon` revoken.
2. Postgres auf gepatchte Supabase-Version upgraden (Dashboard → Infrastructure).
3. `REVOKE EXECUTE … FROM anon, authenticated` für nicht-öffentliche DEFINER-Funktionen; Trigger-/Guard-Funktionen (`prevent_*`, `release_checkout_benefits_on_payment_close`, `cash_transactions_protect_attribution`) nicht im Data-API-Schema exponieren; `log_sms_link_click` nur service_role/Edge.
4. Zero-Policy-Tabellen: überflüssige Grants an `anon`/`authenticated` revoken (Defense in Depth), besonders MFA/`passkey_backup_codes`/`webauthn_challenges`/`leads`/Accounting.
5. `customer_payment_methods`: doppelte/kaputte Policies entfernen, eine klare Own+Staff-Policy-Matrix behalten.
6. Public-Reads mit `true` (`cancellation_rules`, Evaluation-Kataloge) und `products_public_read` tenant- oder bewusst öffentlich scoping.
7. `auth.uid()` in Policies in `(select auth.uid())` wrappen (InitPlan) und fehlende Indexes an Filterspalten nachziehen.

---
*Auditor-Lauf: READ-ONLY. Keine DB-Writes, keine App-Code-Fixes, keine Secrets/PII im Report.*
