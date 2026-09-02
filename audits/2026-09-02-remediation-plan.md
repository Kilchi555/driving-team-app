# Simy — Security Remediation Triage & Master Fix Plan

**Date:** 2026-09-02  
**Role:** Principal Security Engineer / Staff Architect  
**Mode:** Read-only verification + planning. **No fixes. No source/DB/config changes.**  
**Inputs:**  
- `/audits/2026-09-02-senior-engineer-audit.md`  
- `/audits/2026-09-02-security-audit.md`  
**Re-verification:** Code on branch `cursor/senior-engineer-audit-bb9a` (based on `origin/main` @ `52932ed1`) + live Postgres policies on Supabase project `unyjaetebnaexaflpyoc`.

---

## EXECUTIVE SUMMARY

Both prior audits converge on the same **eight foundation defects**. This triage **re-verified each one with fresh evidence**. **All eight are VERIFIED** (none FALSE POSITIVE). Several are tightly coupled through shared auth (`getAuthenticatedUser`) and service-role patterns.

Additionally, the security audit documented **related release blockers** (invoice cross-tenant IDOR, invoice BOLA, staff reminder cross-tenant, etc.) that are **not duplicates of the eight** but must enter the same Wave 1/2 plan or production remains unsafe.

| Metric | Value |
|--------|-------|
| Senior Engineering Score | **3.5/10** |
| Security Score | **2.5/10** |
| Listed findings re-verified | **8/8 VERIFIED** |
| Recommended status | **🔴 DO NOT DEPLOY** |

**Do not implement fixes in parallel without respecting the dependency graph.** Shared auth and RLS changes affect nearly every API.

---

## CURRENT RISK

- **Unauthenticated attackers** can hit service-role admin and payment-token endpoints.  
- **Any authenticated user** can read cross-tenant `reminder_logs` via Data API and UPDATE own `payments.payment_status`.  
- **Authenticated users** can abuse voucher manage and (from related findings) invoice item IDOR.  
- **Hybrid Wallee+credit payments** can fail webhook completion while money is captured.  
- **Deactivated users** retain API access until token expiry/ban.

This is an **incident-class** posture for a multi-tenant payments SaaS, not a cleanup backlog.

---

## VERIFIED FINDINGS

Status legend: **VERIFIED** | **PARTIALLY VERIFIED** | **NOT VERIFIED** | **FALSE POSITIVE**

---

### F-01 — Unauthenticated service-role admin APIs

| Field | Value |
|-------|-------|
| **ID** | F-01 |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** |
| **Endpoints** | `GET /api/admin/cron-status` · `POST /api/admin/get-billing-addresses` · `POST /api/admin/get-student-instructors` · `POST /api/admin/remove-user-device` · `GET /api/admin/calculator-stats` · `POST /api/admin/pendencies/update-overdue` · `POST /api/admin/pendencies/handle-recurrence` |
| **Files** | `server/api/admin/cron-status.get.ts`, `get-billing-addresses.post.ts`, `get-student-instructors.post.ts`, `remove-user-device.post.ts`, `calculator-stats.get.ts`, `pendencies/update-overdue.post.ts`, `pendencies/handle-recurrence.post.ts` |
| **Auth required** | **None** (no `getAuthenticatedUser` / `requireAdmin*` / cron assert) |
| **Authorization** | N/A — open |
| **Tenant boundary** | **None** — service role bypasses RLS |
| **Attacker input** | `studentIds`, `deviceId`/`userId`, `pendencyId` (where applicable); none for cron-status/calculator-stats |
| **Tables** | `payments`, `cron_logs`, `company_billing_addresses`, `appointments`, `user_devices`, `calculator_events`, `pendencies` |

**Evidence:**  
Re-scan of each file shows **zero** auth imports/calls; all construct `getSupabaseAdmin()` or `createClient(..., SERVICE_ROLE_KEY)`.

```6:9:server/api/admin/cron-status.get.ts
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
```

```18:20:server/api/admin/get-billing-addresses.post.ts
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
```

**Impact:** Cross-tenant PII/payment intel; unauthorized device delete; pendency mutation.  
**Definition of Done:** Every `/api/admin/**` route fails closed with 401 unauthenticated and 403 wrong role; negative tests green; service role unreachable without auth.

---

### F-02 — `/api/auth/manage` public password sign-in bypasses login hardening

| Field | Value |
|-------|-------|
| **ID** | F-02 |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** |
| **Endpoint** | `POST /api/auth/manage` |
| **File / function** | `server/api/auth/manage.post.ts` — `signInWithPassword`, `signUp`, `setSession` |
| **Auth required** | **None** for public actions |
| **Hardening bypassed** | Rate limit, captcha, passkey gate, IP block path of `/api/auth/login` |
| **Attacker input** | `email`, `password`, `action`, session tokens for `set-session` |
| **Data flow** | Body → module-level service-role Supabase Auth client → returns full `session` |

**Evidence:**

```21:36:server/api/auth/manage.post.ts
    if (action === 'signin-password') {
      return await signInWithPassword(body)
    }
    // ... signup, set-session public
```

Protected branch calls `getServerSession(event)` which is **not imported** in this file (broken for `update-user`).

**Live callers (must migrate, not break):**  
- `pages/register-staff.vue` → `signin-password`  
- `pages/reset-password.vue` → `set-session` / manage  
- `pages/login/set-password.vue` → manage  

**Impact:** Credential stuffing / auth control bypass; token leakage in JSON.  
**DoD:** Public password sign-in removed; callers use hardened login + cookies; negative test that manage sign-in returns 404/410/401.

---

### F-03 — Unauthenticated payment-token get/save (client `userId`/`tenantId`)

| Field | Value |
|-------|-------|
| **ID** | F-03 |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** |
| **Endpoints** | `POST /api/booking/get-user-payment-token` · `POST /api/wallee/save-payment-token` |
| **Files** | `server/api/booking/get-user-payment-token.post.ts`, `server/api/wallee/save-payment-token.post.ts` |
| **Auth required** | **None** |
| **Table** | `customer_payment_methods` (+ Wallee API read) |
| **Attacker input** | `userId`, `tenantId`, `transactionId` |

**Evidence:** No auth calls; service role queries/writes filtered only by body IDs.

**Critical dependency:** Webhook calls save-payment-token **internally** with `internalSecretHeaders()`:

```2366:2374:server/api/wallee/webhook.post.ts
    await $fetch('/api/wallee/save-payment-token', {
      method: 'POST',
      headers: { ...internalSecretHeaders() },
      body: { transactionId, userId: payment.user_id, tenantId: payment.tenant_id }
```

Today the endpoint **ignores** that secret (still public). Fix must accept **verified internal secret OR authenticated owner**, and bind to payment/Wallee customer identity — not bare body IDs.

**Caller note:** No frontend `$fetch` to `get-user-payment-token` found in `*.ts`/`*.vue` (may be unused or dynamic). **NOT VERIFIED** whether any production UI still calls it; endpoint remains reachable if Nitro mounts it (default).

**Impact:** Token enumeration; cross-tenant payment instrument binding / fraud.  
**DoD:** Unauth get/save → 401; wrong tenant/user → 403; webhook internal path still works; negative security tests pass.

---

### F-04 — Voucher manage IDOR / missing tenant ownership

| Field | Value |
|-------|-------|
| **ID** | F-04 |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** |
| **Endpoint** | `POST /api/vouchers/manage` |
| **File** | `server/api/vouchers/manage.post.ts` |
| **Auth required** | Yes (`getAuthenticatedUser`) — **insufficient** |
| **Table** | `discounts` |
| **Attacker input** | `userId`, `code`, `voucherData` (incl. `tenant_id`), `voucherId` |

**Evidence:**

| Action | Defect |
|--------|--------|
| `load` | `body.userId \|\| user.id` — no ownership/tenant; `user.id` is auth UUID ≠ `users.id` |
| `find-by-code` | Global lookup, no tenant filter |
| `create` | `insert([body.voucherData])` mass assignment |
| `redeem` | Update by `voucherId` only — no ownership |

**Client caller:** `composables/useVouchers.ts` (must keep UX after ownership fix).

**Impact:** Cross-user/cross-tenant voucher theft, burn, forgery.  
**DoD:** Load/redeem scoped to session `db_user_id` + `tenant_id`; create whitelisted + forced tenant; foreign IDs → 403; automated IDOR tests.

---

### F-05a — Live RLS: customers UPDATE own payments (incl. `payment_status`)

| Field | Value |
|-------|-------|
| **ID** | F-05a |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** (live DB) |
| **Table / policy** | `public.payments` / `customer_update_own` |
| **Cmd** | `UPDATE` |
| **Auth** | Any `authenticated` JWT for the payment owner |
| **Attacker input** | PostgREST body: `payment_status`, amounts, etc. |

**Evidence (live `unyjaetebnaexaflpyoc`, re-queried 2026-09-02):**

```text
customer_update_own FOR UPDATE TO authenticated
USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1))
WITH CHECK (same)
-- no column restriction
```

Client path also exists: `composables/usePaymentStatus.ts` updates via user JWT (JS blocks some statuses — bypassable).

Also noted: `customer_insert_own` WITH CHECK is `user_id = auth.uid()` (auth UUID vs `users.id`) — inconsistent; **PARTIALLY related**, not the primary exploit.

**Impact:** Mark unpaid as `completed` without capture.  
**DoD:** Customer Data API cannot change `payment_status` (or cannot UPDATE payments at all); server/webhook only; negative PostgREST test.

---

### F-05b — Live RLS: `reminder_logs` readable by any authenticated user

| Field | Value |
|-------|-------|
| **ID** | F-05b |
| **Severity** | CRITICAL |
| **Status** | **VERIFIED** (live DB) |
| **Table / policies** | `reminder_logs` / `Enable select for authenticated users`, `Enable insert for authenticated users` |
| **Using** | `auth.role() = 'authenticated'` — **no tenant filter** |
| **Columns at risk** | `recipient`, `subject`, `body`, `tenant_id`, `user_id`, … |

**Evidence:** Live policy query 2026-09-02 confirms both policies. Prior audit observed recipient prefix `+41` (PII present).

**Attacker path:** Register any account → `supabase.from('reminder_logs').select('*')` with anon key + JWT.

**Impact:** Cross-tenant mass PII disclosure (GDPR-class).  
**DoD:** Open policies dropped; tenant-scoped or service-role-only; negative Data API test from Tenant A returns no Tenant B rows.

---

### F-06 — Wallee webhook amount check ignores `credit_used_rappen`

| Field | Value |
|-------|-------|
| **ID** | F-06 |
| **Severity** | HIGH (money integrity; treat as Wave-3 blocker for payment ship) |
| **Status** | **VERIFIED** |
| **Endpoint / function** | `POST /api/wallee/webhook` — amount integrity block ~540–576 |
| **File** | `server/api/wallee/webhook.post.ts` |
| **Auth** | Webhook (API verify of txn; no HMAC) |

**Evidence:**  
- Selects `credit_used_rappen` (~243) but compares only `total_amount_rappen/100` to captured CHF.  
- Checkout charges remaining due: `remainingDueRappen` = `total − credit_used` in `server/utils/apply-student-credit.ts` and `wallee-appointment-checkout.ts`.

```64:66:server/utils/apply-student-credit.ts
export function remainingDueRappen(p: CreditPaymentInput): number {
  let fullDue = (p.total_amount_rappen || 0) - (p.credit_used_rappen || 0)
```

```549:552:server/api/wallee/webhook.post.ts
            const expectedChf = Number(p.total_amount_rappen || 0) / 100
            return expectedChf > 0 && capturedChf + 0.01 < expectedChf
```

Reject path returns `success: false` **without 503** → Wallee may stop retrying while capture succeeded.

**Impact:** Hybrid payments stuck non-completed after successful capture.  
**DoD:** Unit + integration: payment with credit + partial capture completes; mismatch still rejects; prefer 503 on verify failure.

---

### F-07 — `getAuthenticatedUser` ignores `is_active` / `deleted_at`

| Field | Value |
|-------|-------|
| **ID** | F-07 |
| **Severity** | HIGH |
| **Status** | **VERIFIED** |
| **File / function** | `server/utils/auth.ts` — `getAuthenticatedUser` (+ refresh retry path) |
| **Auth state** | Valid JWT / refresh cookie |
| **Shared impact** | **All** APIs using this helper |

**Evidence:**  
`AUTH_USER_COLS` includes `is_active, deleted_at` (line 7). Ripgrep shows **no conditional** on those fields before `return { ...authUser, tenant_id, ... }` (lines ~184, ~241).

**Impact:** Deactivated/soft-deleted users keep API access.  
**DoD:** Inactive/deleted → `null`/401 everywhere via shared helper; session revoke on deactivate; tests for inactive staff/admin/customer.

**Regression risk:** HIGH — central choke point; must confirm legitimate “pending registration” paths that return auth user without DB row still work.

---

### F-08 — `/api/database/query` INSERT does not force `tenant_id`

| Field | Value |
|-------|-------|
| **ID** | F-08 |
| **Severity** | HIGH |
| **Status** | **VERIFIED** |
| **Endpoint** | `POST /api/database/query` action `insert` |
| **File** | `server/api/database/query.post.ts` ~297–303 |
| **Auth** | Required (`getAuthenticatedUserWithDbId`); writes need staff/admin role |
| **Attacker input** | Omit `tenant_id` in `body.data` (or rely on mass fields) |

**Evidence:**

```297:300:server/api/database/query.post.ts
      if (allowedColumns.includes('tenant_id') && safeData.tenant_id && safeData.tenant_id !== authUser.tenant_id) {
        throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch: ...' })
      }
```

Mismatch only if `tenant_id` **present and wrong**. UPDATE/DELETE correctly force `.eq('tenant_id', authUser.tenant_id)`.

**Client caller:** `composables/useDatabaseQuery.ts`

**Impact:** Orphan / wrong-tenant inserts via service-role write path.  
**DoD:** Insert always sets `tenant_id = authUser.tenant_id` when column exists; omit/wrong client value cannot create foreign-tenant rows; negative tests.

---

## RELATED VERIFIED RELEASE BLOCKERS (Security Audit — not in the original eight)

These were re-confirmed in the security audit with code evidence. They are **in scope for production readiness** even if not numbered F-01…F-08.

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| **R-01** | CRITICAL | VERIFIED | `GET /api/invoices/get-items` — no tenant/ownership; cross-tenant line items |
| **R-02** | HIGH | VERIFIED | Invoice list/delete/download/resend/summary — any tenant user (customer BOLA) |
| **R-03** | HIGH | VERIFIED | `POST /api/admin/users` `get-user-by-id` — no tenant filter when `tenant_id` omitted |
| **R-04** | HIGH | VERIFIED | Staff reminder senders trust body `tenantId` (cross-tenant) |
| **R-05** | HIGH | VERIFIED | `GET /api/marketing/track/click?url=` open redirect |
| **R-06** | HIGH | VERIFIED | Withdrawal email API — arbitrary recipient / phishing |

**NOT FALSE POSITIVE:** All of the above had concrete file/line evidence in the security audit; R-01/R-02/R-03/R-04 should ride Wave 1–2 with tenant isolation work.

---

## FINDING DEPENDENCIES

```text
                    ┌─────────────────────────┐
                    │  F-07 getAuthenticatedUser │
                    │  (is_active / deleted_at)  │
                    └────────────┬──────────────┘
                                 │ used by almost all APIs
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   F-01 Admin auth          F-04 Vouchers           F-08 DB query
   (add requireAdmin*)      (already uses helper)   (already uses helper)
         │
         │ pattern reuse
         ▼
   F-03 Payment tokens  ←── depends on internal-secret OR session design
         │                    (webhook → save-payment-token)
         │
         ▼
   F-02 Auth manage     ←── independent surface; do BEFORE relying on login
                            hardening for anything else

   F-05a / F-05b RLS    ←── independent of API auth; Data API bypasses APIs
                            FIX IN PARALLEL WITH F-01 (defense in depth)

   F-06 Webhook credit  ←── after token/auth foundation; payment money path
                            Do NOT reorder amount check before understanding
                            remainingDueRappen / process.post credit writes

   R-01…R-04 tenant     ←── same “force tenant from session” pattern as F-04/F-08
```

### Must-fix-before relationships

| First | Then | Why |
|-------|------|-----|
| **F-02** | Relying on login rate-limit/captcha | Bypass remains if manage stays open |
| **F-05a / F-05b** | Trusting “API-only” payment status | Data API bypasses server APIs |
| **F-07** | Assuming deactivate works | Central auth must fail closed first |
| **Internal secret check on F-03** | Breaking webhook token save | Webhook depends on save-payment-token |
| **F-01 auth pattern** | Copy-paste requireAdmin to many routes | Establish one fail-closed admin middleware |
| **F-06** | Shipping more hybrid credit+Wallee flows | Completions already flaky |

### Safe parallelism

- **F-01** (per-route or middleware) ∥ **F-05a/b** (SQL) ∥ **F-02** (auth surface) — different layers.  
- **F-04** ∥ **F-08** ∥ **R-01/R-02** — same mental model (session tenant), different files.  
- **F-06** after or parallel to F-03 if webhook internal auth is designed first.

---

## REMEDIATION WAVES

### WAVE 1 — CRITICAL SECURITY FOUNDATION

**Goal:** Close unauthenticated service-role holes, auth bypass, payment-token abuse, voucher IDOR, dangerous RLS, unsafe inserts, and the worst cross-tenant API gaps.

| Order | ID | Action (plan only — do not implement here) |
|-------|-----|-----------------------------------------------|
| 1.1 | F-01 | Fail-closed auth on all listed admin endpoints (prefer `/api/admin/**` middleware + per-route role) |
| 1.2 | F-02 | Remove/lock public `signin-password`/`signup`; migrate register-staff / reset-password callers |
| 1.3 | F-03 | Auth + ownership OR verified internal secret; stop trusting body tenant/user alone |
| 1.4 | F-05a | Drop/restrict `customer_update_own` so `payment_status` cannot be client-set |
| 1.5 | F-05b | Replace open `reminder_logs` policies with tenant/service-role policies |
| 1.6 | F-04 | Force `db_user_id` + `tenant_id`; whitelist create; ownership on redeem |
| 1.7 | F-08 | Always set `tenant_id` on insert when column exists |
| 1.8 | R-01, R-03, R-04 | Force tenant/ownership on invoice items, admin get-user-by-id, reminders |

**Files likely to change:**  
`server/api/admin/*` (listed), optional new `server/middleware/*admin-auth*`, `server/api/auth/manage.post.ts`, `pages/register-staff.vue`, `pages/reset-password.vue`, `pages/login/set-password.vue`, `server/api/booking/get-user-payment-token.post.ts`, `server/api/wallee/save-payment-token.post.ts`, `server/api/wallee/webhook.post.ts` (headers only if needed), `server/api/vouchers/manage.post.ts`, `composables/useVouchers.ts`, `server/api/database/query.post.ts`, `composables/usePaymentStatus.ts`, `server/api/invoices/get-items.get.ts`, `server/api/admin/users.post.ts`, `server/api/reminders/send-*.post.ts`, SQL migration for RLS.

**DB objects:**  
Policies on `payments`, `reminder_logs` (DROP/CREATE). Possibly revoke grants.

**APIs / roles / tenants:**  
All tenants; unauthenticated internet; customers (RLS); staff/admin (new gates); webhook (internal).

**Regression risks:**  
- Staff UI calling open admin endpoints without cookies.  
- Staff registration / password reset flows.  
- Webhook token save after locking F-03.  
- Client payment status updates that relied on direct Supabase UPDATE.  
- Reminder writers that used authenticated INSERT into `reminder_logs`.

**Required tests (Wave 1):** See TEST REQUIREMENTS below (T-01…T-08, T-R01…).

---

### WAVE 2 — ACCOUNT / AUTHORIZATION INTEGRITY

| Order | ID | Action |
|-------|-----|--------|
| 2.1 | F-07 | Enforce `is_active` / `deleted_at` in `getAuthenticatedUser` (+ revoke on deactivate) |
| 2.2 | R-02 | Invoice BOLA — role gates on list/delete/download/resend/summary |
| 2.3 | R-05, R-06 | Open redirect allowlist; withdrawal email recipient binding |
| 2.4 | — | Audit remaining `/api/admin/**` for auth helper (systematic inventory) |

**Files:** `server/utils/auth.ts`, deactivate/user APIs, invoice routes, marketing click, email withdrawal.  
**Regression:** Onboarding users with edge-case profiles; customer invoice self-service if any exists.  
**Tests:** Inactive/deleted matrix; invoice role matrix.

---

### WAVE 3 — PAYMENT / BUSINESS LOGIC

| Order | ID | Action |
|-------|-----|--------|
| 3.1 | F-06 | Expected amount = `(total_amount_rappen - credit_used_rappen) / 100`; 503 on verify failures |
| 3.2 | — | Wallet atomic deduct with tenant + withdrawal freeze (engineering audit HIGH) |
| 3.3 | — | Webhook credit-product / refund idempotency |
| 3.4 | — | Staff cannot forge `completed` without provider proof / audited manual override |

**Files:** `server/api/wallee/webhook.post.ts`, `server/utils/apply-student-credit.ts`, `server/api/payments/process.post.ts`, `server/api/payments/status.post.ts`, tests under `server/utils/__tests__/`.  
**Regression:** Pure card (no credit) webhooks; full-credit (CHF 0 capture) paths; existing zero-payment guards.  
**Tests:** Hybrid credit+card completion; underpay still rejected; concurrent webhook.

---

### WAVE 4 — REMAINING HIGH/MEDIUM ENGINEERING

Only after Waves 1–3 green + re-audits:

- Dual session / localStorage token hygiene  
- Logout revoke refresh tokens  
- Stop storing raw tokens in `auth_refresh_locks`  
- MFA crypto / wiring or disable claims  
- Captcha + trusted IP on login  
- God-file / `any` reduction  
- Cron fail-open → `assertCronRequest` everywhere  
- SSRF allowlist on apply-hero  
- Expand E2E isolation suite  

---

## FIX ORDER (exact recommended sequence)

1. **F-05a + F-05b** (RLS) — stops Data API money/PII bypass immediately  
2. **F-01** — close unauthenticated service-role admin surface  
3. **F-02** — close auth manage bypass (+ migrate callers)  
4. **F-03** — lock payment tokens (design internal secret path first)  
5. **F-04** — voucher ownership  
6. **F-08** — force insert tenant_id  
7. **R-01, R-03, R-04** — remaining cross-tenant API holes  
8. **F-07** — inactive/deleted gate (Wave 2; central — careful QA)  
9. **R-02** — invoice BOLA  
10. **F-06** — webhook credit amount (Wave 3)  
11. Wave 3 remainder (wallet atomicity, idempotency)  
12. Wave 4 hygiene  

---

## SAFE CHANGE BOUNDARIES (per wave)

### Wave 1 boundaries

| Dimension | Scope |
|-----------|--------|
| **Files** | Listed under Wave 1 only; avoid drive-by refactors |
| **DB** | Only `payments` + `reminder_logs` policies (and grants if needed) |
| **APIs** | Admin listed set, auth/manage, payment-token, vouchers/manage, database/query insert, invoice get-items, admin users get-by-id, reminders send-* |
| **Users** | Internet (unauth), customers, staff, admin; webhook service |
| **Tenants** | All |
| **Out of scope** | MFA redesign, localStorage session redesign, god-file splits |

### Wave 2 boundaries

Central auth helper + invoice role model + redirect/email. Avoid payment webhook edits here.

### Wave 3 boundaries

Payment/webhook/wallet only. No RLS churn unless a payment policy bug remains.

### Wave 4 boundaries

Hygiene and maintainability — no “while we’re here” security redesign.

---

## TEST REQUIREMENTS

### After every wave (gate)

- Existing unit suite (`npm test` / vitest) green for touched modules  
- E2E login still green  
- E2E tenant isolation (`e2e/isolation.spec.ts`) green  
- **New negative security tests** for that wave’s findings (below)  
- Manual smoke: staff login, customer login, one booking payment path  

### CRITICAL finding → proof tests

#### T-01 (F-01) Service-role admin

| Case | Expect |
|------|--------|
| Unauthenticated GET/POST each listed endpoint | **401** |
| Authenticated customer | **403** |
| Authenticated admin same tenant (where applicable) | **200** with only own-tenant data |
| Admin cannot pass foreign `studentIds` from other tenant | **403/empty** |

#### T-02 (F-02) Auth manage

| Case | Expect |
|------|--------|
| `POST /api/auth/manage` `{action:'signin-password'}` | **401/404/410** (not success+session) |
| Hardened `/api/auth/login` still works | **200** + httpOnly cookies |
| register-staff / reset-password flows | Still complete via new path |

#### T-03 (F-03) Payment tokens

| Case | Expect |
|------|--------|
| Unauth get/save | **401** |
| Auth user A get token for user B | **403** |
| Auth user A save token for tenant B | **403** |
| Webhook/internal save with valid secret + matching payment | **200** |
| Webhook without secret | **401** |

#### T-04 (F-04) Vouchers

| Case | Expect |
|------|--------|
| User A `load` with `userId=B` | **403** or only A’s data |
| User A `redeem` foreign `voucherId` | **403** |
| User A `create` with foreign `tenant_id` | Forced to A’s tenant or **403** |

#### T-05a (F-05a) Payment RLS

| Case | Expect |
|------|--------|
| Customer JWT: `UPDATE payments SET payment_status='completed'` | **0 rows / RLS deny** |
| Webhook/service completes payment | Still works |
| Staff legitimate status API (if allowed) | Documented behavior only |

#### T-05b (F-05b) reminder_logs RLS

| Case | Expect |
|------|--------|
| Tenant A JWT: `SELECT * FROM reminder_logs` | No Tenant B rows |
| Insert as customer into foreign tenant | Denied |

#### T-06 (F-06) Webhook credit

| Case | Expect |
|------|--------|
| Payment total 100, credit 40, capture 60 | Completes |
| Payment total 100, credit 0, capture 60 | Rejects |
| Capture missing / API verify fail | **503** retryable |

#### T-07 (F-07) Inactive users

| Case | Expect |
|------|--------|
| `is_active=false` with valid JWT | **401** on admin + customer APIs |
| `deleted_at` set | **401** |
| Active user | Unchanged |

#### T-08 (F-08) database/query insert

| Case | Expect |
|------|--------|
| Insert omitting `tenant_id` | Row gets caller tenant |
| Insert with foreign `tenant_id` | **403** |
| Customer write | Still blocked by role gate |

### Tenant isolation matrix (API, not UI)

For each Wave 1–2 mutating/reading endpoint touched:

| Actor | Target | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|--------|
| Unauth | Any | deny | deny | deny | deny |
| Customer A | Tenant A own | allow (scoped) | per rules | per rules | per rules |
| Customer A | Tenant A other user | deny* | deny* | deny* | deny* |
| Customer A | Tenant B | deny | deny | deny | deny |
| Staff A | Tenant A | allow | allow | allow | allow |
| Staff A | Tenant B | deny | deny | deny | deny |

\*Except explicitly public booking flows — document exceptions.

### Payment authorization matrix

| Actor | Change `payment_status` | Read others’ token | Save token for others |
|-------|-------------------------|--------------------|------------------------|
| Customer | **deny** (Data API + API) | deny | deny |
| Staff | Only via audited API (Wave 3 policy) | tenant-scoped | N/A |
| Webhook | allow with provider proof | N/A | internal only |

### Authentication matrix

| State | Expected |
|-------|----------|
| Unauthenticated | 401 on protected |
| Customer | role-appropriate |
| Staff | role-appropriate |
| Admin | role-appropriate |
| Inactive | 401 |
| Deleted | 401 |

---

## RELEASE BLOCKERS

Must be closed before any “production ready” claim:

1. **F-01** Unauthenticated admin service-role APIs  
2. **F-02** Auth manage login bypass  
3. **F-03** Unauthenticated payment-token get/save  
4. **F-04** Voucher manage IDOR  
5. **F-05a** Payments customer UPDATE / status  
6. **F-05b** reminder_logs open SELECT/INSERT  
7. **F-08** database/query insert tenant force  
8. **F-07** Inactive/deleted auth gate  
9. **F-06** Webhook credit amount (before shipping hybrid payment changes; treat as ship blocker for payment-related releases)  
10. **R-01, R-03, R-04** Cross-tenant API holes  
11. **R-02** Invoice BOLA (tenant-internal catastrophic)

---

## DEFINITION OF DONE (global)

A finding is **solved** only when **all** are true:

1. **Root cause fixed** (not a client-only guard)  
2. **Existing required functionality preserved** (callers migrated)  
3. **Automated unit/integration tests** for the fix  
4. **Negative/security tests** (matrices above) green in CI  
5. **Tenant isolation verified via direct API** (not only UI) where applicable  
6. **Regression risk reviewed** (callers, webhook, RLS side effects)  
7. **Senior engineering re-audit** of the changed surface  
8. **Security re-audit** of the changed surface (attacker re-test of the finding IDs)

**Not solved:** “we added requireAdmin to one file” without middleware inventory / tests / RLS where Data API applies.

### Production readiness checklist

- [ ] Wave 1 complete + tests  
- [ ] Wave 2 complete + tests  
- [ ] Wave 3 complete + tests (if payments in use — **yes for Simy**)  
- [ ] Live RLS re-query confirms F-05a/F-05b closed  
- [ ] Unauth probe of former F-01/F-03 endpoints returns 401  
- [ ] E2E isolation + login green  
- [ ] Dual re-audit (engineering + security) signed off  
- [ ] No open CRITICAL from re-audit  

---

## FINAL RECOMMENDATION

# 🔴 DO NOT DEPLOY

**🟡 NOT READY — FIXES REQUIRED** is insufficient while CRITICAL unauthenticated service-role access, live cross-tenant `reminder_logs` SELECT, and customer `payment_status` UPDATE remain **VERIFIED** in production.

Ship **only after Waves 1–3** meet Definition of Done and both re-audits pass. Wave 4 may follow without blocking a security hotfix release of Waves 1–2 (RLS + unauth endpoints) if product accepts temporary payment completion quirks — **but F-06 should not lag** if hybrid credit+Wallee is live.

---

## NOT VERIFIED — EVIDENCE MISSING

| Item | Note |
|------|------|
| Whether every production cron/env has `CRON_SECRET` set | Code fail-open if unset on some routes; env not inspected |
| Whether UI still calls `get-user-payment-token` | No frontend references found; endpoint still mounted |
| Exhaustive inventory of **all** `/api/admin/**` without auth | Heuristic used; Wave 2 requires full inventory |
| Active exploitation in the wild | Out of scope |
| Exact row counts / blast radius of `reminder_logs` | PII columns + open SELECT verified; full dump not performed |

---

## Audit metadata

| Item | Value |
|------|--------|
| Plan file | `/audits/2026-09-02-remediation-plan.md` |
| Source/DB changes in this task | **None** |
| Live DB re-check | `payments.customer_update_own`, `reminder_logs` open policies — still present |
| Prior audits | Engineering + Security 2026-09-02 |
