# SIMY — Agent Handoff

## 1. Summary

- Status: BLOCKED
- Task: Read-only identification of an alleged cash payment of CHF 186.00 (Fahrschule Gemperli, appointment 10.08.2026 14:50 Europe/Zurich). Phases 1–3 only. No correction authorized.
- What was accomplished: Production records were read. Tenant, customer, and the live appointment are unique. No cash payment of CHF 186.00 exists. The only live CHF 186.00 payment is an invoice line inside a fully settled CHF 465.00 invoice.
- Next action: Human must confirm whether any correction is still intended, and of which record. No write until that confirmation.
- Human approval required: YES
- Verdict: `BLOCKED — PAYMENT NOT UNIQUELY IDENTIFIED`

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: cursor/cash-186-identification-59ff
- Findings commit: 4373427b062e7303f30b0fe735f5d37cb2f83cda
- Stamp commit: fdd4afec647c00a485ebb86a7490e08334f37c5c
- Base SHA: a75e065eed1ed7143b0e49718976b9b0209979bd (origin/main)
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/453 (draft)
- Working tree: CLEAN after the PR-URL commit
- Production project read: Driving Team App (`unyjaetebnaexaflpyoc`). Queries were SELECT only.

## 3. Changes

- Files changed: this handoff only
- Important implementation details: none. No application code, migration, SQL write, RPC, or API mutation.
- Requested work not completed: payment was not set to `pending`. That was explicitly out of scope until a unique cash payment and a separate human approval exist.

## 4. Verification

- Unit tests: NOT RUN — investigation only, no code change
- Integration tests: NOT RUN — investigation only
- E2E tests: NOT RUN — investigation only
- Lint: NOT RUN — no code change
- Typecheck: NOT RUN — no code change
- Required CI checks: NOT RUN — no product change to verify
- Production smoke test: NOT RUN — no production write
- Data evidence: read-only SQL against production, documented below

## 5. Risks and Open Issues

- Known risks: Setting the live CHF 186.00 payment to `pending` would leave invoice `RE-2026-0043`, its single CHF 465.00 settlement, two sibling lesson payments, and the accounting income row inconsistent. The accounting trigger does not reverse an entry when status leaves `completed`.
- Failed or missing checks: none run; none required for a blocked read-only stop.
- Unverified assumptions: The business claim “this was a mistaken cash receipt” is not supported by `payment_method`. It must not be inferred from the amount and the appointment alone.
- Remaining limitations: Staff intent at the moment the invoice was marked paid is not stored. Whether the CHF 465.00 was actually received cannot be proven or disproven from these tables.

## 6. External Actions and Production Safety

- Commit created: YES, handoff document only
- Remote push: YES, after this file is committed
- Pull request created or updated: YES, draft, documentation only
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO

## 7. Next Step

- Exact recommended next action: Stop. Do not edit payments, invoices, cash, credits, or accounting.
- Required human decision or approval: Confirm the intended record. The database does not contain a cash payment of CHF 186.00 for this appointment.
- If blocked, the precise blocker and the minimum action needed to unblock it: A cash payment of exactly CHF 186.00 linked to this tenant, customer, and appointment does not exist. Unblocking requires the human to name the real target (for example the invoice settlement) and to approve a plan that the current application can perform safely. `mark_unpaid` and a direct status update are not that plan.

---

# Phase 1–3 report

Environment: production Supabase project Driving Team App (`unyjaetebnaexaflpyoc`). Read-only.

## Identified records

| Role | Result |
| --- | --- |
| Tenant | Unique. `660b72a9-c67b-4763-85d7-b7ba6605e59e`, name Fahrschule Gemperli, slug `fahrschule-gemperli`, timezone `Europe/Zurich`, currency CHF, active. |
| Customer | Unique inside that tenant. `c841d989-c017-4e3c-9e5d-249538131464`, role `client`, active, not deleted. |
| Live appointment | `1076a300-30aa-42ad-b564-a6c5c74ab694`. Stored `start_time` `2026-08-10 12:50:00+00`, which is 14:50 in `Europe/Zurich`. End 16:20 local. Duration 90. Status `paid`. Not deleted. Created `2026-10-03 20:26:57+00`. |
| Duplicate appointment | `7e3b3bfe-3e61-450f-a676-a15ce8baca61`. Same local start. Status `cancelled`. `deleted_at` `2026-10-03 18:23:58+00`. Created `2026-08-14 09:05:37+00`. |

Monday 10.08.2026 matches that local timestamp.

## Payments of CHF 186.00

No row for this customer has `payment_method` cash or bar. Tenant-wide, cash-like payments exist (29 on `payments`, 10 on `invoice_payments`) and none of them is CHF 186.00.

Two CHF 186.00 payments (`18600` rappen) are tied to the two appointments above. Neither is a cash payment.

### A — live appointment, not cash

- Payment `0bce2dc1-31a3-4780-b66d-89303bad0c49`
- `appointment_id` `1076a300-30aa-42ad-b564-a6c5c74ab694`
- `payment_method` `invoice`, `payment_method_id` null, `payment_provider` `wallee` (no Wallee transaction on this row)
- `payment_status` `completed`
- `total_amount_rappen` 18600, `lesson_price_rappen` 18600, `amount_paid_rappen` null, `credit_used_rappen` 0, `refunded_amount_rappen` 0
- `paid_at` `2026-10-07 00:00:00+00`
- Created `2026-10-03 18:26:58+00`, updated `2026-10-09 12:38:40+00`
- `invoice_id` `c4c8c04c-413b-40c6-8f0e-a93469769056`
- Audit: inserted, then `pending` → `invoice` at `2026-10-03 18:30:23+00`, then `invoice` → `completed` at `2026-10-09 12:38:41+00`

### B — cancelled duplicate, already refunded, not cash

- Payment `e350dae8-e1e7-4903-a22b-eb347ad1e76c`
- `appointment_id` `7e3b3bfe-3e61-450f-a676-a15ce8baca61`
- `payment_method` `wallee`, `payment_status` `refunded`
- `paid_at` `2026-08-03 07:19:10+00`, `refunded_at` `2026-10-03 18:23:58+00`
- `invoice_id` null
- Same-day credit: cancellation `+18600` rappen, then withdrawal `-18600` rappen. Wallet balance afterwards is 0. This path is already closed and is not a cash receipt.

## Invoice and allocations

Invoice `c4c8c04c-413b-40c6-8f0e-a93469769056`, number `RE-2026-0043`.

- Customer and tenant match. `appointment_id` on the invoice is null.
- `total_amount_rappen` 46500, `paid_amount_rappen` 46500
- `status` `paid`, `payment_status` `paid`
- `paid_at` `2026-10-07 00:00:00+00`, updated `2026-10-09 12:38:40+00`
- `credit_applied_rappen` 0
- No bank-import row

Line items, all on this invoice:

| Appointment (local) | Amount |
| --- | --- |
| 10.08.2026 14:50, payment A | CHF 186.00 |
| 06.08.2026 11:15 | CHF 124.00 |
| 03.08.2026 11:00 | CHF 155.00 |

`18600 + 12400 + 15500 = 46500`.

One settlement row, not three receipts:

- `invoice_payments` `f607f3eb-adaf-42dd-ab2f-36f37ca39439`
- `amount_rappen` 46500, `payment_method` `manual`, `status` `completed`
- `payment_date` `2026-10-07 00:00:00+00`, created `2026-10-09 12:38:41+00`

The other two lesson payments on the same invoice are also `payment_method` `invoice` and `payment_status` `completed`, with the same `paid_at`.

## Accounting, cash, credits

Accounting trigger `payments_book_accounting` calls `book_payment_to_accounting()`. On `completed` or `paid` it inserts one income row linked to the payment. It writes a storno only when status becomes `refunded` or the refunded amount covers the total. A change to `pending` does not remove or storno the income row.

For payment A:

- Income `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6`, 18600 rappen, `entry_date` 2026-10-07, `is_paid` true, `source` manual, `linked_payment_id` is payment A, `category_id` null, not locked, no storno.
- Created at the same timestamp as the status change to `completed`.
- `accounting_journal_lines` for this entry: 0.

Sibling income rows exist for the CHF 124.00 and CHF 155.00 payments, created in the same update.

Cash:

- `create_cash_transaction_from_payment` inserts `cash_transactions` only when `payment_method = 'cash'` and `payment_status = 'completed'`.
- No cash transaction, cash movement, confirmation, or daily close references this customer, these appointments, these payments, or CHF 186.00 / CHF 465.00.
- Tenant cash movements that do exist are `system_init` with amount 0. The two confirmed cash transactions are CHF 500.00 and CHF 40.00 for other students and have no appointment.

Credits for this customer net to 0. They belong to the refunded Wallee duplicate, not to payment A. Invoice credit applied is 0.

`pending` in this system is the real `payments.payment_status` value for an open, not-yet-received appointment payment (`types/payment.ts`, customer payments UI “Ausstehend”). After this payment was placed on the invoice, its status was `invoice`, not `pending`. `completed` is what the overview treats as received. There is no separate status literal that means “pending” beyond the string `pending`.

## Supported correction paths, and why they do not fit

- `POST /api/invoices/mark-invoice-paid` is the path that marked this invoice paid. It adds `paid_amount_rappen`, inserts one `invoice_payments` row, and, when the invoice is fully paid, sets every linked payment to `completed` with the same `paid_at`. There is no inverse that unsets one line.
- `releaseInvoicePayments` sets `payment_status` back to `pending` only for statuses in `invoice`, `invoiced`, `pending`, `open`, `processing`, `failed`. It skips `completed`. It also clears `invoice_id` on every payment of that invoice and only reopens appointments in status `verrechnet`. This appointment is `paid`.
- `POST /api/admin/payment-operations` action `mark_unpaid` sets `payment_status` to `pending` and does not clear `paid_at`, the invoice, `invoice_payments`, or the accounting income row.
- Action `switch_to_cash` would mark a payment cash and completed. That is the opposite of this request.
- Refund storno in `book_payment_to_accounting` is for `refunded`, which would also lock the original income row and insert a reversing expense. That is not “set back to pending”, and it would still leave the CHF 465.00 invoice paid.

A status-only update of payment A to `pending` would leave the invoice paid for CHF 465.00, the manual settlement of CHF 465.00 in place, the two other lessons completed, `paid_at` set, and income of CHF 186.00 still in the books. The payment overview would disagree with the invoice and the ledger.

No cash handover contains this amount.

## Why this is not confirmed as a mistaken cash booking

The stored method is `invoice`. The receipt that moved it to `completed` is one manual settlement of the whole invoice. Nothing in cash tables recorded CHF 186.00. The note about an incorrect booking sits on the already refunded Wallee duplicate and its credit withdrawal, which net to zero. That earlier correction must not be reopened, and it is not evidence that the later invoice settlement was a cash posting error.

## Proposed plan

No data change.

Before / after if this stop is respected: every value above stays as read.

If a later approval names payment A anyway, the minimum consistent correction is not available in the current application. It would have to reduce only this lesson’s share of `RE-2026-0043` (CHF 186.00 of CHF 465.00), reopen that payment to the pre-receipt status `invoice` or to `pending` only if the invoice link is intentionally removed, reverse income `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6` by a proper storno rather than a silent delete, and leave the CHF 124.00 and CHF 155.00 lessons and the refunded Wallee payment untouched. That needs a designed, tenant-safe function and a separate draft PR. It must not be done with a direct database update.

## Stop

`BLOCKED — PAYMENT NOT UNIQUELY IDENTIFIED`

No write was performed. Waiting for an explicit decision. Silence is not approval to edit payment A.
