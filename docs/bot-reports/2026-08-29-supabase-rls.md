## RLS Audit — Driving Team App
- Datum/Zeit (UTC): 2026-08-29T01:05:43Z
- Projekt: `unyjaetebnaexaflpyoc`
- Modus: READ-ONLY (keine Änderungen)
- Inventar: **222** Tabellen (`rls_on=222`, `rls_off=0`), **11** Views, **444** Policies
- Security Advisors: **81** (ERROR **0**, WARN **43**, INFO **38**)
- Performance Advisors (Kurz): **1118** (u. a. `auth_rls_initplan` 347, `multiple_permissive_policies` 330) — security-relevant wegen Policy-Performance / Fail-open Risiko bei Overlaps
- Nicht ausgeführt: DB-Writes; `get_logs` (Tool nicht verfügbar); `apply_migration` / Config-Updates (Write)

### Kritisch
- **Objekt:** `public.staff_invitations` — Policy `staff_invitations_token_read`
  - **Problem:** `anon` SELECT mit `status = 'pending' AND expires_at > now()` **ohne Token-Match** — listet alle offenen Einladungen.
  - **Warum riskant:** Zeilen enthalten `invitation_token`, `email`, `phone`, Namen; aktuell **8** pending Invites → Account-Takeover / Phishing möglich.
  - **Evidence:** `pg_policies` (cmd=SELECT, roles=`{anon}`); Spalten via `information_schema.columns`; Count `pending_invites=8`.

- **Objekt:** `public.tenant_settings` — Policy `anon_read_tenant_settings`
  - **Problem:** SELECT für Rolle `public` mit `USING (true)` — volle Tabellenexposition inkl. Spalten `stripe_api_key`, `stripe_webhook_secret`, `payment_provider`, `setting_value`.
  - **Warum riskant:** Jeder Anon-Client kann alle Tenant-Settings lesen. Stripe-Spalten sind derzeit **leer** (`with_stripe_key=0`, `with_webhook_secret=0`), aber Schema + Policy sind ein Secret-Leak-Pfad; `setting_value` (payment/billing) ist ohnehin exponiert.
  - **Evidence:** `pg_policies` + `information_schema.columns` + Count-Query auf `tenant_settings`.

### Hoch
- **Objekt:** `public.course_waitlist` — Policy `course_waitlist_public_insert`
  - **Problem:** INSERT für `anon,authenticated` mit `WITH CHECK (true)`.
  - **Warum riskant:** Beliebige Spam-/Fake-Einträge ohne Tenant-/Kursbindung in der Policy.
  - **Evidence:** `pg_policies`.

- **Objekt:** Kalender-/Buchungs-Metadaten öffentlich lesbar (`USING (true)`, roles `public`)
  - `external_busy_times` → `anon_read_external_busy_times`
  - `staff_working_hours` → `anon_read_staff_working_hours`
  - `staff_locations` → `anon_read_staff_locations`
  - **Warum riskant:** Cross-Tenant-Auslesen von Busy-Times / Arbeitszeiten / Staff-Location-Zuordnung (Profiling, Konkurrenz, Privacy).
  - **Evidence:** `pg_policies` (literal `qual=true`, non-`service_role`).

- **Objekt:** `public.discounts` — `discounts_select_anon` (`is_voucher = true`)
  - **Problem:** Anon kann alle Voucher-Rabatte listen (Codes/Metadaten je nach Spalten).
  - **Warum riskant:** Enumeration von Gutscheinen / Missbrauch.
  - **Evidence:** `pg_policies`.

- **Objekt:** Security Advisor `vulnerable_postgres_version`
  - **Problem:** `supabase-postgres-17.4.1.043` hat ausstehende Security-Patches.
  - **Warum riskant:** Bekannte Postgres-/Plattform-Patches fehlen.
  - **Evidence:** `get_advisors` type=security (WARN).

- **Objekt:** Sensitive Tabellen mit RLS an, **0 Policies** (fail-closed für API, solange Grants nicht umgangen werden)
  - U. a. `password_reset_tokens`, `passkey_backup_codes`, `webauthn_challenges`, `mfa_login_codes`, `mfa_failed_attempts`, `leads`, `impersonation_sessions`, `companies`, Marketing-Tages-Tabellen.
  - **Warum riskant:** Viele haben weiterhin volle Grants an `anon`/`authenticated`; sobald jemand eine permissive Policy hinzufügt oder RLS aus Versehen disablet, ist Exposure sofort. Einige (tokens/MFA) sind hochsensibel.
  - **Evidence:** Advisor `rls_enabled_no_policy` (38) + Grant-Check via `information_schema.role_table_grants`.

- **Objekt:** `public.customer_payment_methods` — doppelte / inkonsistente Policies
  - **Problem:** Policies vergleichen teils `(user_id)::text = (auth.uid())::text` (user_id ist `uuid` der `users`-Tabelle, nicht `auth.users.id`) neben korrekten `users.auth_user_id`-Joins; Rollen teils `{public}`.
  - **Warum riskant:** Unklare Autorisierung, tote Policies, schwer reviewbar; Risiko von Fehlkonfiguration bei künftigen Edits.
  - **Evidence:** `pg_policies` auf `customer_payment_methods`.

### Mittel / Info
- **SECURITY DEFINER** RPCs weiterhin per Advisor für `anon`/`authenticated` executable: u. a. `is_active_tenant`, `is_staff_or_admin_in_tenant`, `is_client_user_for_tenant`, `is_staff_user_for_tenant`, `get_current_user_id`, `can_read_tenant_users` (nur authenticated), `log_sms_link_click`, `release_checkout_benefits_on_payment_close` (Trigger-Signatur — RPC-Aufruf praktisch eingeschränkt). Info-Leak / Spam-Insert möglich; keine direkten Secret-Returns in den geprüften Bodies.
- **Views (11):** alle mit `security_invoker` — OK.
- Weitere offene Read-Policies (`USING (true)`): u. a. `locations`, `categories`, `event_types`, `course_sessions`, Evaluation-Lookup-Tabellen, `cancellation_rules` — oft intentional für Booking-UI; trotzdem breit.
- Performance: viele `auth_rls_initplan` / `multiple_permissive_policies` — bei Last und Policy-Or-Logik relevant (nicht direkt Data-Leak).
- `get_logs`: nicht ausgeführt (Tool fehlt in diesem MCP-Namespace).

### Positiv / OK
- **0 Tabellen ohne RLS** (vorher 8 mit Grants) — Advisor ERROR-Liste leer.
- Kritische DEFINER-RPCs `get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`: EXECUTE nur noch `postgres`/`service_role` (`anon_exec=false`, `auth_exec=false`).
- `session_confirmation_tokens`: Policy prüft `auth.role() = 'service_role'` (nicht mehr offenes `true` für Clients).
- `password_reset_tokens`: RLS an, 0 Policies, **keine** API-Grants an anon/authenticated (deny-by-default).
- `fahrlehrer_leads`: nur noch `service_role` ALL (kein offenes authenticated).
- Kern-Tabellen `payments`, `appointments`, `users` mit tenant-/own-scoped Policies (+ service_role).
- `tenant_secrets` SELECT/UPDATE für authenticated an Admin-Tenant gebunden; offenes `true` nur für `service_role`.

### Delta seit letztem Lauf
Vergleich zu **2026-08-22 Baseline** (Memory / PR #59):

| Thema | Status |
|--------|--------|
| 8 Tabellen ohne RLS (`companies`, `marketing_*`, …) | **Behoben** — RLS überall an |
| SECURITY DEFINER Views (`invoices_with_details`, `medical_certificate_reviews`) | **Behoben** — `security_invoker` |
| DEFINER RPCs `get_tenant_secret` / `unlock_account` / `soft_delete_user` / `test_auth_login` für Client-Rollen | **Behoben** — nur service_role |
| `session_confirmation_tokens` SELECT true | **Behoben** |
| Offene authenticated Policies auf `dunning_*` / `fahrlehrer_leads` | **Teilweise behoben** — dunning-Tabellen jetzt RLS+0 Policies / Grants weg; fahrlehrer nur service_role |
| `staff_invitations` anon list | **Unverändert / weiterhin kritisch** |
| `tenant_settings` anon `USING (true)` | **Neu hervorgehoben** (Schema mit Stripe-Spalten) |
| Security Advisors ERROR | **Verbessert** 10 → 0 |
| Inventar | 219→222 Tabellen; Policies 458→444 |

### Empfehlungen (nur Text, keine Umsetzung)
1. **Sofort:** `staff_invitations_token_read` ersetzen durch Token-gebundenes Lookup (z. B. `invitation_token = <request-param>` / Edge Function mit service_role) — kein anon-List.
2. **Sofort:** `anon_read_tenant_settings` entfernen oder auf unkritische Keys/Feature-Flags einschränken; Stripe-/Secret-Spalten nie über Data API exposen (eigene Tabelle / `tenant_secrets`).
3. `course_waitlist_public_insert`: `WITH CHECK` auf gültigen `course_id`/`tenant_id` + Rate-Limit serverseitig.
4. Public-Reads für `external_busy_times` / `staff_working_hours` / `staff_locations` auf Booking-sichere Projection (View ohne sensible Felder, tenant-gefiltert) umstellen.
5. `discounts_select_anon`: auf Code-Lookup statt Full-Scan begrenzen.
6. Postgres-Upgrade laut Advisor durchführen.
7. Tabellen mit RLS+0 Policies: entweder bewusste Deny-Policies dokumentieren **oder** Grants für anon/authenticated revoken (Defense in Depth), besonders MFA/Passkey/Leads.
8. `customer_payment_methods`: doppelte Policies bereinigen; nur `auth_user_id`-Join behalten.
9. DEFINER-Helper: EXECUTE für `anon` revoken, wo nicht zwingend für Booking nötig; Trigger-Funktionen nicht als RPC granten.

---
*Auditor-Lauf: Cron `0 1 * * 6` · Automation Security-Auditor · keine Secrets/PII-Werte in diesem Report.*
