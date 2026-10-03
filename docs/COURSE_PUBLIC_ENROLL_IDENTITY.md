# Course public enroll identity binding

**When to use:** Public cash/Wallee course enrollment attaches the wrong customer; staff session on public enroll debits another account’s credit; contact match “finds” a user but enrollment should stay unlinked; debugging #239.

Verified against source (Sep 2026). Merge `a0415699` (#239).

Related but separate:

- Course HTTP hardening (#205) and Nitro 410 on legacy enroll (#207) — docs PRs #206 / #210.
- Atomic capacity / Wallee fulfill RPC (#226) — docs PR #230; this runbook covers **who** binds to `payments.user_id` / registration, not seat math.
- F-3 anon Data-API containment (#231) — vouchers/slots/waitlist only.
- Staff phone autofill block on public enroll (#189) — complementary; still enforced before identity resolution.

---

## Intent

Public course enrollment must not **attach** an existing customer account by email/phone discovery. Contact lookup is **discovery only**. The only account authority on the public path is:

1. A **same-tenant** session with role `client` or `student`, or
2. A **newly created** guest user when the contact is unused, or
3. **Unlinked** enrollment (`user_id` null) when contact collides with an existing row and there is no valid session principal.

Staff/admin/cross-tenant sessions are treated as anonymous on this path (`publicCourseSessionPrincipalId` returns `null`).

---

## Contract

### Principal helper

`publicCourseSessionPrincipalId(sessionUser, courseTenantId)` in `server/utils/fulfill-course-wallee-payment.ts`:

- Requires `sessionUser.id`
- Requires `sessionUser.tenant_id === courseTenantId`
- Requires role in `{ client, student }`
- Otherwise returns `null` (staff/admin ignored)

**Do not** use this helper on Path A (`enrollmentId` admin/legacy bind).

### Surfaces

| Surface | Identity rule |
|---------|----------------|
| `POST /api/courses/enroll-cash` | Session principal if valid; else create guest only when contact unused; unique collision → continue **unlinked** (`guestUserId = null`) |
| `POST /api/courses/enroll-wallee` | Session principal only for credit bypass / payment `user_id`; contact match never attaches; guest created later on fulfillment if contact unused |
| `POST /api/payments/process-public` | **Path A** (`enrollmentId`): trusted enrollment/`passedUserId` bind. **Path B** (public course): body `userId` untrusted; set `payments.user_id` from session principal only |
| Wallee fulfill → `ensureGuestUserForCoursePayment` | Reuse only `payment.user_id` when tenant-ok; contact match is discovery; new guest when unused; persist `payment.user_id` only if still null |

### Credit

Wallet/credit enrollment on the public Wallee path runs **only** for `sessionPrincipalId`, never for a contact-matched user id. Session cookie/authorization headers are forwarded into the credit enroll call so the server sees the same principal.

---

## Pitfalls

1. **“Matching email should link the booking”** — that was the vulnerability (account takeover / credit theft). After #239, matching contact without login stays unlinked until the customer authenticates.
2. **Staff testing public enroll while logged in as admin** — session is ignored; behaves like anonymous. Log in as a same-tenant `client`/`student` to bind.
3. **Passing `userId` in `process-public` body on Path B** — ignored. Only Path A (`enrollmentId`) trusts caller/enrollment bind.
4. **Fulfillment attaching via phone/email** — `ensureGuestUserForCoursePayment` must not set `payment.user_id` from a contact match; only from this payment’s existing `user_id` or a newly inserted guest.
5. **Unique constraint `23505` on guest insert** — continue without attach; do not load the colliding row and enroll as that user.
6. **Confusing with #205/#226** — HTTP authz and atomic seats are orthogonal; identity binding is #239.

---

## Codepaths

| Path | Notes |
|------|-------|
| `server/utils/fulfill-course-wallee-payment.ts` | `publicCourseSessionPrincipalId`, `ensureGuestUserForCoursePayment`, `persistCoursePaymentGuestUserId` |
| `server/api/courses/enroll-cash.post.ts` | Public cash identity |
| `server/api/courses/enroll-wallee.post.ts` | Public Wallee + credit principal |
| `server/api/payments/process-public.post.ts` | Path A vs Path B `user_id` |
| `server/api/wallee/webhook.post.ts` | Fulfillment entry (guest ensure) |
| `server/utils/__tests__/course-c5-credit-and-process.test.ts` | Credit + process-public identity |
| `server/utils/__tests__/course-c3-regressions.test.ts` / `course-http-p0p1.test.ts` | Regression guards |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/course-c5-credit-and-process.test.ts
npx vitest run server/utils/__tests__/course-c3-regressions.test.ts
```

Manual: public enroll while logged in as staff must not debit staff credit; same contact as an existing customer without login must not attach that `users.id`.
