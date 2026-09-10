# Tenant API authorization boundary

**When to use:** A privileged Nitro handler trusts body `tenantId` / `staff_id`; inactive sessions still mutate data; tenant admins reach platform-wide analytics or whitelabel builds; public SARI/shop endpoints leak PII; debugging 401 vs 403 after #191.

Verified against source (Sep 2026). Commit `58b98879` (#191). Complementary inventories: root `SECURITY_BASELINE.md`, `SERVICE_ROLE_USAGE.md`. Older SEC-C0x / F-0x runbooks (draft PRs) cover different remediations — do not merge topics.

---

## Intent

Nuxt/Nitro has **no** global `/api` auth gate. Frontend middleware (`middleware/auth.ts`, `admin.ts`) does **not** protect APIs. After #191, privileged handlers must:

1. Resolve the JWT → `users` row (tenant, role, active) **before** service-role work.
2. Bind resource IDs to the **session tenant**, not client-supplied tenant fields.
3. Keep platform-only surfaces on `super_admin`.

---

## Contract

| Helper | File | Outcome |
|--------|------|---------|
| `getAuthenticatedUser` | `server/utils/auth.ts` | Bearer / `sb-*` cookie → Auth user + optional `users` row. Returns `null` if no session. Does **not** reject inactive users by itself. |
| `requireAuthenticatedUser` | `server/utils/require-tenant-auth.ts` | **401** if no session |
| `requireTenantActor` | same | **401** unauth; **403** if missing `id`/`tenant_id`/`role`, inactive, or `deleted_at` |
| `requireTenantStaff` | same | Staff roles via `requireAdminProfile` (`admin`, `staff`, `super_admin`, `tenant_admin`) |
| `requireTenantAdmin` | same | `admin`, `tenant_admin`, `super_admin` |
| `requireSuperAdmin` | `server/utils/require-super-admin.ts` | `role === 'super_admin'` only |
| `assertSameTenant` / `loadStaffInTenant` / `assertSelfOrTenantAdmin` | `require-tenant-auth.ts` | Resource binding → **403** on mismatch |

### Hardened surfaces (#191)

| Surface | Gate | Binding rule |
|---------|------|--------------|
| Staff cash / exam-stats / evaluation-history | `requireTenantStaff` | Instructor/student/appointment IDs must belong to session tenant; staff self-or-admin |
| `POST /api/staff/manage-external-busy-times` | `requireTenantStaff` | Inserts use `actor.tenant_id`; update/delete load row in tenant then authorize stored `staff_id` |
| `GET /api/analytics/dashboard` | `requireSuperAdmin` | Platform-wide read only; GET no longer inserts `analytics_events` |
| Stripe Connect create / account-status | `requireTenantAdmin` | Account ID from `tenants.stripe_connect_account_id`, never client body; Stripe errors remapped to generic 500 |
| `POST /api/send-invite-email` | `requireTenantStaff` | Appointment must match session tenant; staff self-or-admin on `staff_id` |
| `POST /api/emails/send-course-enrollment-confirmation` | `requireStaffOrInternal` | Recipient = `enrollment.email` only (no `testEmail` override); trusted callers send `internalSecretHeaders()` |
| `POST /api/sari/lookup-customer` | Public + rate limit | Tenant from **slug**; returns enrollment fields only; generic failure (no SARI enumeration) |
| `POST /api/shop/resolve-customer` | Public + rate limit | Response `{ customer: { id } }` only — no profile / onboarding token |
| `POST /api/whitelabel/create-app` | `requireSuperAdmin` **before** `readBody` | Tenant admin cannot trigger builds for arbitrary `tenantId` |

Internal secret headers: `x-internal-secret` / `x-internal-api-secret` matching `CRON_SECRET` \| `INTERNAL_API_SECRET` \| `NUXT_INTERNAL_API_SECRET`. See also [CRON_SECRET_AND_FINANCIAL_RLS.md](./CRON_SECRET_AND_FINANCIAL_RLS.md).

---

## Pitfalls

1. **Service role after authz is intentional** — Authz must happen first; body IDs alone are never authorization.
2. **`getAuthenticatedUser` ≠ authorized** — Always pair with a `require*` helper that checks active + tenant + role.
3. **Client `tenantId` is not a credential** — Prefer session `actor.tenant_id`; treat body tenant fields as optional context at best.
4. **Whitelabel UI copy is stale** — `docs/WHITELABEL_APP.md` still describes a tenant admin “App erstellen” button; API requires `super_admin`.
5. **Shop onboarding tokens** — Still written server-side on guest create, but **never** returned to unauthenticated callers after #191.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/auth.ts` | `getAuthenticatedUser`, `requireAdminProfile` |
| `server/utils/require-tenant-auth.ts` | Tenant actor / staff / admin gates + resource binders |
| `server/utils/require-super-admin.ts` | Platform-only gate |
| `server/utils/require-staff-or-internal.ts` | Staff session or internal secret |
| `server/api/staff/{cash-balance,exam-stats,evaluation-history,manage-external-busy-times}.post.ts` | Staff binding pattern |
| `server/api/analytics/dashboard.get.ts` | Super-admin analytics |
| `server/api/stripe/connect/{create-account.post,account-status.get}.ts` | Connect account from tenant row |
| `server/api/send-invite-email.post.ts` | Appointment invite |
| `server/api/emails/send-course-enrollment-confirmation.post.ts` | Enrollment mail |
| `server/api/sari/lookup-customer.post.ts` | Public SARI lookup |
| `server/api/shop/resolve-customer.post.ts` | Guest shop resolve |
| `server/api/whitelabel/create-app.post.ts` | Whitelabel provision |
| `server/utils/__tests__/require-tenant-auth.test.ts` | Gate regressions |
| `server/utils/__tests__/p0-0*.test.ts` | #191 surface tests |
