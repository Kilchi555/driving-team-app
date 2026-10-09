# Course atomic capacity and Wallee fulfillment

**When to use:** Course overbooked despite `max_participants`; Wallee FULFILL left `payment_status=completed` with no seat; recover-cron marked success without a registration; credit/gift-card enroll deducted wallet then failed; capacity restore into a full course; debugging #226 (P0-19 / C-P1-01 / C5).

Verified against source (Sep 2026). Merges `07f1e6c4` + `02b916cd` (#226).

Related but separate:

- HTTP enrollment hardening / retired `/api/courses/enroll` — docs PR #206 (`COURSE_HTTP_ENROLLMENT_HARDENING` / #205).
- Public course enrollment payment methods (#186–#189) — draft `COURSE_PUBLIC_ENROLLMENT` on docs PR #193.
- Course sessions anon SELECT (#208/#209) — docs PR #210; capacity trigger does **not** re-grant anon.
- Wallee remaining-amount after wallet credit — `WALLEE_WALLET_CREDIT_INTEGRITY` / #224 (docs PR #225); fulfillment reuses that formula as defense-in-depth.
- Stuck pending recovery / webhook logs — `WALLEE_PAYMENT_RECOVERY.md` (still valid; course path must use this RPC, not a bare status update).

---

## Intent

Three invariants after #226:

1. **Seat claim is serialized in Postgres.** Active registrations cannot exceed `courses.max_participants`. There is **no** admin capacity override.
2. **Captured Wallee course payment and seat commit together.** Completing a course payment outside `fulfill_course_wallee_payment` is forbidden (can leave paid-with-no-seat).
3. **Full wallet/credit enroll commits seat + wallet + gift/discount counters in one RPC.** No compensate-then-cancel path.

---

## A. Capacity trigger (C-P1-01)

### Seat-consuming predicate

Matches `recount_course_participants` / `adminEnrollInCourse`:

```text
deleted_at IS NULL AND status IS DISTINCT FROM 'cancelled'
```

Notes:

- Status `'waitlist'` on `course_registrations` **still occupies a seat** (same as recount).
- Overflow waitlist rows live on `public.course_waitlist` (unchanged).
- Soft-deleted or `cancelled` rows do not count.

### Mechanism

Migration: `migrations/20260916_course_atomic_capacity.sql`

- `BEFORE INSERT OR UPDATE OF course_id, status, deleted_at` → `enforce_course_registration_capacity`
- Locks the course row (`FOR UPDATE`), counts occupying seats, raises `course_capacity_exceeded` / hint `COURSE_FULL` when full
- **Restore into a full course is rejected** (no silent overbook)

HTTP mapping: `server/utils/course-capacity.ts` → `throwIfCourseCapacityExceeded` → **409** `Kurs ist bereits ausgebucht`.

### Surfaces that map the trigger error

| Surface | Role |
|---------|------|
| `POST /api/courses/enroll-cash` | Cash / invoice / optional-payment insert |
| `POST /api/admin/courses/add-participant` | Admin roster add |
| `POST /api/admin/courses/enroll-user` | Admin enroll |
| `POST /api/admin/courses/restore-participant` | Soft-delete restore (fails if full) |
| `POST /api/sari/transfer-enrollment` | Transfer seat claim |
| `server/utils/admin-course-enroll.ts` | Shared admin enroll helper |

Website twin: `apps/website/server/utils/course-capacity.ts` (+ register path) for the marketing-site enroll surface.

---

## B. Atomic Wallee course fulfillment (P0-19)

### Problem (old path)

Separate PostgREST round-trips could `COMMIT payment_status=completed` before the registration insert. Capacity then rejected the seat; payment stayed completed. Recover-cron could log success with no registration.

### Contract

```text
metadata.course_id present + Wallee mapped status completed
  → MUST call fulfillCourseWalleePayment → RPC fulfill_course_wallee_payment
  → NEVER generic completeCapturedWalleePayment / bare payments UPDATE to completed
```

RPC: `migrations/20260916_fulfill_course_wallee_payment.sql`  
Wrapper: `server/utils/fulfill-course-wallee-payment.ts`

In one transaction the RPC:

1. Locks the payment (`FOR UPDATE`); rejects refunded/cancelled (`payment_conflict`).
2. Requires `payments.metadata.course_id`; payload `course_id` / `tenant_id` must match.
3. Prefers locked `payment.user_id`; never attaches a cross-tenant user (`tenant_mismatch`).
4. Optional defense-in-depth: when `captured_amount_chf` is present, it must match  
   `GREATEST(total − credit_used, 0) / 100 ± 0.01` and remaining must be **> 0** (#224 formula). Callers should supply capture whenever Wallee returns a finite amount.
5. Inserts or reactivates a seat-consuming registration (capacity trigger remains the lock).
6. Sets `payment_status=completed`, `course_registration_id`, `paid_at` **only if** the seat succeeded.
7. On capacity failure for a previously wrongly completed orphan payment (no appointment, no registration), may roll payment back to `pending` and return `capacity_exceeded`.

Idempotency: existing seat-consuming row for `payment_id` → `already_fulfilled` (and ensures payment completed). Cancelled/deleted row for the same `payment_id` is reactivated, not treated as already fulfilled.

### RPC status → caller behavior

| Status | Meaning | Typical HTTP / webhook |
|--------|---------|------------------------|
| `fulfilled` / `already_fulfilled` | Seat + completed payment | Success; post-commit side effects on **new** fulfill only |
| `capacity_exceeded` / `rpc_error` | Retryable | Webhook **503** `retry: true`; process.post **503** |
| `amount_mismatch` / `tenant_mismatch` / `session_conflict` / `payment_conflict` / … | Fail closed | **409** (or domain mapping); **do not** mark completed |

`runPostCommitCourseFulfillmentSideEffects` (marketing lead, vehicle bookings, etc.) and confirmation email run **outside** the RPC after durable success.

### Required callers (course + completed)

| Path | Role |
|------|------|
| `POST /api/wallee/webhook` | Primary FULFILL / completed |
| `GET /api/cron/recover-pending-wallee-payments` | Stuck pending/processing recovery |
| `POST /api/payments/process` | Already-captured Wallee retry (`tryFulfillCourseFromCapturedWalleeTx`; fail-closed on missing capture) |
| `POST /api/wallee/create-transaction` | If an existing course payment UUID is already captured |
| `server/utils/wallee-payment-sync.ts` | Status sync must not generic-complete course payments |

**Out of scope for this RPC:** cash, invoice, admin enroll, optional-payment, pure credit enroll, appointment/product Wallee, authorized-but-not-completed.

Execute grants: `service_role` / `postgres` only (not `anon` / `authenticated`).

---

## C. Atomic credit enroll (C5)

### Contract

Full wallet cover in `POST /api/courses/enroll-wallee` (logged-in user, `availableCredit >= finalAmount > 0`):

```text
enrollCourseWithCredit → RPC enroll_course_with_credit
  seat + deduct_student_credit + giftcard/discount counters + credit_transactions
  in ONE transaction — no increment_balance / cancel-after-refund compensation
```

Migration: `migrations/20260917_enroll_course_with_credit.sql`  
Wrapper: `server/utils/enroll-course-with-credit.ts`

SARI enroll, email, CAPI stay **after** the RPC.

### Discount payload pitfall (`02b916cd`)

- Keep `discount_code` / `discount_source` in the **RPC JSON** so gift-card / voucher consumption can run inside the function.
- Persist only `discount_applied_rappen` on `course_registrations` — there is **no** `course_registrations.discount_code` column. Writing it breaks the insert.

### Status → HTTP

| Status | HTTP |
|--------|------|
| `enrolled` / `already_enrolled` | Success |
| `capacity_exceeded` | **409** `Kurs ist bereits ausgebucht` |
| `insufficient_credit` | **400** |
| `giftcard_unavailable` / `discount_unavailable` / `payment_conflict` / `session_conflict` | **409** |
| `tenant_mismatch` | **403** |
| `course_not_found` | **404** |

---

## Pitfalls

1. **Generic Wallee complete for `metadata.course_id`** — Creates paid-without-seat. Always use `fulfillCourseWalleePayment`.
2. **Assuming admin can overbook** — Override does not exist; restore/add fail with capacity error.
3. **Treating registration `waitlist` as free capacity** — It still consumes a seat; use `course_waitlist` for overflow.
4. **Credit enroll compensate path** — Removed; do not reintroduce deduct-then-cancel.
5. **Writing `discount_code` onto the registration row** — Column does not exist; use JSON payload only.
6. **Counting recover-cron `webhook_logs.success=true` as seat proof** — After #226, course recovery only succeeds when the RPC returns fulfilled / already_fulfilled.
7. **Confusing with #219 top-up deposit** — Fulfillment SQL explicitly does not touch `apply_wallee_topup_deposit`.
8. **Migrations are create-only** — Apply in ops deliberately; do not assume auto-apply to production from the repo alone.

---

## Ops checks

```sql
-- Occupying seats vs cap
SELECT c.id, c.name, c.max_participants,
       COUNT(r.id) FILTER (
         WHERE r.deleted_at IS NULL AND r.status IS DISTINCT FROM 'cancelled'
       ) AS occupying
FROM courses c
LEFT JOIN course_registrations r ON r.course_id = c.id
WHERE c.id = 'COURSE_UUID'
GROUP BY c.id;

-- Course payment completed without seat (should be empty after healthy #226)
SELECT p.id, p.payment_status, p.course_registration_id, p.metadata->>'course_id' AS course_id
FROM payments p
WHERE p.metadata ? 'course_id'
  AND p.payment_status = 'completed'
  AND p.course_registration_id IS NULL
  AND p.appointment_id IS NULL
ORDER BY p.updated_at DESC
LIMIT 50;

-- Trigger present
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_enforce_course_registration_capacity';
```

---

## Codepaths

| Path | Role |
|------|------|
| `migrations/20260916_course_atomic_capacity.sql` | Capacity trigger |
| `migrations/20260916_fulfill_course_wallee_payment.sql` | Wallee fulfill RPC |
| `migrations/20260917_enroll_course_with_credit.sql` | Credit enroll RPC |
| `server/utils/course-capacity.ts` | Capacity error detection / 409 |
| `server/utils/fulfill-course-wallee-payment.ts` | Fulfill wrapper + process capture gate |
| `server/utils/enroll-course-with-credit.ts` | Credit enroll wrapper |
| `server/api/wallee/webhook.post.ts` | FULFILL → RPC; 503 on retryable |
| `server/api/cron/recover-pending-wallee-payments.get.ts` | Recovery → RPC |
| `server/api/courses/enroll-wallee.post.ts` | Credit bypass → credit RPC; else pending Wallee payment |
| `server/utils/__tests__/course-*-*.test.ts` | Contract / regression tests |
