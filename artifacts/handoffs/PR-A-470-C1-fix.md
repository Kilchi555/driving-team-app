# PR #470 — C1 Fix: Bind subscription guard to authorized appointment tenant

## Identity

| Item | Value |
|------|-------|
| PR | [#470](https://github.com/Kilchi555/driving-team-app/pull/470) — still **Draft**, unmerged |
| Branch | `cursor/saas-subscription-write-guard-9780` |
| Base (unchanged) | `ef794668f909826057a713393333af2ed31b70d2` |
| Head before fix | `69c151bb38d530ae44a2fb6264236b4937c46ac6` |
| Head after fix | *(see git rev-parse after push)* |

## Diff summary

Changed files:

- `server/api/appointments/save.post.ts` — C1 authorization + guard ordering
- `server/utils/__tests__/appointments-save-saas-c1.http.test.ts` — new regression suite (**does not** mock away the guard)
- `server/utils/__tests__/staff-appointment-save-price.http.test.ts` — mock supports early `maybeSingle` appointment load
- `server/utils/__tests__/saas-subscription-write-guard.http.test.ts` — static order assertion updated for C1

## How it works now

**Create**

1. Authenticate via `requireAdminProfile`.
2. Non-superadmin: reject body `tenant_id` ≠ caller tenant; force `appointmentData.tenant_id = callerProfile.tenant_id`.
3. Superadmin targeting another tenant: body may *propose* a UUID, but authorization requires an independent `tenants` row lookup; otherwise use caller tenant. Body alone is never trusted.
4. `assertTenantSubscriptionWritable(authorizedTenantId)` then business writes.

**Edit**

1. Require + validate `eventId`.
2. Load appointment: non-superadmin with `.eq('tenant_id', callerProfile.tenant_id)`; superadmin by id.
3. Missing/unauthorized → **404** (no mutation).
4. Reject body `tenant_id` ≠ entity tenant (**403** transfer not allowed).
5. Force payload `tenant_id` to entity tenant.
6. `assertTenantSubscriptionWritable(oldAppointment.tenant_id)`.
7. Update with `.eq('id', eventId).eq('tenant_id', authorizedTenantId)`.

## Regression tests (actual results)

```text
npx vitest run \
  server/utils/__tests__/appointments-save-saas-c1.http.test.ts \
  server/utils/__tests__/staff-appointment-save-price.http.test.ts \
  server/utils/__tests__/staff-appointment-save-credit.http.test.ts \
  utils/__tests__/tenant-subscription-write-access.test.ts \
  server/utils/__tests__/assert-tenant-subscription-writable.test.ts \
  server/utils/__tests__/saas-subscription-write-guard.http.test.ts
# → exit 0 ; 89 tests passed

npm run lint
# → exit 0
```

C1 suite covers: superadmin body redirect → 403; superadmin expired entity → 402 before write; cross-tenant eventId → 404; same-tenant writable edit → success; create foreign body tenant → 403; create caller tenant → success with forced tenant_id.

## Remaining limitations

- Unit/HTTP mocks ≠ production evidence.
- H1–H3 from the independent review are intentionally untouched.
- A new independent security review at the post-fix head is required before merge.

## Safety

No production/staging writes, migrations, deploy, undraft, merge, force-push, or rebase.
