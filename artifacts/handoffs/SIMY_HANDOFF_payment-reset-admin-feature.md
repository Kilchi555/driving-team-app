# SIMY — Agent Handoff

## 1. Summary

- Status: CONDITIONAL PASS
- Task: Assess draft PR #453 and add a tenant-safe admin correction for a mistaken invoice receipt, without changing production data.
- What was accomplished: PR #453 was re-read from GitHub. It is an open draft and contains only handoff documents. A separate draft implements the correction planner, a draft SQL function, admin endpoints, and a confirmation dialog. The Gemperli shape is covered by synthetic tests. Production was not read or written for this step.
- Next action: A person reviews the draft SQL and decides whether to apply the migration. Do not merge either PR. Do not run the correction on the live CHF 186 payment until the open choices are made in the dialog and the migration is applied by a person.
- Human approval required: YES
- Verdict: `SEPARATE IMPLEMENTATION PR`
- Implementation gate: IMPLEMENT WITH CAUTION. The user task authorized a draft implementation. It does not authorize a production migration, a production correction, a merge, or a deploy.

## 2. Git State

- Repository: Kilchi555/driving-team-app
- Audit branch: `cursor/cash-186-identification-59ff`
- Audit PR: https://github.com/Kilchi555/driving-team-app/pull/453
- Audit head SHA: `d1c5a6eaab5412dbe684c5adae55f18276589184`
- Audit base SHA: `a75e065eed1ed7143b0e49718976b9b0209979bd` (`main`, still the live `origin/main` at review time)
- Implementation branch: `cursor/admin-payment-reset-59ff`
- Implementation pull request: https://github.com/Kilchi555/driving-team-app/pull/455 (draft)
- Implementation commit: `92d6039003a6d4de85ebec4f27db657d57ade5df`
- Implementation base: `a75e065eed1ed7143b0e49718976b9b0209979bd`
- Working tree: CLEAN after the implementation commit
- Production project: not queried and not mutated in this step

## 3. Changes

- Files changed: planner, loader, HTTP mapping, two admin routes, draft migration, admin dialog, payment-details button, unit tests, this handoff
- Important implementation details: see architecture below
- Requested work not completed: the migration is not applied. The live Gemperli payment was not corrected. `mark_unpaid` still exists on the server. Detach-from-invoice is refused.

## 4. Verification

- Unit tests: PASS — `vitest run server/utils/__tests__/payment-receipt-reset.test.ts` (9 tests)
- Integration tests: NOT RUN — no database was available for the SQL function
- E2E tests: NOT RUN
- Lint: PASS — `eslint server/utils/__tests__/payment-receipt-reset.test.ts`
- Typecheck: NOT RUN — CI does not enforce a full typecheck
- Required CI checks: NOT RUN on the implementation branch until the pull request is opened
- Production smoke test: NOT RUN
- Production data: NOT READ and NOT CHANGED in this step

## 5. Risks and Open Issues

- Known risks: applying the draft function changes invoice `paid_amount_rappen`, inserts a reversal row, and stornos one income entry. A wrong confirmation still has financial effect.
- Failed or missing checks: SQL was not executed. The overdue trigger interaction is covered by the planner and by reading `update_invoice_status`, not by a database test.
- Unverified assumptions: none about the Gemperli production rows in this step. The synthetic fixture uses the previously recorded ids and amounts.
- Remaining limitations: whether the CHF 186 line should leave the invoice, and which appointment status to restore, stay unanswered. The function aborts unless an admin chooses “remain on invoice” and an appointment disposition.

## 6. External Actions and Production Safety

- Commit created: YES
- Remote push: YES, implementation branch only
- Pull request created or updated: YES, a new draft. PR #453 was not edited.
- Merge: NO
- Deployment: NO
- Production database changes: NO
- Migration applied: NO
- Real customer or financial data changed: NO
- Other externally visible side effects: NO

## 7. Next Step

- Exact recommended next action: Review the draft migration. Apply it only by a human decision. Then use the dialog on a non-production tenant, or wait until the Gemperli choices are explicit.
- Required human decision: Apply migration or not. For the live lesson, confirm the other two lines stay settled, that the CHF 186 line stays on `RE-2026-0043`, and whether the appointment status stays `paid`.
- If blocked, the precise blocker: the SQL function is not in production, and the live case must not be corrected by `mark_unpaid`.

---

# PR #453 live status

Re-read with `gh pr view 453` on 2026-10-16.

| Field | Value |
| --- | --- |
| State | OPEN |
| Draft | yes |
| Title | docs: blocked identification of CHF 186 cash payment |
| Head | `d1c5a6eaab5412dbe684c5adae55f18276589184` |
| Base | `main` `a75e065eed1ed7143b0e49718976b9b0209979bd` |
| Files | `artifacts/handoffs/SIMY_HANDOFF.md`, `SIMY_HANDOFF_cash-186-gemperli.md`, `SIMY_HANDOFF_gemperli-appointment-2026-08-10.md` |
| Required checks on that head | Test and lint SUCCESS, E2E login SUCCESS, Dependency review SUCCESS |
| App Store check | FAILURE / ACTION_REQUIRED. Not a merge gate for this repo. |

Answers:

1. PR #453 exists and is still open.
2. It contains only audit documentation. No application code.
3. No admin receipt-reset function existed on `main` or on that PR. `mark_unpaid` only sets `payment_status` to `pending`.
4. No other open PR implements this reset. Adjacent drafts that must not be mixed into this branch: #417 (mark-invoice-paid settlement), #415 (paid lines at invoice create), #445 (invoice update allowlist), #443 (tenant scope on invoice payment reads).
5. Reused ideas, not their unmerged code: tenant check from `mark-invoice-paid`, storno shape from `book_payment_to_accounting` and `entries/[id].storno`, invoice partial amounts from `mark-invoice-paid`.
6. Confirmed gaps are listed below.

Decision: `SEPARATE IMPLEMENTATION PR`

# Confirmed code findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `mark_unpaid` sets `payments.payment_status = 'pending'` and does not clear `paid_at`, the invoice, `invoice_payments`, or the income entry | CONFIRMED | `server/api/admin/payment-operations.post.ts` action `mark_unpaid` |
| The payment-details “Zurücksetzen” button called that action and told the user the status was pending | CONFIRMED | former `resetPaymentStatusAction` in `UserPaymentDetails.vue`. The button now opens the new dialog. The API action remains. |
| `mark-invoice-paid` marks every linked payment `completed` when the invoice is fully paid and inserts one `invoice_payments` row for the amount submitted | CONFIRMED | `server/api/invoices/mark-invoice-paid.post.ts` |
| `releaseInvoicePayments` skips `completed` and would clear every payment on the invoice | CONFIRMED | `server/utils/release-invoice-payments.ts` |
| `book_payment_to_accounting` writes a storno only for `refunded` or a full refund amount. A change to `pending` or `invoice` leaves the income row | CONFIRMED | function body read from production in the prior audit; same definition is in `sql_migrations/20260818_accounting_p0_compliance.sql` |
| `update_invoice_status` forces `paid` when `paid_amount_rappen >= total`, and rewrites a `sent` invoice to `overdue` including `payment_status` when the due date is past | CONFIRMED | live function `update_invoice_status` from the prior read; the new SQL therefore sets `overdue` directly instead of `sent` when the due date is past |
| `update_appointment_status_on_invoice_paid` sets every appointment on the invoice to `paid` and does not restore them | CONFIRMED | live function from the prior read |
| `invoice_payments.amount_rappen` must be greater than 0, so a reversal cannot be a negative row | CONFIRMED | `database_migration_invoices.sql` constraint `check_positive_amount` |
| `payment_audit_logs.changed_by` is not set by `log_payment_changes` | CONFIRMED | `sql_migrations/20260204_add_payment_audit_logs.sql` |
| `invoices/update` spreads the client `updates` object after a tenant check | CONFIRMED on this `main`. PR #445 changes that file and is not merged. | `server/api/invoices/update.post.ts` |
| Whether #417’s unmerged settlement RPC matches this reset | NOT VERIFIED | #417 is a separate draft. This branch does not include it. |
| Whether a second completed settlement can exist for one invoice in production | NOT VERIFIED | the planner blocks when more than one completed settlement is present. No production re-read in this step. |

# Architecture

`evaluateReceiptReset` is pure. It refuses:

- missing admin actor or a role other than `admin` / `tenant_admin`
- a payment whose tenant is not the caller’s tenant
- cash, a cash-transaction row, a Wallee transaction id, a refund, or a bank-import row
- more than one completed settlement or more than one live income entry
- a line amount that does not match the payment
- missing reason, missing sibling confirmation, missing invoice-line choice, or missing appointment choice
- `detach`, because removing the line would change the invoice total and that behavior is not specified

When the admin confirms that sibling lines stay settled, the line stays on the invoice, and the appointment disposition is explicit:

- this payment goes to `invoice`, `paid_at` becomes null, `invoice_id` stays
- invoice `paid_amount_rappen` decreases by this payment only
- invoice `payment_status` becomes `partial` when a balance remains
- if the due date is before the as-of date, invoice `status` becomes `overdue` directly, so the BEFORE trigger does not rewrite `payment_status`
- the original settlement row stays
- a new `invoice_payments` row with `status = 'reversal'`, positive amount, and `payment_reference` = this payment id records the reversal
- the linked income entry is stornoed once and locked, not deleted
- sibling payment ids are not updated
- the appointment changes only when the admin sends an allowlisted status

`admin_reset_mistaken_receipt` repeats the tenant, sibling, settlement, and amount checks inside one database function. `SELECT … FOR UPDATE` locks the payment and invoice. The same idempotency key returns the stored audit row. A second key, after the reversal exists, records `already_applied` and does not insert another storno.

The audit row stores actor, time, tenant, payment, previous and new status, reason, invoice, settlement, reversal, accounting entry, storno, and appointment before/after. The table has RLS enabled and grants only `service_role`. The client cannot insert it.

Preview: `POST /api/admin/payments/receipt-reset-preview`
Commit: `POST /api/admin/payments/receipt-reset`

Both load rows with the caller’s `tenant_id`. A blocked evaluation does not call the function. The dialog shows the line, the other amounts, the proposed status, the required reason, and the block text. It does not show success when the response is blocked.

# Gemperli regression

Synthetic fixture only. No production read.

Without the three choices, the result is blocked, the payment stays `completed`, both sibling payments stay `completed`, and no reversal or storno is counted.

With “remain on invoice”, sibling confirmation, and “leave appointment unchanged”:

- target status `invoice`
- paid amount 27900 of 46500, open amount 18600
- reversal 18600 against settlement `f607f3eb-adaf-42dd-ab2f-36f37ca39439`
- one storno of income `15ae333d-bdd1-4c21-b1f7-619d4b1d88e6`
- sibling payments `3f92930d-4894-4718-b7a9-b96d8ae0165f` and `e49d9ff7-3862-47ec-b7d8-9309130dcf6c` stay `completed`
- appointment status stays `paid`
- a replay adds no second reversal and no second storno

Detach is blocked with `invoice_line_detach_not_supported`.

# Merge and deploy blockers

- Draft only. Do not merge.
- Do not apply `migrations/20261016_admin_reset_mistaken_receipt.sql` to production until a person reviews it.
- Do not run the correction against the live payment until that migration exists there and the open choices are submitted on purpose.
- `mark_unpaid` is still callable. Removing it is a separate change because this PR only stops the payment-details button from using it.
- The SQL function was not executed in CI.

# IMPLEMENTATION GATE

Change: admin correction of one mistaken invoice receipt.

CHANGE CLASS: API, Database, Authorization, Payment, UI

In Scope: planner, draft RPC, audit table, preview and commit routes, dialog, button wiring, synthetic Gemperli tests.

Out of Scope: production correction, production migration, merge, deploy, Wallee refunds, cash drawer edits, deleting `mark_unpaid`, PR #417/#415/#445.

Hotspots: P0 tenant isolation, P0 service-role client, payment status and accounting. Wallee checkout code was not modified. Stripe was not modified.

Blast Radius: Medium

Change Risk: CRITICAL

Decision Required: the user task authorized this draft. Applying the migration and correcting the live payment still require a separate human decision.

Direct Impact: new route and dialog. The old reset button no longer calls `mark_unpaid`.

Indirect Impact: invoice before-update trigger and payment accounting trigger run if the function is later applied and called.

Potential Impact: PR #417 changes `mark-invoice-paid` on another branch. Merge order can conflict later. REPORT ONLY.

Out-of-scope findings: `invoices/update` still spreads client fields on this main. PR #445 already targets that. Not fixed here.

Dependency Evidence: searches for `mark_unpaid`, `releaseInvoicePayments`, `invoice_payments`, and `book_payment_to_accounting`.

Breaking Change: new table, new function, new routes. Existing payment rows are unchanged until the function is called.

Security Verification: unit tests cover role refusal, tenant mismatch, and RPC arguments that contain only the target payment. RLS execution was not tested against a database.

TEST LEVEL: L1 PASS. L4 automated database isolation NOT RUN.

Manual verification after a human applies the migration: open the payment detail as admin, use Zurücksetzen, confirm a blocked shared invoice shows the other amounts and does not succeed without the checkboxes, then repeat on a disposable invoice.
