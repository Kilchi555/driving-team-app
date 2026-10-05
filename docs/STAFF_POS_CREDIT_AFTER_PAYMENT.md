# Staff POS credit after payment completes

Verified from `main` after merge of `a0e395c5` (#360).

Supersedes the “Credit timing on current main” section in open draft [#363](https://github.com/Kilchi555/driving-team-app/pull/363) `STAFF_POS_PRODUCT_SALE.md` (that draft still describes pre-#360 immediate credit for deferred/invoice). Sale create architecture, methods, and DRAFT RPC basics remain in that draft when it lands; **this file is the credit-timing source of truth**.

## Intent

Wallet credit for Staff POS credit-products is applied only when money is actually completed (or cash at create). Pending invoice / deferred / online sales must not top up the wallet early.

## Credit timing (current main)

Helper: `creditsImmediately(method)` → **`true` only for `cash`**.

| Method | When wallet credit is applied |
|---|---|
| `cash` | Inside `staff_pos_sale` `create` (same transaction as payment + cash row) |
| `deferred` | `staff_pos_sale(p_action: 'complete')` via `POST /api/admin/staff-pos/complete` — status → completed **and** snapshot credit in one RPC transaction |
| `invoice` / `invoice_send` | After the linked invoice is fully paid: `applyStaffPosCreditsForPaidInvoice` → `staff_pos_sale(apply_credit)`. Partial invoice payment → no credit |
| `wallee` | Unchanged: webhook LAYER 10 when completed → `applyStaffProductSaleCredits` → `apply_credit` |

`invoice_send` after successful mail: **send only** (`claim_send` → mail). Orchestrator sets `credit_applied: false` even on `already_sent` replay. Credit waits for invoice paid.

Ledger type remains `credit_transactions.transaction_type = 'credit_product_purchase'`, `reference_type = 'payment'`.

## Completion / overpayment surfaces

```
Deferred complete
  EnhancedStudentModal → POST /api/admin/staff-pos/complete
    → completeDeferredStaffProductSale
      → refuseStaffPosCompletion (tenant, source, deferred fulfillment, pending|completed)
      → staff_pos_sale(complete)

Invoice paid
  mark-invoice-paid / mark-paid paths
    → applyStaffPosCreditsForPaidInvoice (skips when isPartial)
      → staff_pos_sale(apply_credit) per staff_product_sale payment

Deferred cash overpayment (genuine surplus after selection)
  → POST /api/admin/staff-pos/overpayment
    → apply_staff_pos_deferred_cash_overpayment RPC
```

Bulk appointment cash still uses `POST /api/staff/process-bulk-payment` overpayment → `reference_type: 'overpayment'`. That path is **not** the deferred Staff POS helper.

## Schema / migrations

Headers mark these **NOT APPLIED / do not treat repo presence as production**:

| File | Role |
|---|---|
| `migrations/20261003_staff_pos_credit_remediation.sql` | Depends on #336 DRAFT preflight + RPC already applied; credit remediation function/grants |
| `migrations/20261004_staff_pos_payment_completion.sql` | Replaces `staff_pos_sale` body: cash credits on create; invoice/deferred/invoice_send do not; adds `complete` |
| `migrations/20261005_staff_pos_deferred_overpay_idempotency.sql` | Deferred cash overpayment RPC + idempotency |

Also still depends on undeployed-store risk for `20261001_bar_product_sale_schema_preflight.sql` and `20261001_staff_pos_payment_rpc.sql` (#336).

## Constraints & pitfalls

1. **Do not assume deferred/invoice credit at create** — tests assert `creditsImmediately('deferred'|'invoice'|'invoice_send'|'wallee') === false`.
2. Deferred complete refuses non-deferred methods, wrong fulfillment, closed statuses, foreign tenant, or non-`staff_product_sale` payments.
3. Invoice credit is skipped on partial pay; full pay must call `apply_credit` (replay-safe via unique index / `replayed`).
4. `complete` rolls back status change if credit insert fails (including `zero_credit_snapshot`).
5. Do not confuse with `apply_credit_to_payment` (appointment wallet pay-down).
6. Open draft #363 Staff POS overview is otherwise useful; rebase its credit table onto this runbook before merge.

## Codepaths

- `server/utils/staff-product-sale.ts` — `creditsImmediately`
- `server/utils/staff-pos-completion.ts` — complete + invoice-paid credit
- `server/utils/staff-pos-deferred-overpayment.ts`
- `server/utils/staff-product-sale-orchestrator.ts` — invoice_send without post-send credit
- `server/api/admin/staff-pos/complete.post.ts`, `overpayment.post.ts`
- `server/api/invoices/mark-invoice-paid.post.ts`, `mark-paid.post.ts`
- `components/EnhancedStudentModal.vue` — complete / overpayment UI
- Tests: `staff-pos-completion.test.ts`, `staff-pos-deferred-overpayment.test.ts`, `staff-product-sale.test.ts`, `staff-pos-bulk-split.test.ts`
