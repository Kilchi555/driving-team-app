# SIMY — Agent Handoff

## 1. Summary

- Status: BLOCKED
- Task: Read-only reconciliation of appointment `1076a300-30aa-42ad-b564-a6c5c74ab694` and payment `0bce2dc1-31a3-4780-b66d-89303bad0c49` (CHF 186.00) after the prior audit.
- What was accomplished: Current production rows were re-read. They match the prior handoff. The invoice and the single CHF 465.00 settlement are still linked. No post-audit change was found. The actor of the original completion is not stored.
- Next action: Do not write. A human must confirm that the other two invoice lines stay settled, and a safe correction still has to be designed. Existing endpoints cannot set only this payment to `pending`.
- Human approval required: YES
- Verdict: `PARTIAL — AUDIT EVIDENCE INCOMPLETE`
- Actor: `ACTOR UNVERIFIED`

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Branch: cursor/cash-186-identification-59ff
- Prior findings commit: 4373427b062e7303f30b0fe735f5d37cb2f83cda
- Prior branch tip before this reconciliation: 8100cf97ea0e67196e44a57404bf3bc7ca5b314c
- Base SHA: a75e065eed1ed7143b0e49718976b9b0209979bd (origin/main)
- Pull request: https://github.com/Kilchi555/driving-team-app/pull/453 (draft, not edited in this turn)
- Working tree: CLEAN after this handoff commit
- Production project: Driving Team App (`unyjaetebnaexaflpyoc`). SELECT only.

## 3. Changes

- Files changed: `artifacts/handoffs/SIMY_HANDOFF_gemperli-appointment-2026-08-10.md`
- Important implementation details: none. No application code, SQL mutation, migration, RPC, or API call that writes.
- Requested work not completed: payment status was not changed. PR title, body, draft state, review, merge, and deployment were not touched.

## 4. Verification

- Unit tests: NOT RUN — read-only reconciliation
- Integration tests: NOT RUN
- E2E tests: NOT RUN
- Lint: NOT RUN
- Typecheck: NOT RUN
- Required CI checks: NOT RUN
- Production smoke test: NOT RUN
- Data evidence: read-only SQL on 2026-10-16, compared with the prior handoff in `artifacts/handoffs/SIMY_HANDOFF_cash-186-gemperli.md`

## 5. Risks and Open Issues

- Known risks: `pending` on this payment alone leaves invoice `RE-2026-0043` paid for CHF 465.00, the manual settlement at CHF 465.00, and income entry `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6` in place. `book_payment_to_accounting` stornos only when status becomes `refunded`.
- Failed or missing checks: none required for this read.
- Unverified assumptions: The statement that CHF 186.00 was not received is a business instruction. The database still shows one manual settlement of the whole invoice. It does not show that the other CHF 279.00 was received separately.
- Remaining limitations: `changed_by`, `created_by`, and `updated_by` are null. `audit_logs` and `payment_logs` have no row for these ids. Who marked the invoice paid is `ACTOR UNVERIFIED`.

## 6. External Actions and Production Safety

- Commit created: YES, this handoff only
- Remote push: YES, handoff commit only
- Pull request created or updated: NO — existing draft #453 was not edited
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO

## 7. Next Step

- Exact recommended next action: Leave production unchanged.
- Required human decision: Confirm that payments `3f92930d-4894-4718-b7a9-b96d8ae0165f` (CHF 124.00) and `e49d9ff7-3862-47ec-b7d8-9309130dcf6c` (CHF 155.00) were actually received and must stay `completed`. Also choose whether this lesson should remain on the invoice.
- If blocked, the precise blocker: Audit attribution is missing, and no current API can reopen only this lesson without rewriting the shared CHF 465.00 settlement or leaving the invoice and ledger inconsistent.

---

# Reconciliation — 2026-10-16

Re-read of production after the prior audit. Cancelled appointments and Wallee refunds were not re-investigated.

## Current state

Tenant `660b72a9-c67b-4763-85d7-b7ba6605e59e`. Customer `c841d989-c017-4e3c-9e5d-249538131464`.

### Appointment

- `1076a300-30aa-42ad-b564-a6c5c74ab694`
- `start_time` `2026-08-10 12:50:00+00` = 14:50 Europe/Zurich
- `end_time` `2026-08-10 14:20:00+00`
- `status` `paid`
- `deleted_at` null
- `updated_at` `2026-10-09 12:38:40.927906+00`

The same `updated_at` is on the other two appointments linked from this invoice (`cedd4998-6cf7-4318-89a6-d72200e819d9`, `cf82bfea-3cf6-4410-9950-4c34f165adb1`). Both are also `status` `paid`. Trigger `trigger_update_appointment_status_on_invoice_paid` sets every appointment on an invoice to `paid` when the invoice status becomes `paid`. It does not change them back if the invoice later leaves `paid`.

### Payment

- `0bce2dc1-31a3-4780-b66d-89303bad0c49`
- `appointment_id` `1076a300-30aa-42ad-b564-a6c5c74ab694`
- `invoice_id` `c4c8c04c-413b-40c6-8f0e-a93469769056`
- `payment_method` `invoice`
- `payment_status` `completed`
- `total_amount_rappen` 18600
- `lesson_price_rappen` 18600
- `amount_paid_rappen` null
- `paid_at` `2026-10-07 00:00:00+00`
- `created_at` `2026-10-03 18:26:58.248+00`
- `updated_at` `2026-10-09 12:38:40.774+00`
- `created_by` null, `updated_by` null
- `refunded_at` null, `refunded_amount_rappen` 0

### Invoice — association still exists

- `c4c8c04c-413b-40c6-8f0e-a93469769056`, number `RE-2026-0043`
- Same tenant and customer. Invoice `appointment_id` is null.
- `invoice_date` `2026-10-03`, `due_date` `2026-10-13`
- `total_amount_rappen` 46500, `paid_amount_rappen` 46500, `credit_applied_rappen` 0
- `status` `paid`, `payment_status` `paid`
- `paid_at` `2026-10-07 00:00:00+00`
- `created_at` `2026-10-03 18:30:23.296764+00`
- `updated_at` `2026-10-09 12:38:40.774+00`
- Bank-import rows: 0

Lines, unchanged:

| Item | Appointment | Amount |
| --- | --- | --- |
| `b19d9f25-e99e-4451-b9a1-ba87289f9e77` | `1076a300-30aa-42ad-b564-a6c5c74ab694` | 18600 |
| `d7ef2d81-ff6c-4407-8c19-05c588ee3702` | `cedd4998-6cf7-4318-89a6-d72200e819d9` | 12400 |
| `d9e8bb02-3a50-40fe-ad10-83647fc08154` | `cf82bfea-3cf6-4410-9950-4c34f165adb1` | 15500 |

`payment_id` on all three lines is null. Created together at `2026-10-03 18:30:23.4819+00`.

### Settlement — still one row, still includes this lesson

- `f607f3eb-adaf-42dd-ab2f-36f37ca39439`
- `amount_rappen` 46500
- `payment_method` `manual`
- `status` `completed`
- `payment_date` `2026-10-07 00:00:00+00`
- `created_at` `2026-10-09 12:38:41.048038+00`
- No payment reference and no notes

This is one receipt for the invoice total. It is not a separate CHF 186.00 allocation. There is no bank-import record behind it. It is a staff mark-paid of the whole invoice, not an independently matched bank settlement.

The other two payments on the same invoice are still `completed`, method `invoice`, `paid_at` `2026-10-07 00:00:00+00`, `updated_at` `2026-10-09 12:38:40.774+00`.

### Accounting

- Income `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6`
- 18600 rappen, `entry_date` 2026-10-07, `is_paid` true, `source` manual
- `linked_payment_id` is this payment
- `storno_of_id` null, `deleted_at` null, `locked_at` null, `created_by` null
- `created_at` and `updated_at` `2026-10-09 12:38:41.130888+00`
- Journal lines: 0. Storno rows: 0.

## Differences from the prior audit

Compared with `SIMY_HANDOFF_cash-186-gemperli.md`. No material field changed.

| Record | Prior observation | Current | Difference |
| --- | --- | --- | --- |
| Payment status / method / amount / `paid_at` / `invoice_id` / `updated_at` | `completed`, `invoice`, 18600, `2026-10-07`, invoice `c4c8c04c…`, updated `2026-10-09 12:38:40.774+00` | same | none |
| Invoice totals, status, `paid_at`, `updated_at` | 46500 / 46500, `paid` / `paid`, `2026-10-07`, updated `2026-10-09 12:38:40.774+00` | same | none |
| Lines | 18600 + 12400 + 15500 | same three ids and amounts | none |
| Settlement | one manual row `f607f3eb…`, 46500, created `2026-10-09 12:38:41.048038+00` | same | none |
| Income entry | `15ae333d…`, no storno, no journal lines | same | none |
| Payment audit rows | three rows, last transition `invoice` → `completed` at `2026-10-09 12:38:41.130888+00` | same three rows | none since `2026-10-16 06:30+00` |

Newly read, not a change: invoice `due_date` is `2026-10-13`. Appointment `updated_at` is `2026-10-09 12:38:40.927906+00` and matches the other two appointments. The prior handoff did not record those two fields.

No `updated_at` on the payment, invoice, settlement, or income entry is later than `2026-10-09`. Nothing in these tables moved after the prior audit.

## Actor attribution

`ACTOR UNVERIFIED`

- `payment_audit_logs.changed_by` is null on the insert (`2026-10-03 18:26:58`), the `pending` → `invoice` update (`2026-10-03 18:30:23`), and the `invoice` → `completed` update (`2026-10-09 12:38:41`).
- Payment `created_by` and `updated_by` are null. Accounting `created_by` is null.
- `payment_logs` has no row for this payment.
- `audit_logs` has no row whose `resource_id` is this payment, appointment, invoice, settlement, or income entry, including the window after `2026-10-16 06:30+00`.
- `log_payment_changes` stores the row images and does not record a user id.

There is no database evidence that a Fahrschule Gemperli user changed these records after the prior audit. There is also no database evidence naming who marked the invoice paid on 2026-10-09. Absence of an actor is not evidence that Gemperli did, or did not, make the original change.

## What `pending` would require

The pre-receipt status of this payment, from its own audit row, was `invoice` while `invoice_id` was set, and `pending` only before that link existed. The payments overview treats `completed` as received and `pending` as open.

These current paths do not do a one-lesson reversal:

- `mark_unpaid` sets `payment_status` to `pending` and leaves `paid_at`, the invoice, the CHF 465.00 settlement, and the income row.
- `releaseInvoicePayments` skips `completed` and would clear every payment on the invoice.
- Setting status to `refunded` is what makes `book_payment_to_accounting` write a storno. That is a refund, not `pending`.
- `POST /api/admin/accounting/entries/[id]/storno` can reverse income `15ae333d…` because it is unlocked and has no storno. It does not change the payment, and it locks the original entry.
- Before-update trigger `update_invoice_status` forces the invoice back to `paid` when `paid_amount_rappen >= total_amount_rappen`.
- If `paid_amount_rappen` is lowered and status is set to `sent` while `payment_status` is not `paid`, that same trigger sees `due_date` `2026-10-13` < current date and sets status and `payment_status` to `overdue`.

## Smallest safe correction plan

No production write now.

If a later decision confirms that only this lesson was not received and that the CHF 124.00 and CHF 155.00 lessons stay settled, the current application still cannot do it. A future correction would have to, in one tenant-scoped operation:

1. Change only payment `0bce2dc1-31a3-4780-b66d-89303bad0c49`: `payment_status` `completed` → `pending`, `paid_at` → null. Leave amount, method, appointment, tenant, and customer as they are.
2. Keep `invoice_id` only if the human wants the line to stay on `RE-2026-0043`. In that case the status this codebase used for “invoiced, not received” was `invoice`, not `pending`. Choosing `pending` while the foreign key remains is a product decision, not the historical value.
3. Lower invoice `paid_amount_rappen` from 46500 to 27900 in the same update that changes invoice status, so the before-trigger does not force `paid` again. Do not change the other two payments.
4. Adjust settlement `f607f3eb-adaf-42dd-ab2f-36f37ca39439` by a supported reversal of 18600 rappen. Rewriting that row in place, or deleting it, is not a supported correction. There is no per-line allocation to detach.
5. Storno income `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6` with the accounting storno path. Do not delete it. Do not rely on a `pending` update to do this.
6. Set only appointment `1076a300-30aa-42ad-b564-a6c5c74ab694` away from `paid`. Leave the other two appointments `paid`. Their previous status is not stored, so the target status for this appointment is unknown.

That operation does not exist. Do not assemble it from direct SQL.

## Evidence still required before any execution

1. Written confirmation that CHF 124.00 and CHF 155.00 stay `completed`.
2. Written choice: keep this lesson on `RE-2026-0043` (status `invoice` or `pending` with the link kept) or detach it.
3. The appointment status to restore. No history table exists.
4. A designed correction that handles the shared settlement, the invoice before-trigger, the due date of 2026-10-13, and the accounting storno together.
5. Actor of the 2026-10-09 completion, if it must be named. The database does not have it (`ACTOR UNVERIFIED`).

## Stop

`PARTIAL — AUDIT EVIDENCE INCOMPLETE`

Production data was not changed.
