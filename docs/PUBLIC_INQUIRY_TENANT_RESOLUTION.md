# Public inquiry and booking-proposal tenant resolution

Verified from `main` after `#361` / `60a9e576` (tenant-scoped client resolution) and `#358` / `2e854af9` (public inquiry staff assignment).

## Intent

Public booking inquiry and proposal endpoints accept caller-supplied user and staff ids. Those values are **not** a login. Resolve contacts and staff only inside the request tenant; never link or overwrite a foreign-tenant user from browser input.

## Client / contact resolution

`server/utils/resolve-inquiry-user.ts`:

| Helper | Behavior |
|---|---|
| `resolveInquiryUserId` | Prefer `createdByUserId` **only** if that `users` row has `tenant_id = request tenant`. Else match email/phone **inside the tenant**. Pending shadow accounts: merge contact fields + refresh onboarding token (+30d). Completed profiles: **link only**, do not overwrite. Else insert pending `client` (no auth user, no onboarding SMS). Unique race (`23505`) → re-lookup and link. |
| `confirmTenantInquiryUserId` | Body `created_by_user_id` alone: returns the id only when the row belongs to the tenant. Passes **empty** contact fields so a foreign/unknown id cannot match or create a user. |

### Booking proposal (`POST /api/booking/submit-proposal`)

1. `confirmTenantInquiryUserId` on body `created_by_user_id`.
2. If confirmed → skip guest contact/address validation and use that id.
3. Else require guest fields and call `resolveInquiryUserId` with `createdByUserId: null` (contact path only).

### General inquiry (`POST /api/booking/submit-general-inquiry`)

Uses `resolveInquiryUserId` with optional `createdByUserId` plus contact fields (same tenant filters).

## Staff assignment (general inquiry only)

`resolveAssignableInquiryStaff` in `server/utils/public-inquiry-staff.ts`:

- Roles allowed: `staff`, `admin`, `tenant_admin` (`PUBLIC_INQUIRY_ASSIGNABLE_ROLES`).
- Must be active, not deleted, same tenant.
- If a location id is present: also require an active `staff_locations` row for that location + tenant.
- Invalid UUID / foreign / inactive staff → store **`null`**; the inquiry itself still succeeds.

## Constraints & pitfalls

1. Do not treat `created_by_user_id` as authenticated identity (same class of bug as public shop body `user_id` — see shop identity runbook when present).
2. Email/phone lookups are always `.eq('tenant_id', tenantId)` — never global.
3. Completed onboarding users are linked without profile overwrite; only `pending` merges fields.
4. Staff validation failures are soft-null, not 4xx — check stored `staff_id` when debugging “wrong instructor”.
5. Distinct from website prospect claim / proposal follow-up claim automations.

## Tests

- `server/utils/__tests__/resolve-inquiry-user.test.ts`
- `server/utils/__tests__/public-inquiry-staff.test.ts`
