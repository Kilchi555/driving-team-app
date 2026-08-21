# SARI Checkout Races (test-enroll leftovers)

**When to use:** Full course enroll after Wallee pay is missing sessions; student stuck “already in SARI” with no payment; SARI sync imported a mid-checkout leftover; debugging `validateAllSessions` / webhook merge.

Verified against source (Aug 2026).

---

## Intent

SARI has **no dry-run**. Pre-checkout validation does real enroll + rollback. If rollback leaves a seat, blocking checkout strands the student in SARI with **no payment row**. Design: **allow checkout**, skip SARI auto-import while checkout is open, then **re-enroll all paid sessions from payment metadata** on the Wallee webhook (create or merge registration).

---

## Flow

```text
validateAllSessions(sessionIds, faberid, birthdate)
  → enroll each session (skip if already member)
  → on capability failure: rollback test seats → reject checkout
  → on success: rollback test seats
       if leftover remains → still { canEnroll: true }  // intentional
  → create Wallee payment (metadata holds sessions / partial flags / faberid)
  → webhook FULFILL/COMPLETED
       → create or MERGE course_registrations (sari_synced_at = null)
       → enrollInSARIAfterPayment(registrationId)  // all sessions from metadata
```

Open-checkout protection in `sari-sync-engine`:

- Look for payments with `payment_status` in `pending|processing|authorized`
- `created_at` within the last **3 hours**
- `metadata` contains this `course_id`, matching `sari_faberid`, and **no** `course_registration_id` yet
- If found → **skip** SARI auto-import for that faberid+course

Abandoned checkouts older than 3h no longer block imports forever.

---

## Partial / individual flags

Webhook parses `is_partial_enrollment` **strictly**:

- boolean `true`, or string `'true'` → partial
- anything else → not partial

Same strictness when merging into an existing registration. Always re-read session shape from **payment metadata** (source of truth after pay), not only from a stale registration row.

On merge/create, set `sari_synced: false` and `sari_synced_at: null` so enroll runs again for the **full** paid set (leftover single-session seat is not enough).

---

## Pitfalls

1. **Leftover after validate is not a hard failure** — Logs `SARI test-enroll leftover after validate … allowing checkout`. Expect webhook + open-checkout skip to heal; do not “fix” by rejecting checkout.
2. **409 / ALREADY_ENROLLED on webhook** — Normal when a leftover seat remains; enroll path should treat already-enrolled as success for that session and continue others.
3. **Sync racing webhook** — Without the 3h open-checkout skip, sync can create a registration without contact/payment; webhook then **merges** by faberid/email. Merge must clear `sari_synced_at` or full re-enroll may be skipped.
4. **Rollback retries** — `rollbackTestEnrollments` tries unenroll + membership verify up to **3** times with backoff; verify failure counts as leftover.
5. **Course confirmation From address** — Related ops note: enrollment mails use tenant `from_email` only when `resend_domain_verified` (`sendEmail` / course confirmation). Unverified tenants fall back to platform `RESEND_FROM_EMAIL` (e.g. noreply@simy.ch).

---

## Ops checks

```sql
-- Open checkouts that would block SARI auto-import (< 3h)
SELECT id, payment_status, created_at, metadata->>'sari_faberid' AS faberid, metadata->>'course_id' AS course_id
FROM public.payments
WHERE payment_status IN ('pending', 'processing', 'authorized')
  AND created_at >= now() - interval '3 hours'
  AND course_registration_id IS NULL
  AND metadata ? 'course_id'
ORDER BY created_at DESC
LIMIT 50;

-- Registrations waiting for / mid SARI enroll
SELECT id, course_id, sari_faberid, sari_synced, sari_synced_at, payment_id, status
FROM public.course_registrations
WHERE sari_synced IS DISTINCT FROM true
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 50;
```

Server logs to grep: `test-enroll leftover`, `Skipping SARI auto-import`, `Merging Wallee payment into existing`, `Enrolling in SARI for`.

---

## Codepaths

- `utils/sariClient.ts` — `validateAllSessions`, `rollbackTestEnrollments`
- `server/utils/sari-sync-engine.ts` — 3h open-checkout skip before auto-import
- `server/api/wallee/webhook.post.ts` — registration create/merge, `enrollInSARIAfterPayment`, strict partial flags, clear `sari_synced_at`
- `server/api/payments/process-public.post.ts` — payment metadata for course checkout
- `server/utils/email.ts` + `server/api/emails/send-course-enrollment-confirmation.post.ts` — tenant From when domain verified
