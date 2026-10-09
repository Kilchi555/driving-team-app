# Public course user linking and Wallee identity block

Verified from `main` after merge of `3e0c9e47` (#308).

## Intent

Public course enrollment must attach a **tenant-scoped `public.users` business row** without inventing auth logins, and without silently picking the wrong person. When Wallee has already **captured** money but that identity step fails, the payment stays recoverable (`identity_blocked`) instead of being cancelled or refunded by the recovery cron.

Separate from public shop identity (#240 / `SHOP_PUBLIC_IDENTITY`) and from Staff POS admin sale.

## Contract — public course user

Helper: `resolvePublicCourseUser` in `server/utils/public-course-user.ts`.

| Rule | Behavior |
|---|---|
| Auth | Does **not** create auth users, passwords, magic links, or onboarding claims |
| New role | Inserts `role: 'client'` (`PUBLIC_COURSE_USER_ROLE`) |
| Reuse | Exact email match reuses an existing same-tenant `client` or leftover `student` row; profile/role are **not** rewritten |
| Ambiguity | `limit(2)` is an ambiguity detector — two+ rows → abort (`ambiguous_email` / `ambiguous_phone`) |
| Phone | Phone **never** attaches an existing row (`phone_only`); phone only helps create / staff-contact checks |
| Staff contact | Email or phone matching staff/admin roles → `staff_contact` abort |
| Tenant | Resolved id must stay in the course tenant (`tenant_mismatch`) |

Abort class: `PublicCourseUserAbort` with `reason` + HTTP `statusCode` (usually 400/409/500).

### Call sites

| Path | Role |
|---|---|
| `POST /api/courses/enroll-cash` | Resolves user before cash enrollment |
| `fulfillCourseWalleePayment` → `ensureGuestUserForCoursePayment` | Resolves after capture; may mark identity block |
| Online `enroll-wallee` | Does **not** call `resolvePublicCourseUser` at checkout create (fulfillment does) |

`ensureGuestUserForCoursePayment` may reuse `payment.user_id` only when that user is a same-tenant course customer **and** the enrollment email agrees or is absent. Browser-supplied identity is never trusted as the owner.

## Contract — captured identity block

Helpers: `server/utils/wallee-identity-block.ts`.

- State flag: `metadata.wallee_failure_state = 'identity_blocked'` (`CAPTURED_IDENTITY_BLOCK_STATE`)
- Also stores `identity_block_reason`, `wallee_failure_detected_at`; clear sets `identity_block_resolved_at` and drops the active flag
- **`payment_status` stays `pending`** until seat fulfillment succeeds — this is not a Wallee decline and does not refund/cancel
- Recovery cron Phase 4 **must not cancel** identity-blocked rows (`partitionStalePendingWalleePayments` + `cancelStalePendingWalleePaymentIds` with `IS DISTINCT FROM` guard)
- Failure notify skips identity-blocked rows (`isCapturedIdentityBlockMetadata`)

Flow:

```
Wallee capture → fulfillCourseWalleePayment
  → ensureGuestUserForCoursePayment / resolvePublicCourseUser
  → on PublicCourseUserAbort:
       persistCapturedIdentityBlock(reason)
       return status: 'identity_blocked'
  → on successful RPC fulfill:
       clearCapturedIdentityBlock (best-effort; must not undo seat)
```

## Constraints & pitfalls

1. Do not treat `identity_blocked` like abandoned checkout or card decline — money was captured; leave pending for ops/retry.
2. Do not use `.neq('metadata->>wallee_failure_state', …)` for cancel guards — NULL rows drop out; use `isDistinct` / `IDENTITY_BLOCK_STATE_COLUMN`.
3. Phone-only match is intentional rejection, not a soft link.
4. Do not rewrite existing customer roles/profiles on email reuse.
5. Cross-link only: shop public identity and Staff POS are different subsystems.

## Codepaths

- `server/utils/public-course-user.ts`
- `server/utils/wallee-identity-block.ts`
- `server/utils/fulfill-course-wallee-payment.ts`
- `server/api/courses/enroll-cash.post.ts`
- `server/api/cron/recover-pending-wallee-payments.get.ts` (Phase 4)
- `server/utils/wallee-failure-notify.ts`
- Tests: `public-course-user.test.ts`, `wallee-identity-block.test.ts`
