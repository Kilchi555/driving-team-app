# F-01 Remediation Report — Unauthenticated Service-Role Admin APIs

**Date:** 2026-09-02  
**Branch:** `cursor/f01-remediation-bb9a`  
**Scope:** **F-01 only** (no F-02…F-08 changes)  
**Service-role key:** **not rotated** (per instructions)

---

## Executive Summary

All seven F-01 endpoints are remediated:

| Endpoint | Action |
|----------|--------|
| `/api/admin/cron-status` | `requireSuperAdmin` before service role |
| `/api/admin/calculator-stats` | `requireSuperAdmin` before service role |
| `/api/admin/get-billing-addresses` | `requireAdminProfile` + tenant ownership of `studentIds` |
| `/api/admin/get-student-instructors` | `requireAdminProfile` + tenant ownership of `studentIds` |
| `/api/admin/remove-user-device` | Session auth; delete only own devices |
| `/api/admin/pendencies/update-overdue` | **Removed** (no legitimate callers) |
| `/api/admin/pendencies/handle-recurrence` | **Removed** (no legitimate callers) |

Shared helper: `server/utils/admin-f01-access.ts` (`assertUsersBelongToTenant`, `normalizeIdList`).  
Reused existing: `server/utils/require-super-admin.ts`.

---

## Per-Endpoint Changes

### 1. `/api/admin/cron-status`

| Field | Detail |
|-------|--------|
| **Original weakness** | Unauthenticated service-role read of cross-tenant payments + cron logs |
| **Root cause** | No auth; UI `superadmin` middleware only |
| **Change** | `await requireSuperAdmin(event)` before `getSupabaseAdmin()`; payment stats via `count` heads (no full-table pull) |
| **Auth** | Session via `getAuthenticatedUser` → role `super_admin` |
| **Authz** | Super admin only (platform ops page) |
| **Tenant isolation** | Platform-wide view **intentional** for super_admin; unauthenticated access blocked |
| **Legitimate callers** | `pages/admin/cron-status.vue` (still works when logged in as super_admin) |

### 2. `/api/admin/get-billing-addresses`

| Field | Detail |
|-------|--------|
| **Original weakness** | Attacker-controlled `studentIds` → `company_billing_addresses` via service role |
| **Root cause** | No auth; trusted body IDs |
| **Change** | `requireAdminProfile` (admin/staff/tenant_admin/super_admin) → `assertUsersBelongToTenant` → query with `.eq('tenant_id', profile.tenant_id)` |
| **Auth / Authz** | Staff+ of caller tenant |
| **Tenant isolation** | Every student id must exist in `users` with caller `tenant_id`; addresses also filtered by `tenant_id` |
| **Callers** | `pages/customers.vue` (cookies/session already present) |

### 3. `/api/admin/get-student-instructors`

| Field | Detail |
|-------|--------|
| **Original weakness** | Same IDOR pattern on appointments/users |
| **Change** | Same auth + `assertUsersBelongToTenant`; appointments/users queries scoped with `.eq('tenant_id', profile.tenant_id)` |
| **Callers** | `pages/customers.vue` |

### 4. `/api/admin/remove-user-device`

| Field | Detail |
|-------|--------|
| **Original weakness** | Unauthenticated DELETE by body `deviceId`/`userId` |
| **Root cause** | No session binding |
| **Change** | `getAuthenticatedUser`; ownership = `authUser.id` (auth.users id, matching `DeviceManager.vue`); reject mismatched body `userId`; 404 if no row |
| **Auth / Authz** | Any authenticated user, **own devices only** |
| **Tenant isolation** | N/A per-device ownership (table has no tenant_id); cross-user delete blocked |

### 5. `/api/admin/calculator-stats`

| Field | Detail |
|-------|--------|
| **Original weakness** | Unauthenticated platform analytics |
| **Change** | `requireSuperAdmin` before service role |
| **Callers** | None found in UI; still reachable for super_admin tooling |

### 6–7. Pendencies mutators

| Field | Detail |
|-------|--------|
| **Original weakness** | Global unauthenticated UPDATE/INSERT |
| **Root cause** | Orphan privileged routes |
| **Change** | **Deleted** `update-overdue.post.ts` and `handle-recurrence.post.ts` |
| **Rationale** | UI uses `composables/usePendencies.ts` client Supabase paths; no `$fetch` callers; vercel.json has no reference |
| **Residual note** | Client-side pendency writes are **out of F-01 scope** (document only) |

---

## Security Re-Check Matrix

| Endpoint | Auth | Role | Tenant | ID Ownership | Service Role Safe | Cross-Tenant Blocked |
|----------|------|------|--------|--------------|-------------------|----------------------|
| cron-status | YES | super_admin | Platform (by role) | N/A | After auth | Unauth: YES blocked |
| billing-addresses | YES | staff+ | YES | studentIds verified | After auth | YES |
| student-instructors | YES | staff+ | YES | studentIds verified | After auth | YES |
| remove-user-device | YES | any user | ownership | session user | After auth | Cross-user: YES blocked |
| calculator-stats | YES | super_admin | N/A (global table) | N/A | After auth | Unauth: YES blocked |
| pendencies/* | N/A | — | — | — | Route gone | YES (404) |

Frontend-only protection was **not** relied upon.

---

## Tests

### Automated

- `server/utils/__tests__/admin-f01-access.test.ts` — normalizeIdList, assertUsersBelongToTenant (403 on foreign ids), requireSuperAdmin 401/403/allow  
- `npx vitest run server/utils/__tests__/admin-f01-access.test.ts` → **7 passed**  
- `npx eslint server/utils/__tests__/admin-f01-access.test.ts --max-warnings 0` → **pass**

### Negative cases covered by unit tests

| Case | Expected |
|------|----------|
| Foreign student ids vs tenant | 403 |
| Unauthenticated super_admin helper | 401 |
| Admin calling requireSuperAdmin | 403 |

### Manual / follow-up HTTP tests (recommended in CI later)

| Case | Expect |
|------|--------|
| No cookie → each remaining endpoint | 401 |
| Customer session → billing/instructors/cron-status | 403 |
| Tenant A staff + Tenant B studentIds | 403 |
| Auth user delete other user’s deviceId | 404/403 |
| Deleted pendencies paths | 404 |

**Not run in this environment:** full production build, Playwright E2E, live HTTP against app.simy.ch (no deployed preview assumed). Public booking routes were **not** modified.

---

## Service Role

- Still loaded only via server env (`getSupabaseAdmin` / `supabase-admin`)  
- Invoked **after** auth on remaining endpoints  
- **Not** rotated  
- **No** evidence of client bundle exposure introduced

**Rotation recommendation after this remediation:** **NO** (still no key leak evidence; capability abuse for F-01 closed)

---

## Remaining Risks / Out of Scope

| Item | Notes |
|------|--------|
| `POST /api/admin/update-user-device` | Similar pattern to remove-device; **not in F-01 list** — not changed |
| `composables/usePendencies` direct client DB | Separate RLS/auth concern |
| Public booking service-role reads | Fall A — not F-01 |
| F-02…F-08 | Explicitly untouched |
| super_admin cron-status still sees all tenants | By design for platform ops **after** auth |

---

## Final Gate

| Gate | Result |
|------|--------|
| **F-01 STATUS** | **FIXED** |
| Unauthenticated privileged access remains | **NO** (for the seven F-01 endpoints) |
| Cross-tenant access remains | **NO** for billing/instructors/device/pendencies; super_admin cron-status is authenticated platform view |
| Service-role client exposure | **NO** |
| Production blocker (F-01) | **NO** |

### Service-Role-Key Rotation: **NO**
