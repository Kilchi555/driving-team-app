# Payment receipt reset — safety fix

Verdict: **PASS**

Required checks are green on the code head below. App Store checks failed and are not part of the main ruleset. Production application and any live payment correction stay unauthorized.

## Pull request

- PR: https://github.com/Kilchi555/driving-team-app/pull/455
- Branch: `cursor/admin-payment-reset-59ff`
- Checked head: `3b44e15e9c59d8fde7d7c89ad13e35d86684f584`
- Implementation: `e64f6f4f956fc7ae37b4832003095de0a4421933`
- Main at task start: `f1efbe6d471584ecc1da0f621dabb52727088ec4`
- Live main at this review: `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e`
- Merge-base: `a75e065eed1ed7143b0e49718976b9b0209979bd`
- This verdict is a docs commit on top of the checked head. It does not change the migration or the tests.
- Draft stays a draft. Do not merge.

## Root causes

1. `invoice_payments` allowed only `pending`, `completed`, `failed`, and `refunded`. The draft inserted `reversal`, so a real database rejected the correction or, if the check were absent, the history screen added the positive amount to the original settlement.
2. Profit and loss takes payment income from `get_payments_monthly_summary`, which counts `payment_status = 'completed'` only. An extra expense storno would remove the same amount a second time.
3. The database function trusted `service_role` arguments for role, settlement count, line amount, and idempotency. A second key or a pre-existing reversal could collide with a unique index instead of returning a clear result.
4. The invoice `BEFORE UPDATE` trigger rewrites `sent` + a non-paid payment status to `overdue` / `overdue` when the due date is before `CURRENT_DATE`.

The live CHF 186 payment was not used. Tests use synthetic ids and the amounts 46,500 / 18,600 / 12,400 / 15,500.

## What changed

- `migrations/20261016_admin_reset_mistaken_receipt.sql` — constraint includes `reversal`; one function checks the admin, locks rows, recalculates the paid amount from remaining completed or paid payments, writes one reversal, one marked storno, and reversing journal lines; same-key replay returns the stored result; a conflicting reversal raises `reversal_conflict`. Recovery steps are in the file header.
- `utils/invoice-payment-net.ts` — history net is completed minus reversal.
- `components/admin/InvoiceDetailModal.vue` and `server/api/invoices/get-invoice-payments.get.ts` — the correction is labeled Korrektur and is not added as another successful payment.
- `server/utils/accounting.ts`, `server/api/admin/accounting/summary.get.ts`, `server/utils/accounting-year-pdf.ts`, `server/utils/accounting-profitability.ts` — the marked storno is excluded from expenses. A manual storno without that marker still counts.
- `server/api/admin/accounting/entries/[id].storno.post.ts` — a duplicate storno returns 409.
- `server/utils/payment-receipt-reset.ts` and `server/utils/payment-receipt-reset-http.ts` — the planned paid amount is the remaining completed or paid sibling sum, and the dispositions are sent to the function.
- `server/utils/__tests__/payment-receipt-reset.db.test.ts` and `server/utils/__tests__/fixtures/receipt-reset-schema.sql` — disposable Postgres tests.
- `.github/workflows/ci.yml` — CI starts disposable Postgres for those tests.
- `package.json` / `package-lock.json` — dev dependency `pg`.

## Accounting treatment

One effect, not two.

`get_payments_monthly_summary` was read as function text on 2026-10-16 from non-production and from production. No payment rows were read and nothing was written. Both definitions sum `payment_status = 'completed'`, grouped by `created_at` month. The corrected payment becomes `invoice`, so payment income drops once.

The original linked income row stays. Reports ignore linked payment income when they add manual income. The new expense storno uses `external_reference = 'payment-receipt-reset'`. Summary, year PDF, and profitability skip that marker. VAT already skips storno rows and the reversed original. The invoice itself stays in VAT under the existing invoice rules.

If the original entry has journal lines, the function copies them onto the storno with debit and credit swapped. The pair nets to zero. The payment-status trigger does not insert a second income row when the new status is `invoice`.

## Synthetic reconciliation

| | Before | After |
|---|---:|---:|
| This payment | completed 18,600 | invoice, `paid_at` empty |
| Sibling payments | completed 12,400 and 15,500 | unchanged |
| Appointments | paid | unchanged |
| Invoice paid amount | 46,500 | 27,900 |
| Invoice status | paid / paid | overdue / partial, `paid_at` empty, because the due date is past |
| History net | 46,500 completed | 46,500 completed − 18,600 reversal = 27,900 |
| Payment income | 46,500 | 27,900 |
| Recognized expenses | 5,000 rent | 5,000 rent; the 18,600 storno is excluded |
| Result | 41,500 | 22,900 |
| Journal | 18,600 debit and credit | each account nets to 0 |
| VAT | exempt 46,500, output 0, input 0 | unchanged |

A not-yet-due invoice stays `sent` / `partial`. The installed `update_invoice_status` trigger does not replace `partial`.

## Tests executed

Disposable Postgres 16. The schema includes the non-production check constraints, `update_invoice_status`, `update_appointment_status_on_invoice_paid`, `book_payment_to_accounting`, and `get_payments_monthly_summary`.

`payment-receipt-reset.db.test.ts`: 11 passed after the year-PDF assertion was added. They cover the constraint, the shared invoice, partial status, idempotency, `reversal_conflict`, concurrent calls plus a manual storno, the unique storno index, payment income, profit and loss, VAT, journal lines, blocked cash / Wallee / refund / bank import, tenant and staff rejection, atomic rollback, and the audit row.

The year PDF was built from those database rows. Its decoded text contains `CHF 279.00`, `CHF 50.00`, and `CHF 229.00`. It does not contain `CHF 236.00`, which would be the rent plus a second expense for the same 18,600. The original 18,600 income line and the storno line are present and struck through. `accountingYearStatement`, which supplies those PDF totals, returned income 27,900, expense 5,000, result 22,900.

GitHub run `38899258480` on the checked head: Test and lint passed, 3166 tests, including `payment-receipt-reset.db.test.ts` (11). E2E login passed. Dependency review passed. CodeQL passed and is not a required check. `App | Default` and `App | Default | Archive - iOS` failed. Those App Store checks are not in the main ruleset.

The invoice modal was not clicked in a browser. The net used by the modal is the same function the database test asserts.

## Recovery

Dropping the function does not undo a correction.

1. Read `payment_receipt_resets` for `result = 'applied'`.
2. Keep the original payment, the original completed settlement, the reversal, the income row, and the storno.
3. If a person later decides the receipt was valid, add a new completed `invoice_payments` row for that amount, set the payment back to `completed` with the previous `paid_at`, and set `invoices.paid_amount_rappen` to the sum of payments that are completed or paid again. Set the invoice back to paid only when that sum covers the total.
4. Restoring `completed` puts the amount back into payment income once. The marked storno stays out of expenses. If journal lines were reversed, post a new reversing pair for those lines. Do not edit the locked income row in place.

The full steps are at the top of the migration.

## Remaining risks

- This draft is not approved for production.
- The branch is behind `main`. Later main commits `#445` and `#446` do not touch this fix. A person synchronizes the branch before any merge.
- Creating `accounting_entries_one_live_storno` fails closed if two live stornos already share `storno_of_id`. Check that before applying the migration.
- The admin preview uses the Zurich date. The function uses `CURRENT_DATE`, the same clock as the invoice trigger. Near midnight those dates can disagree in the preview. The stored status follows the trigger.
- A manual storno of this income, followed later by this correction, is retagged `payment-receipt-reset` so profit and loss does not count both the lost payment income and the expense.

## Next permitted action

A person may review the draft. A person may apply the migration only on a database they control that is not production, after checking for duplicate live stornos.

Do not merge. Do not undraft. Do not apply the migration to production. Do not correct a live payment.
