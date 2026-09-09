# Service role usage audit

Date: 2026-09-09
Branch: `security/p0-remediation`
Scope: `getSupabaseAdmin()` / `SUPABASE_SERVICE_ROLE_KEY` after the P0 handler fixes.

Service role bypasses RLS. It is a privilege, not the default database client.

This is an inventory, not a claim that every remaining call is justified. Residual privileged-client usage is the main leftover risk after the P0 handler fixes.

## Required service role (auth / identity)

| File | Why | Auth before? | Tenant bound? | RLS client instead? |
| --- | --- | --- | --- | --- |
| `server/utils/auth.ts` | Resolve `users` from `auth.uid()` because client JWT cannot always read the profile | Token present or return null | Yes, via `auth_user_id` | No — bootstrap |
| `server/utils/supabase-admin.ts` | Factory | N/A | N/A | N/A |
| `server/utils/account-switch.ts` | Cross-profile switch flags | Yes (caller) | Yes | No — reads other profiles |

## P0 handlers (authorized, then privileged)

These were the confirmed P0s. Service role remains because RLS is not a substitute for server-side authorization, but **authorization now runs first**.

| File | Why service role | Authz before usage | Tenant / ownership |
| --- | --- | --- | --- |
| `server/api/staff/cash-balance.post.ts` | Financial read | `requireTenantStaff` + `loadStaffInTenant` + self-or-admin | Session tenant |
| `server/api/staff/exam-stats.post.ts` | Cross-table stats | same | Session tenant; ignore body `tenant_id` |
| `server/api/staff/evaluation-history.post.ts` | Cross-table read | same + appointment bind | Session tenant |
| `server/api/staff/manage-external-busy-times.post.ts` | Calendar mutation | `requireTenantStaff`; load row by id **and** tenant | Session tenant |
| `server/api/analytics/dashboard.get.ts` | Platform-wide read | `requireSuperAdmin` | Platform; no GET-side event write |
| `server/api/stripe/connect/create-account.post.ts` | Stripe + tenants update | `requireTenantAdmin` | Session tenant |
| `server/api/stripe/connect/account-status.get.ts` | Stripe retrieve | `requireTenantAdmin` | Stored account of session tenant |
| `server/api/send-invite-email.post.ts` | Send email | `requireTenantStaff` + appointment ownership | Session tenant |
| `server/api/emails/send-course-enrollment-confirmation.post.ts` | Send email | `requireStaffOrInternal` + registration tenant | Registration tenant |
| `server/api/sari/lookup-customer.post.ts` | SARI + public enrollment | Public: slug → tenant, rate limit | Slug-derived tenant |
| `server/api/shop/resolve-customer.post.ts` | Find/create guest | Public: rate limit; no PII/token in response | Slug preferred; UUID still accepted as shop context, not auth |
| `server/api/whitelabel/create-app.post.ts` | `app_configs` + GitHub | `requireSuperAdmin` | `tenantId` is a platform resource id |
| `server/api/appointments/notify-change.post.ts` | Notify customer | `requireTenantStaff` + appointment in tenant + self-or-admin `staff_id` | Appointment `user_id` only |
| `server/api/availability/queue-recalc.post.ts` | Queue availability | `requireStaffOrInternal`; staff uses session tenant + `assertSelfOrTenantAdmin`; internal verifies staff in body tenant | Body `tenant_id` is not authorization |
| `server/api/staff/working-hours.post.ts` | Hours mutation | `requireTenantStaff` + `authorizeWorkingHoursMutation` | Session tenant; self or tenant-admin |
| `server/api/staff/working-hours-manage.post.ts` | Hours mutation + slot release | same | Session tenant; self or tenant-admin |
| `server/api/staff/get-working-hours.get.ts` | Hours read | same | Session tenant; self or tenant-admin |
| `server/api/database/query.post.ts` (`staff_working_hours` writes) | **Must not** use service role | `getAuthenticatedUserWithDbId` + `authorizeWorkingHoursMutation` then **user JWT client** | Session tenant; self or tenant-admin. Other whitelisted tables still use service role after tenant filter (residual). |
| `server/api/booking/cancel-reservation.post.ts` | Delete reservation | guest email proof **or** staff same tenant | Row tenant |
| `server/api/auth/upload-document.post.ts` | Storage upload | owner / staff / registration window | DB user tenant; bucket pinned |

Cash JWT **writes** are denied after the unapplied P0-08 migration (SELECT remains for office UI). Course registration roster JWT writes remain for staff; payment/SARI columns are frozen by trigger (`payment_status`, `payment_id`, `amount_paid_rappen`, `payment_method`, `discount_applied_rappen`, `sari_data`, `sari_synced`, `sari_synced_at`, `sari_faberid`, `sari_license_id`, `sari_licenses`). `sari_synced_by` is not a production column. Server APIs above keep working via service role.

## Working-hours write paths (P1-04)

| Endpoint | Auth | Actor | Tenant | Ownership | Why service role |
| --- | --- | --- | --- | --- | --- |
| `/api/staff/working-hours` | `requireTenantStaff` | session user | session `tenant_id` | `authorizeWorkingHoursMutation` | Cross-table users lookup + hours write after authz. RLS is not the enforcement boundary here. |
| `/api/staff/working-hours-manage` | same | same | same | same | Slot release + hours delete/toggle after authz. |
| `/api/staff/get-working-hours` | same | same | same | same | Read of another instructor is admin-only. |
| `/api/database/query` hours write | session JWT | session user | session `tenant_id` | `authorizeWorkingHoursMutation` **before** mutation | **Not used.** Mutation goes through the user JWT client so RLS applies. |
| `staff/register`, `tenants/create-admin` | invitation / registration token | new user | derived from token | inserts the new user's own hours | Creating the first row for a user who may not yet have a staff JWT. |

A service-role hours write without `authorizeWorkingHoursMutation` (or equivalent self-or-tenant-admin check) is a blocker.

## Course registration payment writes

| Endpoint | Auth | Why service role |
| --- | --- | --- |
| `courses/enroll-cash`, `courses/enroll`, admin enroll | staff/admin session | Must set payment fields the JWT trigger forbids |
| Wallee webhook | provider signature | Payment capture |
| SARI sync crons/APIs | cron secret / staff | `sari_*` columns |

## Public / webhook / cron (must stay privileged)

| Area | Examples | Authn | Notes |
| --- | --- | --- | --- |
| Public booking | `server/api/booking/*`, `tenants/by-slug.get.ts` | None / session id | Tenant from slug or reserved slot, not client JWT |
| Payments | `server/api/wallee/*`, `stripe/webhook.post.ts` | Provider signature | Must not trust body tenant |
| Cron | `server/api/cron/*` | `assertCronRequest` fail-closed | Do not treat `x-vercel-cron` as auth |
| Website public | `server/api/public/website/*` | None | Tenant from subdomain |

Could some public **reads** use the anon key + RLS? Yes, if policies are exact. Today they use service role after server filters. That is residual risk, not a P0 regression of the confirmed findings.

## Remaining body.tenantId / user_id identifiers

These were **not** in the confirmed P0 list. They still need a later pass:

- `server/api/courses/register.post.ts` — public waitlist-style register uses `body.tenant_id`
- `server/api/auth/complete-registration.post.ts` — registration uses `body.tenant_id`
- `server/api/system/availability-data.post.ts` — can prefer `body.tenant_id`
- `server/api/marketing/offers.post.ts` — `body.tenantId \|\| authUser.tenant_id`
- `server/api/admin/save-tenant-secrets.post.ts` — admin compared to `body.tenant_id` (better than unbounded, still client-supplied)

`server/api/sms/send.post.ts` already ignores mismatched `body.tenantId`.

## RLS client instead?

Use the user-scoped Supabase client when the operation is a simple SELECT the JWT is allowed to see (staff cash balance **display** already does this in `useOfficeCashRegisters.ts`).

Keep service role when:

1. The handler must write across RLS (webhooks, enrollment, email, storage)
2. The actor is anonymous but the server derived a public tenant context
3. Auth bootstrap (`getAuthenticatedUser`)

Do not add new service-role calls without authentication and a tenant/ownership check first.
