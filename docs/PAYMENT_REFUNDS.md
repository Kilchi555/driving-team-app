# Payment Refunds — Wallee Ledger & Partial Refunds

**When to use:** Debugging partial/full Wallee refunds, double-payout risk after wallet credit refunds, cancellation refunds that silently go to wallet, or webhook/ledger mismatch on `payment_refunds`.

Verified against source (Aug 2026). Related ops: [WALLEE_PAYMENT_RECOVERY.md](./WALLEE_PAYMENT_RECOVERY.md) (pending capture recovery — not refunds).

---

## Intent

Track every Wallee refund attempt in `payment_refunds`, keep `payments.refunded_amount_rappen` in sync, and allow **multiple partial** refunds without double-paying. Shared entry point: `processWalleeRefund` in `server/utils/wallee-refund.ts`.

---

## Money model

| Term | Definition |
|------|------------|
| Captured (Wallee) | `round5(total_amount_rappen - credit_used_rappen)` |
| Reserved | Sum of ledger rows with status `pending` or `successful` |
| Remaining refundable | `max(0, captured - reserved)` (also exposed as helper on payment columns) |
| `payments.refunded_amount_rappen` | Synced sum of pending+successful ledger amounts |

Statuses accepted for a new refund: `completed`, `partially_refunded`, `authorized` — or any status if remaining > 0. After sync, a full Wallee refund sets `payment_status=refunded`; partials typically leave `completed` (sync does **not** invent `partially_refunded`).

Amounts are in **Rappen**; Wallee API calls use CHF (`amount_rappen / 100`).

---

## Ledger (`payment_refunds`)

Migration: `sql_migrations/20260815_payment_refunds_ledger.sql`.

- Unique `(payment_id, idempotency_key)`
- Status: `pending` | `successful` | `failed`
- RLS: deny all for `anon`/`authenticated` — **service role only**
- Same pattern for `refund_requests`

Idempotent retry: same key + `successful` → return prior result without calling Wallee again.

---

## Call sites & idempotency keys

| Path | Key pattern | Notes |
|------|-------------|--------|
| `POST /api/admin/payments/refund` | `manual-refund-{paymentId}-{amount}` | Allowlisted actors only |
| `POST /api/payments/refund-request` | same, or `duration-reduction-…` if `price_correction` | Price correction does **not** bump `refunded_amount_rappen` |
| Appointment cancel | `appointment-cancel-{appointmentId}` | Customer/staff → often wallet unless allowlisted |
| Course remove participant | `course-remove-{enrollmentId}` | Allowlist gate before Wallee |
| Refund-request review | per admin flow | Uses `processWalleeRefund` |
| Wallee webhook `Refund` entity | `webhook-{refundId}` upsert | Then `syncPaymentRefundTotals` |

---

## Temporary allowlist

`utils/wallee-refund-access.ts` — `WALLEE_REFUND_ALLOWED_EMAILS` (currently a single staff email).

- Manual admin refund APIs: **403** if actor email not listed.
- Customer/staff cancel: requesting `refundDestination=wallee` is **forced to `wallet`** unless allowlisted.
- Course remove: Wallee refund skipped/blocked without allowlist.

Until the list is widened, most tenants only see **credit-wallet** refunds on cancel.

---

## Pitfalls

1. **`payment_status=refunded` with `refunded_amount_rappen=0`** — treated as **wallet/credit** refund already paid; Wallee refund is blocked to avoid double payout.
2. **No `tenant_id` / no Wallee transaction id** — hard fail; resolve via `payment_wallee_transactions` or manual Wallee dashboard.
3. **Fully credit-paid** (`captured <= 0`) — nothing to refund via Wallee.
4. **Price correction** (`priceCorrection: true`) — money leaves via Wallee + ledger row, but totals sync intentionally skips increasing `refunded_amount_rappen` so the new lower total stays refundable correctly.
5. **Pending rows reserve capacity** — open `pending` attempts reduce remaining even before SUCCESSFUL webhook.
6. **Allowlist** — “Wallee refund” UI/API appears to fail or silently choose wallet; check actor email first.
7. Client/anon cannot read `payment_refunds` — use service role / admin APIs for investigation.

---

## Quick SQL

```sql
SELECT id, payment_status, total_amount_rappen, credit_used_rappen,
       refunded_amount_rappen, wallee_transaction_id, wallee_refund_id
FROM payments WHERE id = :payment_id;

SELECT * FROM payment_refunds
WHERE payment_id = :payment_id
ORDER BY created_at;
```

Remaining ≈ `round( (total - coalesce(credit,0)) / 5 ) * 5 - refunded_amount_rappen`.

---

## Codepaths

- `server/utils/wallee-refund.ts` — `processWalleeRefund`, `syncPaymentRefundTotals`, remaining helpers
- `utils/wallee-refund-access.ts` — allowlist
- `server/api/admin/payments/refund.post.ts`, `server/api/payments/refund-request.post.ts`
- `server/api/appointments/handle-cancellation.post.ts`, `cancel-customer.post.ts`, `cancel-staff.post.ts`
- `server/api/admin/courses/remove-participant.post.ts`, `refund-preview.post.ts`
- `server/api/wallee/webhook.post.ts` — `handleWalleeRefundWebhook`
- `sql_migrations/20260815_payment_refunds_ledger.sql`
