## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-10-17T01:04Z
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
- Tabellen `public`: **235** — RLS an: **235** / aus: **0**
- Views `public`: **11** — alle mit `security_invoker` (on/true)
- Policies: **423**
- RLS an, aber **0 Policies**: **48**
- Security Advisors: **97** (ERROR **0**, WARN **49**, INFO **48**)
- Performance (security-relevant, Kurz): `auth_rls_initplan` WARN×343; `multiple_permissive_policies` WARN×277; `unindexed_foreign_keys` INFO×184
- Auth/API-Logs: `query_logs` gelesen — **0** Postgres-Meldungen zu „row-level security“ im letzten ~24h-Fenster

### Kritisch
- Keine.

### Hoch
- **Objekt:** `public.staff_locations` / Policy `anon_read_staff_locations`  
  **Problem:** `SELECT` mit `USING (true)` für Rolle **PUBLIC** (gilt damit auch für `anon`).  
  **Warum riskant:** Unauthentifizierte Clients können alle Zuordnungen Staff↔Location inkl. `tenant_id`, `staff_id`, `is_online_bookable`, `available_categories` listen (67 Zeilen). Erleichtert Tenant-/Staff-Enumeration.  
  **Evidence:** `pg_policy` — `qual = true`, `polroles = {0}` (PUBLIC); Advisor-Kontext unverändert seit Vorwochen.

- **Objekt:** Postgres-Version `supabase-postgres-17.4.1.043`  
  **Problem:** Security Advisors: `vulnerable_postgres_version` (WARN×1).  
  **Warum riskant:** Offene Patches am Datenbank-Engine; nicht RLS-spezifisch, aber Plattform-Risiko.  
  **Evidence:** `get_advisors(type=security)` → lint `vulnerable_postgres_version`.

- **Objekt:** 9× `SECURITY DEFINER`-Funktionen mit `EXECUTE` für `anon`  
  **Problem:** Advisor `anon_security_definer_function_executable` (WARN×9): u. a. `get_current_user_id`, `is_active_tenant`, `is_*_for_tenant`, `is_staff_or_admin_in_tenant`, `log_sms_link_click`, `prevent_*_client_mutation`, `release_checkout_benefits_on_payment_close`.  
  **Warum riskant:** Auch wenn Hilfs-/Trigger-Funktionen oft harmlos sind, bleibt die öffentliche RPC-Oberfläche größer als nötig (Informationsleck / Missbrauchspfad). Kritische Secrets-RPCs (`get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`) haben **kein** anon/authenticated EXECUTE — positiv.  
  **Evidence:** `get_advisors` + `HAS_FUNCTION_PRIVILEGE('anon', …, 'EXECUTE')`.

### Mittel / Info
- **48 Tabellen mit RLS, aber 0 Policies** (Advisor `rls_enabled_no_policy` INFO×48). Wirkung: Deny-all für Rollen ohne Bypass — gut als Fail-closed. Darunter sensible Namen (`password_reset_tokens`, `passkey_backup_codes`, `webauthn_challenges`, `mfa_*`, `leads`, `guest_*`, `payment_access_grants`, …).  
  **Defense-in-depth:** 27 der 48 haben weiterhin **volle** Table-Grants an `anon`/`authenticated` (u. a. `leads`, `mfa_login_codes`, `passkey_backup_codes`, `webauthn_challenges`). RLS blockiert heute; Grants sollten dennoch auf `service_role` beschränkt werden. 21 Tabellen ohne anon/auth Grants — besser.
- **PUBLIC `SELECT true`:** zusätzlich `cancellation_rules_public_read`, `evaluation_categories|criteria|scale_select` — Katalog-/Stammdaten, geringeres Risiko als `staff_locations`, aber unnötig weit für `anon`.
- **authenticated `SELECT true`:** Lookup-Tabellen (`categories`, `event_types`, `business_types`, `plz_distance_cache`, `reminder_providers`, `user_document_categories`, `business_type_presets`) — typisch unkritisch, tenant-übergreifend lesbar für alle eingeloggten Nutzer.
- **`customer_payment_methods`:** weiterhin Policy-Duplikate / teils inkonsistente Qualifier (`user_id::text = auth.uid()::text` vs. Join über `users.auth_user_id`) — verwirrend, schwer zu reviewen (Advisor `multiple_permissive_policies` trägt bei).
- **authenticated DEFINER EXECUTE** (WARN×11): wie anon-Hilfsfunktionen plus `can_read_tenant_users`, `cash_transactions_protect_attribution`.
- **`function_search_path_mutable`** WARN×28 — Search-Path-Härtung offen.
- **Performance↔RLS:** 343× `auth_rls_initplan` (Policies sollten `(select auth.uid())` nutzen) — Performance, indirekt DoS-/Last-Risiko unter Last.

### Positiv / OK
- **0 Tabellen ohne RLS** in `public` (seit Baseline 2026-08-22 behoben und stabil).
- Alle **11 Views** mit `security_invoker` (keine SECURITY DEFINER Views mehr).
- Kritische DEFINER-RPCs (`get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`) ohne anon/authenticated EXECUTE.
- `payments`: JWT nur SELECT (tenant/own); Writes laut Schema-Kommentar service_role.
- Token-/Secret-Tabellen ohne Policies und ohne anon/auth Grants (`password_reset_tokens`, `guest_otps`, `guest_sessions`, `payment_access_grants`, `impersonation_sessions`, …) — Fail-closed.
- Security Advisors: **0 ERROR**.

### Delta seit letztem Lauf
Vergleich zu **2026-10-10** (`docs/bot-reports/2026-10-10-supabase-rls.md` / Memory):

| Metrik | 2026-10-10 | 2026-10-17 | Delta |
|--------|------------|------------|-------|
| Tabellen / RLS on/off | 235 / 235 / 0 | 235 / 235 / 0 | unverändert |
| Views (invoker) | 11 | 11 | unverändert |
| Policies | 423 | 423 | unverändert |
| Zero-Policy | 48 | 48 | unverändert |
| Security Advisors | 97 (0/49/48) | 97 (0/49/48) | unverändert |
| Kritisch | keine | keine | unverändert |
| Hoch | staff_locations; Postgres patch; 9 anon DEFINER | gleich | unverändert |

- **Neu:** keine
- **Unverändert:** alle Hoch-Findings und Inventar-Zahlen
- **Behoben:** keine seit letztem Lauf

### Empfehlungen (nur Text, keine Umsetzung)
1. `anon_read_staff_locations` entfernen oder auf bewusst öffentliche, minimale Spalten/Zeilen einschränken (z. B. nur aktive + online-bookable, ohne interne IDs wo möglich) — Booking-Flow über `availability_slots` / Server-API prüfen.
2. Postgres auf aktuelle Supabase-Patch-Version upgraden ([Upgrading](https://supabase.com/docs/guides/platform/upgrading)).
3. `REVOKE EXECUTE ON FUNCTION … FROM anon, authenticated` für Trigger-/Guard-DEFINER-Funktionen, die nicht als RPC gedacht sind; Hilfs-RPCs nur belassen, wenn bewusst öffentlich und side-effect-frei.
4. Bei den 27 Zero-Policy-Tabellen mit anon/auth Grants: Grants auf `service_role` (bzw. benötigte Rollen) zurücknehmen — Defense in Depth.
5. `customer_payment_methods`-Policies konsolidieren (eine klare own-user + staff-tenant Variante).
6. Optional: `auth_rls_initplan`-Hotspots und doppelte permissive Policies abbauen (Performance + Reviewbarkeit).

### Nicht ausgeführt (Write)
- `apply_migration`, Schema-DDL, Policy-Änderungen, `deploy_edge_function`, Branch merge/reset/rebase, Storage-Config — bewusst übersprungen (READ-ONLY).

### Methoden-Referenz
- `get_advisors(project_id, type=security|performance)`
- `list_tables(schemas=['public'], verbose=false)`
- SELECT-only SQL gegen `pg_class` / `pg_policy` / `information_schema` / `pg_proc`
- `query_logs` (Postgres, RLS-Stichwort) — Read only
