# Welcome email + onboarding reminder authorization

**When to use:** Changing tenant welcome mail, student onboarding reminders, or any caller that used to pass recipient contact details in the request body.

Verified against current `main` (Oct 2026). Landed: **#338** (`bdf8b77e`).

**Not this:** Cron batch reminders (`GET /api/cron/send-onboarding-reminders` still uses `assertCronRequest` only). Tenant-registration HMAC for `create-admin` / rollback (`docs` draft #196 / `registration-token.ts`). Public client registration uploads (`docs/REGISTRATION_UPLOAD_GRANT.md`).

---

## Intent

Stop unauthenticated or cross-tenant callers from triggering privileged outbound mail. Recipient identity comes from the database for the authorized tenant, never from attacker-controlled body fields.

---

## Contract (current `main`)

### `POST /api/tenants/send-welcome-email`

| Gate | Detail |
|------|--------|
| Body | `{ tenantId, registration_token? }` — extra fields such as `email` are ignored |
| Path A | Valid `registration_token` for **that** `tenantId` via `verifyRegistrationToken` (HMAC from `POST /api/tenants/register`, ~30 min) — no staff session required |
| Path B | Else `requireStaffOrInternal` — staff/admin roles or `x-internal-secret` |
| Tenant check | Staff (non–`super_admin`) must have `profile.tenant_id === tenantId` → else **403** |
| Recipient | `tenants.contact_email` (+ name fields) loaded by service role for `tenantId` |
| Missing contact | **404** `Tenant not found or missing contact_email` |

### `POST /api/students/send-onboarding-reminder`

| Gate | Detail |
|------|--------|
| Auth | Always `requireStaffOrInternal` first (no registration HMAC path) |
| Body | `{ userId, tenantId }` only — body `email` / `phone` / `firstName` are ignored |
| Tenant check | Staff (non–`super_admin`) must match `tenantId` **before** any DB write → else **403** |
| User load | `users` row with `.eq('id', userId).eq('tenant_id', tenantId)` — miss → **404** |
| Token update | Same tenant + `onboarding_status = 'pending'` filters; new UUID token, expiry **+30 days** |
| Channels | Email from stored `users.email`; SMS flag from stored `users.phone` (SMS send still frontend-side) |

Internal mode (`x-internal-secret` / `CRON_SECRET` / `INTERNAL_API_SECRET` / `NUXT_INTERNAL_API_SECRET`) skips the staff tenant check because `profile` is null — callers must still pass a correct `tenantId`/`userId` pair that exists.

### Roles helper

`requireStaffOrInternal` → `STAFF_ADMIN_ROLES`: `admin`, `staff`, `super_admin`, `tenant_admin`. `x-vercel-cron` is **not** an internal credential.

---

## Pitfalls

1. **Do not trust body contact fields** — tests deliberately send `attacker@…`; mail goes to stored tenant/user contacts.
2. **Welcome HMAC ≠ staff auth** — token is bound to one `tenantId`; it does not authorize other tenants or onboarding reminders.
3. **Comment drift** — file header still says “14 Tage”; code sets **30 days** on `onboarding_token_expires`.
4. **Cron path is separate** — do not fold batch reminders into `requireStaffOrInternal`.
5. **401/403/404 must rethrow** — onboarding handler preserves those codes; wrapping them as 500 hides auth failures.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/tenants/send-welcome-email.post.ts` | Welcome send + dual auth |
| `server/api/students/send-onboarding-reminder.post.ts` | Reminder send + DB recipient |
| `server/utils/require-staff-or-internal.ts` | Staff session or internal secret |
| `server/utils/registration-token.ts` | Tenant signup HMAC |
| `server/utils/__tests__/p0-welcome-onboarding-authz.http.test.ts` | P0-A / P0-B coverage |
| `pages/tenant-register.vue` | Calls welcome with registration token after signup |
