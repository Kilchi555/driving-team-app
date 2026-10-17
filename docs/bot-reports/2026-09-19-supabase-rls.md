## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-09-19T01:05Z (Cron)
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
- Tabellen `public`: **226** — RLS an: **226** / aus: **0**
- Views `public`: **11** — alle `security_invoker` (on/true)
- Policies: **415**
- Security Advisors: **84** (ERROR **0**, WARN **43**, INFO **41**)
- Performance (security-relevant): `auth_rls_initplan` WARN **335**, `multiple_permissive_policies` WARN **277**, `unindexed_foreign_keys` INFO **166**
- Auth/API-Logs: `query_logs` versucht (postgres_logs, RLS-Fenster) — Backend-Fehler / Fenster-Limit; keine RLS-Erklärung ableitbar; keine Fixes

### Kritisch
- Keine aktuellen kritischen Findings.
- Die früheren Kritischen (`staff_invitations_token_read`, `tenant_settings.anon_read_tenant_settings`) bleiben **behoben**.

### Hoch
- **Objekt:** `public.staff_locations` / Policy `anon_read_staff_locations`  
  **Problem:** `SELECT` für `{public}` mit `USING (true)`.  
  **Warum riskant:** Offenlegung von `staff_id`, `location_id`, `tenant_id`, Buchbarkeitsflags und `available_categories` über alle Tenants (49 Zeilen).  
  **Evidence:** `pg_policies` (`using = true`); Spalten via `information_schema.columns`.

- **Objekt:** Postgres-Version  
  **Problem:** Advisor `vulnerable_postgres_version` — `supabase-postgres-17.4.1.043` mit ausstehenden Security-Patches.  
  **Warum riskant:** Bekannte Plattform-Schwachstellen bis zum Upgrade.  
  **Evidence:** `get_advisors` type=security, lint `vulnerable_postgres_version`.

- **Objekt:** SECURITY DEFINER RPCs mit `EXECUTE` für `anon`  
  **Problem:** u.a. `get_current_user_id`, `is_active_tenant`, `is_client_user_for_tenant`, `is_staff_or_admin_in_tenant`, `is_staff_user_for_tenant`, `log_sms_link_click`, `release_checkout_benefits_on_payment_close`.  
  **Warum riskant:** Unnötige Angriffsfläche / Rollen-Info-Leak; `log_sms_link_click` erlaubt anon Writes in `sms_link_clicks`; `release_checkout_benefits_*` ist Trigger-Funktion, bleibt aber per Advisor RPC-ausführbar.  
  **Evidence:** `get_advisors` `anon_security_definer_function_executable` (7); `pg_get_functiondef`.

### Mittel / Info
- **41 Tabellen mit RLS an, 0 Policies** (Advisor `rls_enabled_no_policy`, INFO): u.a. `leads`, `password_reset_tokens`, `mfa_login_codes`, `passkey_backup_codes`, `guest_otps`/`guest_sessions`, Accounting-/Marketing-Tabellen. Wirkung für API-Rollen = Deny-all — gut, sofern absichtlich. Viele haben trotzdem noch volle Grants an `anon`/`authenticated` (z.B. `leads`, `mfa_login_codes`, `passkey_backup_codes`, `webauthn_challenges`, `tenant_secrets`) → Grants bereinigen (Defense in Depth).
- **`function_search_path_mutable`** WARN **27** (Trigger-/Helper-Funktionen ohne fixed `search_path`).
- **`authenticated_security_definer_function_executable`** WARN **8** (inkl. `can_read_tenant_users`).
- **`customer_payment_methods`:** weiterhin **12** Policies, teils redundant/fehlerhaft (`(user_id)::text = (auth.uid())::text` mischt interne User-ID mit Auth-UID). Zusätzlich korrekte Own-Policies — Chaos erhöht Fehlerrisiko bei künftigen Edits.
- **Weitere offene Public-/Auth-Reads mit literal `true` (12 non-service):** `cancellation_rules_public_read`; `evaluation_categories`/`criteria`/`scale` SELECT true; sowie authenticated Katalog-Reads (`business_types`, `categories`, `event_types`, `plz_distance_cache`, `reminder_providers`, `user_document_categories`) — eher Katalogdaten, aber ohne Tenant-Filter.
- **`products_public_read`:** `SELECT` für `{public}` mit `is_active = true` (kein Tenant-Filter) — Katalog-Leak über Tenants hinweg.
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

### Delta seit letztem Lauf
Vergleich zu 2026-09-12 (`docs/bot-reports/2026-09-12-supabase-rls.md`, PR #203):

| Metrik | 2026-09-12 | 2026-09-19 | Delta |
|--------|------------|------------|-------|
| Tabellen / RLS off | 226 / 0 | 226 / 0 | unverändert |
| Policies | 431 | 415 | −16 |
| Zero-Policy-Tabellen | 41 | 41 | unverändert |
| Security Advisors | 84 (0/43/41) | 84 (0/43/41) | unverändert |
| Views security_invoker | 11/11 | 11/11 | unverändert |
| `auth_rls_initplan` | 341 | 335 | −6 |
| `multiple_permissive_policies` | 305 | 277 | −28 |

- **Behoben (Hoch):** `course_waitlist` INSERT `WITH CHECK (true)` — Policy entfernt; verbleibende Policies tenant-scoped (`course_waitlist_tenant_*`).
- **Behoben (Hoch):** Voucher/`voucher_codes` anon Voll-Listen — keine anon Lookup-aller-Codes mehr; SELECT erfordert `auth.uid()` + Tenant bzw. Own/Admin.
- **Behoben (Hoch):** `course_sessions_public_read` war `USING (true)` — jetzt `EXISTS (... courses.is_public = true)`.
- **Unverändert (Hoch):** `staff_locations.anon_read_staff_locations` (`SELECT true`); Postgres-Patch; DEFINER EXECUTE für anon an Hilfs-RPCs (7).
- **Neu:** keine neuen kritischen Objekte; Policy-Count weiter gesunken (Aufräumen Waitlist/Voucher/Sessions).

### Empfehlungen (nur Text, keine Umsetzung)
1. `anon_read_staff_locations` auf `is_online_bookable`/`is_active` + Tenant-Kontext einschränken oder durch `availability_slots`-Pfad ersetzen; interne IDs aus Public-Projektion nehmen.
2. Postgres auf gepatchte Supabase-Version upgraden (Dashboard → Infrastructure).
3. `REVOKE EXECUTE … FROM anon, authenticated` für nicht-öffentliche DEFINER-Funktionen; Trigger-Funktionen (`release_checkout_benefits_on_payment_close`) nicht im Data-API-Schema exponieren; `log_sms_link_click` nur service_role/Edge.
4. Zero-Policy-Tabellen: überflüssige Grants an `anon`/`authenticated` revoken (Defense in Depth), besonders Tokens/MFA/`tenant_secrets`/`leads`.
5. `customer_payment_methods`: doppelte/kaputte Policies entfernen, eine klare Own+Staff-Policy-Matrix behalten.
6. Public-Reads mit `true` (`cancellation_rules`, Evaluation-Kataloge) und `products_public_read` tenant- oder bewusst öffentlich scoping.
7. `auth.uid()` in Policies in `(select auth.uid())` wrappen (InitPlan) und fehlende Indexes an Filterspalten nachziehen.

---
*Auditor-Lauf: READ-ONLY. Keine DB-Writes, keine App-Code-Fixes, keine Secrets/PII im Report.*
