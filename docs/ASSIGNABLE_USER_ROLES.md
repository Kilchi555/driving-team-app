# Assignable `public.users.role` — no `student` (#344)

Verified against `main` tip including `faf21fdd` (and later `staffCreatePayload` hardening from multi-admin lifecycle).

## Intent

Stop writing and matching `public.users.role = 'student'`. Customers / learners are stored and queried as `client` (legacy `customer` rows remain readable where allowlists already included them). Role updates accept only roles the application already stores; staff creation ignores a caller-supplied role.

## Contract

Helpers in `server/utils/assignable-user-roles.ts`:

- `TENANT_ASSIGNABLE_ROLES`: `admin`, `staff`, `client`, `customer`.
- `SUPER_ADMIN_ASSIGNABLE_ROLES`: `client`, `staff`, `admin`, `tenant_admin`, `super_admin`, `accountant`, `customer`, `affiliate`.
- `sanitizeRoleChange(callerRole, requestedRole)`:
  - Omitted / null / `''` → `undefined` (no change).
  - `super_admin` caller: closed set above; unknown (including `student`) → **400** `Invalid role: …`.
  - Non–super_admin assigning `super_admin` → **403**.
  - Non–super_admin outside `TENANT_ASSIGNABLE_ROLES` (including `student`) → **403** `Forbidden: cannot assign role …`.
- `staffCreatePayload(userData, callerTenantId)`: whitelist profile fields only; forces `role: 'staff'`, `tenant_id: callerTenantId`, `is_primary_admin: false`. Caller-supplied `role`, nested privilege fields, and foreign `tenant_id` are dropped. Empty `callerTenantId` → **400**.

Write sites that mint customers now use `role: 'client'` (not `student`), including admin create-user / add-participant and SARI sync engine user creation.

Read/match sites that previously `.eq('role', 'student')` or `.in('role', ['student', 'client'])` now use `client` (and sometimes legacy `customer` where the prior allowlist already had it). Course session principal set: `PUBLIC_COURSE_SESSION_ROLES = new Set(['client'])` in `fulfill-course-wallee-payment.ts`.

## What `student` means now

- **Not** a valid `public.users.role` for assign or store.
- Still used elsewhere as a **domain label**, not a users.role value:
  - `cancellation_type` / policy math (`'student' | 'staff'`).
  - SARI route names and UI copy (“student” as participant).
  - `isPrivilegedUserRole('student')` remains `false` in `public-registration-role` tests (non-privileged if ever seen).
- Negative tests may still construct `{ role: 'student' }` to prove it is **not** a course-session principal.

## Migration implications

- No SQL migration in #344. Rows that already have `role = 'student'` (if any) are not rewritten by this change.
- Lookups that only filter `client` will miss leftover `student` rows until data is repaired.
- New inserts must not recreate `student`.

## Pitfalls

- Do not reintroduce `'student'` in `.eq('role', …)` or insert payloads for `public.users`.
- `customer` remains tenant-assignable and appears in some pickup / location allowlists as a legacy role — distinct from `client`.
- Public registration always mints `client` via `resolvePublicRegistrationRole` (#195 / open doc **#196**) — complementary, not the same contract as this allowlist.
- Invitation accept roles are `admin` | `staff` (#362) — separate from learner `client`.

## Codepaths

| Symbol / path | Role |
|---|---|
| `server/utils/assignable-user-roles.ts` | Allowlists + sanitize + staff create payload |
| `server/api/admin/users.post.ts` | `sanitizeRoleChange` / `staffCreatePayload` |
| `server/api/admin/create-user.post.ts`, `admin/courses/add-participant.post.ts` | Insert `client` |
| `server/utils/sari-sync-engine.ts` | Sync-created users as `client` |
| `server/api/admin/users/search.get.ts`, `marketing-ltv.get.ts`, `marketing-ads-keywords.get.ts` | Match `client` |
| `components/CashTransactionModal.vue` | Match `client` |
| `server/api/courses/enroll-cash.post.ts`, `enroll-wallee.post.ts`, `fulfill-course-wallee-payment.ts` | Session roles = `client` |
| `server/api/locations/create-pickup.post.ts`, `staff/get-locations.get.ts`, `appointments/cancel-customer.post.ts` | Drop `student` from role allowlists |
| `server/utils/__tests__/assignable-user-roles.test.ts` | Closed-set + no-`student`-in-write-paths checks |

## Related (do not conflate)

- Open draft **#196** — `PUBLIC_REGISTER_CLIENT_ROLE` / `STAFF_INVITATION_REGISTRATION`.
- Open draft **#339** / code **#338** — welcome/onboarding endpoint authz (not users.role vocabulary).
- **#362** — invitation role lock (`admin`/`staff`) during staff registration.
