## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-08-22T01:05:00Z
- Projekt: unyjaetebnaexaflpyoc
- Modus: READ-ONLY (keine Änderungen)
- Inventar: 219 Tabellen (211 mit RLS an, 8 ohne), 11 Views, 458 Policies in `public`
- Advisors: Security 187 (ERROR 10 / WARN 154 / INFO 23); Performance nur security-relevant mitgenommen (`auth_rls_initplan` 352, `unindexed_foreign_keys` 161)
- Nicht ausgeführt (Write): apply_migration, deploy_edge_function, create/pause/restore, Branch merge/reset/rebase, Storage-Config-Updates

### Kritisch
- **Objekt:** `public.companies` + Marketing-Tabellen ohne RLS (`marketing_ga4_daily`, `marketing_gsc_daily`, `marketing_google_ads_daily`, `marketing_meta_ads_daily`, `marketing_google_ads_search_terms_daily`, `marketing_meta_ads_ad_daily`, `marketing_offers`)  
  **Problem:** `relrowsecurity = false`; Advisor `rls_disabled_in_public` (ERROR). Grants an `anon`/`authenticated` inkl. SELECT/INSERT/UPDATE/DELETE.  
  **Warum riskant:** API-Rollen können Daten ohne Zeilenfilter lesen und ändern (Business-/Ads-Daten, Firmenstammdaten).  
  **Evidence:** `get_advisors(type=security)`; SQL `pg_class.relrowsecurity`; `information_schema.role_table_grants`.

- **Objekt:** Views `public.invoices_with_details`, `public.medical_certificate_reviews`  
  **Problem:** Advisor `security_definer_view` (ERROR); keine `security_invoker`-Option; volle Grants an `anon`/`authenticated`.  
  **Warum riskant:** SECURITY DEFINER umgeht RLS der Basistabellen (`invoices`/`users` bzw. `appointments`/`users`/`payments`) → potenziell tenant-übergreifende Billing-/Gesundheitsdaten inkl. Kontaktfelder und Certificate-URLs.  
  **Evidence:** `get_advisors`; `pg_get_viewdef` + `reloptions`; Grants-Query.

- **Objekt:** RPC `public.get_tenant_secret(...)` (SECURITY DEFINER, EXECUTE für `anon`/`authenticated`)  
  **Problem:** Liest `tenant_secrets.secret_value` und gibt es zurück; setzt `v_user_id` aus `auth.uid()`, prüft aber keine Admin-/Tenant-Berechtigung vor dem Return.  
  **Warum riskant:** Secret-Leak über `/rest/v1/rpc/get_tenant_secret` (auch unauthentifiziert, wenn RPC erreichbar).  
  **Evidence:** Advisor `anon_security_definer_function_executable` / `authenticated_...`; `pg_get_functiondef` (nur Struktur, kein Secret-Inhalt).

- **Objekt:** RPC `public.unlock_account(p_user_id uuid)` (SECURITY DEFINER)  
  **Problem:** Setzt Lock-Felder auf `users` ohne Auth-/Rollenprüfung; EXECUTE für `anon`/`authenticated`.  
  **Warum riskant:** Beliebige Account-Entsperrung / Lock-Bypass.  
  **Evidence:** `pg_get_functiondef`; `HAS_FUNCTION_PRIVILEGE`.

- **Objekt:** RPC `public.soft_delete_user(...)` (SECURITY DEFINER)  
  **Problem:** Berechtigung hängt am Parameter `deleting_user_id` (Rollen-Lookup auf übergebener ID), nicht an `auth.uid()`. EXECUTE für `anon`/`authenticated`.  
  **Warum riskant:** IDOR — Aufrufer kann sich als privilegierte User-ID ausgeben und Soft-Deletes auslösen.  
  **Evidence:** `pg_get_functiondef` (Permission-Block startet mit `deleting_user.role = 'master_admin'`).

- **Objekt:** RPC `public.test_auth_login(user_email, user_password)` (SECURITY DEFINER)  
  **Problem:** Keine Auth-Prüfung; liest `auth.users` und liefert Existenz, `email_confirmed`, `user_id`. Password-Parameter ungenutzt. EXECUTE für `anon`.  
  **Warum riskant:** User-Enumeration / Auth-Metadaten-Leak; Debug-Funktion in Prod.  
  **Evidence:** vollständige Funktionsdefinition (keine Secrets).

### Hoch
- **Objekt:** `public.session_confirmation_tokens`  
  **Problem:** Policy `tokens_public_read` — `SELECT` für `{public}` mit `qual=true`. Spalten u.a. `token`, `tenant_id`, `course_id`, `staff_id`.  
  **Warum riskant:** Beliebige Session-/Bestätigungs-Tokens auslesbar.  
  **Evidence:** `pg_policies`; Spaltenliste `information_schema.columns`.

- **Objekt:** `public.password_reset_tokens`  
  **Problem:** Policy `password_reset_tokens_anon_read` — `anon` SELECT wo `expires_at > now() AND used_at IS NULL` (kein Token-Match nötig). Spalten inkl. `token`, `email`, `phone`, `user_id`.  
  **Warum riskant:** Aktive Reset-Tokens und PII für alle Anonymen.  
  **Evidence:** `pg_policies`.

- **Objekt:** Zu offene Policies für `authenticated` (cross-tenant)  
  - `dunning_settings` / `dunning_templates` / `invoice_dunning_log`: ALL `USING(true) WITH CHECK(true)`  
  - `fahrlehrer_leads`: INSERT/SELECT/UPDATE mit `true`  
  - `discounts`: doppelte SELECT-Policies `qual=true` für authenticated  
  - `product_sales`: zusätzliche Policies „Enable * for authenticated users“ nur `auth.role() = 'authenticated'` (neben tenant-Policy; permissive OR)  
  **Warum riskant:** Tenant-Isolation gebrochen bzw. durch permissive Zusatz-Policies ausgehebelt.  
  **Evidence:** `pg_policies` Filter auf offene/`auth.role()`-only Qualifier.

- **Objekt:** Weitere SECURITY-DEFINER-RPCs mit EXECUTE für `anon`/`authenticated` (u.a. Cash: `office_cash_deposit`/`withdrawal`/`withdraw_cash_transaction`/`top_up_cash_balance`; `allocate_invoice_number`; `append_exam_passed_category`; `list_expired_receipts`; `get_payments_monthly_summary`; `debug_users_access`)  
  **Problem:** Advisor-Warnungen ×63 anon + ×63 authenticated; teilweise mit internen Guards (z.B. Cash-Deposit prüft Tenant), teils unsicher.  
  **Warum riskant:** DEFINER + breites EXECUTE = großes Angriffsflächen-Inventar; jede fehlende Guard ist kritisch.  
  **Evidence:** `get_advisors`; gezielte `HAS_FUNCTION_PRIVILEGE`-Stichprobe.

- **Objekt:** `public.users` Policy `anon_read_staff_users` — `SELECT` wo `role = 'staff'` für `{public}`  
  **Problem:** Öffentliche Staff-PII (Namen/E-Mail/Telefon je nach Spaltenexposition).  
  **Warum riskant:** Unnötige Exposure, falls Booking nur reduzierte Felder braucht (besser View/RPC).  
  **Evidence:** `pg_policies`.

### Mittel / Info
- **23 Tabellen mit RLS an, 0 Policies** (Advisor `rls_enabled_no_policy`, INFO): u.a. `passkey_backup_codes`, `mfa_login_codes`, `mfa_failed_attempts`, `impersonation_sessions`, `account_switch_grants`, `accountant_grants`, `leads`, `cash_daily_closes`, `webauthn_challenges`.  
  **Einordnung:** Für `anon`/`authenticated` faktisch Deny-all (gut, wenn nur `service_role` zugreifen soll). Risiko: versehentliche Policy später / Client-Erwartung unklar; sensible Auth-Tabellen sollten explizit dokumentiert + Grants hart eingeschränkt sein.

- **Views ohne eigenes RLS**, viele mit `security_invoker=on` (OK relativ zu DEFINER): u.a. `failed_login_activity`, `mfa_setup_status`, `mfa_sms_codes_expired`, `office_cash_overview`, `staff_capabilities`, `client_staff_assignments`. Trotzdem breite Default-Grants an `anon`/`authenticated` — Sicherheit hängt 1:1 an Basistabellen-Policies.

- **Performance (security-relevant):** 352× `auth_rls_initplan` (Policies re-evaluieren `auth.uid()` pro Zeile), 161× `unindexed_foreign_keys` — kann zu Timeouts/DoS-ähnlichem Lastverhalten bei großen Tabellen führen; kein direkter Auth-Bypass.

- **Postgres-Version:** Advisor `vulnerable_postgres_version` (WARN) — Patches verfügbar (`supabase-postgres-17.4.1.043`).

- **Auth/API-Logs:** nicht nötig für Befundlage; nicht ausgeführt.

### Positiv / OK
- Kern-Domain weitgehend mit RLS: `payments`, `appointments`, `invoices`, `tenant_secrets` (Tabellen-Policies), `customer_payment_methods` (teilweise owner-basiert) haben RLS und tenant-/owner-bezogene Policies.
- 211/219 Tabellen haben RLS aktiviert.
- Mehrere Views korrekt mit `security_invoker` abgesichert (im Gegensatz zu den zwei DEFINER-Views).
- `service_role`-`USING(true)`-Policies sind erwartbar und allein kein Bug (sofern Key nicht clientseitig landet).

### Delta seit letztem Lauf
- Letzter Lauf 2026-08-15: **BLOCKED** (kein Supabase-MCP).
- Dieser Lauf: **erster erfolgreicher Audit** → **Baseline-Lauf** (alle Findings „neu“ relativ zur Historie).

### Empfehlungen (nur Text, keine Umsetzung)
1. Sofort RLS auf den 8 Tabellen ohne RLS aktivieren + restriktive Policies (oder Grants von `anon`/`authenticated` entziehen, nur `service_role`).
2. `invoices_with_details` und `medical_certificate_reviews` auf `security_invoker=on` umstellen (oder Views entfernen / durch eng gefilterte RPCs ersetzen); unnötige Grants revoken.
3. `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated` für Debug/Privilegien-RPCs (`test_auth_login`, `unlock_account`, `get_tenant_secret`, `soft_delete_user`, Cash-/Admin-RPCs); wo nötig nur `service_role` + harte `auth.uid()`-Guards.
4. Policies mit `USING(true)` / `WITH CHECK(true)` für `authenticated`/`public` auf Tokens, Dunning, Leads, Discounts, `product_sales` tenant- bzw. token-gebunden neu schneiden; doppelte permissive Policies bereinigen.
5. `password_reset_tokens` / `session_confirmation_tokens`: kein Listen-SELECT für anon — nur RPC mit Token-Hash-Lookup.
6. Postgres patchen; danach Advisors erneut prüfen.
7. Optional: fehlende Indexes auf Policy-/FK-Spalten und `auth_rls_initplan`-Umstellung auf `(select auth.uid())` für Stabilität.
