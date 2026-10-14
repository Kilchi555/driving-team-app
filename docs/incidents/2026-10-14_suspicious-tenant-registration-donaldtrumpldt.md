# SIMY — Suspicious Tenant Registration Investigation

**Subject:** Tenant slug/name `donaldtrumpldt` (and related cluster)  
**Date:** 2026-10-14  
**Scope:** Investigation only — no remediation  
**Snapshot:** ~15:00 UTC  

---

## Verdict

Exact slug `donaldtrumpldt` does **not** exist in production.

Three related public self-registrations were created the same day:

- `donaldtrump-ltd`
- `2donaldtrump-ltd`
- `donaldtrump-the-real`

Pattern indicates **spam / abuse of open signup** (or non-customer testing), **not** a demonstrated tenant-isolation / cross-tenant security incident.

Onboarding allows live trial tenants without email verification. The intended `tenant_register` rate limit (3/hour/IP) did **not** contain this burst.

---

## 1. Baseline and access scope

| Item | Value |
|------|--------|
| Repo | `Kilchi555/driving-team-app` |
| Branch / HEAD | `main` @ `0770ad2e53168ff01f7c45e575eee8c1566329c5` |
| Worktree | Clean |
| Production DB | Supabase project **Driving Team App** (`unyjaetebnaexaflpyoc`) |
| Access | Read-only SQL + log queries via MCP |
| Also checked | Non-production Supabase test project (no match); restore-test project (no `tenants` relation) |

**Not used:** login-as-tenant, credential reset, impersonation, private content browsing beyond aggregates, writes, migrations, deploys, commits/pushes during investigation.

---

## 2. Tenant creation provenance and timestamps

### Exact slug

- `donaldtrumpldt`: **not found** in `tenants` or `audit_logs` details.
- Closest match: `donaldtrump-ltd` (“Donald Trump Ltd” without hyphen).

### Related cluster (production)

| Slug | Tenant ID (short) | Created (UTC) | Customer # | Path |
|------|-------------------|---------------|------------|------|
| `donaldtrump-ltd` | `7604a6f4…cd0` | 2026-10-14 14:38:05 | SM-261014-001 | Public self-registration |
| `2donaldtrump-ltd` | `d5dcf08b…e7b` | 2026-10-14 14:40:40 | SM-261014-002 | Public self-registration |
| `donaldtrump-the-real` | `c675503b…c0` | 2026-10-14 14:53:03 | SM-261014-003 | Public self-registration |

**Creation path (all three):** unauthenticated `POST /api/tenants/register` → audit `action = tenant_registration`, `status = success`.

**Not indicated:** super-admin provision, website-prospect shell (`website_only = false`, `website_status = none`).

**Shared state:** `is_active = true`, `is_trial = true`, `subscription_plan = trial`, `business_type = consulting`, trial ≈ 30 days.

**Same source IP prefix:** `103.125.235.*` for all registration audits in the window (10 events: 7 failed + 3 success).

---

## 3. Redacted identity / activity summary

### Users / auth

| Slug | User count | Admin | Notes |
|------|------------|-------|-------|
| `donaldtrump-ltd` | 0 | No | `create-admin` never completed (orphan tenant) |
| `2donaldtrump-ltd` | 0 | No | Orphan tenant |
| `donaldtrump-the-real` | 1 | Yes (primary admin) | `onboarding_status = completed`; auth email **auto-confirmed**; `last_sign_in_at` null |

- One **pending** staff invitation on `donaldtrump-the-real` (role `staff`, not accepted).
- Contact emails masked: `do***@trump.com`, `2_***@trump.com`, `3d***@trump.com`.
- Phone: same digit suffix across cluster (masked `***4567`); same phone hash for all three.
- Address signals: ZIP `6969` / city `DC` (first two); city `Washinghtom` / ZIP `1234` (third).
- Logos: none.

### Product activity

| Metric | Count |
|--------|------:|
| Appointments | 0 |
| Invoices | 0 |
| Payments | 0 |
| Courses | 0 |
| Website tenants | 0 |

Template seed present (locations, event types, tenant settings, pricing rules, cancellation reasons, evaluation criteria). No other audit actions for these `tenant_id`s beyond registration. Rollback registration events in window: **0**.

### Auth / notify side evidence

- **4 failed** `login_attempts` for `do***` / `2d***@trump.com` from the same IP prefix (consistent with orphan tenants: contact email ≠ auth user).
- Super-admin notifications: `new_tenant_registration` **sent** for all three.

### Registration attempt timeline (same /24)

| Time (UTC) | Status | Error / slug |
|------------|--------|--------------|
| 14:36–14:37 | failed ×3 | `PLZ muss 4 Ziffern haben` |
| 14:38 | **success** | `donaldtrump-ltd` |
| 14:38–14:39 | failed ×4 | slug already taken |
| 14:40 | **success** | `2donaldtrump-ltd` |
| 14:53 | **success** | `donaldtrump-the-real` |

Failed audit rows do **not** store slug → cannot prove an attempt at exact `donaldtrumpldt`.

---

## 4. Relevant code paths and authorization checks

### Creation flow

1. UI: `pages/tenant-register.vue`
2. `POST /api/tenants/register` (`server/api/tenants/register.post.ts`)
   - Unauthenticated
   - Intended rate limit: **3 / hour / IP** (`tenant_register`)
   - Email format + disposable checks
   - Slug: `/^[a-z0-9-]+$/`, length 3–50, reserved list, app + DB uniqueness
   - Placeholder name/phone heuristics (did **not** block this cluster)
   - Insert via **service_role** admin client; `is_active: true` immediately
   - Issues HMAC `registration_token` (30 min)
3. `POST /api/tenants/create-admin` (`server/api/tenants/create-admin.post.ts`)
   - Requires valid registration token bound to `tenant_id`
   - Creates auth user with **`email_confirm: true`**
   - Role `admin`, `is_primary_admin: true`
   - **No** `logAudit` in this handler

### Membership / join

| Action | Gate |
|--------|------|
| Become tenant admin after register | Valid HMAC registration token |
| Join as staff | `staff_invitations` token (tenant + email bound) |
| Join as client | Existing `tenantId`; role forced to `client` |
| Create tenant as super_admin | `server/api/admin/tenants-manage.ts` |

Ordinary users cannot join an arbitrary tenant as admin by guessing UUID alone (token required).

### Abuse controls observed

- Rate limiter: `server/utils/rate-limiter.ts` — counts `rate_limit_logs`; **fails open** on DB errors; fire-and-forget inserts (race).
- **Incident evidence:** zero `rate_limit_logs` rows for operation `tenant_register` during the burst, despite 10 registration audits from the same /24 within ~17 minutes (intended max 3/hour).

### RLS / privileges (production snapshot)

- `tenants`: RLS enabled; SELECT policies for `anon` / `authenticated` where `is_active = true`; **no** INSERT/UPDATE policies (writes expected via `service_role`).
- Effective privileges: `authenticated` has INSERT/UPDATE/DELETE/**TRUNCATE** on `tenants` without matching write RLS policies. TRUNCATE is not RLS-gated (privilege hygiene; PostgREST typically does not expose TRUNCATE).
- `appointments` / `invoices` / `payments`: tenant-scoped staff/admin policies; `service_role` bypasses RLS by design (app must filter).

---

## 5. Tenant-isolation findings and test coverage

### This incident

No evidence these tenants read or modified another tenant’s records (two have no users; third never signed in).

### Existing coverage

| Artifact | What it proves |
|----------|----------------|
| `e2e/isolation.spec.ts` | apple-review admin cannot list e2e-isolation admins (403); cannot successfully read foreign appointment |
| Vitest `require-tenant-auth`, multi-admin lifecycle, many P0/P1 authz tests | Per-helper / per-endpoint cross-tenant denial |

### Gaps (unverified — do not claim secure or vulnerable)

- Invoices / payments / courses / settings cross-tenant E2E
- Storage object ACL beyond policy skim
- Background jobs tenant binding
- Automated abuse E2E for unauthenticated `POST /api/tenants/register`

**Proposed regression tests (not executed here):** burst register > 3/hour must 429; orphan tenant without admin flagged; isolation matrix for invoices, payments, courses, settings, storage in disposable non-prod.

---

## 6. Evidence supporting or contradicting abuse

### Supports abuse / non-customer signup

- Three near-identical names/slugs in ~15 minutes
- Same /24 for all registration audits
- Joke / invalid address pattern (`6969`, `Washinghtom`)
- Celebrity-themed naming + `@trump.com`
- Two orphan tenants (no admin), then a third that completed admin + staff invite
- Zero real bookings/payments
- Failed logins for contact emails without auth accounts
- Rate limit did not stop the burst

### Limits inference / incomplete evidence

- Name alone ≠ malice (could be QA/joke)
- Email domain / single IP alone ≠ fraud
- Low usage alone ≠ malicious
- Failed audits omit slug (cannot prove `donaldtrumpldt` attempt)
- Edge log path field unavailable in tool for deeper bot/UA signals
- `create-admin` not audited

**Distinguish:** missing logs ≠ proof an event did not happen (except where positive counters exist, e.g. appointments = 0).

---

## 7. Severity, confidence, unresolved questions

| ID | Finding | Classification | Severity | Confidence |
|----|---------|----------------|----------|------------|
| F1 | Public self-serve creates live trial tenants without email verification | **CONFIRMED SECURITY ISSUE** | HIGH (abuse / cost / spam) | High |
| F2 | `tenant_register` rate limit ineffective in this incident | **CONFIRMED SECURITY ISSUE** | HIGH (abuse / cost) | High |
| F3 | Trump-themed cluster is spam/abuse (not isolation breach) | **SUSPICIOUS — MORE EVIDENCE NEEDED** | MEDIUM | Medium–High |
| F4 | Exact slug `donaldtrumpldt` absent | **LIKELY LEGITIMATE / LOW CONCERN** (naming mismatch) | LOW | High |
| F5 | Cross-tenant isolation for this incident | **INCONCLUSIVE** | N/A | Medium |

### Verified facts vs hypotheses vs unavailable

- **Facts:** three tenants exist; public register path; same /24; activity zeros; rate_limit gap; auto email confirm on create-admin.
- **Hypotheses:** intentional spam / joke signup / external tester; first two abandoned mid-wizard.
- **Unavailable:** full client User-Agent/bot score; create-admin failure reason for orphans; whether IP is known internal tester.

### Unresolved questions

1. Is `103.125.235.*` a known tester, VPN, or cloud egress?
2. Why did `create-admin` not complete for the first two tenants?
3. Is `NUXT_REGISTRATION_TOKEN_SECRET` set in production (code warns on insecure fallback)?
4. Why are `tenant_register` rows absent from `rate_limit_logs` while other `register` operations log?

---

## 8. Recommended next steps (not performed)

> Explicit separate authorization required before any enforcement or code change.

1. **Ops:** Review/suspend the three trial tenants if confirmed non-customer; preserve audit evidence before any delete.
2. **Abuse control:** Fix `tenant_register` rate-limit persistence (await insert; prefer fail-closed or circuit-break; add burst regression test).
3. **Onboarding:** Consider email verification before active trial; stronger spam heuristics; CAPTCHA; orphan-tenant cleanup job.
4. **Audit:** Log `create-admin` success/failure; store slug on failed registration audits.
5. **Isolation tests:** Expand non-production E2E to invoices, payments, courses, settings, storage.
6. **Privilege hygiene:** Review `authenticated` TRUNCATE/DML grants on `tenants` under a separate Impact Gate.

---

## 9. Integrity confirmation

**No production data was changed.**  
**No tenant was blocked, deleted, suspended, or modified.**  
**No passwords, access tokens, session cookies, API keys, or service-role keys were exposed.**  
**No remediation was implemented.** Investigation only.
