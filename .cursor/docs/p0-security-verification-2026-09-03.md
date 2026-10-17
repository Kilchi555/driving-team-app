# P0 Security Verification — SEC-C01 / C02 / C03

**Date:** 2026-09-03  
**Branch:** `cursor/p0-security-verification-3e7f` (from `origin/main`)  
**Scope:** Targeted verification only — no code, RLS, migration, or config changes  
**Live DB:** Supabase project `unyjaetebnaexaflpyoc` (Driving Team App)  
**Live HTTP:** `https://app.simy.ch`  

**Method:** Repository/middleware/auth chain review + live `pg_policies` / privileges / triggers + safe probes (unauthenticated HTTP; RLS UPDATE tests inside `BEGIN…ROLLBACK` only).

---

## SEC-C01

**Claim:**  
Live RLS on `users` allows a non-privileged authenticated user to UPDATE `role`, `tenant_id`, and/or `admin_level`, enabling privilege escalation and/or tenant escape.

### Actual Request Flow

Not an HTTP API finding. Attack path:

```
Browser / attacker client
  → Supabase JS (anon key + user JWT)
  → PostgREST
  → PostgreSQL RLS on public.users
  → UPDATE own row (auth_user_id = auth.uid())
```

App APIs that later call `getAuthenticatedUser()` re-read `users.role` / `users.tenant_id` from the DB and would honor the escalated values.

### Authentication

Requires a valid Supabase Auth session (`authenticated` role). Unauthenticated / `anon` has table grants but **no** matching UPDATE policy → anon UPDATE blocked by RLS.

### Authorization / Tenant Enforcement

**None at column level.** Live policy `user_update_own`:

- `USING (auth_user_id = auth.uid())`
- `WITH CHECK (auth_user_id = auth.uid())`

No restriction that `role`, `tenant_id`, `admin_level`, or `is_active` remain unchanged.

### Database / RLS Protection

| Check | Result |
|-------|--------|
| RLS enabled on `users` | **Yes** (`relrowsecurity = true`) |
| UPDATE policy for `authenticated` | `user_update_own` only (permissive) |
| Column UPDATE privilege on `role` | **Yes** (`authenticated`) |
| Column UPDATE privilege on `tenant_id` | **Yes** |
| Column UPDATE privilege on `admin_level` | **Yes** |
| Triggers blocking role/tenant change | **No** |
| Existing triggers | `create_student_credit_trigger` (AFTER INSERT, client only); `trigger_create_staff_cash` (AFTER INSERT OR **UPDATE OF role**) — creates cash register when role becomes `staff`; **does not prevent** escalation |
| FK on `tenant_id` | References `tenants(id)` — blocks invalid UUIDs, **allows** any existing tenant |

Repo migrations (`migrations/fix_users_rls_ultra_safe.sql`, `fix_users_rls_data_leak.sql`, `fix_rls_cleanup_duplicates.sql`) historically define the same permissive `WITH CHECK (auth_user_id = auth.uid())` pattern — consistent with live state.

### Counter-Evidence Checked

| Layer | Present? | Protects C01? |
|-------|----------|---------------|
| Restrictive RLS / column freeze | No | — |
| BEFORE UPDATE trigger on role/tenant | No | — |
| CHECK constraint on `role` | No | — |
| Column REVOKE of UPDATE on privileged cols | No — UPDATE granted | — |
| Server-only writes for role changes | Partial intent (many APIs) but **client PostgREST still allowed** | No |
| `FORCE ROW LEVEL SECURITY` | `relforcerowsecurity = false` (irrelevant for `authenticated`) | — |

### Safe Test

Executed on live DB inside a single transaction, then **ROLLBACK** (post-check confirmed original row unchanged):

1. `SET LOCAL ROLE authenticated` + JWT `sub` = client user `9207aab5-…` (row prefix `410e054a`, originally `role=client`, tenant prefix `64259d68`).
2. `UPDATE users SET role = 'admin' … RETURNING role` → **`admin`**.
3. Separate txn: `UPDATE … SET tenant_id = <other existing tenant 05237207-…>, admin_level = 'full'` → **`tenant_after=05237207`, `admin_level_after=full`**.
4. After ROLLBACK: row still `role=client`, original tenant, `admin_level=null`.

**Conclusion of test:** A normal client can change own `role`, `tenant_id`, and `admin_level` under live RLS. Tenant escape to another real tenant ID succeeds at the DB layer.

### Observed / Determined Result

Privilege escalation and tenant escape are **possible via PostgREST** for any authenticated user who can update their own `users` row. No production data was left modified.

### Status

**CONFIRMED**

### Verified Severity

**CRITICAL**

### Confidence

**HIGH**

### Why

Live policy + column privileges + successful authenticated UPDATE in a rolled-back transaction. Triggers do not block; FK only requires a valid tenant. This is not a false positive from missing middleware — it is a data-plane / RLS defect.

---

## SEC-C02

**Claim:**  
`GET /api/tenant-admin/marketing-overview` is reachable without sufficient authentication/authorization and can disclose cross-tenant data.

### Actual Request Flow

```
HTTP GET /api/tenant-admin/marketing-overview?days=&tenant_id=
  → Nitro route: server/api/tenant-admin/marketing-overview.get.ts
  → server/middleware/01.auth-cookie-to-header.ts  (copies cookie→Authorization only; no enforce)
  → server/middleware/validate-tenant.ts           (explicitly skips /api/*)
  → Handler: NO getAuthenticatedUser / requireSuperAdmin
  → getSupabaseAdmin()  (service role, bypasses RLS)
  → Parallel SELECTs on marketing_*, booking_events, appointments, tenants, …
  → Optional filter: if query.tenant_id set, some queries filter; default = ALL tenants
  → JSON response (ok, summary, tenants[], ads, funnel, …)
```

UI caller: `pages/tenant-admin/marketing.vue` (`$fetch` without credentials gate on the API). Page meta: `layout: 'tenant-admin'` only — **no** `middleware: ['superadmin']`. Layout may redirect unauthenticated **browsers** for the HTML page; that does **not** protect the API.

### Authentication

**Not required** by the handler. Live probe:

```text
GET https://app.simy.ch/api/tenant-admin/marketing-overview?days=1
→ HTTP 200
→ ok: true
→ tenants: length 16 (fields include id, name, slug)
→ summary includes bookings, sessions, googleSpend, metaSpend, totalAdSpend, funnel metrics, …
→ adsCampaigns, channels, topGa4Pages, quickWins present
```

### Authorization

**None.** No role check. Sibling under same prefix **does** enforce auth:

```text
GET https://app.simy.ch/api/tenant-admin/sessions
→ HTTP 401 Unauthorized
```

(`sessions.get.ts` uses `requireSuperAdmin`.) This is strong counter-evidence that platform auth works when implemented — this route simply omits it.

### Tenant Enforcement

- Client may pass `tenant_id` query param (fully client-controlled).
- Default (omitted): aggregates **across all tenants**.
- Probe with bogus `tenant_id=00000000-0000-4000-8000-000000000099` still returned **HTTP 200** with `tenants` list length 16 (tenant directory still loaded; booking summary filtered to 0 for that id). No auth barrier.

### Database / RLS Protection

**Bypassed.** Handler uses `getSupabaseAdmin()` / service role. RLS on underlying tables is irrelevant for this path.

### Counter-Evidence Checked

| Layer | Present? | Protects C02? |
|-------|----------|---------------|
| Handler auth (`requireSuperAdmin`) | **Missing** on this file; present on most other `tenant-admin/*` | No |
| Global / server middleware auth | Cookie→header only; tenant middleware skips `/api/` | No |
| Client page middleware | marketing.vue has **no** `superadmin` middleware | UI only, not API |
| `nuxt.config` `routeRules` auth | SSR/cache only — no API auth | No |
| `vercel.json` IP allowlist for this path | Not found | No |
| WAF blocking unauth | Live unauth **200** | No |
| RLS | Bypassed by admin client | No |

### Safe Test

1. Unauthenticated GET `days=1` → **200** + cross-tenant marketing payload (summarized above; no row-level customer PII dumped in this report).  
2. Unauthenticated GET with attacker-chosen `tenant_id` → **200**.  
3. Contrast: unauthenticated GET `/api/tenant-admin/sessions` → **401**.

No authenticated Tenant A session was required to prove the gap (endpoint is open to the world). Tenant-A-vs-B abuse is therefore moot for auth — any caller can request any/all tenants.

### Observed / Determined Result

Finding stands: unauthenticated, service-role, cross-tenant marketing/ops intelligence disclosure on production.

### Status

**CONFIRMED**

### Verified Severity

**CRITICAL**

### Confidence

**HIGH**

### Why

Code path has zero auth; live production returns 200 with multi-tenant aggregates and tenant directory; sibling routes correctly return 401.

---

## SEC-C03

**Claim:**  
`POST /api/appointments/resend-confirmation` is reachable without auth and can disclose confirmation tokens / sensitive information.

### Actual Request Flow

```
HTTP POST /api/appointments/resend-confirmation
  Body: { appointmentId }
  → server/api/appointments/resend-confirmation.post.ts
  → middleware: same as C02 (no API auth enforcement)
  → Handler: NO auth / NO tenant / NO role check
  → getSupabaseAdmin()
  → SELECT appointments (*) + users(email, names) + staff names BY appointmentId only
  → If confirmation_token missing: UPDATE mint new UUID (write path)
  → If token exists: no write
  → Response JSON: { success, confirmationToken, confirmationLink, message }
  → Email send: TODO / not executed (returns link for “manual” send)
  → logger.debug may log email + link server-side
```

### Authentication

**Not required.** Evidence:

```text
POST …/resend-confirmation  {"appointmentId":"00000000-0000-4000-8000-000000000001"}
→ HTTP 404 Appointment not found
```

(If auth were required, expected **401** before appointment lookup — same pattern as secured siblings.)

### Authorization / Tenant Enforcement

**None.** Any caller who knows/guesses an appointment UUID can load that row **cross-tenant** via service role (`.eq('id', appointmentId)` only).

### Token / Sensitive Exposure

Live probe against an appointment that **already had** a `confirmation_token` (read-only path; no mint/UPDATE):

```text
POST …/resend-confirmation  {"appointmentId":"<existing-uuid>"}
→ HTTP 200
→ success: true
→ confirmationToken: <36-char UUID>   (redacted in report)
→ confirmationLink: /confirm/<token>
→ message: "Appointment reset successfully. Confirmation email should be sent manually."
```

Email is loaded in the handler for logging but **not** included in the JSON body. Token and capability URL **are** returned.

### Can the token unlock a protected function?

| Consumer | Notes |
|----------|-------|
| `composables/useReminderService.ts` | Builds `${baseUrl}/confirm/${confirmation_token}` for customer reminders |
| `GET /confirm/<token>` on production | Returns SPA HTML 200 (no dedicated `pages/confirm/[token].vue` in tree; likely catch-all/`[slug]` shell) |
| `POST /api/appointments/confirm` | **Does** require auth; uses `appointmentId` + ownership — **not** the token |

So: **token disclosure is confirmed**. Whether `/confirm/<token>` currently performs a privileged state change without further auth is **partially unclear** from routing (no dedicated page file); the reminder system still treats the token URL as the customer confirmation capability, and the API leak remains a sensitive secret disclosure + IDOR.

### Counter-Evidence Checked

| Layer | Present? | Protects C03? |
|-------|----------|---------------|
| Handler auth | **No** | No |
| Server middleware auth | No enforce | No |
| Internal secret header | **No** (unlike some email internals) | No |
| RLS | Bypassed by admin client | No |
| Confirm mutation API auth | Exists on `appointments/confirm.post.ts` | Does **not** protect this resend endpoint |
| “Email only, no token in response” | False — token in response | No |

### Safe Test

1. Unauth + nonexistent UUID → **404** (proves no auth gate).  
2. Unauth + existing appointment **with** token → **200** + `confirmationToken` / `confirmationLink` (no DB write because token already present).  
3. Values redacted; no bulk enumeration performed.

### Observed / Determined Result

Unauthenticated IDOR + confirmation token / link disclosure on production. Cross-tenant by appointment UUID. Email not in response body but loaded server-side.

### Status

**CONFIRMED**

### Verified Severity

**CRITICAL** (token/capability disclosure + unauthenticated cross-tenant appointment access via service role).  
Note: full “confirm appointment without login via `/confirm/token`” UX path is **not fully mapped** to a dedicated page; that sub-aspect alone would be NEEDS VERIFICATION, but it does **not** downgrade the confirmed API leak.

### Confidence

**HIGH** (for unauth + token in response + IDOR).  
**MEDIUM** (for end-to-end customer confirm UX solely via `/confirm/<token>` page).

### Why

Handler has no auth; production returns tokens for real appointment IDs; admin client bypasses RLS; sibling confirm API shows the team knows how to gate similar operations.

---

## FINAL SUMMARY

| Finding | Status | Severity | Confidence |
|---------|--------|----------|------------|
| SEC-C01 | **CONFIRMED** | CRITICAL | HIGH |
| SEC-C02 | **CONFIRMED** | CRITICAL | HIGH |
| SEC-C03 | **CONFIRMED** | CRITICAL | HIGH (API leak); MEDIUM (confirm-page UX) |

---

## MUST FIX BEFORE PRODUCTION

1. **SEC-C01** — Freeze privileged columns on `users` (`role`, `tenant_id`, `admin_level`, `is_active`, `auth_user_id`): restrictive WITH CHECK and/or BEFORE UPDATE trigger and/or REVOKE column UPDATE from `authenticated`. Re-test PostgREST self-UPDATE.  
2. **SEC-C02** — Add `requireSuperAdmin` (or equivalent) to `marketing-overview`; never default to all-tenants for non-superadmin; re-test unauth → 401.  
3. **SEC-C03** — Require staff/admin of owning tenant (or remove endpoint); never return `confirmationToken` to callers; re-test unauth → 401 and no token in body.

---

## NEEDS VERIFICATION

- Exact customer UX behind `/confirm/<token>` (no dedicated page file; SPA shell returns 200).  
- Whether any edge/WAF rules exist outside this repo for non-production environments (production probes show none for these paths).  
- Whether inactive/deleted users retain Auth sessions that could use SEC-C01 (orthogonal to C01 root cause).

---

## FALSE POSITIVES / MITIGATED

- None of SEC-C01 / C02 / C03.  
- Counter-examples that **do** work correctly (not mitigations of these findings):  
  - `/api/tenant-admin/sessions` → 401 unauthenticated  
  - `/api/appointments/confirm` → requires auth + ownership  
  - Most other `server/api/tenant-admin/*` handlers call `requireSuperAdmin`

---

## ABSOLUTE RULE COMPLIANCE

- No application code changes  
- No RLS / migration / test / config changes  
- No intentional persistent production data mutation (C01 tests rolled back; C03 used existing-token read path)  
- Verification report only
