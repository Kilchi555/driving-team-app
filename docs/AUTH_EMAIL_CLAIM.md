# Auth email claim (onboarding / register)

**When to use:** Onboarding or guest SMS link “steals” an existing login; public email check says available but create fails; cross-tenant email collision; `auth_user_id` unique violation; pending booking contact overwritten.

Verified against source (Aug 2026). Commit `6dba78a2` (#92).

---

## Intent

Supabase Auth emails are **global**. A `public.users` profile may attach an `auth_user_id` only if that Auth user is not already owned by another profile. Existing Auth users must **never** be password-reset via admin `createUser` / update during onboarding — otherwise a guest or onboarding token can hijack them.

---

## Contract

### Claim codes (`AuthEmailClaimCode`)

| Code | Meaning | Account create? | Guest booking? |
|------|---------|-----------------|----------------|
| `AVAILABLE` | No Auth user; no tenant client with auth | Yes | Yes |
| `TENANT_CLIENT_EXISTS` | Same tenant already has a client with this email + `auth_user_id` | No | No |
| `AUTH_LINKED_ELSEWHERE` | Auth user exists and is linked to another `users` row | No | Yes |
| `ORPHAN_CLAIMABLE` | Auth user exists but no `users` row owns it | No (must sign in / password-reset) | Yes |
| `AUTH_LOOKUP_FAILED` | Admin Auth lookup failed | No | No (treat as unavailable for create) |
| `INVALID` | Bad email | No | No |

`claimOrCreateAuthUser` only creates when `availableForAccount` is true (`AVAILABLE`). If Auth reports “already registered” after create, it re-evaluates and throws **409** with `AUTH_LINKED_ELSEWHERE` (or the re-evaluated code) — it does **not** reset the password.

### Unique `auth_user_id`

Partial unique index `users_auth_user_id_uidx` (`migrations/20260828_users_auth_user_id_unique.sql`): at most one non-null `auth_user_id` in `public.users`. App maps Postgres `23505` via `isUniqueAuthUserIdViolation`.

### Public vs trusted responses

Untrusted clients must not learn global Auth occupancy:

| Surface | Behavior |
|---------|----------|
| `POST /api/students/check-email` without valid pending onboarding token | `publicEmailCheckAvailable`: hides `AUTH_LINKED_ELSEWHERE` / `ORPHAN_CLAIMABLE` / lookup failure as “available”; taken tenant clients get generic `PUBLIC_EMAIL_TAKEN_MESSAGE` |
| Same endpoint **with** valid pending `token` | Returns real `code` + claim message (trusted onboarding user) |
| `POST /api/auth/check-email-exists` | Tenant-local row only; global Auth occupancy not exposed as `exists: true` unless `TENANT_CLIENT_EXISTS` |

### Pending booking contacts

`pendingContactMismatch`: if a pending user was matched by email, an incoming phone that differs from the stored phone (normalized CH digits) blocks overwrite — and vice versa when matched by phone. Used in `guest-book` so a new guest cannot rewrite another pending contact.

---

## Surfaces

| Path | Role |
|------|------|
| `claimOrCreateAuthUser` | Onboarding complete + client register |
| `evaluateClientEmailClaim` | Shared decision (tenant client + Auth + linked profiles) |
| `POST /api/students/complete-onboarding` | Creates/links Auth for pending student |
| `POST /api/auth/register-client` | Public client registration |
| `POST /api/booking/guest-book` | Claim check + pending contact guard |
| `POST /api/students/check-email` | Live availability UI |
| `POST /api/auth/check-email-exists` | Register form existence check |

---

## Pitfalls

1. **Orphan Auth ≠ free email** — `ORPHAN_CLAIMABLE` means the person must log in or use Auth password-reset. Onboarding must not call admin password update.
2. **Public “available” can still fail create** — Privacy masking returns available for linked-elsewhere / orphan; create still 409s. UI should handle 409 with the German claim message.
3. **Cross-tenant same email** — Auth is global. Tenant A’s client with Auth blocks Tenant B from creating a new Auth user for that email; guest booking may still proceed without a new account.
4. **Token expiry** — `resolvePendingUserIdFromOnboardingToken` only trusts `onboarding_status = pending` and non-expired `onboarding_token_expires`.
5. **Unique index races** — Two concurrent claims for the same Auth user can hit `users_auth_user_id_uidx`; treat as conflict, not retry-with-reset.

---

## Smoke test

1. Email with existing Auth + other `users.auth_user_id` → onboarding/register 409 `AUTH_LINKED_ELSEWHERE`; public check-email without token does not leak “linked elsewhere”.
2. Email unused in Auth → create succeeds; `users.auth_user_id` set once.
3. Pending onboarding token for user U + same email → check-email returns `code` for trusted path.
4. Guest book matching pending by email with different phone → contact mismatch / reject overwrite.
5. Second profile insert with same `auth_user_id` → unique violation.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/auth-email-claim.ts` | Codes, evaluate, claim-or-create, public mask, pending mismatch |
| `migrations/20260828_users_auth_user_id_unique.sql` | Partial unique index |
| `server/api/students/complete-onboarding.post.ts` | Onboarding claim |
| `server/api/auth/register-client.post.ts` | Register claim |
| `server/api/booking/guest-book.post.ts` | Guest claim + pending contact |
| `server/api/students/check-email.post.ts` | Public/trusted availability |
| `server/api/auth/check-email-exists.post.ts` | Tenant-local exists |
| `server/utils/__tests__/auth-email-claim.test.ts` | Unit coverage |

Related: customer-account activation / consulting no-login tenants (draft `CUSTOMER_ACCOUNT_ACTIVATION.md` on open docs PRs) — orthogonal toggle; claim rules still apply when accounts are enabled.
