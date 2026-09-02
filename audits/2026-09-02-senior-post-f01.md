# Senior Engineering Re-Audit — Post F-01 Remediation

**Date:** 2026-09-02  
**Branch audited:** `cursor/f01-remediation-bb9a` (`d5d3c162`) vs `origin/main`  
**Mode:** Read-only (no source/DB/RLS/env/dependency changes except this report file)  
**Prior overall score:** 3.5 / 10  
**Focus:** Engineering regression, architecture, reliability, testing — **not** a full security re-audit  

---

## Executive Summary

F-01 remediation is a **focused, correct, low-blast-radius security fix**. Diff is tight (10 files), reuses existing auth helpers, adds a small shared tenant-ownership helper, deletes orphaned privileged routes, and does **not** touch public booking.

**No Critical engineering regressions** were found in the F-01 change set.

**Caveats:**

1. Tests prove **helpers**, not HTTP route boundaries — coverage gap for a CRITICAL-class fix.  
2. Live DB shows **1 `super_admin` with `tenant_id = NULL`**. Billing/instructors now use `requireAdminProfile`, which **requires** a tenant → enrichment calls on `customers.vue` will **403** for that operator (page still loads students; enrichment is best-effort and already catch-swallowed).  
3. System-wide architecture score remains low; F-01 does not fix F-02…F-08 or auth sprawl across ~1k routes.

**Production decision for merging F-01 / proceeding to next remediation wave:** **CONDITIONAL GO**

---

## 1. Git Diff Analysis

### Commits

| SHA | Message |
|-----|---------|
| `9e18cd3f` | fix(security): close F-01 unauthenticated service-role admin APIs |
| `d5d3c162` | fix(security): finish F-01 hardening and document remediation |

### Files (`origin/main...HEAD`)

| Status | Path |
|--------|------|
| A | `audits/2026-09-02-f01-remediation.md` |
| M | `server/api/admin/calculator-stats.get.ts` |
| M | `server/api/admin/cron-status.get.ts` |
| M | `server/api/admin/get-billing-addresses.post.ts` |
| M | `server/api/admin/get-student-instructors.post.ts` |
| D | `server/api/admin/pendencies/handle-recurrence.post.ts` |
| D | `server/api/admin/pendencies/update-overdue.post.ts` |
| M | `server/api/admin/remove-user-device.post.ts` |
| A | `server/utils/admin-f01-access.ts` |
| A | `server/utils/__tests__/admin-f01-access.test.ts` |

**Unexpected / out-of-scope changes:** **None.** Diff stays inside F-01. No UI, booking, payment webhook, RLS, or dependency edits.

**Side effects:** Pendencies API removal is intentional; UI uses `composables/usePendencies.ts` (client Supabase), not these routes.

**Dead code:** Orphan routes removed — positive. Empty `pendencies/` directory may remain (harmless).

---

## 2. Authentication Architecture

### Mechanisms used by F-01

| Helper | Used by |
|--------|---------|
| `requireSuperAdmin` (`server/utils/require-super-admin.ts`) | cron-status, calculator-stats |
| `requireAdminProfile` (`server/utils/auth.ts`) | billing-addresses, student-instructors |
| `getAuthenticatedUser` | remove-user-device (ownership) |
| Session → DB role/tenant | via `getAuthenticatedUser` |

**Assessment:** F-01 correctly **reused** existing helpers instead of inventing a third `requireSuperAdmin`. An early duplicate in `admin-f01-access.ts` was removed (Nuxt auto-import conflict warned during install) — good cleanup.

**Pre-existing inconsistency (not introduced by F-01):**

- Two `getSupabaseAdmin` implementations: `utils/supabase.ts` vs `server/utils/supabase-admin.ts` (cron-status uses the former; others the latter).  
- Mix of `statusMessage` vs `message` on `createError`.  
- Auth still not centrally enforced for all `/api/admin/**` (middleware fail-closed still absent).

**Verdict:** Auth for the F-01 surface is consistent enough; platform-wide auth remains fragmented.

---

## 3. Authorization Architecture

Desired flow:

```text
Authentication → Role → Tenant boundary → Resource ownership → Service role
```

F-01 implements this on the fixed routes:

| Route | Who | What | Tenant / ownership |
|-------|-----|------|--------------------|
| cron-status | super_admin | read ops + payments overview | platform-wide (by role) |
| calculator-stats | super_admin | marketing aggregates | global table |
| billing / instructors | staff+ | read enrichment | `assertUsersBelongToTenant` + query `.eq('tenant_id')` |
| remove-user-device | any auth user | delete own device | session `auth.users.id` |

**Separation:** Auth vs authz is clearer than before on these routes. Authorization remains **per-route**, not a shared policy engine — acceptable for a surgical fix; still a long-term maintainability debt.

---

## 4. Tenant Isolation (engineering view)

F-01 improvement: client `studentIds` are no longer trusted alone.

**Live evidence relevant to F-01 design:**

```text
super_admin users: 1 with tenant_id NULL, 0 with tenant_id set
```

`requireAdminProfile` **rejects empty tenant_id** (auth.ts ~290–294). Therefore the live platform super_admin **cannot** successfully call billing/instructors as written.

`customers.vue` already treats enrichment failures as non-fatal (`catch` → warn, keep student list). **Functional regression severity: degraded enrichment for tenantless super_admin, not hard page failure.**

Systemic tenant issues outside F-01 (prior audits: F-02…F-08, invoice IDOR, etc.) remain — out of scope for “did F-01 regress,” in scope for “known before next fix.”

---

## 5. Service Role Architecture

On F-01 routes, service role is invoked **only after** auth/authz — correct pattern.

Still appropriate uses:

- Cross-table admin enrichment with RLS bypass after tenant checks  
- Super-admin platform aggregates  

Could some use user JWT + RLS instead? Possibly for device delete if RLS were correct — engineering preference for least privilege, not a F-01 regression.

**Dual admin client modules** remain a maintainability smell (pre-existing).

---

## 6. F-01 Regression Check (per endpoint)

### cron-status

| Check | Result |
|-------|--------|
| Auth executed first | YES (`requireSuperAdmin`) |
| Legitimate super_admin UI | Should work (page middleware already superadmin) |
| Error handling | Re-throws `statusCode`; else 500 |
| Performance | **Improved** — count heads instead of loading all payment rows; list queries still **unbounded** for pending/overdue/waiting |
| New bugs | None Critical |

### calculator-stats

| Check | Result |
|-------|--------|
| Auth | YES |
| Callers | None in UI — no product regression |
| Behavior | Unchanged aggregation logic |

### get-billing-addresses / get-student-instructors

| Check | Result |
|-------|--------|
| Auth + role | YES |
| Tenant ownership | YES (membership query + filter) |
| customers.vue | Staff/admin with tenant: OK; tenantless super_admin: enrichment 403 (caught) |
| Extra DB round-trip | One membership query before data — acceptable |

### remove-user-device

| Check | Result |
|-------|--------|
| Session ownership | YES |
| Rejects foreign userId | YES (403) |
| Aligns with DeviceManager | YES (stores/filters `auth.users.id`) |
| Response still returns deleted row | Pre-existing; includes device metadata |

### Pendencies mutators (deleted)

| Check | Result |
|-------|--------|
| Callers | None found previously |
| UI | Uses composable client path |
| Regression | **None expected**; API now 404 |

---

## 7. API Design

| Concern | Assessment |
|---------|------------|
| 401 / 403 / 404 | Generally correct on new paths |
| 400 on bad id lists | `normalizeIdList` — good |
| Logging | Device delete logs auth user id at debug — OK |
| Sensitive data in errors | Limited; billing still `select('*')` in success payload (pre-existing) |
| HTTP methods | Unchanged (POST for reads on billing/instructors — pre-existing smell, Low) |

---

## 8. Testing

### What exists

- Unit tests for `normalizeIdList`, `assertUsersBelongToTenant`, `requireSuperAdmin`  
- Local: **7/7 passed**; eslint clean on new test file  
- CI: **Test and lint SUCCESS** on PR #129; E2E login was **IN_PROGRESS** at audit time  

### Gaps

| Missing | Why it matters |
|---------|----------------|
| Unauthenticated HTTP → each route | Proves Nitro wiring + middleware absence doesn’t bypass |
| Wrong-role / wrong-tenant HTTP | End-to-end security boundary |
| Device ownership HTTP | Session vs body `userId` |
| Super_admin without tenant → billing | Documents intentional 403 |

**Tests currently validate helper logic**, not that handlers call those helpers. For a CRITICAL remediation this is a **Medium** engineering/testing finding — not enough to NO-GO the merge given CI green and small surface, but must be closed in a follow-up.

---

## 9–11. Reliability / Performance / TypeScript

| Topic | Note | Introduced by F-01? |
|-------|------|---------------------|
| Unbounded payment lists on cron-status | Still no `.limit()` on pending sets | NO (partially improved via counts) |
| Membership query before IN filter | Extra RT; correct | YES (necessary) |
| `as any` in require-super-admin / cron-status | Pre-existing style | NO |
| `as unknown as SupabaseClient` in tests | Test-only | YES (acceptable) |
| Race conditions | None new in F-01 paths | — |

---

## 12. Architecture (long-term)

F-01 does **not** create a platform auth layer. It demonstrates the right **local pattern**:

```text
require*(event) → derive tenant from session → verify resource IDs → service role
```

Simy still cannot scale security/maintainability to thousands of tenants without:

- Fail-closed `/api/admin/**` middleware  
- Single service-role entrypoint  
- Retiring generic DB proxies / dual clients  
- Shrinking god routes (webhooks, event modal, etc.)  

These remain backlog — not F-01 regressions.

---

## 13. Public vs Private API Boundary

F-01 changes are entirely under `/api/admin/**` (private).  
**Public booking was not modified.** Boundary between Fall A (booking) and Fall B (admin) remains intact and clearer after F-01 verification + fix.

---

## 14. Production Checks Executed

| Check | Result |
|-------|--------|
| Diff review | Done |
| Unit tests (`admin-f01-access`) | **PASS** (7) |
| ESLint on new test/helper | **PASS** |
| CI Test and lint (PR #129) | **SUCCESS** |
| CI E2E login | **IN_PROGRESS** at audit time — **NOT VERIFIED terminal** |
| Full local `nuxt build` | Previously green on push smoke; not re-run this audit turn |
| Live HTTP probe of production | Not performed (read-only / no attack) |

---

## FINDINGS

### FINDING

**ID:** SE-POST-F01-001  

**Severity:** Medium  

**Category:** Testing  

**File:** `server/utils/__tests__/admin-f01-access.test.ts` (absence of route-level tests)  

**Function / Route:** All F-01 handlers  

**Problem:** Security boundary tests stop at helpers; no automated unauthenticated/wrong-tenant HTTP assertions against the Nitro routes.  

**Evidence:** Test file only imports `admin-f01-access` / `require-super-admin`; no `$fetch`/supertest/handler invocation.  

**Impact:** Refactor could drop `await requireSuperAdmin(event)` and unit tests would still pass.  

**Recommendation:** Add route-level negative tests (401/403) in CI for each remaining F-01 endpoint.  

**Introduced by F-01:** YES (incomplete test strategy for the fix)  

**Production Blocker:** NO  

---

### FINDING

**ID:** SE-POST-F01-002  

**Severity:** Medium  

**Category:** Reliability / Bug (product edge)  

**File:** `server/api/admin/get-billing-addresses.post.ts`, `get-student-instructors.post.ts` + `server/utils/auth.ts` `requireAdminProfile`  

**Function / Route:** Billing / instructors enrichment  

**Problem:** `requireAdminProfile` requires `tenant_id`. Live production has a `super_admin` with **NULL** `tenant_id`. Those enrichment APIs now 403 for that account.  

**Evidence:** Live SQL: `super_admin` → `no_tenant=1`, `with_tenant=0`. Auth helper lines 290–294 throw if `!tenantId`.  

**Impact:** Platform operator enrichment on `customers.vue` degraded (caught → student list still shown). Not a security hole.  

**Recommendation:** Either assign a tenant to the platform super_admin for support workflows, or explicitly allow `super_admin` to pass an **audited** tenant context (not body-trusted without membership). Do in a follow-up — not a revert of F-01.  

**Introduced by F-01:** YES  

**Production Blocker:** NO  

---

### FINDING

**ID:** SE-POST-F01-003  

**Severity:** Low  

**Category:** Performance  

**File:** `server/api/admin/cron-status.get.ts`  

**Function / Route:** pending/overdue/waiting payment selects  

**Problem:** List queries remain unbounded (only stats path was improved with `count` heads).  

**Evidence:** Lines 30–51 select payment rows with filters but no `.limit()`.  

**Impact:** Slow response / memory pressure if many authorized payments exist.  

**Recommendation:** Add reasonable `.limit()` / pagination for ops UI.  

**Introduced by F-01:** NO (pre-existing; partially improved)  

**Production Blocker:** NO  

---

### FINDING

**ID:** SE-POST-F01-004  

**Severity:** Low  

**Category:** Maintainability  

**File:** `server/api/admin/cron-status.get.ts` vs other F-01 routes  

**Function / Route:** `getSupabaseAdmin` import path  

**Problem:** cron-status imports from `~/utils/supabase`; others from `~/server/utils/supabase-admin` — two admin clients.  

**Evidence:** Import lines in respective files.  

**Impact:** Drift risk (key format / fetch stripping).  

**Recommendation:** Standardize on one server admin module in a later cleanup wave.  

**Introduced by F-01:** NO (continued pre-existing pattern)  

**Production Blocker:** NO  

---

### FINDING

**ID:** SE-POST-F01-005  

**Severity:** Low  

**Category:** Maintainability  

**File:** `server/api/admin/remove-user-device.post.ts`  

**Function / Route:** comment vs behavior  

**Problem:** Comment says “ignore foreign IDs”; code **throws 403** on mismatch (stricter — good). Comment is wrong.  

**Evidence:** Lines 30–36 vs comment line 30.  

**Impact:** Future maintainer confusion.  

**Recommendation:** Fix comment in a tiny follow-up.  

**Introduced by F-01:** YES  

**Production Blocker:** NO  

---

### Known pre-existing (not scored as F-01 regressions; awareness for next wave)

- F-02…F-08 and related security blockers from prior audits remain.  
- Auth still per-route; no fail-closed admin middleware.  
- `update-user-device` similar ownership pattern **not** in F-01 scope.  
- Public booking may still use service role with client `tenant_id` (Fall A / hardening).  

---

## Scores

| Area | Score | Notes |
|------|-------|-------|
| Architecture | **4.5 / 10** | F-01 pattern correct; platform still ad-hoc |
| Code Quality | **5 / 10** | Clean surgical diff; dual clients / anys remain |
| Performance | **5 / 10** | Cron stats improved; lists still unbounded |
| Reliability | **4.5 / 10** | Tenantless super_admin edge; otherwise solid |
| Testing | **4 / 10** | Helpers tested; route negatives missing (+0.5 vs 3) |
| Maintainability | **4 / 10** | Shared helper helps; no platform middleware yet |

### Overall Engineering Score: **4.5 / 10**

**vs previous 3.5 / 10:** **improved** — not because the whole SaaS is healthy, but because a verified CRITICAL hole was closed with minimal, consistent server-side auth/tenant checks and without collateral damage to booking.

---

## Production Decision

# CONDITIONAL GO

**Meaning:** Safe to **merge F-01** and proceed to the next remediation wave (F-02 / RLS / etc.). No Critical/High **engineering regression** blocks the F-01 ship.

**Conditions:**

1. Confirm CI **E2E login** finishes green on PR #129.  
2. Accept tenantless super_admin enrichment degradation (or assign tenant).  
3. Track SE-POST-F01-001 (route-level negative tests) as follow-up before claiming “security test complete.”

**Not GO:** System-wide production readiness (prior security blockers remain).  
**Not NO-GO:** F-01 itself looks mergeable from an engineering standpoint.

---

## FINAL RESULT

| Item | Value |
|------|-------|
| **F-01 Engineering Regression** | **PASS** |
| **Critical Findings** | **0** |
| **High Findings** | **0** |
| **Medium Findings** | **2** (SE-POST-F01-001, 002) |
| **Low Findings** | **3** (003–005) |
| **Overall Engineering Score** | **4.5 / 10** (↑ from 3.5) |
| **Production Decision** | **CONDITIONAL GO** |

**Next Recommended Step:**  
Merge F-01 when E2E is green → start **F-05a/F-05b (RLS)** and/or **F-02 (auth/manage)** per `/audits/2026-09-02-remediation-plan.md` Wave 1 order → add route-level negative tests for the F-01 endpoints as a small follow-up PR.

---

## Audit metadata

| Item | Value |
|------|--------|
| Report path | `/audits/2026-09-02-senior-post-f01.md` |
| Prior audits preserved | YES |
| Source changes this audit | NONE (report only) |
