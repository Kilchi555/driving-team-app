# Guest Auth login boundary

Verified from `main` after merge of `10d97f05` (#382).

## Intent

Decide whether a matching `public.users` row is a **login-backed account** (must authenticate) or a **no-Auth shadow** (may be reused on guest booking / pending registration).

Public course / VKU enrollment creates business rows with `auth_user_id: null` and often omits `onboarding_status` (DB default may be `completed`). Treating `onboarding_status === 'completed'` as proof of a login blocked those customers from later guest lesson booking and forced duplicate identities.

## Contract

Shared helpers: `server/utils/guest-customer-identity.ts`.

| Helper | Rule |
|---|---|
| `isAuthBackedCustomer` | `Boolean(user.auth_user_id)` — **only** Auth presence |
| `isReusableGuestCustomer` | Row exists **and** not Auth-backed |
| `pickReusableGuestCustomer` | Prefer email match over phone when both are reusable shadows |

Do **not** use `onboarding_status === 'completed'` as a login gate.

### Call sites

| Path | Behavior |
|---|---|
| `POST /api/booking/guest-book` | Auth-backed phone/email → 409 (`DUPLICATE_PHONE` / `TENANT_CLIENT_EXISTS`). Reusable shadows are reused (`pickReusableGuestCustomer`). Login-required tenants still short-circuit earlier (`registration_required` → 403) |
| `upsertPendingRegistrationUser` | Reuses no-Auth shadows (pending **or** completed-without-auth). Auth-backed contact → conflict |
| `POST /api/auth/register-client` (pendingOnly) | Blocks only when `auth_user_id` is set — not completed-without-auth |
| `resolvePublicCourseUser` | Documents that new course rows intentionally omit onboarding status; guest flows must key off Auth |

Cross-link: public course user linking / Wallee identity block are separate (`PUBLIC_COURSE_USER_AND_WALLEE_IDENTITY` on draft #380). This runbook is only the login-boundary rule those guests depend on.

## Example

```
VKU enroll → public.users { auth_user_id: null, onboarding_status: completed (default) }
Guest lesson book same email
  → isAuthBackedCustomer? no
  → pickReusableGuestCustomer → reuse same id
  → no duplicate client row

Same email after customer set a password (auth_user_id set)
  → 409 — must log in
```

## Constraints & pitfalls

1. Knowing someone’s phone/email must never attach a booking to an Auth-backed account without login.
2. Do not reintroduce `onboarding_status === 'completed'` checks as “active account” in guest-book or pending registration.
3. Email preference over phone when both shadows match is intentional (historical guest-book behavior).
4. Contact mismatch on a reused pending shadow still 409s (`CONTACT_MISMATCH`) — reuse ≠ overwrite conflicting contact pairs.
5. No production data migration in #382 — behavior-only.

## Codepaths

- `server/utils/guest-customer-identity.ts`
- `server/api/booking/guest-book.post.ts`
- `server/utils/pending-registration-user.ts`
- `server/api/auth/register-client.post.ts`
- `server/utils/public-course-user.ts` (comment / contract alignment)
- Tests: `server/utils/__tests__/guest-customer-identity.test.ts`
