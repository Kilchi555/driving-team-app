## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-09-05T01:01Z (Cron-Trigger)
- Projekt: `unyjaetebnaexaflpyoc`
- Modus: READ-ONLY (keine Änderungen)

### Inventar (Kurz)
| Metrik | Wert |
|--------|------|
| Tabellen `public` | 226 (RLS on: 226 / off: 0) |
| Views `public` | 11 (alle `security_invoker`) |
| Policies | 445 |
| RLS an, 0 Policies | 41 |
| Security Advisors | 86 (ERROR 0, WARN 45, INFO 41) |
| Performance Advisors (Sicherheit relevant) | `auth_rls_initplan` 347, `multiple_permissive_policies` 331 |

Quellen: `get_advisors(security|performance)`, `list_tables`, SELECT auf `pg_class` / `pg_policies` / `information_schema`.
Nicht ausgeführt: `get_logs` (Tool nicht verfügbar); alle Write-Tools übersprungen.

---

### Kritisch
- **Objekt:** `public.staff_invitations` / Policy `staff_invitations_token_read`
  - **Problem:** `anon` SELECT mit `status = 'pending' AND expires_at > now()` — ohne Token-Bindung.
  - **Warum riskant:** Leakt `invitation_token`, E-Mail, Telefon, Namen aller offenen Einladungen (aktuell **7** pending).
  - **Evidence:** `pg_policies` (cmd=SELECT, roles=`{anon}`); Spalten via `information_schema.columns`; Count pending via SELECT.

- **Objekt:** `public.tenant_settings` / Policy `anon_read_tenant_settings`
  - **Problem:** SELECT `USING (true)` für Rolle `public` (inkl. anon).
  - **Warum riskant:** Schema enthält `stripe_api_key`, `stripe_webhook_secret`. Derzeit **0** Zeilen mit befüllten Stripe-Feldern — Latenzrisiko bei späterer Nutzung.
  - **Evidence:** `pg_policies`; Spaltenfilter auf `tenant_settings`; Count `stripe_*` populated = 0.

---

### Hoch
- **Objekt:** `public.course_waitlist` / `course_waitlist_public_insert`
  - **Problem:** INSERT für `{anon,authenticated}` mit `WITH CHECK (true)`.
  - **Warum riskant:** Beliebige Spam-/PII-Einträge (Name, E-Mail, Telefon); 12 bestehende Rows.
  - **Evidence:** `pg_policies`.

- **Objekt:** Öffentliche Read-Policies (`USING true`, roles `public`)
  - `external_busy_times.anon_read_external_busy_times`
  - `staff_working_hours.anon_read_staff_working_hours`
  - `staff_locations.anon_read_staff_locations`
  - **Warum riskant:** Kalender-/Standort-Muster aller Tenants ohne Auth; unterstützt Enumeration/Targeting.
  - **Evidence:** SELECT open-true Policies excl. `service_role`.

- **Objekt:** `public.discounts` — `discounts_select_anon` / `discounts_insert_anon`
  - **Problem:** anon SELECT aller `is_voucher = true`; anon INSERT wenn `is_voucher AND payment_id IS NOT NULL`.
  - **Warum riskant:** Voucher-Enumeration; potenziell missbräuchliche Inserts bei erratenen/geleakten `payment_id`s.
  - **Evidence:** `pg_policies`.

- **Objekt:** Postgres-Version
  - **Problem:** Advisor `vulnerable_postgres_version` (WARN).
  - **Warum riskant:** Bekannte Patches noch nicht eingespielt (Plattform-Update nötig).
  - **Evidence:** `get_advisors` type=security.

- **Objekt:** SECURITY DEFINER RPCs ausführbar für anon/authenticated
  - u.a. `log_sms_link_click`, `release_checkout_benefits_on_payment_close`, Hilfsfunktionen `is_*` / `get_current_user_id`.
  - **Warum riskant:** Unerwartete RPC-Oberfläche; Trigger-Funktionen sollten kein Public-EXECUTE haben.
  - **Evidence:** Advisors `anon_security_definer_function_executable` (8), `authenticated_security_definer_function_executable` (9); `has_function_privilege` bestätigt EXECUTE für die beiden erstgenannten.

---

### Mittel / Info
- **41 Tabellen mit RLS + 0 Policies:** Deny-by-default für Client-Rollen (gut für Isolation), aber viele haben weiterhin breite Grants an `anon`/`authenticated` (SELECT…TRUNCATE). Besser: Grants auf `service_role` beschränken + explizite Policies wo Client-Zugriff nötig.
  - Neuere/auffällige: u.a. `leads`, `password_reset_tokens`, `passkey_backup_codes`, `webauthn_challenges`, `mfa_*`, `impersonation_sessions`, `guest_otps`/`guest_sessions`, Accounting-/Marketing-Tabellen.
  - Evidence: Advisor `rls_enabled_no_policy` (41 INFO); Grants-Query.

- **`customer_payment_methods` Policy-Chaos:** parallele Policies, teils `user_id::text = auth.uid()::text` (vermutlich nie matchend, da `user_id` ≠ auth UUID) + korrekte `users.auth_user_id`-Varianten; Advisor meldet multiple permissive Policies auch für `anon`.
  - Evidence: `pg_policies`; performance `multiple_permissive_policies`.

- **Weitere offene SELECT true (eher Katalog/Public-Booking):** `locations`, `course_sessions`, `cancellation_rules`, `evaluation_*`, `categories`/`event_types`/`business_types*` (authenticated), `user_document_categories`, `reminder_providers`, `plz_distance_cache`.

- **Performance (security-adjacent):** 347× `auth_rls_initplan` (auth.uid() pro Row statt `(select auth.uid())`); 331× multiple permissive Policies — DoS-/Last-Risiko bei großen Tabellen.

- **Function search_path mutable:** 27 WARNs (Trigger/Helper) — Privilege-Escalation-Hygiene.

---

### Positiv / OK
- **0 Tabellen ohne RLS** (226/226) — gegenüber Baseline 2026-08-22 (8 ohne RLS) weiterhin gehalten.
- Alle 11 Views mit `security_invoker` (keine DEFINER-View-Bypass).
- Kritische RPCs `get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`, `record_failed_login`, `check_login_security_status`: DEFINER, aber **kein** EXECUTE für anon/authenticated.
- `session_confirmation_tokens`: nur service_role (`auth.role() = 'service_role'`).
- `password_reset_tokens` / MFA-/Passkey-Tabellen: RLS an, 0 Policies → Client-Zugriff blockiert.
- `payments` / `users` / `appointments`: tenant-/own-scoped Policies; kein anon SELECT true.
- `fahrlehrer_leads`: service_role full access (kein offenes Client-ALL).
- Security Advisors: **0 ERROR** (Baseline hatte 10 ERRORs).

---

### Delta seit letztem Lauf (2026-08-29)
| Bereich | Status |
|---------|--------|
| `staff_invitations_token_read` | **unverändert** (pending 8→7) |
| `tenant_settings` anon SELECT true | **unverändert** (Stripe-Felder weiter leer) |
| `course_waitlist` INSERT true | **unverändert** |
| Public reads busy/hours/locations | **unverändert** |
| Tabellen ohne RLS | **unverändert OK** (0) |
| Inventar | Tabellen 222→**226**, Policies 444→**445**, Zero-Policy 38→**41** |
| Security Advisors | 81→**86** (weiterhin 0 ERROR) |
| Kritische RPCs locked | **unverändert OK** |
| Neu behoben | **keine** |

---

### Empfehlungen (nur Text, keine Umsetzung)
1. **`staff_invitations_token_read` ersetzen:** anon nur per exaktem Token-Lookup (RPC/Edge) oder Spalten maskieren; Token nie listen.
2. **`anon_read_tenant_settings` einschränken:** nur whitelisted Keys / Public-View ohne `stripe_*`; Secrets nur in `tenant_secrets` + service_role.
3. **`course_waitlist_public_insert`:** WITH CHECK auf gültigen `course_id`/`tenant_id` + Rate-Limit/Captcha-Pfad.
4. Public Calendar-Reads auf `availability_slots` bzw. tenant-scoped Views umstellen; `USING (true)` auf busy/hours/locations entfernen.
5. `discounts` anon Policies härten (Code-Lookup statt Full-Scan; Insert nur über service_role/Checkout).
6. Zero-Policy-Tabellen: Grants von anon/authenticated revoken; wo App-Zugriff nötig, enge Policies nachziehen.
7. `customer_payment_methods`: doppelte/fehlerhafte Policies konsolidieren.
8. Postgres-Patch einspielen; DEFINER-EXECUTE für anon an Trigger-RPCs revoken; `search_path` fixen; RLS `auth.uid()` → `(select auth.uid())` priorisieren.
