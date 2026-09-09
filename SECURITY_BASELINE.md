# Security baseline — P0 remediation

Date: 2026-09-09
Remediation branch: `security/p0-remediation`
Worktree: isolated from dirty `merge/feat-account-switch-to-main` checkout

## Production vs this branch

| Ref | SHA | Notes |
| --- | --- | --- |
| Production `app.simy.ch` | `ad83ecb904e1d5235ed8d9b7336ab9f23d8c1162` | simy-app + driving-team-app deployments 2026-09-08 |
| `origin/main` (this branch base) | `23ab407104b2be6fa015a2d454adcb3a15f9b1d9` | Ancestor of prod SHA plus website-only dependency bumps. `server/` diff vs prod SHA is empty. |
| Dirty local HEAD (untouched) | `54ac2e7e…` on `merge/feat-account-switch-to-main` | ~597 uncommitted files. Not used. |

## Authentication (Nitro)

Nitro does **not** authenticate `/api/*` globally.

| Helper / layer | File | Behavior |
| --- | --- | --- |
| `getAuthenticatedUser` | `server/utils/auth.ts` | Bearer or `sb-*` cookie → `/auth/v1/user`. Loads `users` via service role. **Returns `null` if no token (does not throw).** Does not currently reject `is_active=false` / `deleted_at`. May return auth user without DB row (registration). |
| `requireAdminProfile` | `server/utils/auth.ts` | Throws **401** if unauthenticated, **403** if role not in allow-list or no `tenant_id`. Default roles: `admin`, `staff`, `super_admin`. |
| `requireAdminOnly` | `server/utils/auth.ts` | `admin` + `super_admin`. |
| `getAuthenticatedUserWithDbId` | `server/utils/auth.ts` | Returns DB user id or `null`. |
| `requireSuperAdmin` | `server/utils/require-super-admin.ts` | 401 / 403. Role string is `super_admin` (underscore). |
| `requireStaffOrInternal` | `server/utils/require-staff-or-internal.ts` | Internal `x-internal-secret` matching `CRON_SECRET` / `INTERNAL_API_SECRET`, else `requireAdminProfile` with `STAFF_ADMIN_ROLES` including `tenant_admin`. |
| `canAccessUserDocument` | `server/utils/access-control.ts` | Pure function for document path ownership. |

Frontend `middleware/auth.ts` and `middleware/admin.ts` return immediately on `process.server`. They do not protect APIs.

## Server middleware

| File | Effect on `/api/*` |
| --- | --- |
| `01.auth-cookie-to-header.ts` | Copies cookie → `Authorization`. No reject. |
| `validate-tenant.ts` | Skips `/api/`. |
| `rate-limiting.ts` | Default export no-op. Per-endpoint `createRateLimitMiddleware`. |
| `02.custom-domain.ts` | Skips `/api/`. |

## Supabase clients

| Helper | File | RLS |
| --- | --- | --- |
| `getSupabaseAdmin()` | `server/utils/supabase-admin.ts` | Bypasses RLS (`SUPABASE_SECRET_KEY` \|\| `SERVICE_ROLE_KEY`) |
| `getSupabaseAnon()` | same | Respects RLS |
| Browser `getSupabase()` | `utils/supabase.ts` | Anon key + user JWT → PostgREST |

**Rule:** service role is a privilege. Handlers must authenticate and authorize **before** calling `getSupabaseAdmin()`.

## Tenant resolution (intended)

```
JWT → auth.uid() → users.auth_user_id → users.id + users.tenant_id + users.role
```

Client `tenantId` / `staff_id` / `user_id` / `instructorId` / `accountId` are resource identifiers only after the session tenant is established.

Live role values: `client`, `staff`, `admin`, `affiliate`, `student`, `super_admin`. Some RLS policies still say `superadmin` (no underscore) and never match.

## Rate limiting / cron / SARI / Stripe

- Rate limit: `server/utils/rate-limiter.ts` + `getClientIP` (`server/utils/ip-utils.ts`).
- SARI authenticated ops: `server/utils/sari-rate-limit.ts` (currently fail-open on limiter errors). Public lookup had **no** limit.
- Cron: `assertCronRequest` is fail-closed (Bearer `CRON_SECRET` required). Some older cron handlers still have inline checks.
- Stripe Connect: unauthenticated create/status handlers; **no** `stripe_connect_account_id` column on `tenants` (only billing customer/subscription ids).

## Public flows that must keep working

- Tenant branding by slug (`/api/tenants/by-slug`)
- Public booking locations/staff
- Guest course enrollment + SARI identity lookup
- Waitlist signup
- Shop guest checkout (email is **not** proof of ownership)

## Confirmed P0 targets (from independent validation)

Staff APIs, calendar busy-times, platform analytics, Stripe Connect, invite/enrollment email, SARI lookup, shop resolve-customer, `cash_balances` / `course_registrations` RLS, whitelabel `body.tenantId` IDOR.
