# Simy — World-Class Ethical Hacker Security Audit

**Date:** 2026-09-02  
**Scope:** Attacker-minded application security review of Simy (Nuxt 3 / Vue / TypeScript / Supabase Auth + RLS / PostgreSQL / Vercel) on `origin/main`  
**Mode:** Absolute read-only. No source, DB, config, or dependency changes.  
**Live verification:** Supabase project `unyjaetebnaexaflpyoc` (production “Driving Team App”) — selected RLS policies and SECURITY DEFINER EXECUTE grants queried.  
**Companion:** Also see `/audits/2026-09-02-senior-engineer-audit.md` for engineering context.

---

## Executive Summary

Simy is a **multi-tenant payments / booking SaaS**. From an attacker’s perspective the highest-value targets are: **cross-tenant data**, **payment status / wallet balances**, **auth session minting**, and **admin service-role APIs**.

The platform has a competent **intended** security model (`getAuthenticatedUser` resolves `tenant_id` from DB; many newer admin routes use `requireAdminProfile`; dangerous SECURITY DEFINER RPCs are **not** executable by `anon`/`authenticated` in prod). That model is **not enforced uniformly**.

**Verified, exploitable classes of bugs include:**

1. **Unauthenticated service-role endpoints** (admin + booking payment tokens + pendencies).  
2. **Auth bypass surface** (`/api/auth/manage` password sign-in without login controls).  
3. **Cross-tenant IDOR** (invoice items by id; vouchers; appointment metadata; admin `get-user-by-id`; staff reminders trusting body `tenantId`).  
4. **Live RLS failures** — any authenticated user can **SELECT all `reminder_logs`** (PII); customers can **UPDATE own `payments`** including `payment_status`.  
5. **Intra-tenant BOLA** — any logged-in customer can list/delete invoices for the whole tenant.  
6. **Business-logic / payment integrity** — webhook amount check ignores wallet credit; client-trusted payment status via Data API.  
7. **Open redirect**, **SSRF** (admin Unsplash download URL), **email abuse** (arbitrary recipient HTML email).

Because **cross-tenant data access is demonstrated**, the decision is automatic:

# 🔴 DO NOT DEPLOY

---

## Production Decision

**🔴 DO NOT DEPLOY**

Cross-tenant access paths are verified in code and (for RLS) against the live database. Treat open unauthenticated endpoints and payment-status RLS as an **active incident**, not backlog polish.

---

## Threat Model (attacker assumptions)

| Trust boundary | Attacker capability |
|----------------|---------------------|
| Browser / Vue | Fully controlled; ignore client checks |
| Request body / query / headers / cookies | Fully forged |
| `tenant_id`, `userId`, `studentId`, `invoice_id` | Chosen by attacker |
| Supabase anon key + user JWT | Available after any account registration |
| Service role | Only via **server** endpoints that call `getSupabaseAdmin()` without auth |
| Network | Can call `app.simy.ch/api/*` directly |

---

## Critical Findings

### 🔴 CRITICAL — Unauthenticated admin APIs with service role

**Target:**  
`GET /api/admin/cron-status`  
`POST /api/admin/get-billing-addresses`  
`POST /api/admin/get-student-instructors`  
`POST /api/admin/remove-user-device`  
`GET /api/admin/calculator-stats`  
`POST /api/admin/pendencies/update-overdue`  
`POST /api/admin/pendencies/handle-recurrence`

**Vulnerability:**  
No authentication. Handlers instantiate Supabase with **service role** and read/mutate production tables (payments, billing addresses, appointments, devices, pendencies).

**Evidence:**

```6:37:server/api/admin/cron-status.get.ts
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, appointment_id, scheduled_payment_date, ...')
```

```7:28:server/api/admin/get-billing-addresses.post.ts
  const { studentIds } = body
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
```

```5:32:server/api/admin/remove-user-device.post.ts
  // no auth
  .from('user_devices').delete().eq('id', deviceId).eq('user_id', userId)
```

**Attacker Scenario:**  
1. Unauthenticated `GET /api/admin/cron-status` → inventory authorized/pending payments across tenants.  
2. `POST /api/admin/get-billing-addresses` with guessed/leaked UUIDs → company billing PII.  
3. `POST /api/admin/remove-user-device` → disrupt MFA/device trust for victims.

**Impact:**  
Cross-tenant PII; payment ops intel; unauthorized deletes; privilege escalation equivalent to DB admin for those tables.

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Fail-closed middleware for `/api/admin/**` requiring `requireAdminProfile` or cron secret. Delete debug endpoints.

---

### 🔴 CRITICAL — Auth bypass via `/api/auth/manage`

**Target:** `POST /api/auth/manage` — actions `signin-password`, `signup`, `set-session`

**Vulnerability:**  
Parallel auth surface using module-level **service role** client. Returns full session tokens. Skips rate limit, captcha, passkey/MFA, IP block path of `/api/auth/login`.

**Evidence:**

```21:78:server/api/auth/manage.post.ts
    if (action === 'signin-password') {
      return await signInWithPassword(body)
    }
    // ...
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { success: true, data: { user: data.user, session: data.session } }
```

**Attacker Scenario:**  
Credential stuffing against `/api/auth/manage` while primary login appears “hardened”. Super_admin passkey gate on `/api/auth/login` is irrelevant.

**Impact:**  
Account takeover at scale; token leakage in responses; authentication control failure (OWASP A07).

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Remove public sign-in/sign-up; single auth gateway only.

---

### 🔴 CRITICAL — Unauthenticated payment-method token APIs

**Target:**  
`POST /api/booking/get-user-payment-token`  
`POST /api/wallee/save-payment-token`

**Vulnerability:**  
No session. Client supplies `userId` + `tenantId`. Service role reads/writes `customer_payment_methods`. Save path attaches Wallee tokens from arbitrary `transactionId`.

**Evidence:**

```9:40:server/api/booking/get-user-payment-token.post.ts
  const { userId, tenantId } = body
  const supabase = getSupabaseAdmin()
  .from('customer_payment_methods')
  .eq('user_id', userId).eq('tenant_id', tenantId)
```

```8:23:server/api/wallee/save-payment-token.post.ts
  const { transactionId, userId, tenantId } = body
  const supabase = getSupabaseAdmin()
```

**Attacker Scenario:**  
Enumerate payment method IDs; bind known Wallee transaction tokens to attacker-chosen users → fraudulent charges / account payment takeover.

**Impact:**  
Payment fraud; cross-tenant payment instrument binding.

**Exploitability:** HIGH (enumeration) / MEDIUM–HIGH (token bind if txn IDs known)  
**Release Blocker:** YES  

**Recommendation:**  
Require auth or signed booking session; bind to payment row + Wallee customerId; never trust body tenant/user.

---

### 🔴 CRITICAL — Cross-tenant invoice items IDOR

**Target:** `GET /api/invoices/get-items?invoice_id=`

**Vulnerability:**  
Any authenticated user + service role. Filters **only** by `invoice_id` — **no tenant or ownership check**.

**Evidence:**

```16:37:server/api/invoices/get-items.get.ts
  const authUser = await getAuthenticatedUser(event)
  // ...
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice_id)
```

**Attacker Scenario:**  
Register free account (Tenant A). Brute/guess invoice UUIDs (or leak from other bugs). Read line items + product sales for Tenant B.

**Impact:**  
Cross-tenant financial data disclosure (prices, products, appointments).

**Exploitability:** MEDIUM–HIGH (UUID entropy slows blind enum; any leak of invoice ids = instant)  
**Release Blocker:** YES  

**Recommendation:**  
Join invoice → assert `tenant_id` + role (staff) or ownership (customer).

---

### 🔴 CRITICAL — Voucher manage IDOR / mass assignment / cross-tenant

**Target:** `POST /api/vouchers/manage` actions `load|find-by-code|create|redeem`

**Vulnerability:**  
Authenticated but service-role. Arbitrary `userId` load; global code lookup; insert raw `voucherData` (client `tenant_id`); redeem any `voucherId`.

**Evidence:**

```28:37:server/api/vouchers/manage.post.ts
      const userId = body.userId || user.id
      .from('discounts').select('*').eq('user_id', userId)
```

```96:99:server/api/vouchers/manage.post.ts
      .insert([body.voucherData])
```

```134:137:server/api/vouchers/manage.post.ts
      .update({ is_used: true }).eq('id', body.voucherId)
```

**Attacker Scenario:**  
Load another user’s vouchers → redeem/steal value; create vouchers under foreign tenant; burn competitors’ vouchers.

**Impact:**  
Cross-tenant financial abuse; gift-card theft.

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Force session `db_user_id` + `tenant_id`; whitelist create fields; ownership on redeem.

---

### 🔴 CRITICAL — Live RLS: `reminder_logs` world-readable to authenticated

**Target:** Table `public.reminder_logs` (live policies)

**Vulnerability:**  
Verified in production:

```text
Enable select for authenticated users
USING (auth.role() = 'authenticated')

Enable insert for authenticated users
WITH CHECK (auth.role() = 'authenticated')
```

Columns include `recipient`, `subject`, `body`, `tenant_id`, `user_id` — live sample recipient prefix `+41…` (phone PII).

**Attacker Scenario:**  
1. Create any account.  
2. Use Supabase JS with anon key + JWT:  
   `supabase.from('reminder_logs').select('*').limit(1000)`  
3. Exfiltrate emails/SMS bodies and recipients across **all tenants**.

**Impact:**  
Mass PII breach; GDPR incident; phishing targeting.

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Drop open policies; service-role-only writes; tenant-scoped staff SELECT.

---

### 🔴 CRITICAL — Live RLS: customers can UPDATE `payments` (incl. status)

**Target:** Table `public.payments` policy `customer_update_own`

**Vulnerability:**  
Live UPDATE policy allows customers to update **any column** on their payment rows (match via `users.id`). Client composable blocks some statuses in JS only — bypass with raw PostgREST.

**Evidence (live):**

```text
customer_update_own FOR UPDATE
USING / WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
-- no column restriction on payment_status
```

```84:93:composables/usePaymentStatus.ts
      await supabase.from('payments').update({ payment_status: update.status, ... })
        .eq('id', update.payment_id)
```

**Attacker Scenario:**  
Book/create pending payment →  
`update payments set payment_status='completed' where id=<mine>` via Data API → mark lesson paid without paying.

**Impact:**  
Financial fraud; accounting corruption; unpaid services marked paid.

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Revoke customer UPDATE on payments; status changes only via webhook/service role with provider proof.

---

### 🔴 CRITICAL — Inactive users retain API access

**Target:** `server/utils/auth.ts` — `getAuthenticatedUser`

**Vulnerability:**  
Selects `is_active`, `deleted_at` but never enforces them before returning a session identity.

**Attacker Scenario:**  
Compromised or terminated staff account still has valid refresh token → continues calling admin APIs until Auth ban.

**Impact:**  
Vertical privilege persistence after offboarding.

**Exploitability:** MEDIUM (needs existing token) / HIGH post-compromise  
**Release Blocker:** YES  

**Recommendation:**  
Fail closed; revoke refresh tokens on deactivate.

---

## High Findings

### 🔴 HIGH — Intra-tenant invoice BOLA (customer = full finance access)

**Target:**  
`/api/invoices/list`, `delete`, `get`, `download`, `resend`, `get-summary`

**Vulnerability:**  
Auth only checks “has profile + tenant_id”. **No role check.** Customers can list **all** tenant invoices (`select *`), delete any invoice in tenant, download PDFs, resend emails, pull financial summary.

**Evidence:**

```29:33:server/api/invoices/delete.post.ts
    .from('invoices').delete()
    .eq('id', invoice_id)
    .eq('tenant_id', userProfile.tenant_id)
```

```30:34:server/api/invoices/list.get.ts
    .from('invoices_with_details').select('*')
    .eq('tenant_id', userProfile.tenant_id)
```

**Attacker Scenario:**  
Student account → `DELETE` employer invoices; dump all customer financial docs of the driving school.

**Impact:**  
Destruction/disclosure of tenant financial records (not cross-tenant, but catastrophic for that tenant).

**Exploitability:** HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Staff/admin for list/delete/summary; customers only own invoices by `user_id`.

---

### 🔴 HIGH — Admin `get-user-by-id` cross-tenant dump

**Target:** `POST /api/admin/users` action `get-user-by-id`

**Vulnerability:**  
Tenant mismatch check only when `tenant_id` is present in body. `get-user-by-id` selects `*` by `user_id` with **no tenant filter**.

**Evidence:**

```61:64:server/api/admin/users.post.ts
  if (authUser.role !== 'super_admin' && tenant_id && tenant_id !== authUser.tenant_id) {
```

```232:241:server/api/admin/users.post.ts
    if (action === 'get-user-by-id') {
      .from('users').select('*').eq('id', user_id).single()
```

**Attacker Scenario:**  
Tenant admin omits `tenant_id`, supplies foreign `user_id` → full user row (PII, possibly sensitive columns).

**Impact:**  
Cross-tenant user PII.

**Exploitability:** MEDIUM–HIGH  
**Release Blocker:** YES  

**Recommendation:**  
Always scope by `authUser.tenant_id` unless super_admin.

---

### 🔴 HIGH — Staff reminder endpoints trust foreign `tenantId`

**Target:**  
`POST /api/reminders/send-payment-confirmation` (and sibling confirmation/deletion senders)

**Vulnerability:**  
`requireStaffOrInternal` then uses body `paymentId` / `userId` / `tenantId` with service role — **no match** to caller’s `tenant_id`.

**Evidence:**

```13:36:server/api/reminders/send-payment-confirmation.post.ts
  await requireStaffOrInternal(event)
  const { paymentId, userId, tenantId } = body
  .from('users').select(...).eq('id', userId)
```

**Attacker Scenario:**  
Staff of Tenant A triggers emails / payment reminder side effects for Tenant B users.

**Impact:**  
Cross-tenant email abuse; potential payment metadata updates depending on handler body.

**Exploitability:** MEDIUM (needs staff account)  
**Release Blocker:** YES (cross-tenant)  

**Recommendation:**  
Force `profile.tenant_id`; assert payment.tenant_id match.

---

### 🔴 HIGH — Dual session storage (httpOnly + localStorage tokens)

**Target:** Login JSON + `utils/supabase.ts` `persistSession: true`

**Vulnerability:**  
Refresh tokens returned to JS and stored in localStorage. httpOnly cookies are not sufficient against XSS.

**Attacker Scenario:**  
XSS (stored reglement `v-html`, or future sink) → steal refresh token → persistent session hijack.

**Impact:**  
Account takeover.

**Exploitability:** MEDIUM (needs XSS) — elevates any XSS to CRITICAL  
**Release Blocker:** NO (HIGH hardening)  

**Recommendation:**  
Cookie-only web sessions; no refresh token in JSON for browser clients.

---

### 🔴 HIGH — Logout does not revoke refresh tokens

**Target:** `POST /api/auth/logout`

**Vulnerability:**  
Clears cookies only; Supabase refresh tokens (localStorage / DB locks) remain valid.

**Attacker Scenario:**  
Steal token before logout → continue after victim “logs out”.

**Impact:**  
Session persistence after logout.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

**Recommendation:**  
Server revoke + clear refresh locks.

---

### 🔴 HIGH — Refresh tokens persisted in `auth_refresh_locks`

**Target:** `server/utils/token-refresh.ts`

**Vulnerability:**  
Dedup table stores live `access_token` / `refresh_token` JSON.

**Attacker Scenario:**  
SQL dump / compromised service role / insider reads table → mint sessions.

**Impact:**  
Mass session compromise from DB access.

**Exploitability:** LOW–MEDIUM (needs DB access)  
**Release Blocker:** NO  

**Recommendation:**  
Never store raw tokens; opaque status + short TTL encrypted blob or Redis.

---

### 🔴 HIGH — MFA incomplete / weak crypto

**Target:** `send-mfa-code.post.ts`, login MFA wiring

**Vulnerability:**  
`Math.random()` OTP; plaintext code stored; unsalted SHA-256; SMS/email TODO (codes logged); progressive MFA not on successful login path.

**Evidence:**

```135:145:server/api/auth/send-mfa-code.post.ts
  return Math.floor(100000 + Math.random() * 900000).toString()
  // insert includes code: code (plaintext)
```

**Attacker Scenario:**  
If MFA marketed as control → false security; OTP prediction / DB read of plaintext.

**Impact:**  
Authentication control failure.

**Exploitability:** MEDIUM  
**Release Blocker:** NO unless MFA claimed in compliance  

**Recommendation:**  
Disable until fixed; `crypto.randomInt`; hash-only; real delivery.

---

### 🔴 HIGH — Captcha optional; spoofable login IP

**Target:** `server/api/auth/login.post.ts`

**Vulnerability:**  
Captcha only if provided. IP from leftmost `X-Forwarded-For` (attacker-controlled).

**Attacker Scenario:**  
Omit captcha; rotate spoofed XFF to evade IP blocks while stuffing passwords via `/api/auth/manage` or login.

**Impact:**  
Weaker brute-force resistance.

**Exploitability:** HIGH  
**Release Blocker:** NO  

**Recommendation:**  
Trusted-proxy IP; captcha after failures; kill manage bypass.

---

### 🔴 HIGH — Authenticated email abuse / phishing vector

**Target:** `POST /api/email/send-withdrawal-notification`

**Vulnerability:**  
Any logged-in user can send templated HTML email to **arbitrary `data.email`** (or tenant admin email for `admin_new_withdrawal`). Body fields (`studentName`, etc.) attacker-controlled → HTML injection in email.

**Evidence:**

```104:145:server/api/email/send-withdrawal-notification.post.ts
  // any logged-in user
  const to = type === 'admin_new_withdrawal'
    ? await getAdminEmail(data.tenantId)
    : data.email
  await sendEmail({ to, subject, html })
```

**Attacker Scenario:**  
Phish victims with Simy-branded emails; spam admins of other tenants via `tenantId`.

**Impact:**  
Brand abuse; phishing; admin inbox spam (cross-tenant notify).

**Exploitability:** HIGH  
**Release Blocker:** YES for admin_new_withdrawal cross-tenant; HIGH for phishing  

**Recommendation:**  
Bind recipient to caller profile email; admin notify internal-only; escape HTML.

---

### 🔴 HIGH — Open redirect

**Target:** `GET /api/marketing/track/click?url=`

**Vulnerability:**  
Unauthenticated redirect to arbitrary `url`.

**Evidence:**

```31:43:server/api/marketing/track/click.get.ts
  let destination = url ? decodeURIComponent(url) : 'https://app.simy.ch'
  return sendRedirect(event, destination, 302)
```

**Attacker Scenario:**  
Craft `https://app.simy.ch/api/marketing/track/click?url=https://evil.tld/phish` for trusted-looking phishing.

**Impact:**  
Credential phishing via trusted domain.

**Exploitability:** HIGH  
**Release Blocker:** NO (HIGH)  

**Recommendation:**  
Allowlist hostnames; reject external URLs.

---

### 🔴 HIGH — SSRF via Unsplash `download_location` (admin)

**Target:** `POST /api/website/media/apply-hero`

**Vulnerability:**  
Admin-authenticated `fetch(body.download_location)` with Unsplash Client-ID header; no host allowlist. AI path `downloadImage` allows any http(s).

**Evidence:**

```119:122:server/api/website/media/apply-hero.post.ts
    const dlRes = await fetch(body.download_location, {
      headers: { Authorization: `Client-ID ${key}` },
    })
```

**Attacker Scenario:**  
Compromised/malicious tenant admin → SSRF to cloud metadata / internal URLs; exfil Unsplash key to attacker-controlled host (header sent).

**Impact:**  
SSRF; API key theft.

**Exploitability:** MEDIUM (needs admin)  
**Release Blocker:** NO  

**Recommendation:**  
Allowlist `api.unsplash.com`; block private IP ranges; don’t forward secrets to user URLs.

---

### 🔴 HIGH — Appointment last-* cross-tenant probe

**Target:** `POST /api/appointments/get-appointment-info` (`last-duration`, `last-category`)

**Vulnerability:**  
Service role query by `studentId` without tenant membership check.

**Impact:**  
Cross-tenant metadata leak.

**Exploitability:** MEDIUM  
**Release Blocker:** YES (cross-tenant)  

**Recommendation:**  
Assert same tenant / ownership.

---

### 🔴 HIGH — Documents insert client `tenant_id`

**Target:** `POST /api/documents/manage` save

**Vulnerability:**  
`tenant_id: document_data.tenant_id || callerUser.tenant_id`

**Impact:**  
Cross-tenant document row pollution.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

**Recommendation:**  
Always force caller tenant.

---

### 🔴 HIGH — Affiliate debug foreign tenant

**Target:** `GET /api/affiliate/debug-user?tenant_id=`

**Vulnerability:**  
Staff can pass foreign `tenant_id`.

**Impact:**  
Cross-tenant debug PII.

**Exploitability:** MEDIUM  
**Release Blocker:** YES (cross-tenant)  

**Recommendation:**  
Pin tenant; remove from prod.

---

### 🔴 HIGH — `/api/database/query` INSERT without forced tenant_id

**Target:** `POST /api/database/query` action `insert`

**Vulnerability:**  
Mismatch rejected only if client sends `tenant_id`; omit → insert without isolation. Service-role writes. `calendar_tokens.token` whitelisted.

**Impact:**  
Orphan/cross-tenant rows; secret token exposure risk.

**Exploitability:** MEDIUM  
**Release Blocker:** YES if endpoint used in prod clients  

**Recommendation:**  
Always set tenant; strip secrets; prefer deprecation.

---

### 🔴 HIGH — Wallee webhook ignores credit in amount check

**Target:** `POST /api/wallee/webhook`

**Vulnerability:**  
Rejects when captured < full `total_amount_rappen` even when wallet credit covered the difference. Returns non-503 failure.

**Impact:**  
Paid hybrid checkouts stuck unpaid; ops may manually mark paid (fraud window) or double-charge.

**Exploitability:** N/A (integrity bug); attacker may exploit stuck state / support social engineering  
**Release Blocker:** YES for money integrity  

**Recommendation:**  
Expected = total − credit; 503 on verify failure.

---

### 🔴 HIGH — Wallet credit race / non-tenant-scoped deduct

**Target:** `POST /api/payments/process`

**Vulnerability:**  
Credit update by `user_id` only; non-atomic; ignores pending withdrawal freeze.

**Impact:**  
Overdraft; race double-spend.

**Exploitability:** MEDIUM (parallel requests)  
**Release Blocker:** NO  

**Recommendation:**  
Atomic RPC with tenant + withdrawal checks.

---

### 🔴 HIGH — Cron fail-open when `CRON_SECRET` unset

**Target:** e.g. `server/api/cron/process-recalc-queue.get.ts` (and several siblings)

**Vulnerability:**  
Auth check wrapped in `if (cronSecret && cronSecret.trim() !== '')` — missing env ⇒ **public**.

Contrast: `assertCronRequest` in `cron-auth.ts` fails closed.

**Evidence:**

```29:44:server/api/cron/process-recalc-queue.get.ts
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && cronSecret.trim() !== '') {
      // only then enforce
    }
```

**Attacker Scenario:**  
If misconfigured env in any deploy → trigger expensive recalcs / side effects.

**Impact:**  
DoS / unintended mutations.

**Exploitability:** LOW–HIGH depending on env  
**Release Blocker:** NO (verify prod has CRON_SECRET — **NOT VERIFIED** here)  

**Recommendation:**  
Always use `assertCronRequest` (fail closed).

---

### 🔴 HIGH — Payment mass assignment (staff)

**Target:** `POST /api/payments/manage` create

**Vulnerability:**  
`...body.paymentData` spread into insert; only `tenant_id` forced.

**Impact:**  
Staff can craft arbitrary amounts/statuses/metadata.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

**Recommendation:**  
Whitelist columns; server-compute money fields.

---

## Medium Findings

### 🟡 MEDIUM — Stored XSS in admin reglement viewer

**Target:** `components/admin/ReglementeManager.vue` `v-html="viewingReglementData.content"`

**Vulnerability:**  
Admin HTML not sanitized (customer views use DOMPurify).

**Attacker Scenario:**  
Malicious admin/staff stores script → other admins open reglement → XSS → session theft (localStorage tokens).

**Impact:**  
Admin session hijack chain.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

**Recommendation:**  
DOMPurify everywhere; CSP; cookie-only sessions.

---

### 🟡 MEDIUM — PostgREST `.or()` filter injection surface

**Target:** `invoices/list.get.ts` search term interpolation

**Vulnerability:**  
Unescaped search into `.or(...)` filter string.

**Impact:**  
Filter logic abuse / unexpected data exposure within already-overprivileged list.

**Exploitability:** LOW–MEDIUM  
**Release Blocker:** NO  

**Recommendation:**  
Parameterized filters; escape reserved chars.

---

### 🟡 MEDIUM — Unauthenticated `analytics/setup` calls `exec_sql`

**Target:** `POST /api/analytics/setup`

**Vulnerability:**  
No auth; attempts `rpc('exec_sql')` with file SQL via service role.

**Live note:** `exec_sql` RPC **does not exist** in production (verified). Handler falls back to “success” message — limited blast radius today, still a dangerous pattern.

**Exploitability:** LOW (RPC missing)  
**Release Blocker:** NO  

**Recommendation:**  
Delete endpoint; never expose SQL execution RPCs.

---

### 🟡 MEDIUM — Global rate-limit middleware no-op

**Target:** `server/middleware/rate-limiting.ts`

**Impact:**  
Abuse of weak endpoints; multi-instance Vercel nullifies in-memory maps.

**Exploitability:** HIGH for abuse  
**Release Blocker:** NO  

---

### 🟡 MEDIUM — Client-side route middleware is UX only

**Target:** `middleware/auth.ts`, `admin.ts` (`process.server` return)

**Impact:**  
UI redirects ≠ authorization. Safe only if every API checks auth (many do not).

**Exploitability:** N/A (design)  
**Release Blocker:** NO  

---

### 🟡 MEDIUM — Pickup location create for any same-tenant userId

**Target:** `POST /api/locations/create-pickup`

**Impact:**  
Any tenant user can attach pickup locations to other students.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

---

### 🟡 MEDIUM — Staff can mark payments completed without provider proof

**Target:** `POST /api/payments/status`

**Impact:**  
Insider fraud.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

---

### 🟡 MEDIUM — Webhook / credit-product idempotency races

**Target:** Wallee webhook side effects

**Impact:**  
Double wallet credit under parallel deliveries.

**Exploitability:** MEDIUM  
**Release Blocker:** NO  

---

### 🟡 MEDIUM — Wallee webhooks without HMAC

**Target:** `/api/wallee/webhook`

**Mitigation present:** Live API verification of transaction. Still allows noise/DoS.

**Exploitability:** LOW for forge (if API verify holds)  
**Release Blocker:** NO  

---

## Low Findings

### 🟢 LOW — Mock `utils/walleeService.ts` stub in repo

Risk if accidentally imported.

### 🟢 LOW — Dangerous historical SQL scripts in repo

Re-apply risk for open policies; live users policies appear fixed.

### 🟢 LOW — Verbose webhook/payment logging

PII in logs.

### 🟢 LOW — Public branding APIs

Expected; ensure no secrets in branding payloads (**NOT VERIFIED** every field).

---

## Positive Security Controls (verified)

| Control | Status |
|---------|--------|
| `tenant_id` from DB in `getAuthenticatedUser` | Good foundation |
| Dangerous SECURITY DEFINER RPCs (`get_tenant_secret`, `unlock_account`, `soft_delete_user`, `test_auth_login`, `debug_users_access`) | **EXECUTE denied** for `anon`/`authenticated` in prod |
| RLS enabled on sampled tables | No public tables found with RLS disabled (sample query empty) |
| Staff appointments/payments/invoices RLS | Tenant-scoped (live) |
| Passkey/WebAuthn for super_admin | Comparatively strong |
| Stripe SaaS webhook signature verify | Good |
| Wallee webhook API transaction verify | Good (amount-vs-credit bug aside) |
| Service role not in `runtimeConfig.public` | Good |
| No hardcoded live service_role JWT found in source scan | Good |

---

## Attack Paths (chained)

### Path A — Unauthenticated → cross-tenant payment intel

```
Unauth GET /api/admin/cron-status
  → list authorized payments (ids, schedule, wallee txn)
  → POST /api/admin/get-billing-addresses with related studentIds
  → PII + payment fraud planning
```

**Combined impact:** CRITICAL  

### Path B — Any account → mass PII via RLS

```
Register tenant A account
  → Supabase Data API SELECT reminder_logs
  → all tenants' SMS/email recipients + bodies
```

**Combined impact:** CRITICAL (GDPR-scale)  

### Path C — Customer → free lessons

```
Create pending payment (own)
  → PostgREST UPDATE payments.payment_status = 'completed'
  → consume service without paying
```

**Combined impact:** CRITICAL financial  

### Path D — Auth stuffing → admin takeover

```
POST /api/auth/manage signin-password (no captcha/rate path)
  → session tokens in JSON
  → if admin password weak → full tenant admin
  → optional: invoices delete / payment status forge / SSRF hero
```

**Combined impact:** CRITICAL  

### Path E — Staff → cross-tenant harassment / data

```
Staff JWT tenant A
  → reminders/send-* with tenant B ids
  → OR admin/users get-user-by-id without tenant_id
  → OR invoices/get-items with foreign invoice_id
```

**Combined impact:** CRITICAL cross-tenant  

### Path F — XSS → session mint

```
Stored XSS (reglement v-html)
  → steal localStorage refresh token
  → sync-session / API as victim
```

**Combined impact:** HIGH–CRITICAL  

### Path G — Open redirect phishing

```
Trusted app.simy.ch click tracker
  → redirect to attacker site
  → harvest credentials → manage/login
```

**Combined impact:** HIGH  

---

## OWASP Mapping

| OWASP / API Top 10 | Simy findings |
|--------------------|---------------|
| Broken Access Control (A01 / API1 BOLA) | Invoice IDOR, voucher IDOR, reminder_logs RLS, admin get-user-by-id, invoice BOLA |
| Authentication Failures (A07 / API2) | auth/manage bypass; MFA weak; logout no revoke; optional captcha |
| Security Misconfiguration (A05 / API8) | Unauth admin endpoints; cron fail-open pattern; open redirect |
| Cryptographic Failures (A02) | MFA Math.random / plaintext OTP; tokens in localStorage |
| Injection (A03) | PostgREST filter injection surface; HTML email injection |
| SSRF (A10) | apply-hero download_location |
| Business Logic / API6 | Payment status client UPDATE; webhook credit amount; wallet races |
| Excessive Data Exposure | Invoice list `select *`; cron-status payments dump |
| Unrestricted Resource | Unauth calculator-stats / cron-status |

---

## Secrets Assessment

| Check | Result |
|-------|--------|
| Service role in client public config | Not found (private runtimeConfig) |
| Hardcoded live JWTs / sk_live in source | Not found in targeted scan |
| Tokens in API JSON (login) | **Yes** — access + refresh |
| Tokens in DB (`auth_refresh_locks`) | **Yes** |
| MFA codes in logs / plaintext column | **Yes** |
| Unsplash key sent to attacker URL (SSRF) | Possible via apply-hero |

**Secrets score driver:** No classic “key in Git”, but **session secrets in browser storage and DB** are first-class credential leaks under XSS/DB compromise.

---

## Release Blockers (security)

1. Auth-gate or delete all unauthenticated service-role admin/pendencies/payment-token endpoints.  
2. Remove public `/api/auth/manage` sign-in/sign-up/set-session.  
3. Fix live RLS: `reminder_logs` open SELECT/INSERT; `payments` customer UPDATE (especially `payment_status`).  
4. Fix cross-tenant IDORs: `invoices/get-items`, vouchers/manage, appointment last-*, admin `get-user-by-id`, staff reminders body tenant, affiliate debug.  
5. Fix intra-tenant invoice BOLA (role checks on list/delete/download/resend/summary).  
6. Fix withdrawal email arbitrary recipient / cross-tenant admin notify.  
7. Enforce `is_active`/`deleted_at` in auth.  
8. Fix Wallee webhook expected amount vs credit (money integrity).  
9. Force `tenant_id` on database/query inserts (or disable).

---

## Security Scores

| Domain | Score | Notes |
|--------|-------|-------|
| Authentication | **3/10** | Dual session; manage bypass; MFA unfinished; logout weak |
| Authorization | **2/10** | Many IDORs; invoice BOLA; unauth admin |
| Tenant Isolation | **2/10** | Multiple verified cross-tenant paths + RLS holes |
| Database/RLS | **3/10** | Core tables improved; reminder_logs + payments UPDATE fatal |
| API Security | **2/10** | ~1k routes; inconsistent auth; service-role sprawl |
| Input Security | **5/10** | Some sanitization; open redirect; SSRF; filter/HTML injection |
| Business Logic | **3/10** | Payment status forge; webhook credit; wallet races |
| Secrets | **6/10** | No leaked service role in public config; session token hygiene poor |
| Payment Security | **3/10** | Client status UPDATE; token APIs; webhook amount bug |

### OVERALL SECURITY SCORE: **2.5/10**

---

## Final Security Verdict

# 🔴 DO NOT DEPLOY

**Would I expose this attack surface to paying multi-tenant customers without hotfixes?**

# NO

Cross-tenant data access is not theoretical: **invoice items by ID**, **voucher APIs**, **reminder_logs RLS**, **admin user-by-id**, and **unauthenticated service-role admin routes** are concrete. Combined with **customer payment_status UPDATE**, a low-skill attacker with any account (or none) can cause **privacy and financial damage**.

---

## NOT VERIFIED — EVIDENCE MISSING

- Whether production `CRON_SECRET` is set on all Vercel environments (code fail-open if not).  
- Exhaustive audit of all ~1079 API routes (sample + pattern hunt; residual risk remains).  
- Full RLS policy set for every table (critical tables sampled live).  
- Runtime XSS inventory beyond reglement `v-html`.  
- Whether `auth/manage` is reachable in production routing/WAF (code is present and callable if route is mounted — Nuxt mounts `server/api` by default).  
- Active exploitation in the wild (out of scope).

---

## Audit metadata

| Item | Value |
|------|--------|
| Git ref | `origin/main` (audit branch based on `52932ed1`) |
| Live DB | `unyjaetebnaexaflpyoc` |
| Source changes | None |
| Report path | `/audits/2026-09-02-security-audit.md` |
