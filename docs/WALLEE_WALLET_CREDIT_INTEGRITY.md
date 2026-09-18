# Wallee wallet credit integrity (top-up + remaining charge)

**When to use:** Captured Wallee top-up marked `completed` without a wallet deposit; FULFILL replay / recover-cron should credit; Wallee charged the full total after wallet credit was applied; webhook amount mismatch after partial wallet use; debugging #219 / #224.

Verified against source (Sep 2026). Merges `a193119b` (#219), `158cea41` (#224).

Related but separate:

- Stuck pending recovery / webhook logging — `WALLEE_PAYMENT_RECOVERY.md` (still valid; this runbook covers **credit application** and **remaining payable**).
- Draft Wallee webhook replay / busy overlap (docs PR #118) — replay/timestamp guards; do not rewrite here.
- Gift-card checkout reserve + wallet RPCs (docs PR #91) — catalog gift / redeem paths, not Wallee top-up deposits.
- Staff appointment server quote (#218) — how lesson totals are composed before credit is applied.

---

## Intent

Two invariants after wallet involvement:

1. **Top-up (#219):** A captured Wallee **Guthaben aufladen** payment must credit the student wallet **before** (or without leaving) `payment_status = completed`. Credit is idempotent and refuses non-top-up shapes.
2. **Partial wallet on a lesson/payment (#224):** When `credit_used_rappen > 0`, Wallee must charge and validate against  
   `remaining = max(total_amount_rappen − credit_used_rappen, 0)` — never the full total, never a client-supplied amount.

---

## A. Top-up detection and deposit (#219)

### What counts as a top-up

`inspectWalleeTopupPayment` is **conservative**:

| Gate | Effect |
|------|--------|
| `payment_method === 'credit'` | **Never** a top-up (wallet-spend / duplicate-submit) |
| `payment_method !== 'wallee'` | Not a top-up |
| Appointment / invoice / course / products context | Not a top-up (description spoof blocked) |
| `metadata.is_topup === true` **or** description `^Guthaben aufladen(?:\s\|$\|–\|-)` with `lesson_price_rappen === total_amount_rappen > 0` | Candidate |
| Amount | Prefer `metadata.topup_amount_rappen` when it matches total; else total; mismatch → `invalid_amount` (no credit) |

Metadata may arrive as object, JSON string, or char-key object — `normalizePaymentMetadata` heals these before inspection.

### Atomic deposit

`applyCapturedWalleeTopupCredit` → RPC `apply_wallee_topup_deposit`:

- Locks the payment row; **caller user/tenant/amount must match the row** (else exception).
- RPC re-checks Wallee + top-up shape (description prefix, no appointment/invoice/course/products, lesson = total).
- Inserts `credit_transactions` deposit (`payment_method = wallee`, `reference_id = payment_id`) + increments `student_credits` in one function.
- Partial unique index `credit_transactions_wallee_deposit_reference_uidx` → replay returns `already_applied`.

Migration: `migrations/20260914_topup_wallee_deposit_integrity.sql` (index + RPC only; does **not** backfill historical missing credits).

### Complete path order

`completeCapturedWalleePayment`:

1. If top-up targeting `completed` → **credit first**; on failure leave incomplete / return error.
2. Then mark `completed` (and heal metadata `is_topup` / `topup_amount_rappen` when allowed).

Used from webhook, recover-cron, and process retry. FULFILL on an **already-completed** top-up without a deposit still runs `applyCapturedWalleeTopupCredits` so retries can heal.

### Surfaces (top-up)

| Path | Role |
|------|------|
| `POST /api/customer/create-topup-session` | Creates Wallee top-up payment shape |
| `POST /api/wallee/webhook` | Capture → credit → complete; heal already-completed |
| `GET /api/cron/recover-pending-wallee-payments` | Same credit path for stuck pending |
| `POST /api/payments/process` | Retry path uses inspection / complete helper |
| `server/utils/payment-metadata.ts` | Detection + metadata normalize |
| `server/utils/topup-credit.ts` | Apply + complete helpers |

---

## B. Remaining payable after wallet credit (#224)

### Formula

```text
walleeRemainingRappen(payment) =
  max(total_amount_rappen - credit_used_rappen, 0)   // via remainingDueRappen, pending status
```

Tolerance for capture match: **±0.01 CHF** (1 rappen float guard).

### Create transaction

`POST /api/wallee/create-transaction`:

- Loads payment from DB; client amount is **never** authoritative.
- Charges `walleeRemainingChf(payment)`.
- Remaining ≤ 0 → **400** (no CHF-0 Wallee transaction for fully credited payments).
- Client mismatch is logged; server remaining is used.

`POST /api/payments/convert-to-online` passes CHF remaining (not full total rappen).

### Webhook validation

Capture amount is compared with `isWalleeCaptureMatchingRemaining` against DB remaining — not `total_amount_rappen` alone. Existing replay / tenant / transaction / status guards are unchanged.

### Surfaces (remaining)

| Path | Role |
|------|------|
| `server/utils/wallee-remaining-amount.ts` | Remaining + capture match helpers |
| `POST /api/wallee/create-transaction` | Charge remaining |
| `POST /api/wallee/webhook` | Validate capture vs remaining |
| `POST /api/payments/convert-to-online` | Start online pay for remainder |

---

## Pitfalls

1. **`payment_method=credit` is not a missing top-up** — Do not credit it again.
2. **Description spoof** (`Guthaben aufladen` on a shop/lesson row) — Blocked when products / appointment / `lesson ≠ total`.
3. **Marking completed before deposit** — Pre-#219 failure mode; use `completeCapturedWalleePayment` / heal on FULFILL replay.
4. **Migration does not auto-repair old rows** — Controlled reconciliation after deploy is separate ops work.
5. **Charging Wallee for the full total after wallet credit** — Wrong; charge remaining only (#224).
6. **Fully credited payment → Wallee CHF 0** — Rejected at create-transaction; do not open a zero transaction.
7. **Confusing top-up deposit with gift-card wallet redeem** — Different RPCs (`apply_wallee_topup_deposit` vs gift-card reserve/redeem).

---

## Ops checks

```sql
-- Top-up payment without a Wallee deposit row (investigate)
SELECT p.id, p.payment_status, p.total_amount_rappen, p.description, p.user_id, p.created_at
FROM payments p
LEFT JOIN credit_transactions ct
  ON ct.reference_id = p.id
 AND ct.transaction_type = 'deposit'
 AND ct.payment_method = 'wallee'
WHERE p.payment_method = 'wallee'
  AND p.description LIKE 'Guthaben aufladen%'
  AND p.payment_status = 'completed'
  AND ct.id IS NULL
ORDER BY p.created_at DESC
LIMIT 50;

-- Partial wallet: expected Wallee charge in rappen
SELECT id, total_amount_rappen, credit_used_rappen,
       GREATEST(total_amount_rappen - COALESCE(credit_used_rappen, 0), 0) AS remaining_rappen,
       payment_status, wallee_transaction_id
FROM payments
WHERE id = 'PAYMENT_UUID';
```

---

## Codepaths

- `server/utils/payment-metadata.ts` — `inspectWalleeTopupPayment`, metadata normalize
- `server/utils/topup-credit.ts` — `applyCapturedWalleeTopupCredit(s)`, `completeCapturedWalleePayment`
- `migrations/20260914_topup_wallee_deposit_integrity.sql` — unique index + `apply_wallee_topup_deposit`
- `server/utils/wallee-remaining-amount.ts` — remaining + capture match
- `server/api/wallee/create-transaction.post.ts`, `webhook.post.ts`
- `server/api/payments/convert-to-online.post.ts`
- Tests: `payment-metadata.test.ts`, `topup-credit.test.ts`, `wallee-remaining-amount.test.ts`, `wallee-create-transaction.http.test.ts`
