# Public registration / inquiry submission idempotency

**When to use:** Changing public `/register/:tenant`, general inquiry submit, pending-user mail, or the post-success CTA for hidden-account tenants.

Verified against current `main` (Oct 2026). Landed: **#325** (`2a1f7873`), success redirect (`fe168dcf`), register stay-on-form (**#307**, `dbdac6a6`).

**Not this:** Registration upload HMAC grant (`docs` draft #339 / #334). Register-client role lock (open draft #196). Welcome/onboarding authz (#338).

---

## Intent

One human form submit must produce **one** school-facing inquiry / one pair of “new user” notifications, even when the browser retries, double-clicks, or reloads. Idempotency is enforced with a client-generated `submission_id` plus database unique constraints—not SELECT-then-INSERT.

---

## Contract (current `main`)

### Client submission id

| Helper | Behavior |
|--------|----------|
| `utils/register-form-submission.ts` | UUID in `sessionStorage` (`register_submission_id`); reuse until success |
| `rememberSubmissionId` | Create only when missing / invalid |
| `finishRegisterSubmission` | Mark completed, drop id + cached form |
| `consumeCompletedRegisterSubmission` | After success reload: clear form restore so the user cannot resend the same payload |

Invalid non-empty `submission_id` → **400** (`parseSubmissionId` in `server/utils/inquiry-submission.ts`). Blank / omitted → legacy insert (no idempotency).

### Inquiry proposals (#325)

`insertInquiryProposal`:

1. INSERT `booking_proposals` (optional `submission_id`)  
2. On unique violation `23505` with a submission id → SELECT winner by `(tenant_id, submission_id)` and return `{ created: false }`  
3. Replay path in `submit-general-inquiry.post.ts` returns `idempotent_replay: true` and **skips** second notifications / conversion side effects  

SQL draft: `sql_migrations/20260930_booking_proposals_submission_id.sql` — **not applied from application code**. Unique partial index on `(tenant_id, submission_id) WHERE submission_id IS NOT NULL`.

### Pending registration users (#325)

`upsertPendingRegistrationUser` in `server/utils/pending-registration-user.ts`:

- Prefer update of existing **pending** row matched by email or phone in tenant  
- Else INSERT; on `23505` race, resolve to existing row  
- Active accounts (`auth_user_id` set or `onboarding_status === 'completed'`) → conflict `email` / `phone` → caller **409**  
- `pendingUserNotificationPlan(created)` — admin “Neuer Benutzer” + customer receipt only when `created === true`

### Success CTA (`fe168dcf`)

`resolveRegistrationSuccessAction`:

| Account mode | CTA |
|--------------|-----|
| `hidden` + slug matches loaded tenant + safe `website_url` | External “Zurück zur Website” (http/https only, no userinfo) |
| `hidden` otherwise | Internal `/` |
| `required` / other | “Zum Login” → `/${slug}` or `/login` |

### Stay on form (#307)

`/register/:tenant` **always** renders the public form, including when a session is already active. Phones keep admin sessions; the old redirect to `/admin/dashboard` 404’d. Passkey/backup login targets on `pages/login.vue` are `/admin` and `/dashboard` (not the missing `*/dashboard` paths).

---

## Pitfalls

1. **SQL may be undeployed** — without `booking_proposals.submission_id` + unique index, retries can create duplicate proposals even when the client sends an id.  
2. **Omit vs invalid id** — empty opts out of idempotency; garbage values must 400, not silently insert.  
3. **Replay must stay silent** — `created: false` / `idempotent_replay` must not re-send school mail, customer receipt, or Ads conversion upload.  
4. **Pending vs active conflict** — updating a pending twin is OK; colliding with an activated account is 409.  
5. **Do not reintroduce logged-in redirects** on `/register/:tenant` — mobile admin sessions will break customer links again.  
6. **Website CTA safety** — only absolute http(s) without credentials; never invent a host from the slug alone.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/register-form-submission.ts` | Client submission id lifecycle |
| `utils/registration-success-target.ts` | Hidden-account success CTA |
| `server/utils/inquiry-submission.ts` | Parse id + insert-with-replay |
| `server/utils/pending-registration-user.ts` | Pending user upsert + notification plan |
| `server/api/booking/submit-general-inquiry.post.ts` | Inquiry API + replay short-circuit |
| `server/api/auth/register-client.post.ts` | Public register + pending notifications |
| `pages/register/[tenant].vue` | Form, submission id, stay-on-form |
| `pages/login.vue` | Passkey/backup redirect path fixes (#307) |
| `sql_migrations/20260930_booking_proposals_submission_id.sql` | Column + unique index (draft) |
| `server/utils/__tests__/public-registration-idempotency.test.ts` | Idempotency coverage |
| `server/utils/__tests__/registration-success-target.test.ts` | Success CTA coverage |
