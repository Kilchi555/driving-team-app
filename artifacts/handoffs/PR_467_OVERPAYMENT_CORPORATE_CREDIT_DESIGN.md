# Overpayment and corporate credit design

**DESIGN COMPLETE — NO IMPLEMENTATION PERFORMED**

## 1. Repository state

| Item | Value |
| --- | --- |
| Observed | 2026-10-17T10:41:42Z |
| PR | https://github.com/Kilchi555/driving-team-app/pull/467 |
| State | OPEN, Draft |
| Live head | `9d4d60ccafa96ecb7878e6c9a65008b8a52e1340` |
| Live base | `1991c4398950cdeb0b0dc0730ae3bceb52c8864d` |
| Branch | `cursor/settlement-integrity-hardening-4274` |

The live head and base match the pin. Application files at that commit were inspected. The local checkout was one unpushed docs commit ahead of the pin (`artifacts/handoffs/PR_467_THREE_TYPE_ERRORS.md` only) at inspection time. No payment file, database, or PR state was changed for the investigation. Production and shared staging were not accessed. Whether `20261016` or `20261017` is applied anywhere is unknown.

## 2. Verified current behavior

### Confirmed repository facts

**Personal credit only.** `student_credits` and `credit_transactions` are keyed by user. `increment_balance(p_user_id, p_tenant_id, p_amount)` updates `student_credits` for that pair (`migrations/20260826_wallet_atomic_ops.sql`). No application writer credits `companies.id`.

**Companies are first-class, employees are users.** `POST /api/admin/companies` writes `companies` in `profile.tenant_id`. `POST /api/admin/companies/assign-user` sets `users.company_id` after both rows load in that tenant (`server/api/admin/companies/assign-user.post.ts` 26–62). The Firmenkunden screen assigns many users (`pages/admin/companies.vue`). Assignment copies a billing address. It does not move a wallet.

**Invoice writers.**

| Path | Bill-to stored | File |
| --- | --- | --- |
| Ordinary draft | `user_id` from the draft. `company_id` only when `billing_type = company` and the id loads in the tenant. A billing name or `users.company_id` is ignored | `server/utils/invoice-persist-and-send.ts` 193–198, `server/utils/invoice-company-link.ts` 1–7 and 78–84 |
| Auto-invoice | `user_id` = the learner. `billing_type` becomes `company` when a saved billing name exists. `company_id` is forced null | `server/utils/auto-invoice-on-complete.ts` 314–332 |
| External resource | Free-text company name, `company_id` null | `invoice-company-link.ts` 34–43 |
| Individual course | `user_id` = participant, `billing_type` individual | `server/utils/course-enrollment-billing.ts` 137–165 |
| Firmenkurs | `company_id` = course company, `user_id: null`, `billing_type` company. Each participant stays on `invoice_items.user_id` and `payments.user_id` | `course-enrollment-billing.ts` 324–410 |
| Rental | `user_id` = renter, `billing_type` individual | `server/api/admin/rental-invoice.post.ts` 142–153 |

**Checked-in invoice schema disagrees with Firmenkurs.** `database_migration_invoices.sql` line 10 declares `user_id UUID REFERENCES users(id) NOT NULL`. No later migration in the repo drops that constraint. `invoice_payments` (lines 101–122) stores method, amount, and notes. It has no payer. `paid_amount_rappen` is a header cache (line 41).

**Invoice settlement of CHF 300 paid with CHF 400.** `settle_marked_invoice_payment` sets the header to `LEAST(previous + requested, total)` and inserts `invoice_payments.amount_rappen` for the full requested amount (`migrations/20261016_payment_settlement_atomicity.sql` 230 and 253–264). A null or zero requested amount means “the invoice total” (lines 182–187). The surplus is not a credit. PR #467’s wrapper calls that function and says so (`migrations/20261017_settlement_integrity_hardening.sql` 6–9). The disposable PGlite test books an 8,000 header, a 10,000 journal, and zero credit rows. That test is not production proof.

**Idempotency that exists today.**

- Optional `invoice_payments.idempotency_key`, unique per tenant when present. A missing key still books another installment (`20261017` 19–24 and 522–523). The same key with a different amount raises `idempotency_amount_mismatch`.
- A fully paid invoice with no bank key returns replay inside the inner function and does not insert another journal (`20261016` 212–224).
- Bank duplicate is `duplicate_bank_import` on `bank_import_records`.
- Invoice product credit is one deposit per `(tenant_id, reference_id)` and rolls back if the ledger or balance fails (`20261017` 240–372).
- Keyed bulk cash surplus (`bulk-cash-overpay:<key>`) is one transaction. A repeat returns the stored amount (`20261017` 374–504).
- Staff-POS deferred surplus uses a different key and a different function. Bulk cash must not call it.
- The mark-paid dialog creates one UUID per open (`components/admin/InvoiceDetailModal.vue` 1217–1245) and does not cap the typed amount at the remainder.

**Credit after invoice settlement is a second transaction.** `mark-invoice-paid.post.ts` 52–88 settles first, then calls `applyInvoiceCreditOnPaid` for `invoice.user_id` only when the invoice is fully paid and that user id is present. A wallet failure is logged and the invoice stays paid. That credit is the `credit_to_wallet` line snapshot, not the surplus.

**Cash lesson surplus is a different owner.** `process-bulk-payment.post.ts` 239–242 treats cash above the sum of dues as surplus. The credit method requires one student (`apply-student-credit.ts` 117–118). The cash method credits `payments[0].user_id` (lines 383–448). With a key it uses `apply_identified_cash_overpayment`. Without a key it upserts `student_credits` and then inserts a ledger row; the ledger failure is non-fatal. `apply_cash_settlement_batch` can set `invoices.payment_status` to `paid` when related `payments` are completed and does not write `paid_amount_rappen` or `invoice_payments` (`20261016` 401–438 and 460–467).

**Receipt reversal already exists and refuses wallets.** `migrations/20261016_admin_reset_mistaken_receipt.sql` inserts a positive `invoice_payments` row with status `reversal` because `amount_rappen > 0`. It does not edit the original row. It refuses the reset when invoice product credit or a linked credit transaction is present. It does not reverse `student_credits`.

**Authorization already on the settlement RPCs.** The three #467 functions are `SECURITY DEFINER`, `search_path pg_catalog, public`, and `EXECUTE` only for `service_role`. The invoice actor must be `admin` or `tenant_admin` in the invoice tenant. The cash actor must be active staff/admin, and the student must be in that tenant. HTTP tenant comes from `users` loaded by `auth_user_id`.

**`applyStudentCreditToPayments` is not atomic.** It updates `payments` and inserts the ledger, then updates the balance (`apply-student-credit.ts` 188–274).

**`POST /api/staff/credit-transaction` writes a caller-supplied `user_id` in the staff tenant without loading that user in the tenant** (`server/api/staff/credit-transaction.post.ts` 117–139).

### Inferences

- A billing-name snapshot is a postal label. Code already refuses to treat it as `company_id`. The design keeps that refusal.
- `users.company_id` is an employment link, not a credit owner. The companies API embeds `users!users_company_id_fkey`, so the relationship is expected, but the `ADD COLUMN` is not in the repo.
- CAMT import matches and flags duplicates (`server/api/invoices/camt-import.post.ts`). Booking still goes through `mark-invoice-paid` with `camt_dedupe_key`. No TypeScript file inserts `invoice_payments`. No Wallee handler was found that calls `settle_marked_invoice_payment`.

### Unknown, left unknown

- Live nullability of `invoices.user_id`.
- Live existence and foreign key of `invoices.company_id` and `users.company_id`.
- Whether any historical journal sum exceeds `paid_amount_rappen`.
- Grants and migration status on production or shared staging.

## 3. Proposed data model

Leave `student_credits` and `credit_transactions` in place. Add company credit and a receipt ledger beside them. Do not copy personal balances into the new tables.

### Bill-to, without assuming `user_id` is nullable

New invoices gain two columns:

- `bill_to_kind text not null default 'user'` check (`user`, `company`)
- `bill_to_company_id uuid null`

Rules enforced in the write function:

- `bill_to_kind = user` requires `bill_to_company_id` null and `user_id` equal to a `users.id` in `invoices.tenant_id`.
- `bill_to_kind = company` requires `bill_to_company_id` of a `companies` row in the same tenant.
- `user_id`, while the column is `NOT NULL`, is the document contact. It is never the credit owner when `bill_to_kind = company`.

**How to verify the Firmenkurs conflict without a live query.** Ship a read-only preflight file that a person runs on a database they choose. This design does not run it. The preflight reports `is_nullable` for `invoices.user_id`, whether `invoices.company_id` exists, and the count of rows with `user_id` null. Until that report exists:

- The settlement function treats a null `user_id` as an unresolved bill-to and posts no automatic credit.
- The Firmenkurs writer is not changed in the first schema PR.
- The compatible writer change, after a human confirms the column is `NOT NULL` or after a reviewed nullability migration, stops inserting null. It requires an explicit contact `user_id` in the tenant and sets `bill_to_kind = company` plus `bill_to_company_id`. A disposable test applies only the migrations in the repo, asserts the checked-in `NOT NULL`, and asserts the current source still contains `user_id: null`, so the conflict stays visible.

### Company credit

`company_credit_accounts`

- `id uuid primary key`
- `tenant_id uuid not null`
- `company_id uuid not null`
- `balance_rappen integer not null default 0` — cache
- `unique (tenant_id, company_id)`
- check `balance_rappen >= 0`

`company_credit_transactions`

- `id`, `tenant_id`, `company_id`, `amount_rappen` (signed), `balance_before_rappen`, `balance_after_rappen`
- `transaction_type` in `deposit`, `application`, `reversal`, `correction`
- `receipt_id`, `invoice_id`, `reverses_transaction_id`
- `idempotency_key text not null`
- `created_by uuid not null`
- `unique (tenant_id, idempotency_key)`

The cache is updated only inside the posting function, which locks the account `FOR UPDATE`. A deferred constraint trigger checks `balance_rappen = sum(amount_rappen)` for that account before commit. New company accounts start at zero, so the sum check is valid. Personal accounts do not get a historical sum check, because existing drift was not measured.

### Receipts and allocations

`payment_receipts`

- `id`, `tenant_id`, `amount_rappen check > 0`, `received_at`, `method`, `source`
- `idempotency_key text not null`
- `external_ref text null` — bank dedupe or provider id
- `payer_kind` in `user`, `company`, `unknown`
- `payer_user_id`, `payer_company_id` — exactly one when the kind is known, both null when `unknown`
- `created_by`
- `unique (tenant_id, idempotency_key)`
- `unique (tenant_id, external_ref)` where `external_ref` is not null

`receipt_allocations`

- `tenant_id`, `receipt_id`, `invoice_id`, `amount_rappen check > 0`
- `status` in `applied`, `reversal`
- `reverses_allocation_id`
- `unique (receipt_id, invoice_id)` where `status = applied`

`receipt_dispositions`

- one remainder row per receipt: `kind` in `personal_credit`, `company_credit`, `unallocated`
- `amount_rappen check >= 0`
- links to `credit_transactions.id` or `company_credit_transactions.id` when credited
- `unique (receipt_id)` where `kind` is a remainder kind

Immutable invariant, checked in the function under row locks:

```text
receipt.amount_rappen
  = net applied allocations
  + net reversals of those allocations
  + remainder disposition
  + refund dispositions
```

Net applied to one invoice cannot exceed `invoices.total_amount_rappen - already net applied`. `invoices.paid_amount_rappen` is set to that net, never to the receipt total. A second receipt on a fully paid invoice allocates zero and leaves the whole amount as remainder.

Refunds and corrections are new rows. Historical `amount_rappen` values stay. This matches the existing reversal style in `20261016_admin_reset_mistaken_receipt.sql`.

Key format stays `^[A-Za-z0-9_-]{8,80}$`. A missing key is rejected. The server does not derive a key from amount plus invoice, because two genuine equal installments must remain possible under two keys.

### Tenant-safe company link

`invoices.bill_to_company_id` references `companies(id)`. The posting function also requires `companies.tenant_id = invoices.tenant_id`. A composite foreign key `(company_id, tenant_id)` is the target once a human confirms `companies` has that unique key. Until then the function check is mandatory and the composite key is part of the same reviewed migration.

## 4. Ownership matrix

Automatic credit runs only when `payer_kind` is known and equals the invoice bill-to. Otherwise the receipt is stored and the remainder is `unallocated`.

| # | Scenario | Owner | Automatic credit | Audit |
| --- | --- | --- | --- | --- |
| 1 | Individual pays their own invoice in excess | That `user_id`, because payer user equals `bill_to_kind = user` | Yes, personal surplus only | Receipt, allocation, `credit_transactions` deposit, disposition `personal_credit` |
| 2 | Company pays its own invoice in excess | That `company_id` | Yes, company surplus only | Receipt, allocation, company ledger deposit, disposition `company_credit` |
| 3 | Company pays an employee’s individual invoice | No automatic owner. Bill-to is the user and payer is the company | No. Allocate up to the invoice total only. Remainder stays `unallocated` | Receipt with both payer and bill-to. Resolution, if any, is a later manual entry |
| 4 | Employee pays a company invoice | No automatic owner | No. Same as 3, reversed. Remainder `unallocated` | Same |
| 5 | Company prepays for several employees | The company, when the receipt payer is explicitly that company and no allocation touches another bill-to | Yes, the unallocated-to-invoices amount becomes company credit | Receipt with zero or more later applications. Each application is its own ledger row |
| 6 | One receipt, several invoices of the same company | That company for any remainder, after explicit allocations | Allocations only up to each outstanding. Remainder to company credit when the payer is that company | One receipt, one allocation per invoice, one remainder |
| 7 | One receipt covers an individual invoice and a company invoice | Remainder has no owner | Allocations require a manual authorized act. Automatic remainder credit is forbidden | See unresolved decisions. Until that decision, the function rejects a mixed bill-to set |
| 8 | Payer unknown | Nobody | A QR/reference match may propose an invoice. Surplus stays `unallocated`. Name or debtor text does not set the payer | Receipt `payer_kind = unknown` |
| 9 | Invoice already paid, another payment arrives | Follows 1–4 using the new receipt’s payer and that invoice’s bill-to. Allocation amount is 0 | Credit only when payer and bill-to match. Header stays capped | New receipt. No second inflation of `invoice_payments` |
| 10 | Duplicate webhook, bank import, or retry | The first receipt | No second credit | Same `idempotency_key` or `external_ref` returns the stored receipt. A different amount raises |
| 11 | Refund after credit was issued | Reverse the original owner | A reversal ledger entry for the credited amount, then allocation reversals, then `paid_amount` recomputed from net allocations | New rows only. If available credit is below the reversal amount, the whole refund rolls back |
| 12 | Company reassigned, disabled, or deleted | The company account stays with `company_id` | `users.company_id` changes do not move credit. `is_active = false` blocks new application and still allows admin resolution. Delete is `ON DELETE RESTRICT` on the credit account | Assignment and archive already write the user or company row. Credit transfers are separate manual entries |

## 5. Transaction boundaries

One database function, `post_payment_receipt`, is the boundary for receive, allocate, and remainder. HTTP handlers only resolve the actor and call it.

```text
post_payment_receipt(actor, idempotency_key, external_ref, amount, payer, allocations[]):
  lock actor; require role and actor.tenant_id
  reject a missing or malformed key
  if receipt exists for (tenant, key) or (tenant, external_ref):
    require stored amount and payer; return stored dispositions
  insert receipt
  lock invoices and credit accounts in id order
  for each requested allocation:
    require invoice.tenant_id = actor.tenant_id
    require bill_to resolved
    reject a set that mixes user and company bill-to   -- until the product decision in section 8
    allocated = min(requested, outstanding)
    insert allocation
    set invoice.paid_amount = previous net + allocated
    set payment_status from that net, never from the receipt total
  remainder = amount - sum(allocations)
  if remainder = 0: insert disposition unallocated amount 0
  else if every touched invoice has the same bill-to and payer equals that bill-to:
    post personal or company credit in this same transaction
    insert the matching disposition
  else:
    insert disposition unallocated
  deferred trigger checks company balance = ledger sum
  on any failure: roll back receipt, allocations, header, and credit together
```

Apply existing credit is a second function, `apply_credit_to_invoice`:

```text
lock credit account and invoice
require same tenant
personal credit only when bill_to_kind = user and owner = invoice.user_id
company credit only when bill_to_kind = company and owner = bill_to_company_id
use = min(available, outstanding)
insert application ledger row and an allocation funded by that credit
update both caches
unique (tenant, idempotency_key) makes a retry return the same use
```

Refund:

```text
lock receipt, allocations, and the credited account
insert reversal allocations and a reversing credit ledger row
recompute paid_amount from net allocations
fail and roll back when available credit cannot cover the reversal
```

`apply_cash_settlement_batch` must stop setting `invoices.payment_status = paid` unless net receipt allocations cover the total. That sync joins this transaction when the bulk path is moved. Until then it remains a known gap.

Invariants the database enforces:

- Remainder plus net allocations equal the receipt.
- Header `paid_amount_rappen` equals net allocations, and it is at most the total.
- One applied allocation per receipt and invoice.
- One remainder disposition per receipt.
- Company balance equals its ledger at commit.
- Idempotency key and external ref are unique per tenant.
- Credit owner is the bill-to of the invoice being credited, or nobody.

## 6. Security model

| Action | Roles |
| --- | --- |
| Post a receipt and allocate to invoices | `admin`, `tenant_admin`. Staff keep today’s lesson-cash role only after that path calls `post_payment_receipt` and cannot choose the owner |
| Apply company or personal credit to an invoice | `admin`, `tenant_admin` |
| Resolve an `unallocated` remainder | `admin`, `tenant_admin`, with a required reason |
| Refund or reverse | `admin`, `tenant_admin` |
| Transfer between personal and company credit | Not in this design. No such function |

The server loads `users` by `auth_user_id` and uses that `tenant_id`. Body `tenant_id`, `user_id`, and `company_id` are ignored as owners. Payer and bill-to are loaded from `payment_receipts` and `invoices` inside the function. A client may send an invoice id and an explicit payer id; both must load in the actor tenant or the call fails.

RPC rules match #467: `SECURITY DEFINER`, `search_path pg_catalog, public`, `REVOKE` from `PUBLIC`, `anon`, and `authenticated`, `GRANT EXECUTE` to `service_role` only. The function checks the actor role itself.

Manual resolution writes `created_by`, the reason, the previous disposition id, and the new disposition. It does not update the old amount.

`POST /api/staff/credit-transaction` is an unrelated hole: it still trusts a body `user_id`. It is listed in section 9 and is not part of this settlement design.

## 7. Migration and compatibility

Each phase is a draft PR. No migration is applied except by a later human approval. Nothing in these phases reads production from this environment.

1. **Preflight only.** Read-only SQL for `user_id` nullability, `company_id` presence, and counts of null `user_id`. No writes.
2. **Additive schema.** New company credit tables, receipts, allocations, dispositions, bill-to columns with default `user` where `company_id` is null. No backfill of credit. Existing `student_credits` rows stay.
3. **Posting function and PGlite tests.** Not wired to HTTP.
4. **Switch `mark-invoice-paid`.** Require a key. Header stays capped. Surplus goes to a disposition. Stop inserting the surplus as `invoice_payments.amount_rappen`.
5. **Company credit application** for `bill_to_kind = company` only.
6. **Close the keyless bulk surplus.** Require the existing dialog UUID. Route it through the receipt function. Stop the non-transactional upsert.
7. **Firmenkurs writer**, only after the preflight. Replace `user_id: null` with a contact user and an explicit company bill-to.
8. **Reconciliation report.** List invoices where the net journal exceeds `paid_amount_rappen`. Create no credit from that gap.
9. **Refund function** that can reverse a credit created by this design. The old receipt-reset function continues to refuse wallets until this path exists.

Rollback of unused new tables is a drop of those tables before any receipt is posted. After the first posted receipt, rollback is a forward reversal, using the same rule as the existing receipt-reset comment: do not delete posted rows.

Historical overpayments stay historical. A later backfill needs its own decision and its own approval.

## 8. Regression tests

Disposable Postgres tests, same style as `server/utils/__tests__/settlement-integrity-hardening.pg.test.ts`. Mocks may cover HTTP status codes. They do not replace these.

- Individual overpay: header 30,000, receipt 40,000, personal credit 10,000, company credit 0.
- Company overpay: company credit 10,000, `student_credits` unchanged, including the employee on the line.
- Company credit pays a second invoice of the same company for a different employee, and refuses another company, another tenant, and an individual invoice.
- Mixed bill-to allocation is rejected.
- Unknown payer stores the receipt and an `unallocated` remainder.
- Duplicate key and duplicate bank ref return one receipt. A changed amount raises. A missing key raises.
- Two concurrent identical keys produce one credit. Two different keys on one invoice cannot push `paid_amount` above the total.
- Fail the ledger insert, the balance update, and the header update. Each leaves zero receipts and zero credit.
- Refund after credit inserts a reversal and restores the balance. Refund after the credit was spent rolls back.
- Already-paid invoice plus a new receipt does not raise `paid_amount`.
- A fixture with an old journal above the header remains uncredited after migration.
- Firmenkurs source still shows the null write until the writer PR, and the settlement function credits nothing when `user_id` is null.
- `anon` and `authenticated` lack `EXECUTE`. A foreign-tenant actor is `forbidden`.

## 9. Unresolved product decisions

1. **Mixed receipts.** Whether one receipt may be manually split across an individual invoice and a company invoice. Until that is decided, the function rejects the set.
2. **Who may resolve `unallocated` money, and onto which account.** The design limits the act to `admin` and `tenant_admin` and requires a reason. The allowed targets (original payer, bill-to, refund only) are not chosen here.
3. **Historical gaps.** Whether any old journal-minus-header difference may later become credit. This design does not convert them.
4. **Firmenkurs contact.** Which real `users` row fills `user_id` if the column stays `NOT NULL`: a company contact, or a user selected on each invoice.
5. **Staff and company credit.** Whether staff may apply company credit, or only `admin` and `tenant_admin`.

## 10. Ranked risks

1. **High.** Wiring the new receipt while `settle_marked_invoice_payment` still stores the gross amount in `invoice_payments` would double-count. The switch PR has to stop that insert in the same change.
2. **High.** `apply_cash_settlement_batch` can mark an invoice paid without `paid_amount_rappen`. A company-credit UI that trusts `payment_status` alone would apply credit against a header that was never allocated.
3. **High.** Keyless bulk surplus remains live until phase 6. Shipping company credit first does not close that personal double-credit path.
4. **Medium.** Firmenkurs `user_id: null` may already fail on a `NOT NULL` catalog, or it may have succeeded if the live column differs. The preflight is the only safe check.
5. **Medium.** Personal `student_credits` can already disagree with its ledger. The new personal surplus path must not “repair” that history inside the receipt transaction.
6. **Medium.** `credit-transaction.post.ts` can still create a personal balance for a body `user_id` outside the tenant check. Out of scope, still a way around the new owner rules.
7. **Low.** `companies` has RLS and no policies. Safety depends on every route using the service role and the profile tenant. The new RPCs must do the same.

## 11. Implementation sequence

| PR | Contents | Stays draft until |
| --- | --- | --- |
| A | This design, no code | Product decisions 1–5 are answered |
| B | Preflight SQL only | A human has run it and attached the result |
| C | Additive tables, triggers, no HTTP | Review of constraints |
| D | `post_payment_receipt` and `apply_credit_to_invoice` plus PGlite tests | Tests in section 8 for post and apply |
| E | Switch invoice mark-paid. Require a key. Cap the header. Disposition for surplus | D is merged by a person and the migration is approved |
| F | Company credit application API | E |
| G | Bulk cash requires a key and uses the receipt function. Invoice status sync stops marking paid ahead of `paid_amount` | F |
| H | Firmenkurs bill-to writer | B’s preflight |
| I | Reconciliation report, no credit backfill | Separate approval if anyone later wants a backfill |
| J | Refund/reversal that can reverse the new credit | I |

Unrelated and not pulled into these PRs: the staff credit-transaction tenant gap, the non-atomic `applyStudentCreditToPayments` balance update, and the project-wide typecheck.

**DESIGN COMPLETE — NO IMPLEMENTATION PERFORMED**
