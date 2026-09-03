# World-Class Security + Engineering Review

**Date:** 2026-09-03  
**Scope:** Full repository review (Nuxt multi-tenant app `driving-team-app` / Simy)  
**Method:** Code analysis + live Supabase schema/policy verification (`unyjaetebnaexaflpyoc`)  
**Rules followed:** Analysis and documentation only — no application code, tests, migrations, or config changes  

**Baseline:** `origin/main` at review start (branch `cursor/worldclass-security-review-3e7f`)

---

## Executive Summary

The platform has meaningful security investments (API auth helpers, many remediations in March–September 2026, server-side Wallee amount derivation, Stripe signature verification, credits UPDATE locked to staff in live RLS). **It is not production-ready for a hostile multi-tenant assessment without closing several Critical/High gaps.**

The highest-impact issues are:

1. **Live RLS on `users` allows any authenticated user to UPDATE their own `role`, `tenant_id`, `is_active`, and `admin_level`** (column privileges + permissive `user_update_own`). This is a direct privilege-escalation / tenant-hop path via the Supabase client.
2. **Several service-role API handlers remain unauthenticated**, including a cross-tenant marketing dump (`/api/tenant-admin/marketing-overview`) and appointment confirmation-token disclosure (`/api/appointments/resend-confirmation`).
3. **Architecture claims of “100% API-first / zero client DB queries” are false.** ~77 client files still call `supabase.from(...)` (~294 call sites), including payment/status and staff calendar flows. Security still depends heavily on RLS — which is incomplete for privilege fields and invoices.

Older audit docs (Jan–Mar 2026) that mark issues “all fixed” or “migration complete” must not be trusted without re-verification against current code and live policies.

| Severity | Security | Engineering | Combined |
|----------|----------|-------------|----------|
| CRITICAL | 3 | 0 | 3 |
| HIGH | 8 | 3 | 11 |
| MEDIUM | 8 | 6 | 14 |
| LOW | 4 | 4 | 8 |
| INFO | 5 | 4 | 9 |

---

## Engineering

### Critical

*(None classified as engineering-only Critical. Cross-cutting Critical items are listed under Security.)*

### High

#### ENG-H01 — Client DB access remains widespread despite “API-first complete” claims

**Severity:** HIGH  
**Category:** Architecture / Coupling / Trust boundary  

**Evidence:**  
- ~77 files under `composables/`, `pages/`, `components/` with `.from('...')` (~294 matches).  
- High-risk examples: `composables/usePaymentStatus.ts` (client `payments` UPDATE), `composables/useEventModalForm.ts` (~1876 LOC, payments + booking logic), `composables/useReminderService.ts`, `composables/useStudents.ts`, `composables/useCourseParticipants.ts`, `pages/tenant-admin/*.vue`.  
- Contradicts `FINAL_SECURITY_AUDIT.md` (“Zero active critical direct database queries”) and parts of `DOCUMENTATION_INDEX.md`.

**Why it matters:** Authorization becomes “whatever RLS allows,” not “what the API enforces.” When RLS is wrong (see SEC-C01), client paths become exploit paths without needing an API bug.

**Attack / Failure Scenario:** Authenticated client uses published anon key + session to call PostgREST directly and mutate privileged columns / read tenant-wide rows.

**Affected Components:** Frontend data layer, RLS, all domains still using client queries.  
**Blast Radius:** Cross-feature; amplifies every RLS gap.  
**Confidence:** HIGH  

**Recommended Fix:** Enforce API-only for writes on sensitive tables; add CI grep gates; migrate remaining hotspots (payments, users, credits, appointments, discounts, courses).  
**Required Retest:** Confirm zero client writes to `users`, `payments`, `student_credits`, `appointments`, `invoices`; attempt PostgREST UPDATE on `users.role` after RLS fix.

---

#### ENG-H02 — `reserve-slot` documents atomicity but performs non-conditional UPDATE

**Severity:** HIGH  
**Category:** Race conditions / Booking integrity  

**Evidence:** `server/api/booking/reserve-slot.post.ts`  
- Comments claim “Atomic UPDATE (prevents double-booking)” and “slot only updated if still free”.  
- Implementation: read slot → check availability in app memory → `.update({...}).eq('id', body.slot_id)` **without** `WHERE reserved_by_session IS NULL OR reserved_until < now()`.  
- Contrast: `server/api/booking/create-appointment.post.ts` correctly uses `.eq('is_available', true)` on the locking update.

**Why it matters:** Two concurrent public reservations can both succeed; overlapping booking races until create-appointment’s stricter lock.

**Attack / Failure Scenario:** Two clients race the same `slot_id`; both receive 200; downstream booking conflicts / overbooking pressure.

**Affected Components:** Public booking, `availability_slots`.  
**Blast Radius:** Per-slot / per-staff schedule integrity.  
**Confidence:** HIGH  

**Recommended Fix:** Single conditional UPDATE returning row; treat 0 rows as 409; optionally `SELECT … FOR UPDATE` via RPC.  
**Required Retest:** Concurrent reservation load test on one slot.

---

#### ENG-H03 — God composables and duplicated payment/discount logic

**Severity:** HIGH  
**Category:** Maintainability / Hidden business logic  

**Evidence:**  
- `composables/useEventModalForm.ts` (~1876 lines), `composables/useAvailabilitySystem.ts` (~1312), `stores/auth.ts` (~785).  
- Parallel payment stacks: `usePayments` / `usePaymentsNew` / `usePaymentStatus` (API vs direct DB).  
- Parallel discount stacks: `useHybridDiscounts` + `useDiscountsConsolidated`.  
- Docs `docs/PAYMENT_PROVIDERS.md` describe `/api/payment-gateway/*`; that directory does not exist — live paths are `/api/wallee/*` and `/api/stripe/*`.

**Why it matters:** Security and pricing rules diverge between paths; fixes applied to one path leave another exploitable or inconsistent.

**Attack / Failure Scenario:** Staff UI uses client price fields via `appointments/save.post.ts` while online booking uses server pricing — inconsistent financial truth.

**Affected Components:** Booking calendar, shop, payments.  
**Blast Radius:** Pricing/payment integrity across staff vs online.  
**Confidence:** HIGH  

**Recommended Fix:** Single server pricing module; delete or wrap dead payment abstractions; split god composables.  
**Required Retest:** Same appointment priced via staff save vs online book yields consistent server totals.

---

### Medium

#### ENG-M01 — Cron auth fail-open when `CRON_SECRET` unset

**Evidence:** `server/api/cron/process-recalc-queue.get.ts`, `recalculate-staff-hours.get.ts`, `send-wallee-reminders.get.ts`, `cleanup-expired-invitations.post.ts` use `if (cronSecret && …)` patterns.  
**Confidence:** HIGH (code). Production env presence: **NEEDS VERIFICATION**.

#### ENG-M02 — Dual session model (cookies + localStorage + Supabase client + sync-session)

**Evidence:** `docs/SESSION_PERSISTENCE.md`, `server/utils/cookies.ts` (24h/7d), `nuxt.config` supabase cookie maxAge 8h, `server/api/auth/sync-session.post.ts`.  
**Risk:** Stale profile/role UI; confusing logout; harder incident response.

#### ENG-M03 — `getAuthenticatedUser` loads `is_active` / `deleted_at` but does not gate

**Evidence:** `server/utils/auth.ts` selects those columns, returns profile regardless. Soft-deactivated users can keep calling APIs while Auth session lives.  
**Aligned with prior F-07 notes.**

#### ENG-M04 — Mass-assignment on privileged update endpoints

**Evidence:** `server/api/company-billing/manage.post.ts` (`...body.addressData`), `server/api/payments/manage.post.ts` (`...body.paymentData`), `admin/courses/upsert.post.ts`. Auth present on some, but column allowlists incomplete.

#### ENG-M05 — Credit refund path non-atomic / missing `tenant_id`

**Evidence:** `handleCreditRefund` in `server/api/wallee/webhook.post.ts` (~1967–1993): `.eq('user_id', payment.user_id)` without `tenant_id`; read-modify-write balance. Unique key is `(user_id, tenant_id)` per schema usage elsewhere.

#### ENG-M06 — Middleware does not protect APIs

**Evidence:** `middleware/admin.ts` returns early on server; `server/middleware/validate-tenant.ts` skips `/api/`. Every API must self-enforce — many do not (Security findings).

### Low

#### ENG-L01 — Stale / contradictory security documentation as operational risk  
#### ENG-L02 — `documents/upload.post.ts` uses `getServerSession` from `#auth` but no nuxt-auth module in `package.json` / `nuxt.config` (likely broken or undefined behavior)  
#### ENG-L03 — Superadmin RLS policies use role string `'superadmin'` while app code uses `'super_admin'` (live `pg_policies` on appointments/payments)  
#### ENG-L04 — Dangerous historical migrations remain in tree that can re-introduce client credit UPDATE (`migrations/fix_rls_for_guest_voucher_redemption.sql`, etc.)

### Info

#### ENG-I01 — Strong server pricing on online shop/booking paths (`shop/create-payment`, `wallee/create-transaction`, `booking/create-appointment`)  
#### ENG-I02 — Shared auth helpers (`getAuthenticatedUser`, `requireAdminProfile`, `requireSuperAdmin`, `requireStaffOrInternal`) are solid when used  
#### ENG-I03 — F-03 payment-token endpoints remediated in current tree (`payment-token-auth.ts`)  
#### ENG-I04 — Invite/PKCE fail-closed handling present (`utils/auth-url-session.ts`)

---

## Security

### Critical

#### SEC-C01 — Live RLS: authenticated users can UPDATE own `role` / `tenant_id` / `admin_level`

**Severity:** CRITICAL  
**Category:** Authorization / Privilege escalation / Multi-tenant isolation / RLS  

**Evidence (live DB `unyjaetebnaexaflpyoc`):**  
- Policy `user_update_own` on `users`: `USING (auth_user_id = auth.uid())` / `WITH CHECK (auth_user_id = auth.uid())` — no restriction on `role` or `tenant_id`.  
- Column privileges for role `authenticated`: **UPDATE** on `role`, `tenant_id`, `is_active`, `admin_level`, `auth_user_id`.  
- No triggers on `users` preventing role changes (queried `pg_trigger`).  
- No CHECK constraint on `role` values.  
- Client still has direct `users` access paths (`composables/useStudents.ts`, StaffTab, tenant-admin pages, etc.).

**Why it matters:** Full vertical privilege escalation and horizontal tenant hopping via PostgREST, independent of API authorization.

**Attack / Failure Scenario (non-destructive description):**  
Authenticated client issues `UPDATE users SET role = 'admin'` (or `'super_admin'`) / `tenant_id = <victim>` where `auth_user_id = auth.uid()`. Subsequent API calls using `getAuthenticatedUser` would load the elevated role/tenant.

**Affected Components:** `users` RLS, all role-gated APIs, tenant isolation.  
**Blast Radius:** Platform-wide compromise of authorization model.  
**Confidence:** HIGH  

**Recommended Fix:**  
1. Immediately replace `user_update_own` WITH CHECK to freeze `role`, `tenant_id`, `admin_level`, `is_active`, `auth_user_id` (compare `OLD`/`NEW` via trigger, or column REVOKE + narrow UPDATE policy for safe profile fields only).  
2. Revoke UPDATE on privileged columns from `authenticated`.  
3. Ensure all privileged user changes go through service-role APIs with authz.  

**Required Retest:** As a client user, attempt PostgREST update of `role` and `tenant_id` — must fail. Staff/admin APIs for role changes still succeed.

---

#### SEC-C02 — Unauthenticated cross-tenant marketing overview (service role)

**Severity:** CRITICAL  
**Category:** Missing authentication / Sensitive data exposure / BOLA  

**Evidence:** `server/api/tenant-admin/marketing-overview.get.ts`  
- No `requireSuperAdmin` / no auth.  
- Uses `getSupabaseAdmin()`.  
- Optional `tenant_id` query param; default aggregates **all tenants**.  
- Selects GSC/GA4/Ads spend, booking events, appointments (with UTM/gclid), conversion uploads, tenant list.

**Why it matters:** Anyone who can reach the production URL can pull business-sensitive analytics and appointment marketing attribution across tenants.

**Attack / Failure Scenario:** Unauthenticated `GET /api/tenant-admin/marketing-overview?days=90` returns cross-tenant marketing + booking attribution datasets.

**Affected Components:** Tenant-admin marketing, appointments, ads data tables.  
**Blast Radius:** All tenants’ marketing/ops intelligence.  
**Confidence:** HIGH  

**Recommended Fix:** Add `requireSuperAdmin`; default-deny; never return cross-tenant without explicit superadmin scope.  
**Required Retest:** Unauthenticated request → 401; non-superadmin → 403.

---

#### SEC-C03 — Unauthenticated appointment confirmation token disclosure

**Severity:** CRITICAL  
**Category:** Missing authentication / IDOR / Sensitive token exposure  

**Evidence:** `server/api/appointments/resend-confirmation.post.ts`  
- No auth.  
- Loads appointment + user email via service role by `appointmentId` from body.  
- Returns `confirmationToken` and `confirmationLink` in JSON.  
- Can mint a new token if missing.

**Why it matters:** Confirmation tokens are capability URLs; leaking them enables confirmation/cancellation abuse and discloses customer email.

**Attack / Failure Scenario:** Caller supplies known/guessed UUID → receives token + email path for that appointment (cross-tenant).

**Affected Components:** Appointments confirmation flow.  
**Blast Radius:** Any appointment UUID; cross-tenant.  
**Confidence:** HIGH  

**Recommended Fix:** Require staff/admin of owning tenant (or owner); never return raw tokens to clients that should only trigger email server-side.  
**Required Retest:** Unauth → 401; foreign tenant staff → 403; no token in response body.

---

### High

#### SEC-H01 — Unauthenticated staff PII endpoints (service role)

**Severity:** HIGH  
**Category:** Missing auth / IDOR / PII  

**Evidence:**  
- `server/api/staff/cash-balance.post.ts` — no auth; loads `cash_movements` / `cash_transactions` + student names by `instructorId`.  
- `server/api/staff/exam-stats.post.ts` — no auth; appointments, exam_results, student names by `staff_id`.  
- `server/api/staff/evaluation-history.post.ts` — no auth; notes/evaluations by `user_id` / `appointment_id`.

**Attack / Failure Scenario:** Enumerate staff/student UUIDs → pull cash and evaluation/exam PII across tenants.

**Affected Components:** Staff cash, exams, evaluations.  
**Blast Radius:** Cross-tenant PII if IDs known/leaked.  
**Confidence:** HIGH  

**Recommended Fix:** `requireAdminProfile` + enforce `staff_id`/`user_id` within caller `tenant_id`.  
**Required Retest:** Unauth 401; cross-tenant ID 403/404.

---

#### SEC-H02 — Unauthenticated external busy-time mutation

**Severity:** HIGH  
**Category:** Missing auth / Availability sabotage  

**Evidence:** `server/api/staff/manage-external-busy-times.post.ts` — create/update/delete via service role; no auth; accepts arbitrary `staff_id` / `tenant_id`.

**Attack / Failure Scenario:** Attacker inserts busy blocks → removes availability slots for victim staff.

**Blast Radius:** Scheduling availability per staff/tenant.  
**Confidence:** HIGH  

**Recommended Fix:** Auth + tenant ownership checks; bind staff_id to caller tenant.  
**Required Retest:** Unauth 401; cross-tenant mutation denied.

---

#### SEC-H03 — Unauthenticated tenant bootstrap / mutation APIs

**Severity:** HIGH  
**Category:** Missing auth / Multi-tenant  

**Evidence:**  
- `server/api/tenants/seed-defaults.post.ts` — any `tenant_id`.  
- `server/api/tenants/copy-default-categories.post.ts` — inserts categories for any `tenant_id`.  
- `server/api/tenants/send-welcome-email.post.ts` — emails any tenant’s `contact_email`.

**Attack / Failure Scenario:** Spam welcome emails; pollute another tenant’s category catalog during/after onboarding.

**Blast Radius:** Per-tenant config integrity + email abuse.  
**Confidence:** HIGH  

**Recommended Fix:** Registration-token or authenticated admin of that tenant only; rate-limit.  
**Required Retest:** Foreign tenant_id rejected.

---

#### SEC-H04 — Weak onboarding gate on `invite-staff-batch`

**Severity:** HIGH  
**Category:** Authorization / Privilege  

**Evidence:** `server/api/tenants/invite-staff-batch.post.ts` — “Kein JWT erforderlich”; only checks tenant `created_at` < 30 minutes; then invites staff via service role.

**Attack / Failure Scenario:** Attacker who learns a freshly created `tenant_id` invites themselves/staff into that tenant within the window.

**Blast Radius:** New tenants during registration window.  
**Confidence:** HIGH  

**Recommended Fix:** Bind to registration session token / creator auth; shorten window; require proof of ownership.  
**Required Retest:** Unauth invite with random fresh tenant_id fails without ownership proof.

---

#### SEC-H05 — Branding API tenant isolation bug for staff/admin

**Severity:** HIGH  
**Category:** Horizontal privilege escalation / Broken access control  

**Evidence:** `server/api/tenants/branding.post.ts` lines 63–64, 106–116:  
- `isSystemAdmin = ['admin','staff','super_admin'].includes(role)`  
- Tenant match enforced only when `!isSystemAdmin`  
→ Any `admin`/`staff` can update **any** tenant’s branding (field whitelist mitigates mass-assignment of secrets, not cross-tenant).  
- Non-privileged roles with matching `tenant_id` are not role-denied.

**Attack / Failure Scenario:** Staff of Tenant A updates branding of Tenant B (defacement / phishing lookalike).

**Blast Radius:** All tenants’ public branding.  
**Confidence:** HIGH  

**Recommended Fix:** Only `super_admin` may cross tenants; tenant `admin` only own `tenant_id`; clients forbidden.  
**Required Retest:** Staff A → tenant B → 403.

---

#### SEC-H06 — Live RLS: all active tenant members can SELECT all `invoices`

**Severity:** HIGH  
**Category:** RLS / Intra-tenant data exposure  

**Evidence (live):** Policy `invoices_select_policy` — `tenant_id IN (SELECT … users … is_active = true)` **without role restriction**. Insert/update policies correctly require staff/admin roles.

**Attack / Failure Scenario:** Authenticated client role user lists all school invoices (amounts, customer refs) via Supabase client.

**Blast Radius:** Intra-tenant financial PII.  
**Confidence:** HIGH  

**Recommended Fix:** Restrict SELECT to staff/admin/accountant or invoice owner.  
**Required Retest:** Client role cannot select other users’ invoices.

---

#### SEC-H07 — Unauthenticated email-sending endpoints (abuse + data)

**Severity:** HIGH  
**Category:** Missing auth / Abuse  

**Evidence:**  
- `server/api/send-invite-email.post.ts` — no auth; loads appointment + staff; sends email to attacker-chosen address.  
- `server/api/students/send-onboarding-reminder.post.ts` — no auth; regenerates onboarding links for `userId`/`tenantId`.

**Attack / Failure Scenario:** Email spam via product infrastructure; onboarding token theft for targeted `userId`.

**Blast Radius:** Email reputation + account onboarding takeover assist.  
**Confidence:** HIGH  

**Recommended Fix:** Staff/admin auth + tenant binding; rate limits; do not accept arbitrary recipient without ownership checks.  
**Required Retest:** Unauth → 401.

---

#### SEC-H08 — Debug cron proxy injects `CRON_SECRET` without caller auth

**Severity:** HIGH  
**Category:** Missing auth / Privilege proxy  

**Evidence:** `server/api/debug/trigger-recalc-queue.post.ts` — comments claim non-production/admin token; **no caller check**; uses env `CRON_SECRET` to call `/api/cron/process-recalc-queue`.

**Attack / Failure Scenario:** Unauthenticated trigger of availability recalculation (DoS / load / unexpected slot churn).

**Blast Radius:** Availability compute pipeline.  
**Confidence:** HIGH  

**Recommended Fix:** Disable in production or require `super_admin`; never proxy secrets for anonymous callers.  
**Required Retest:** Unauth → 401/404 in production.

---

### Medium

#### SEC-M01 — Wallee webhooks lack HMAC (mitigated by live API re-read + amount check)

**Evidence:** `server/api/wallee/webhook.post.ts` lines 81–82, 501+. Idempotency via `webhook_logs` + `STATUS_PRIORITY`.  
**Residual risk:** Replay of valid events; dependency on Wallee API availability; credit-product race residual.  
**Confidence:** HIGH  

#### SEC-M02 — Cron auth accepts `x-vercel-cron: 1` alone on some jobs

**Evidence:** `process-recalc-queue.get.ts`, `assertCronRequest` patterns. Header is forgeable unless edge-network restricted.  
**NEEDS VERIFICATION:** Vercel edge enforcement on production.

#### SEC-M03 — Any same-tenant authenticated user can change appointment `payment_method`

**Evidence:** `server/api/appointments/update-payment-status.post.ts` — auth + tenant match, **no role check**.

#### SEC-M04 — Inactive/deleted users not rejected in `getAuthenticatedUser`

**Evidence:** `server/utils/auth.ts` — selects `is_active`/`deleted_at`, never gates.  

#### SEC-M05 — Logout does not revoke refresh tokens server-side

**Evidence:** `server/api/auth/logout.post.ts` clears cookies only.

#### SEC-M06 — Client `usePaymentStatus` still attempts payment UPDATEs

**Evidence:** `composables/usePaymentStatus.ts` — blocks some completed statuses client-side only; staff RLS may still allow payment updates for staff sessions. Relies on RLS, not API.

#### SEC-M07 — `medical-certificate/approve|reject` depend on unset `event.context.user`

**Evidence:** No server middleware sets `event.context.user`. Fail-closed today (always 401) — footgun if later populated without checks.  

#### SEC-M08 — Staff calendar save accepts client-controlled amounts

**Evidence:** `server/api/appointments/save.post.ts` uses `totalAmountRappenForPayment` / `basePriceRappen` from body with light sanity caps. Authenticated staff trusted — insider / compromised staff session risk.

### Low

#### SEC-L01 — Public runtimeConfig exposes `walleeSpaceId` / `walleeUserId` (identifiers, not API secrets)  
#### SEC-L02 — Cookie `secure` gated on `NODE_ENV === 'production'` only  
#### SEC-L03 — JWT sample / token extraction markdown in repo (`GET_AUTH_TOKEN.md`, etc.) — **NEEDS VERIFICATION** if any token is live  
#### SEC-L04 — `admin/test-db-connection` gated only by `NODE_ENV === 'production'`

### Info

#### SEC-I01 — Stripe webhook uses `constructEvent` + required secret (SaaS billing)  
#### SEC-I02 — Online Wallee charge amounts derived from DB, not client body  
#### SEC-I03 — Live `student_credits`: no client UPDATE-own policies (staff only) — March 2026 credit fraud vector remains closed in live DB  
#### SEC-I04 — Most `/api/debug/*` (except trigger-recalc-queue) require `super_admin` or `CRON_SECRET`  
#### SEC-I05 — Service role key kept in private `runtimeConfig` (not `public`) in `nuxt.config.ts`

---

## Top 10 Findings

Sorted by severity → exploitability → blast radius → confidence:

| Rank | ID | Title | Sev | Exploitability | Blast Radius | Conf |
|------|----|-------|-----|----------------|--------------|------|
| 1 | SEC-C01 | `users` RLS allows self-escalation of role/tenant | CRITICAL | Easy (PostgREST) | Platform | HIGH |
| 2 | SEC-C02 | Unauth marketing-overview cross-tenant dump | CRITICAL | Easy (HTTP GET) | All tenants | HIGH |
| 3 | SEC-C03 | Unauth resend-confirmation token leak | CRITICAL | Easy if UUID known | Cross-tenant appointments | HIGH |
| 4 | SEC-H01 | Unauth staff PII APIs | HIGH | Easy if IDs known | Cross-tenant PII | HIGH |
| 5 | SEC-H02 | Unauth busy-time mutation | HIGH | Easy | Scheduling | HIGH |
| 6 | SEC-H07 | Unauth invite/onboarding email endpoints | HIGH | Easy | Email + onboarding | HIGH |
| 7 | SEC-H05 | Branding cross-tenant for staff/admin | HIGH | Easy if staff session | Branding all tenants | HIGH |
| 8 | SEC-H06 | Invoices readable by all tenant members | HIGH | Easy (client) | Intra-tenant finance | HIGH |
| 9 | ENG-H02 | reserve-slot race (non-atomic) | HIGH | Concurrent clients | Booking integrity | HIGH |
| 10 | ENG-H01 | Persistent client DB writes amplify RLS gaps | HIGH | Ongoing | Systemic | HIGH |

---

## Security Hotspots

1. **Service-role API surface without uniform auth gate** — especially `/api/tenant-admin/*`, `/api/staff/*`, `/api/tenants/*`, `/api/appointments/resend-confirmation`, `/api/send-invite-email`, onboarding reminders.  
2. **RLS on `users` privileged columns** — live privilege escalation.  
3. **Client-side Supabase mutations** — payments, users, courses, discounts.  
4. **Wallee webhook trust model** — API re-verify is good; no HMAC; credit edge cases.  
5. **Cron / debug proxies** — fail-open secrets, `x-vercel-cron`, secret-injecting debug route.  
6. **Onboarding-time weak auth** (`invite-staff-batch` 30-minute window).

---

## Engineering Hotspots

1. **Hybrid “API-first” vs direct client queries** — unfinished migration; docs claim completion.  
2. **`useEventModalForm` / availability / auth store size** — concentration of business rules.  
3. **Booking reservation locking inconsistency** — reserve-slot vs create-appointment.  
4. **Payment provider documentation drift** (`payment-gateway` vs `wallee`/`stripe`).  
5. **Session model complexity** — cookies, cache, sync-session, Capacitor.  
6. **Historical SQL migrations that can re-open closed RLS holes** if reapplied.

---

## Positive Findings

Documented as currently evidenced in code and/or live DB:

1. **Online payment amounts are server-authoritative** for shop checkout and Wallee transaction creation (client amounts ignored / recomputed).  
2. **Stripe webhooks verify signatures** with required secret.  
3. **Wallee webhook** re-fetches transaction from Wallee API and checks amount vs DB; status downgrade protection; duplicate same-state short-circuit via `webhook_logs`.  
4. **Live `student_credits`**: clients cannot UPDATE own balance (staff-only UPDATE policies).  
5. **Live appointments**: no anon SELECT-all; customer read scoped via `users.id` lookup.  
6. **Auth cookie flags**: httpOnly + sameSite lax; service role not in public runtimeConfig.  
7. **Shared server auth utilities** exist and are used correctly on many admin/accounting routes.  
8. **F-03 payment token get/save** authz present in current tree.  
9. **Invite/PKCE URL session handling** is deliberately fail-closed.  
10. **Prior RLS remediations** (anon appointments read, tenant UPDATE-all, anon payment insert, credit self-update) appear closed in live policies relative to March 2026 audit claims for those specific items.

---

## Needs Verification

| # | Item | Why |
|---|------|-----|
| NV-01 | Production `CRON_SECRET` always set | Fail-open cron handlers become public if unset |
| NV-02 | Whether Vercel edge rejects forged `x-vercel-cron` | Determines real exploitability of header-only cron auth |
| NV-03 | Production reachability of unauth endpoints | Confirm no WAF/IP allowlist in front of `/api/*` |
| NV-04 | Whether JWT samples in markdown docs are expired | Secret hygiene |
| NV-05 | Preview/`NODE_ENV` for “disabled in production” debug tools | Misconfigured preview could expose them |
| NV-06 | End-to-end exploitability of SEC-C01 from real browser session | Policy+grants say yes; confirm no undocumented DB rewrite rules outside `public` |
| NV-07 | Full `pg_policies` inventory for all sensitive tables beyond sampled set | Only key tables verified live this pass |
| NV-08 | Whether `docs/RLS_POLICIES.csv` is used operationally | File is stale vs live |
| NV-09 | F-03 remediation deployed to `app.simy.ch` | Code present on main; deploy status unknown at review time |
| NV-10 | Accountant / rental / SARI CZV surfaces beyond sampled files | Additional auth gaps possible |

---

## Recommended Remediation Order

### P0 — sofort (vor Production / sofort patchen)

1. **SEC-C01** — Freeze privileged `users` columns (RLS + REVOKE + trigger).  
2. **SEC-C02** — Auth-gate `marketing-overview` (`requireSuperAdmin`).  
3. **SEC-C03** — Auth-gate / redesign `resend-confirmation` (no token in response).  
4. **SEC-H01 / H02 / H07 / H08** — Auth-gate unauthenticated staff/email/debug mutation & PII endpoints.  
5. **SEC-H03 / H04** — Lock down tenant bootstrap & invite-staff-batch.

### P1 — vor nächstem Release

6. **SEC-H05** — Fix branding tenant/role gate.  
7. **SEC-H06** — Tighten invoices SELECT RLS.  
8. **ENG-H02** — Atomic reserve-slot UPDATE.  
9. **ENG-M01 / SEC-M02** — Fail-closed cron auth everywhere; do not trust `x-vercel-cron` alone.  
10. **ENG-M03 / SEC-M04** — Reject inactive/deleted users in `getAuthenticatedUser`.  
11. Remove or strictly gate remaining unauthenticated service-role handlers found by inventory.

### P2 — geplant

12. **ENG-H01** — Finish client→API migration for payments/users/appointments/discounts/courses; CI ban on client writes.  
13. **ENG-H03** — Collapse payment/discount god-paths; fix docs.  
14. **SEC-M01 / ENG-M05** — Harden Wallee credit idempotency + always filter `tenant_id`.  
15. **SEC-M05** — Server-side refresh token revoke on logout.  
16. Align superadmin role string in live RLS (`super_admin` vs `superadmin`).  
17. Quarantine/delete dangerous historical RLS SQL that re-opens client credit UPDATE.

### P3 — optional

18. Cookie `secure` based on actual HTTPS/`VERCEL_ENV`.  
19. Purge token samples from markdown; complete secrets register rotations.  
20. Split remaining large composables; improve error-contract consistency.  
21. Medical-certificate endpoints: migrate to `getAuthenticatedUser` explicitly.

---

## Review Notes

- **ASSUMPTION:** Production deploys with `NODE_ENV=production` and a non-empty `CRON_SECRET` (not proven in this environment).  
- **ASSUMPTION:** Attackers can reach `/api/*` on the public hostname (standard for this app’s Vercel deployment model).  
- No exploits or destructive actions were performed. Live verification was limited to read-only SQL against policy/privilege catalogs.  
- No application code was changed in this review; this document is the sole deliverable.
