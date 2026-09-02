# Simy — World-Class Senior Engineer Production Audit

**Date:** 2026-09-02  
**Scope:** Full production codebase on `origin/main` (`52932ed1`) — Nuxt 3 / Vue / TypeScript / Supabase / PostgreSQL / Vercel multi-tenant SaaS  
**Mode:** Absolute read-only (source unchanged). Live DB RLS verified via Supabase SQL against project `unyjaetebnaexaflpyoc` (“Driving Team App”).  
**Auditor role:** Principal/Staff Software Engineer — brutal honesty.

---

## Executive Summary

Simy is a large, feature-rich multi-tenant SaaS (~1 079 server API routes, heavy admin surface, Wallee payments, online booking, invoices, courses). Core auth correctly resolves `tenant_id` from `public.users` (not from client JWT claims alone), and many newer admin routes correctly use `requireAdminProfile` / `requireAccountingAccess`. Live RLS for `users`, `appointments`, `payments` (staff paths), and `invoices` is largely tenant-scoped — better than stale SQL dumps in the repo suggested.

**That is not enough.**

The system still has **unauthenticated service-role endpoints** that leak or mutate production data, a **parallel login API that bypasses login hardening**, **voucher IDOR**, **unauthenticated payment-token APIs**, a **live RLS hole on `reminder_logs`**, and **customers can UPDATE their own `payments` rows** (including `payment_status`) via the Data API. Payment webhooks can reject legitimate hybrid (credit + Wallee) completions because amount checks ignore `credit_used_rappen`. Architecture is endpoint-ad-hoc (~1k routes, god composables up to ~1.8k LOC, ~3.7k `any` in server), with thin E2E (3 files) relative to risk.

**This is not a codebase I would green-light as production-ready for a paying multi-tenant SaaS without fixing the release blockers below.**

---

## Production Decision

# 🔴 DO NOT DEPLOY

Ship nothing further (and treat the open unauthenticated endpoints as an **incident / hotfix**) until the release blockers are closed.

---

## System Understanding (how it actually works)

### Stack & shape

| Layer | Reality |
|-------|---------|
| App | Nuxt 3 monolith (`server/api/**`, `pages/**`, `composables/**`) + `apps/website`, `apps/simy` |
| Auth | Dual: httpOnly cookies (`sb-auth-token` / `sb-refresh-token`) + client Supabase session (localStorage) |
| API bridge | `server/middleware/01.auth-cookie-to-header.ts` copies cookie → `Authorization: Bearer` |
| Identity | `getAuthenticatedUser` verifies JWT then loads `users` for `tenant_id` / role |
| DB access | Mix of user JWT (RLS) and ubiquitous `getSupabaseAdmin()` (service role, bypasses RLS) |
| Tenant enforcement | **Per-endpoint**, not middleware. `server/middleware/validate-tenant.ts` **skips all `/api/*`** |
| Payments | Tenant checkout = **Wallee**; Stripe = SaaS subscription billing |
| Deploy | Vercel from `main`; CI: Test/lint + E2E login |

### Auth data flow

```
Login UI → POST /api/auth/login
  → setAuthCookies (httpOnly)
  → JSON also returns access_token + refresh_token
  → client setSession → localStorage

/api/* → cookie→Bearer middleware → getAuthenticatedUser
  → Auth API verify → public.users (tenant_id, role)
```

Route middleware (`middleware/auth.ts`, `admin.ts`) is **client UX only** (`process.server` early-return). **API authorization is entirely handler-local.**

### Multi-tenant model

- Tenants in `tenants`; users carry `tenant_id`.
- Good pattern: force `authUser.tenant_id` / `profile.tenant_id` on queries.
- Bad pattern: accept `tenantId` / `userId` / `studentIds` from body and query with service role without membership checks.

---

## Findings

### [CRITICAL] — Unauthenticated admin APIs using service role

**Kategorie:** Architecture / Bug  
**Datei:** `server/api/admin/cron-status.get.ts`, `server/api/admin/get-billing-addresses.post.ts`, `server/api/admin/get-student-instructors.post.ts`, `server/api/admin/remove-user-device.post.ts`, `server/api/admin/calculator-stats.get.ts`, `server/api/admin/pendencies/update-overdue.post.ts`, `server/api/admin/pendencies/handle-recurrence.post.ts`  
**Position:** Entire handlers (no `getAuthenticatedUser` / `requireAdmin*` / cron secret)

**Problem:**  
These handlers call `getSupabaseAdmin()` / service-role client with **zero authentication**. Anyone who can reach the deployment can read payment cron state, billing addresses by `studentIds`, instructor mappings, mutate/delete devices, mutate pendencies, and aggregate calculator events.

**Impact:**  
Cross-tenant PII disclosure; payment operations intel; unauthorized deletes; task state corruption. Classic IDOR + privilege escalation via missing auth.

**Evidence:**

```6:37:server/api/admin/cron-status.get.ts
export default defineEventHandler(async (event) => {
  try {
    // ✅ Use Admin client to bypass RLS
    const supabase = getSupabaseAdmin()
    // ...
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, ...')
```

```7:28:server/api/admin/get-billing-addresses.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { studentIds } = body
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
```

```5:32:server/api/admin/remove-user-device.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // ... no auth ...
  const { data, error } = await supabase
    .from('user_devices')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', userId)
```

**Empfehlung:**  
Auth-gate every `/api/admin/*` with `requireAdminProfile` (or cron secret for true cron). Prefer a single server middleware that fails closed for `/api/admin/**`. Delete or disable endpoints that exist only for debugging.

**Release Blocker:** YES

---

### [CRITICAL] — `/api/auth/manage` bypasses hardened login

**Kategorie:** Architecture / Bug  
**Datei:** `server/api/auth/manage.post.ts`  
**Position:** Lines 21–78 (`signin-password`, `signup`, `set-session`)

**Problem:**  
Public actions authenticate via module-level **service-role** client and return full `session` tokens. No rate limit, captcha, passkey/MFA gates, or IP block path used by `/api/auth/login`. Protected branch calls `getServerSession(event)` which is **not imported/defined** in this file.

**Impact:**  
Credential stuffing and account takeover path that skips login controls; tokens returned to client; super_admin passkey enforcement on primary login is irrelevant if this endpoint is used.

**Evidence:**

```21:36:server/api/auth/manage.post.ts
    if (action === 'signin-password') {
      return await signInWithPassword(body)
    }
    // ...
    if (action === 'set-session') {
      return await setSession(body)
    }
```

```58:78:server/api/auth/manage.post.ts
async function signInWithPassword(body: AuthRequest) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return {
    success: true,
    data: { user: data.user, session: data.session }
  }
}
```

**Empfehlung:**  
Remove public sign-in/sign-up from this endpoint. Route all auth through `/api/auth/login` + cookie setters. Fix or delete broken `update-user` path.

**Release Blocker:** YES

---

### [CRITICAL] — Unauthenticated payment-token read/write (service role)

**Kategorie:** Architecture / Bug  
**Datei:** `server/api/booking/get-user-payment-token.post.ts`, `server/api/wallee/save-payment-token.post.ts`  
**Position:** Entry handlers; trust `userId` + `tenantId` from body

**Problem:**  
No session. Service role queries/writes `customer_payment_methods` based on client-supplied IDs. Save path pulls Wallee transaction and can attach tokens to arbitrary users/tenants if transaction IDs are known.

**Impact:**  
Enumeration of payment method IDs; binding stolen/known Wallee tokens to other accounts; fraud / unauthorized charges depending on downstream charge flows.

**Evidence:**

```9:40:server/api/booking/get-user-payment-token.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userId, tenantId } = body
  // ...
  const supabase = getSupabaseAdmin()
  const { data: defaultToken, error: defaultError } = await supabase
    .from('customer_payment_methods')
    .select('id, is_default, is_active, user_id, tenant_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
```

```8:23:server/api/wallee/save-payment-token.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { transactionId, userId, tenantId } = body
  const supabase = getSupabaseAdmin()
```

**Empfehlung:**  
Require authenticated user (or signed booking session). Bind token save to payment row ownership + Wallee `customerId` match. Never accept bare `userId`/`tenantId` from the client for service-role writes.

**Release Blocker:** YES

---

### [CRITICAL] — Voucher manage IDOR / missing tenant checks

**Kategorie:** Bug  
**Datei:** `server/api/vouchers/manage.post.ts`  
**Position:** `load` (28–48), `find-by-code` (51–74), `create` (77–111), `redeem` (114–150)

**Problem:**  
Auth required, but:
- `load` accepts arbitrary `body.userId` (and falls back to `user.id` which is **auth UUID**, not `users.id`).
- `find-by-code` is global, no tenant filter.
- `create` inserts `body.voucherData` as-is (client can set foreign `tenant_id`).
- `redeem` marks any `voucherId` used with no ownership/tenant check.

**Impact:**  
Cross-user voucher disclosure; cross-tenant voucher creation/redemption; financial abuse.

**Evidence:**

```28:37:server/api/vouchers/manage.post.ts
    if (action === 'load') {
      const userId = body.userId || user.id
      const { data: vouchers, error } = await supabaseAdmin
        .from('discounts')
        .select('*')
        .eq('user_id', userId)
```

```114:137:server/api/vouchers/manage.post.ts
    if (action === 'redeem') {
      // ...
      const { data: redeemed, error: updateError } = await supabaseAdmin
        .from('discounts')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', body.voucherId)
```

**Empfehlung:**  
Force `db_user_id` + `tenant_id` from session. Redeem/create under transactional ownership checks. Never insert raw client voucher payloads.

**Release Blocker:** YES

---

### [CRITICAL] — Customers can UPDATE own payment rows via RLS (incl. status)

**Kategorie:** Database / Bug  
**Datei:** Live RLS on `payments` (`customer_update_own`); client `composables/usePaymentStatus.ts`  
**Position:** Prod policy `customer_update_own`; composable lines 73–95

**Problem:**  
Live policy allows authenticated customers to **UPDATE** any column on their payment rows (`user_id` match). Client composable blocks some “completed” statuses in JS only — trivially bypassed with direct Supabase client / PostgREST. No column whitelist; `payment_status` can be set to `completed` / `cancelled` / etc.

**Impact:**  
Mark unpaid lessons as paid without capture; cancel legitimate payment state; financial and accounting integrity failure.

**Evidence (live DB):**

```text
policy customer_update_own ON payments FOR UPDATE
USING (user_id = (SELECT users.id FROM users WHERE auth_user_id = auth.uid() LIMIT 1))
WITH CHECK (same)
-- no restriction on payment_status column
```

```84:93:composables/usePaymentStatus.ts
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: update.status,
          wallee_transaction_id: update.wallee_transaction_id,
          ...
        })
        .eq('id', update.payment_id)
```

Also: `customer_insert_own` WITH CHECK is `user_id = auth.uid()` (auth UUID vs `users.id`) — inconsistent/broken insert policy; updates use the correct join.

**Empfehlung:**  
Drop client UPDATE on `payments` for customers, or restrict to non-status metadata via trigger/RPC. Only service role / verified webhook / staff APIs may change `payment_status`.

**Release Blocker:** YES

---

### [CRITICAL] — Live RLS: `reminder_logs` readable (and insertable) by any authenticated user

**Kategorie:** Database  
**Datei:** Live policies on `reminder_logs` (also reflected in historic dump / incomplete migrations)  
**Position:** Policies `Enable select for authenticated users`, `Enable insert for authenticated users`

**Problem:**  
Verified in production: SELECT uses `auth.role() = 'authenticated'` with **no tenant filter**. Table contains `recipient`, `subject`, `body`, `user_id`, `tenant_id` — cross-tenant PII.

**Impact:**  
Any logged-in user of any tenant can read reminder content (emails/SMS recipients and bodies) for all tenants via Supabase Data API.

**Evidence (live):**

```text
reminder_logs / Enable select for authenticated users / SELECT / USING (auth.role() = 'authenticated')
reminder_logs / Enable insert for authenticated users / INSERT / WITH CHECK (auth.role() = 'authenticated')
Columns include: recipient, subject, body, tenant_id, user_id, payment_id, appointment_id
```

**Empfehlung:**  
Drop open policies; replace with tenant-scoped staff SELECT and service-role-only writes. Revoke grants from `authenticated` if server-only.

**Release Blocker:** YES

---

### [CRITICAL] — Wallee webhook amount check ignores wallet credit

**Kategorie:** Bug / Reliability  
**Datei:** `server/api/wallee/webhook.post.ts`  
**Position:** Lines 540–576 (amount integrity); `credit_used_rappen` selected at ~243 but unused in comparison

**Problem:**  
Completion is rejected when `capturedChf < total_amount_rappen/100`. Hybrid checkouts charge only the remaining due after credit (`remainingDueRappen` elsewhere). Captured amount is correctly lower; webhook rejects and returns `success: false` **without 503**, so Wallee may stop retrying while money is captured and DB payment stays incomplete.

**Impact:**  
Paid customers stuck unpaid; support fire drills; inconsistent ledger vs Wallee; potential double-charge if ops “fixes” manually wrong.

**Evidence:**

```540:576:server/api/wallee/webhook.post.ts
      if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
        const capturedChf = Number(...)
        if (Number.isFinite(capturedChf)) {
          const underpaid = payments.filter((p: any) => {
            const expectedChf = Number(p.total_amount_rappen || 0) / 100
            return expectedChf > 0 && capturedChf + 0.01 < expectedChf
          })
          // returns success: false without retry hint
```

**Empfehlung:**  
Expected amount = `(total_amount_rappen - COALESCE(credit_used_rappen,0)) / 100`. On verification failure return **503** so Wallee retries. Add regression test with credit + capture.

**Release Blocker:** YES

---

### [HIGH] — `getAuthenticatedUser` ignores `is_active` / `deleted_at`

**Kategorie:** Bug  
**Datei:** `server/utils/auth.ts`  
**Position:** `AUTH_USER_COLS` line 7; return blocks ~216–247 (and refresh path ~162–190)

**Problem:**  
Columns are selected but never enforced. Deactivated/soft-deleted users retain API access until Auth ban/token expiry.

**Impact:**  
Fired staff / closed student accounts keep operating; tenant offboarding incomplete.

**Evidence:** Columns listed in `AUTH_USER_COLS`; no `if (!dbUser.is_active || dbUser.deleted_at) return null` before return.

**Empfehlung:**  
Fail closed in `getAuthenticatedUser` and revoke refresh tokens on deactivate.

**Release Blocker:** YES (for staff/admin offboarding correctness)

---

### [HIGH] — Dual session storage: httpOnly cookies + localStorage tokens

**Kategorie:** Architecture  
**Datei:** `server/api/auth/login.post.ts` (~800+), `utils/supabase.ts` (`persistSession: true`)  
**Position:** Login JSON session return; client hydration

**Problem:**  
httpOnly cookies are undermined by returning refresh tokens in JSON and persisting them in localStorage. XSS ⇒ full account takeover.

**Impact:**  
Any XSS (or malicious extension) steals long-lived sessions despite “HTTP-only session” marketing.

**Empfehlung:**  
Prefer cookie-only for web; never return refresh tokens to JS where avoidable; Capacitor can use a dedicated secure store path.

**Release Blocker:** NO (hardening; treat as HIGH)

---

### [HIGH] — Logout does not revoke Supabase refresh tokens

**Kategorie:** Reliability  
**Datei:** `server/api/auth/logout.post.ts`  
**Position:** Cookie clear only (verified by auth sub-audit)

**Problem:**  
Stolen refresh tokens (localStorage, `auth_refresh_locks`, logs) remain valid after logout.

**Impact:**  
Logout is cosmetic for attackers holding refresh tokens.

**Empfehlung:**  
Server-side `signOut` / revoke refresh; clear `auth_refresh_locks`; rotate on logout.

**Release Blocker:** NO

---

### [HIGH] — Refresh tokens stored in `auth_refresh_locks`

**Kategorie:** Architecture / Database  
**Datei:** `server/utils/token-refresh.ts` (~107–120)

**Problem:**  
Live session payloads including refresh tokens written to DB for dedup. Any service-role reader or SQL leak mints sessions.

**Impact:**  
DB backup / insider / SQL injection becomes session minting.

**Empfehlung:**  
Store opaque job status only; encrypt short-lived blob or use Redis with TTL; never persist raw refresh tokens.

**Release Blocker:** NO (HIGH priority hardening)

---

### [HIGH] — MFA incomplete / cryptographically weak

**Kategorie:** Bug / Reliability  
**Datei:** `server/api/auth/send-mfa-code.post.ts`, `verify-mfa-login.post.ts`, `login.post.ts`

**Problem:**  
- Successful login path does not drive progressive MFA (`requiresMFA` only mentioned on failed-credential branch).  
- OTP via `Math.random()`.  
- Plaintext `code` stored alongside hash.  
- Unsalted SHA-256.  
- SMS/email send is TODO; codes logged.  
- Non-timing-safe compare.

**Impact:**  
MFA cannot be trusted as a control; if enabled partially, gives false assurance.

**Evidence:**

```135:145:server/api/auth/send-mfa-code.post.ts
  return Math.floor(100000 + Math.random() * 900000).toString()
// ...
        code: code,
        code_hash: await hashCode(code),
```

```148:162:server/api/auth/send-mfa-code.post.ts
    // Implement SMS sending logic here
    logger.debug('📱 SMS code to', phoneNumber.slice(-4), ':', code)
```

**Empfehlung:**  
Disable MFA product claims until fixed; use `crypto.randomInt`, salted hashes only, timingSafeEqual, real delivery, wire step-up on successful password.

**Release Blocker:** NO if MFA not marketed as enforced; YES if compliance assumes MFA

---

### [HIGH] — `/api/database/query` INSERT does not force `tenant_id`

**Kategorie:** Architecture  
**Datei:** `server/api/database/query.post.ts`  
**Position:** Lines 297–300

**Problem:**  
Tenant mismatch only rejected **if** client sends `tenant_id`. Omitting it allows inserts without tenant (or wrong defaults). Writes use service role. `calendar_tokens.token` is whitelisted.

**Impact:**  
Orphan / cross-tenant rows; ICS token exposure if SELECT path + weak RLS.

**Evidence:**

```297:300:server/api/database/query.post.ts
      if (allowedColumns.includes('tenant_id') && safeData.tenant_id && safeData.tenant_id !== authUser.tenant_id) {
        throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch: ...' })
      }
```

**Empfehlung:**  
Always set `safeData.tenant_id = authUser.tenant_id` when column exists. Strip secrets from whitelist. Prefer retiring this generic proxy.

**Release Blocker:** YES for any client still using insert via this proxy in production

---

### [HIGH] — Documents manage: client-controlled `tenant_id` on insert

**Kategorie:** Bug  
**Datei:** `server/api/documents/manage.post.ts`  
**Position:** Line 131

**Problem:**  
`tenant_id: document_data.tenant_id || callerUser.tenant_id` — authenticated staff/owner can write documents under another tenant_id.

**Impact:**  
Cross-tenant document pollution / potential access confusion depending on list filters.

**Evidence:**

```127:132:server/api/documents/manage.post.ts
          .insert({
            user_id,
            tenant_id: document_data.tenant_id || callerUser.tenant_id,
```

**Empfehlung:**  
Always `callerUser.tenant_id`. Scope verify/delete by tenant.

**Release Blocker:** NO (HIGH)

---

### [HIGH] — Appointment info last-* without tenant membership check

**Kategorie:** Bug  
**Datei:** `server/api/appointments/get-appointment-info.post.ts`  
**Position:** `last-duration` / `last-category` (~27–80)

**Problem:**  
Any authenticated user can query last duration/category for arbitrary `studentId` via service role without verifying same-tenant membership.

**Impact:**  
Cross-tenant metadata leak (duration/type of lessons).

**Empfehlung:**  
Resolve caller tenant; assert student.tenant_id match (or self-only for customers).

**Release Blocker:** NO (HIGH privacy)

---

### [HIGH] — Affiliate debug accepts foreign `tenant_id`

**Kategorie:** Bug  
**Datei:** `server/api/affiliate/debug-user.get.ts`  
**Position:** Lines 30–32

**Problem:**  
Staff can pass `query.tenant_id` ≠ own tenant and dump eligibility/debug PII.

**Impact:**  
Cross-tenant debug disclosure.

**Empfehlung:**  
Force `requester.tenant_id` unless `super_admin`. Remove from production or gate behind env flag.

**Release Blocker:** NO

---

### [HIGH] — Wallet credit mutations non-atomic / not tenant-scoped in `process.post`

**Kategorie:** Reliability / Bug  
**Datei:** `server/api/payments/process.post.ts`  
**Position:** ~123–127, ~307–313

**Problem:**  
Credit balance read/update by `user_id` only; no `tenant_id`; no `pending_withdrawal_rappen`; bypasses atomic RPC used elsewhere (`wallet-atomic`).

**Impact:**  
Race → overdraft; spend frozen withdrawal balance; wrong row if duplicates.

**Empfehlung:**  
Use existing atomic deduct RPC with tenant scope everywhere.

**Release Blocker:** NO (HIGH for money paths — strongly recommended before next payment feature ship)

---

### [HIGH] — Webhook credit-product / failed-payment refund race

**Kategorie:** Reliability  
**Datei:** `server/api/wallee/webhook.post.ts` (`handleCreditRefund`, `processVouchersAndCredits`)

**Problem:**  
Check-then-act credit grants/refunds without idempotent constraints; parallel deliveries can double-credit. Duplicate short-circuit depends on `webhook_logs` success flag written late.

**Impact:**  
Wallet inflation; real money loss.

**Empfehlung:**  
Unique constraints + atomic SQL upserts; idempotency keys per side effect.

**Release Blocker:** NO (HIGH)

---

### [HIGH] — Staff can set payment `completed` without provider proof

**Kategorie:** Bug  
**Datei:** `server/api/payments/status.post.ts` (~229–246)

**Problem:**  
Non-privileged users blocked from forging completed; admin/staff can set arbitrary statuses including paid.

**Impact:**  
Insider fraud / compromised staff session marks unpaid as paid.

**Empfehlung:**  
Require Wallee/sync proof or explicit “manual mark paid” audit trail with dual control for completed.

**Release Blocker:** NO

---

### [HIGH] — Captcha optional; login IP from leftmost X-Forwarded-For

**Kategorie:** Bug  
**Datei:** `server/api/auth/login.post.ts` (~32–35, ~116–152)

**Problem:**  
Captcha only if token provided. IP for rate/block uses client-controllable leftmost XFF (unlike hardened `ip-utils`).

**Impact:**  
Rate-limit evasion; credential stuffing resilience degraded.

**Empfehlung:**  
Align with trusted proxy IP helper; require captcha after N failures (or always in prod).

**Release Blocker:** NO

---

### [MEDIUM] — God objects / unmaintainable surface area

**Kategorie:** Architecture  
**Datei:** e.g. `composables/useEventModalForm.ts` (~1876 LOC), `useAvailabilitySystem.ts` (~1312), `pages/tenant-register.vue` (~4200), `server/api/wallee/webhook.post.ts` (~2900+)

**Problem:**  
Extreme file sizes; business logic mixed across composables, pages, and mega webhooks. ~1 079 API routes with inconsistent auth helpers.

**Impact:**  
High change-failure rate; audits forever incomplete; regressions inevitable.

**Empfehlung:**  
Domain modules (booking, payments, auth); kill generic DB proxy; enforce lint rule for max file size / requireAdmin on `/api/admin`.

**Release Blocker:** NO

---

### [MEDIUM] — TypeScript safety eroded

**Kategorie:** Architecture  
**Datei:** Server-wide (`~3760` `any` hits in `server/`; `~1626` `as any` repo-wide)

**Problem:**  
Widespread `any` and assertions hide tenant/null bugs at compile time.

**Impact:**  
Runtime-only discovery of isolation and payment bugs.

**Empfehlung:**  
Strict mode on new code; ban `any` in `server/api/**` via ESLint; typed DTOs + zod at boundaries.

**Release Blocker:** NO

---

### [MEDIUM] — Passkey path solid; password MFA / manage auth not

**Kategorie:** Architecture  
**Datei:** Passkey WebAuthn verify (positive); contrast `auth/manage`, MFA stubs

**Problem:**  
Uneven security maturity: WebAuthn for super_admin is comparatively strong; legacy password paths are weak.

**Impact:**  
False sense of security from “we have MFA/passkeys”.

**Empfehlung:**  
Single auth gateway; retire parallel surfaces.

**Release Blocker:** NO

---

### [MEDIUM] — `create-transaction` charges full DB total (ignores credit)

**Kategorie:** Bug  
**Datei:** `server/api/wallee/create-transaction.post.ts` (~51–78)

**Problem:**  
Uses `total_amount_rappen` without subtracting credit; appointment checkout helper does it correctly.

**Impact:**  
Double-charge risk if this endpoint is used after credit applied.

**Empfehlung:**  
Charge remaining due only; deprecate duplicate entry points.

**Release Blocker:** NO (unless this endpoint is in live booking path — **NOT VERIFIED** for all callers)

---

### [MEDIUM] — Legacy webhook `wallee-payment-success` appointment insert not idempotent

**Kategorie:** Reliability  
**Datei:** `server/api/webhooks/wallee-payment-success.post.ts`

**Problem:**  
Retries can create duplicate appointments; payment not linked in handler.

**Impact:**  
Double bookings.

**Empfehlung:**  
Idempotent upsert keyed by payment/transaction; delete legacy if unused.

**Release Blocker:** NO

---

### [MEDIUM] — Global rate-limit middleware is a no-op

**Kategorie:** Reliability  
**Datei:** `server/middleware/rate-limiting.ts`

**Problem:**  
Default export empty; in-memory maps ineffective on multi-instance Vercel. Login uses DB limiter (better) but many endpoints rely on nothing.

**Impact:**  
Abuse of open/weak endpoints.

**Empfehlung:**  
Edge/KV rate limits on sensitive routes.

**Release Blocker:** NO

---

### [MEDIUM] — Client direct Supabase writes depend on RLS perfection

**Kategorie:** Architecture  
**Datei:** `composables/usePaymentStatus.ts`, `useAdminAppointments.ts`, others

**Problem:**  
Client updates bypass server business rules; safety = RLS only. Already broken for payments customer UPDATE.

**Impact:**  
Any permissive policy = direct data plane exploit.

**Empfehlung:**  
Server-only writes for money, appointments status, credits; client read via APIs.

**Release Blocker:** NO (paired with payments RLS fix = YES)

---

### [LOW] — Wallee webhooks lack HMAC (acknowledged)

**Kategorie:** Architecture  
**Datei:** `server/api/wallee/webhook.post.ts` (~80–82)

**Problem:**  
No signature; mitigated by live API verification. Still allows noise/DoS.

**Empfehlung:**  
IP allowlist / shared secret header if Wallee supports; always verify via API (already done).

**Release Blocker:** NO

---

### [LOW] — Mock `utils/walleeService.ts` stub in repo

**Kategorie:** Reliability  
**Datei:** `utils/walleeService.ts`

**Problem:**  
Fake txn IDs if imported by mistake.

**Empfehlung:**  
Delete or isolate under `mocks/`.

**Release Blocker:** NO

---

### [LOW] — Repo contains dangerous historical SQL scripts

**Kategorie:** Database  
**Datei:** e.g. `clean_appointments_rls.sql`, open policies in dumps

**Problem:**  
Re-running old scripts could recreate open SELECT policies. Live `users` leak appears **fixed** (good); scripts remain a footgun.

**Impact:**  
Accidental production lockdown/openness if someone “applies” old SQL.

**Empfehlung:**  
Archive/delete obsolete SQL; single source of truth in ordered migrations; CI check against live policies.

**Release Blocker:** NO

---

## Positive observations (credit where due)

- `getAuthenticatedUser` resolves tenant from DB — correct multi-tenant foundation.
- Many modern admin/accounting routes use `requireAdminProfile` / `requireAccountingAccess` + `.eq('tenant_id', profile.tenant_id)`.
- Live RLS for `users`, staff `appointments`/`payments`, `invoices` looks tenant-aware (better than `db_clean.sql` implied).
- Wallee webhook verifies transaction via API; Stripe SaaS webhook verifies signatures.
- Recent CHF-0 completion guard (`zero-payment-completion`) + guest pricing fixes show active payment hygiene work.
- Passkey/WebAuthn path for super_admin is comparatively solid.
- Unit test volume for utils is non-trivial (~87 vitest files); E2E isolation test exists (`e2e/isolation.spec.ts`).

---

## Testing Gaps

| Area | Current | Missing |
|------|---------|---------|
| E2E | `login.spec.ts`, `isolation.spec.ts` (~137 LOC total) | Auth bypass endpoints, voucher IDOR, payment-token unauth, webhook credit+amount, RLS regression for `reminder_logs` / payments customer UPDATE |
| Unit | Strong on accounting/validators/wallet helpers | Webhook amount-vs-credit; `getAuthenticatedUser` inactive users; vouchers/manage ownership |
| Integration | Sparse | Service-role admin routes must 401 without session |
| Security | Ad-hoc docs in repo | Automated scan for `/api/admin` without auth helper import; CI policy dump vs allowlist |
| Load/race | Missing | Concurrent webhook deliveries; concurrent credit deduct |

**Regression tests that should exist before calling any of the CRITICAL fixes “done”:**

1. Unauthenticated calls to listed admin + payment-token endpoints → 401.  
2. Voucher load/redeem with foreign IDs → 403.  
3. Customer PostgREST UPDATE `payments.payment_status = completed` → denied.  
4. Authenticated tenant A SELECT `reminder_logs` for tenant B → empty/denied.  
5. Webhook COMPLETED with `credit_used_rappen` + partial capture → payment completed.  
6. Deactivated user JWT → 401 on admin API.

---

## Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Architecture | **4/10** | Tenant resolution OK; enforcement ad-hoc across 1k routes; dual auth; god objects |
| Code Quality | **4/10** | Inconsistent patterns; massive files; pervasive `any` |
| Performance | **5/10** | Some parallel queries; cron-status loads all payment stats into memory; N+1 risks in admin lists — not fully verified |
| Reliability | **3/10** | Webhook amount bug; non-idempotent credits; racey wallet updates |
| Testing | **3/10** | Utils tests OK; critical security/money paths under-tested; thin E2E |
| Maintainability | **3/10** | Endpoint sprawl; dual clients; historic SQL landmines |

### ENGINEERING SCORE: **3.5/10**

---

## RELEASE BLOCKERS

1. Auth-gate or remove unauthenticated admin service-role endpoints (`cron-status`, `get-billing-addresses`, `get-student-instructors`, `remove-user-device`, `calculator-stats`, unauthenticated pendencies mutators).  
2. Lock down / remove public `/api/auth/manage` sign-in/sign-up/set-session.  
3. Auth + ownership on `get-user-payment-token` and `save-payment-token`.  
4. Fix voucher `manage` IDOR / tenant forcing.  
5. Fix live RLS: revoke customer unrestricted UPDATE on `payments`; close `reminder_logs` open policies.  
6. Fix Wallee webhook expected amount to account for `credit_used_rappen` (and fail open with 503 on verify errors).  
7. Enforce `is_active` / `deleted_at` in `getAuthenticatedUser`.  
8. Force `tenant_id` on `/api/database/query` inserts (or disable insert).

---

## Recommended Fix Order

1. **Incident: unauthenticated endpoints** — auth or delete today.  
2. **Auth manage bypass** — remove public password sign-in.  
3. **Payments RLS customer UPDATE** — money integrity.  
4. **reminder_logs RLS** — PII blast radius.  
5. **Payment token endpoints** — fraud.  
6. **Vouchers manage** — financial IDOR.  
7. **Webhook credit amount** — stuck paid bookings.  
8. **Inactive users + query.insert tenant force**.  
9. **Wallet atomicity / webhook idempotency**.  
10. **Structural: admin middleware fail-closed; retire DB proxy; shrink god files**.

---

## NOT VERIFIED — EVIDENCE MISSING

- Whether every production cron caller already uses secrets for pendencies (endpoints themselves are open either way).  
- Full call graph of `wallee/create-transaction` vs appointment checkout helper in all production UIs.  
- Whether MFA is enabled for any paying tenant today (code is incomplete regardless).  
- Complete live policy set for all ~100+ tables (sampled critical tables only).  
- Whether `NUXT_INTERNAL_API_SECRET` is set in all environments (`notify-new-tenant` fails closed if missing — good).  
- Runtime XSS presence (localStorage risk is architectural regardless).

---

## Final Verdict

**Would I deploy this myself to a SaaS with paying customers?**

# NO

**Begründung:**  
A multi-tenant payments SaaS cannot ship (or continue expanding) with **unauthenticated service-role admin/payment endpoints**, **customers able to UPDATE payment status via RLS**, **cross-tenant `reminder_logs` reads**, and a **webhook that rejects valid credit+card captures**. Those are not “tech debt” — they are **active security and money-integrity defects**. The core tenant resolution idea is sound and parts of the newer API layer are competent, but the attack surface and inconsistency mean I would freeze feature work, hotfix blockers, then harden systematically.

---

## Audit metadata

| Item | Value |
|------|--------|
| Git ref audited | `origin/main` @ `52932ed1` |
| Live DB checked | Supabase `unyjaetebnaexaflpyoc` |
| Source changes | None (read-only) |
| Report file | `/audits/2026-09-02-senior-engineer-audit.md` |
