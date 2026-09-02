# F-01 Verification Audit — Service-Role APIs & Public Booking

**Date:** 2026-09-02  
**Finding under review:** F-01 — Unauthenticated service-role admin APIs  
**Mode:** Absolute read-only (no source/DB/RLS/env/dependency changes)  
**Scope:** Every endpoint named in F-01, plus reconstruction of public booking vs privileged service-role use  
**Git context:** `cursor/senior-engineer-audit-bb9a` (based on `origin/main`)  
**Live schema:** Supabase `unyjaetebnaexaflpyoc` (column inventory for affected tables)

---

## Executive Summary

F-01 is **not** a misunderstanding of public booking.

All **seven** endpoints originally listed under F-01 live under `/api/admin/**`, use the **Supabase service role**, perform **privileged reads or mutations**, and have **no server-side authentication, authorization, cron secret, or webhook secret**.

**None** of them are part of the public booking page flow.

UI pages that call some of these APIs use Nuxt route middleware (`auth` / `superadmin`). That is **browser UX only** and does **not** protect the API when an attacker sends HTTP requests directly.

Legitimate public booking **does** exist (e.g. `/api/booking/get-available-slots`) and may use service role for precomputed slots — that pattern is **Fall A** and is **out of F-01’s endpoint list**. Confusing Fall A with Fall B was the risk this audit was asked to avoid; after verification, F-01 endpoints are **Fall B**.

### F-01 Overall Verdict

# F-01 VERIFIED — CRITICAL

### Service-Role-Key Rotation

# NO

(rotation does not remediate F-01; key not shown delivered to clients — see final section)

### Production Blocker

# YES

---

## Method

For each F-01 endpoint:

1. Read full handler source  
2. Search repo for callers (`$fetch`, docs, composables)  
3. Check for auth helpers, secrets, tenant checks  
4. Map tables/columns and mutation capability  
5. Classify A–F  

Separately, sampled public booking routes to establish the **intended** unauthenticated pattern (contrast).

**Assumption rejected:** “No login ⇒ vulnerability.”  
**Assumption applied:** Client body/query IDs are attacker-controlled; Nuxt page middleware is not API auth.

---

## Public Booking Context (Fall A — contrast, not F-01)

### Intended unauthenticated booking flow (reconstructed)

```text
Browser (no account)
  → Public booking UI (/booking/..., slug pages)
  → /api/booking/*  (e.g. get-available-slots, get-tenant-by-slug, get-locations, preview-price, guest-book, …)
  → Optional rate limit / input validation
  → Server Supabase client (anon OR service role depending on route)
  → Narrow SELECT of public-safe fields scoped by tenant_id / slug
  → Response: slots, branding, categories — not admin payment ledgers
```

**Example — consciously public:**

| Aspect | `GET /api/booking/get-available-slots` |
|--------|----------------------------------------|
| Public by design | **YES** (file header documents “Public endpoint”) |
| Auth | None (browsing) |
| Rate limit | Yes (`checkRateLimit`, 100/min) |
| Tenant | Query `tenant_id` required — **client-controlled**, used as filter for availability |
| Service role | **YES** (`getSupabaseAdmin()`) despite comment saying anon/RLS |
| Data returned | Slot schedule fields only (staff_id, times, location_id, …) — not payments/PII dumps |
| Mutations | None in this handler |
| F-01? | **NO — not in F-01 list** |

**Example — public with anon key:**

| Aspect | `POST /api/booking/get-tenant-by-slug` |
|--------|----------------------------------------|
| Public by design | YES |
| Client | Anon key (`SUPABASE_ANON_KEY`) |
| Select | Branding fields only (`id, name, slug, colors, logos…`) |
| F-01? | **NO** |

**Assessment of Fall A:** Unauthenticated booking is **legitimate**. Using service role on some booking reads is a **hardening concern** (prefer anon + RLS or stricter projection), but it is **not** the same defect as unauthenticated `/api/admin/*` with `select('*')` / `delete` / cross-tenant payment dumps.

**F-01 endpoints are not used by public booking** (caller search: no `/booking` or public pages reference them).

---

## Per-Endpoint Verification (F-01 list)

---

### Endpoint: `/api/admin/cron-status`

**Classification:** C (+ D for any future auth — must be admin/super_admin and tenant-scoped)

**Original F-01 Finding:** Unauthenticated service-role admin API exposing payment/cron state.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** **None** in handler.  
**Authorization:** **None**.  
**Tenant validation:** **None** — queries all matching `payments` rows globally.  
**Service Role:** YES (`getSupabaseAdmin()` from `~/utils/supabase`, server-only loader).  

**Caller(s):**  
- `pages/admin/cron-status.vue` → `$fetch('/api/admin/cron-status')`  
- Page has `middleware: 'superadmin'` (**UI only**)  
- Nav link in `layouts/tenant-admin.vue`  

**Internal secret / cron secret:** **None** on this route.

**Data accessible (read):**  
- `cron_logs` (`select *`, last 20)  
- `payments`: authorized pending/overdue/waiting/processed rows including `id`, `appointment_id`, `scheduled_payment_date`, `wallee_transaction_id`, statuses  
- Aggregate stats by loading **all** payment status rows into memory (`select payment_status, automatic_payment_processed, automatic_payment_consent` with **no tenant filter**)

**Mutations possible:** None in this handler (read-only).

**Cross-tenant risk:** **YES** — no `tenant_id` filter on payment queries.

**Attacker scenario (no account):**  
`GET https://app…/api/admin/cron-status` → inventory automatic-payment pipeline across tenants + Wallee transaction IDs + appointment IDs.

**Evidence:**  
- File: `server/api/admin/cron-status.get.ts`  
- Function: default `defineEventHandler`  
- Lines 8–68: service role + unscoped payment selects  
- Caller: `pages/admin/cron-status.vue:255`  

**Security assessment:** Privileged operational/financial intel. **Not** public booking. Page middleware irrelevant to direct HTTP.

**Required action:** AUTH + AUTHORIZATION (super_admin or admin + tenant scope) / INTERNAL SECRET if only ops tooling

---

### Endpoint: `/api/admin/get-billing-addresses`

**Classification:** C + D  

**Original F-01 Finding:** Unauthenticated service-role read of billing addresses by `studentIds`.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None  
**Tenant validation:** None  
**Service Role:** YES (`createClient(URL, SUPABASE_SERVICE_ROLE_KEY)`)

**Caller(s):**  
- `pages/customers.vue` (`middleware: 'auth'` UI only) posts `{ studentIds }` after loading students  

**Client-controlled input:** `studentIds[]` — attacker-chosen UUIDs.

**Data accessible:**  
`company_billing_addresses` `select *` where `user_id IN studentIds` and `is_active` — live columns include `company_name`, `contact_person`, `email`, `phone`, `street`, `zip`, `city`, `vat_number`, `company_register_number`, `tenant_id`, `user_id`, notes.

**Mutations:** None.

**Cross-tenant risk:** **YES** — any known/guessed `user_id` returns rows regardless of tenant.

**Attacker scenario:**  
`POST /api/admin/get-billing-addresses` `{ "studentIds": ["<uuid>"] }` → company billing PII.

**Evidence:**  
- File: `server/api/admin/get-billing-addresses.post.ts`  
- Lines 7–30  

**Security assessment:** Classic IDOR + missing auth. Admin enrichment for customers page, not booking.

**Required action:** AUTH + AUTHORIZATION (staff/admin) + tenant membership check on every `studentId`

---

### Endpoint: `/api/admin/get-student-instructors`

**Classification:** C + D  

**Original F-01 Finding:** Unauthenticated mapping of students → instructors via appointments.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None  
**Tenant validation:** None  
**Service Role:** YES  

**Caller(s):** `pages/customers.vue` (auth middleware UI only)

**Client-controlled input:** `studentIds[]`

**Data accessible:**  
- `appointments`: `user_id`, `staff_id` for those students (all tenants)  
- `users`: `id`, `first_name`, `last_name` for those staff  

**Mutations:** None.

**Cross-tenant risk:** **YES**

**Attacker scenario:** Probe student UUIDs → learn instructor graph / confirm account existence.

**Evidence:** `server/api/admin/get-student-instructors.post.ts` lines 7–58  

**Required action:** AUTH + AUTHORIZATION + tenant filter on appointments/users

---

### Endpoint: `/api/admin/remove-user-device`

**Classification:** C + D  

**Original F-01 Finding:** Unauthenticated delete of `user_devices` via service role.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None (comment “Extra security check” only re-asserts body `userId` on the delete filter — **not** caller identity)  
**Tenant validation:** None  
**Service Role:** YES  

**Caller(s):** `components/DeviceManager.vue` — sends `deviceId` + `userId` from client auth store (still forgeable).

**Client-controlled input:** `deviceId`, `userId`

**Data accessible / mutations:**  
`DELETE FROM user_devices WHERE id = deviceId AND user_id = userId` — returns deleted rows. Table holds `ip_address`, `user_agent`, `mac_address`, geo fields, `verification_token`, `is_trusted`, etc.

**Cross-tenant risk:** **YES** if attacker knows/guesses `deviceId`+`userId` pairs (or learns them from other leaks).

**Attacker scenario:**  
Unauth `POST` with victim IDs → remove trusted devices / disrupt device security UX.

**Evidence:**  
- File: `server/api/admin/remove-user-device.post.ts` lines 5–34  
- Caller: `components/DeviceManager.vue:302-307`  

**Security assessment:** Privileged **mutation**. Definitely Fall B. Not booking.

**Required action:** AUTH + AUTHORIZATION (caller must own device or be admin of same tenant)

---

### Endpoint: `/api/admin/calculator-stats`

**Classification:** C (+ D if multi-tenant data)

**Original F-01 Finding:** Unauthenticated aggregate of `calculator_events`.

**Public by design:** NO (under `/api/admin`)  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None  
**Tenant validation:** None (table has no `tenant_id` column in live schema — platform-wide marketing analytics)  
**Service Role:** YES  

**Caller(s):** **No frontend `$fetch` callers found** in `*.ts`/`*.vue` (orphan/admin tooling candidate). Website inserts events via `apps/website/server/api/calculator-events.post.ts` separately.

**Client-controlled input:** Query `days` (default 30).

**Data accessible:** Aggregated opens/submissions/conversion by `category` from `calculator_events` (`event_type`, `category`, `date`, `session_id` exists on table but not selected here).

**Mutations:** None.

**Cross-tenant risk:** **UNCLEAR / N/A for tenant_id** — events appear global marketing metrics, not per-tenant SaaS data. Still **privileged internal analytics** exposed publicly.

**Attacker scenario:** Scrape conversion funnels / category interest without auth.

**Evidence:** `server/api/admin/calculator-stats.get.ts` lines 3–52  

**Security assessment:** Lower blast radius than payment/billing endpoints, but still **not** a safe public API and **not** booking. Classification remains **C** (should require admin/super_admin). Not FALSE POSITIVE.

**Required action:** AUTH (admin/super_admin) or remove if unused

---

### Endpoint: `/api/admin/pendencies/update-overdue`

**Classification:** E (intended batch job) currently reachable as **C**

**Original F-01 Finding:** Unauthenticated mass update of pendencies.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None  
**Tenant validation:** None — updates **all tenants** matching status/date  
**Service Role:** YES (`getSupabaseAdmin()`)  
**Cron/internal secret:** **None**

**Caller(s):** **No** references to this API path in app code. `composables/usePendencies.ts` implements overdue updates **client-side** via direct Supabase (`updatePendency`), not this route. Endpoint appears **orphaned but live**.

**Mutations:**  
`UPDATE pendencies SET status='überfällig' WHERE due_date < now AND status IN ('pendent','in_bearbeitung') AND deleted_at IS NULL` — **global**.

**Cross-tenant risk:** **YES** (writes across all tenants).

**Attacker scenario:** Spam `POST /api/admin/pendencies/update-overdue` → mass status flip / workflow disruption.

**Evidence:** `server/api/admin/pendencies/update-overdue.post.ts` lines 1–16  

**Required action:** INTERNAL SECRET (cron) **or** AUTH admin; prefer fail-closed cron assert; or delete if unused

---

### Endpoint: `/api/admin/pendencies/handle-recurrence`

**Classification:** E / C (orphaned privileged mutator)

**Original F-01 Finding:** Unauthenticated create of recurring pendencies.

**Public by design:** NO  
**Used by public booking:** NO  

**Authentication:** None  
**Authorization:** None  
**Tenant validation:** Copies `tenant_id` from loaded row (not from attacker body) — but attacker chooses `pendencyId`  
**Service Role:** YES  
**Secret:** None  

**Caller(s):** **None** found. UI recurrence handled in `usePendencies.handleRecurrence` via client insert.

**Client-controlled input:** `pendencyId`

**Data accessible:** Full pendency row (`select *`) including `title`, `description`, `notes`, `attachments`, `assigned_to`, `tenant_id`.

**Mutations:** `INSERT` new pendency clone with advanced due date.

**Cross-tenant risk:** **YES** — any `pendencyId` from any tenant can be read and cloned.

**Attacker scenario:** Enumerate/guess pendency UUIDs → read internal task content; spam duplicate tasks.

**Evidence:** `server/api/admin/pendencies/handle-recurrence.post.ts` lines 1–66  

**Required action:** INTERNAL SECRET or AUTH + tenant; or delete orphan

---

## Summary Table

| Endpoint | Public by Design | Booking | Service Role | Auth | Authorization | Tenant Safe | Risk | Action |
|----------|------------------|---------|--------------|------|---------------|-------------|------|--------|
| `/api/admin/cron-status` | NO | NO | YES | None | None | NO | CRITICAL | AUTH + tenant scope |
| `/api/admin/get-billing-addresses` | NO | NO | YES | None | None | NO | CRITICAL | AUTH + AUTHZ + tenant |
| `/api/admin/get-student-instructors` | NO | NO | YES | None | None | NO | CRITICAL | AUTH + AUTHZ + tenant |
| `/api/admin/remove-user-device` | NO | NO | YES | None | None | NO | CRITICAL | AUTH + ownership/admin |
| `/api/admin/calculator-stats` | NO | NO | YES | None | None | N/A (global table) | HIGH | AUTH or remove |
| `/api/admin/pendencies/update-overdue` | NO | NO | YES | None | None | NO | CRITICAL | INTERNAL SECRET / AUTH |
| `/api/admin/pendencies/handle-recurrence` | NO | NO | YES | None | None | NO | CRITICAL | INTERNAL SECRET / AUTH |

**Classifications:** All **C** (and **D** where tenant/role required); pendencies also **E** by intended use but **not protected**. **Zero** endpoints classified **A** or **F**.

---

## Answers to the 16 Checklist Questions (aggregate for F-01 set)

| # | Question | Answer for F-01 set |
|---|----------|---------------------|
| 1 | Intentionally public? | **NO** for all seven |
| 2 | Used by public booking? | **NO** |
| 3 | Called from browser/client? | **YES** for cron-status, billing-addresses, student-instructors, remove-user-device; **NO callers found** for calculator-stats & pendencies APIs (still reachable) |
| 4 | Auth required? | **NO** (server) |
| 5 | Authorization required? | **NO** |
| 6 | `tenant_id` from client? | Not used; worse — **no tenant filter** (except recurrence copies from fetched row) |
| 7 | `user_id` from client? | **YES** for billing, instructors (`studentIds`), remove-device (`userId`) |
| 8 | Service role used? | **YES** all |
| 9 | RLS bypassed? | **YES** — service role bypasses all RLS |
| 10 | Data readable? | Payments, billing PII, appointments/staff names, devices (via delete return), calculator aggregates, full pendency rows |
| 11 | Mutations? | Device **DELETE**; pendencies **UPDATE** (global) + **INSERT** (recurrence) |
| 12 | Cross-tenant? | **YES** (except calculator_events has no tenant_id) |
| 13 | Privileged admin functions? | **YES** (ops payment intel, billing dump, device removal, task mutation) |
| 14 | Internal/cron/webhook secret? | **NO** on these routes |
| 15 | Secret cryptographically effective? | N/A — absent |
| 16 | Legitimate internal callers? | UI admin/customers/device manager for four routes; pendencies/calculator appear orphaned; **webhook/cron do not call these** |

---

## Service Role Loading (F-01)

| Path | How key is loaded |
|------|-------------------|
| `getSupabaseAdmin()` | `utils/supabase.ts` — **server-only** (`if (!process.server) throw`); env `SUPABASE_SECRET_KEY` \|\| `SUPABASE_SERVICE_ROLE_KEY` |
| Direct `createClient` | Several admin files read `process.env.SUPABASE_SERVICE_ROLE_KEY` inline |

**Client delivery check:**  
`nuxt.config.ts` places `supabaseServiceRoleKey` / `secretKey` under **private** `runtimeConfig`, **not** under `runtimeConfig.public`.  
`getSupabaseAdmin` refuses non-server use.

**Conclusion:** No evidence F-01 itself **exfiltrates** the service-role key to browsers. Attackers abuse **privileged capabilities** through unauthenticated HTTP, which is different from possessing the key.

Could these use authenticated user clients + RLS instead?  
**Yes** for billing/instructors/devices (with proper policies). Cron-status aggregates might stay service-role **behind auth**. Pendencies batch jobs should be cron-secret + service role.

---

## F-01 Overall Verdict

# F-01 VERIFIED — CRITICAL

**Reasoning:**  
At least six endpoints allow dangerous cross-tenant reads or mutations without auth. None are “safe public booking.” UI middleware does not mitigate direct API access. calculator-stats is lower severity but still wrongly public under `/api/admin`.

**Not** FALSE POSITIVE.  
**Not** merely PARTIALLY VERIFIED — every listed endpoint fails the privileged-access test; severity varies, authenticity of the finding does not.

---

## Service-Role-Key Rotation Decision

# NO

| Criterion | Evidence-based answer |
|-----------|----------------------|
| 1. Key only used server-side? | **YES** (for these paths / config layout) |
| 2. Key indirectly abuseable via public route? | **Capabilities** abuseable — **not** the raw key |
| 3. Key delivered to client? | **No evidence** |
| 4. Evidence of actual compromise / key leak? | **None** in this audit |
| 5. Rotation as defense-in-depth? | Optional hygiene **after** auth fixes; **does not close F-01** |

**Why not YES:** Rotating the key while leaving these routes unauthenticated means the **new** key is immediately usable the same way by the same unauthenticated handlers. Rotation without auth is theater.

**When CONDITIONAL would become YES:** If logs/incident response show the service-role JWT/secret was copied off-server, committed, or returned in a response — **NOT VERIFIED** here.

---

## Production Blocker

# YES

Unauthenticated privileged admin APIs with service-role DB access are ship blockers for a multi-tenant SaaS, independent of public booking legitimacy.

---

## Next Recommended Step

1. **Do not rotate the service-role key as the primary fix.**  
2. Implement Wave 1 item **F-01** from `/audits/2026-09-02-remediation-plan.md`: fail-closed auth on all seven routes (or delete orphans).  
3. Prefer a single `/api/admin/**` server middleware requiring `requireAdminProfile` / super_admin, plus tenant filters on IDOR bodies.  
4. Pendencies routes: wire to `assertCronRequest` or delete if unused.  
5. Re-test with unauthenticated HTTP probes (negative tests T-01).  
6. Separately (not F-01): review public booking routes that use `getSupabaseAdmin()` (e.g. get-available-slots) for least-privilege hardening — **Fall A**, classification **B** candidate, out of F-01 remediation critical path.

---

## Final Decision

| Item | Decision |
|------|----------|
| **F-01** | **VERIFIED** |
| **Service-Role-Key Rotation** | **NO** |
| **Production Blocker** | **YES** |
| **Next Recommended Step** | Auth-gate or remove the seven `/api/admin/*` endpoints; do not confuse with public booking; do not use key rotation as the fix |

---

## NOT VERIFIED — EVIDENCE MISSING

- Whether production WAF/Vercel firewall already blocks `/api/admin/*` anonymously (code does not).  
- Historical access logs proving exploitation.  
- Whether `calculator_events` is considered confidential business data by product owners (still should not be unauth under `/api/admin`).  
- Runtime confirmation that Nitro mounts all seven routes in production (Nuxt convention: yes if files exist — **standard**, not separately probed live HTTP in this read-only audit).
