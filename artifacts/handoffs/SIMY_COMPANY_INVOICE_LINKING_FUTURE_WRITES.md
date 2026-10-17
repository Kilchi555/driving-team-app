# Company invoice linking — future writes

Date: 2026-10-16  
Repository: `Kilchi555/driving-team-app`  
Branch: `cursor/company-invoice-future-writes-ea11`  
Draft PR: https://github.com/Kilchi555/driving-team-app/pull/461  
Base (`origin/main`): `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`  
Implementation commit: `90fbae28474dd9f77e091465d09d7470ff93cdf8`  
Head when draft #461 was opened: `8f0b1d24833ff32e78e9c03c617da5f4931a9c02`  
PR #459 head, not modified: `e568b2957c39bfb497d58d6172bab20107ef65fb`  
This follow-up commit only records the PR URL and that head. The pull request description is updated to the branch tip after this commit.

No backfill ran. No migration was added or applied. No production SQL, invoice update, payment update, or deploy ran. PR #459 was not edited, undrafted, or merged.

## Verdict

`PASS` for the scoped future-write.

Company invoices created through `persistAndSendInvoiceDraft` receive `invoices.company_id` only when the draft carries an explicit company id and that id loads inside the invoice tenant. A company name, an address, or `users.company_id` does not create the link. Auto-invoice and external resource invoices stay unlinked because those drafts have no trustworthy company id. That is the contract, not a missing source invented here.

## Implementation gate

Change class: API, authorization, tenant isolation, privileged Supabase client.  
Change risk: **CRITICAL**. Invoice insert via the service-role client. No RLS change, no payment-provider change, no trigger change.  
Approval: the user order for this future-write, scoped to `persistAndSendInvoiceDraft`, its auto-invoice callers, and `POST /api/admin/resources/block`.  
Recommendation carried from the system audit: implement with caution. Do not backfill.  
This change does not expand into POS, course SQL, quote conversion, or historical rows.

## Cause

`persistAndSendInvoiceDraft` inserted the billing name and `billing_type` and omitted `company_id`. Send-draft and both auto-invoice entry points share that function. Auto-invoice sets `billing_type=company` when the saved billing snapshot has a company name, and it loads `users.company_id`, but neither value is a confirmed company id.

`POST /api/admin/resources/block` inserts its own invoice. An external booking has `external_company_name` as free text and no company row. A client-supplied `company_id` on that body is not a validated company.

## Correction

`server/utils/invoice-company-link.ts`

- `companyIdForInvoiceInsert` runs before invoice-number allocation and before the invoice insert.
- `billing_type` other than `company` returns null. A stray company id on a personal draft is discarded and does not fail the personal invoice.
- Null or empty `company_id` on a company draft returns null and does not query `companies`.
- A non-UUID explicit id throws `InvoiceCompanyLinkError` 400 `Ungültige Firmen-ID`.
- A UUID is loaded with `companies.id` and `companies.tenant_id` equal to the invoice tenant. A database error throws 503 `Firma konnte nicht geprüft werden`. No row, or a row whose `tenant_id` is not the invoice tenant, throws 404 `Firma nicht gefunden`. Foreign and unknown ids share that message.
- The insert stores the resolved id, not the raw draft field. `applyMissingInvoiceBilling` may still read `users.company_id` when the postal address or email is missing. It copies address and email only. It does not write `company_id`.

`server/utils/invoice-persist-and-send.ts`

- `InvoiceDraftPayload.company_id` is optional and documented as never inferred.
- The insert sets `company_id: linkedCompanyId`. Billing name, address, totals, and `payment_status: 'pending'` are unchanged.

`server/utils/auto-invoice-on-complete.ts`

- `buildDraftForPayments` sets `company_id: autoInvoiceCompanyId()`, which returns null.
- Callers (`save-criteria-evaluations`, `batch-update-appointment-status`, `exams/save-result`, `GET /api/cron/auto-invoice-scheduled`) only call `triggerAutoInvoiceOnComplete` or `runScheduledAutoInvoices`. They were not given a new company argument.

`server/api/invoices/send-draft.post.ts`

- Staff role check and draft tenant check stay in place.
- `InvoiceCompanyLinkError` is returned with its status code. Other persist failures stay 500 with the error message.

`server/api/admin/resources/block.post.ts`

- `externalResourceInvoiceAssociation` ignores `body.company_id`.
- A non-empty external name keeps `billing_type=company` and `company_id=null`. An empty name stays `billing_type=individual` and `company_id=null`.
- The free-text name, contact, and address are still stored. Auth remains `requireAdminProfile`. The resource lookup stays on `profile.tenant_id`.

## Blocker and next step

Auto-invoice and the external resource invoice do not have a company id that is safe to store. Membership and the billing name are not substitutes. The next step, if a later caller already resolved a company id by loading `companies` in the invoice tenant, is to pass that id on the draft. Do not read it from `users.company_id` or from `company_billing_addresses`.

## Tests and results

Command:

`npx vitest run server/utils/__tests__/invoice-company-link.test.ts server/utils/__tests__/invoice-tenant-isolation.test.ts`

Result: 2 files, 25 tests, all passed (2026-10-16).

`npx eslint server/utils/__tests__/invoice-company-link.test.ts server/utils/invoice-company-link.ts --max-warnings 0` passed. The repository lint script covers `server/utils/__tests__/**/*.ts`. Pre-existing `any` usages in the touched persist, auto-invoice, send-draft, and resource files were not rewritten.

| Contract | Result |
| --- | --- |
| Explicit company id in the invoice tenant is stored. Name and totals stay as sent. | Passed |
| Company id from another tenant is rejected with 404 before insert. | Passed |
| Unknown company id is rejected before insert. | Passed |
| Non-UUID explicit id is rejected with 400 before insert and does not query `companies`. | Passed |
| Company name without an id stays unlinked. `companies` is not queried. | Passed |
| Auto-invoice draft uses `autoInvoiceCompanyId()`. The four callers do not set `company_id`. | Passed |
| The name-only persist forbids the `users` table, so membership is not read on that path. | Passed |
| Personal `billing_type=individual` stays `company_id` null even if an id is sent. | Passed |
| External free-text name, including a supplied id, stays unlinked. | Passed |
| The seeded existing invoice and its payment row stay byte-for-byte equal after a new insert. | Passed |
| Company lookup failure returns 503 and does not insert. Invoice insert failure throws `insert failed` and does not add a row. Send-draft maps that to HTTP 500. | Passed |
| Existing persist payment-claim tests still pass. | Passed |

Integration gap: these tests use an in-memory Supabase mock. They do not open Postgres, do not evaluate `companies` RLS, and do not fire `calculate_invoice_vat`, `update_invoice_status`, or `update_appointment_status_on_invoice_paid`. `companies` RLS is enabled with no policies; the writers use the service-role client and must filter `tenant_id` in application code, which the new lookup does. A later integration test against a database is still required before treating RLS as proven.

## Files

- `server/utils/invoice-company-link.ts` (new)
- `server/utils/invoice-persist-and-send.ts`
- `server/utils/auto-invoice-on-complete.ts`
- `server/api/invoices/send-draft.post.ts`
- `server/api/admin/resources/block.post.ts`
- `server/utils/__tests__/invoice-company-link.test.ts` (new)
- `artifacts/handoffs/SIMY_COMPANY_INVOICE_LINKING_FUTURE_WRITES.md` (this file)

## Remaining writers

Not changed. They need their own scope.

| Path | Why it remains |
| --- | --- |
| `POST /api/invoices/create` | Already stores a client `company_id` after a same-tenant `companies` read. Empty id becomes null. It still stores a sent id when `billing_type` is individual. Out of scope. |
| `createCompanyCourseInvoice` / `POST /api/admin/courses/company-invoice` | Writes `company_id` from `courses.company_id` after the course and company load in the caller tenant, and only for `billing_mode=company_collective`. |
| Participant course invoice in `course-enrollment-billing.ts` | Hard-coded `individual`. No `company_id`. |
| `issue_course_invoice` | Hard-coded `individual`. Insert column list has no `company_id`. Service-role RPC. |
| `staff_pos_sale` | Hard-coded `individual`. Insert column list has no `company_id`. Service-role RPC. |
| `POST /api/admin/rental-invoice` | Hard-coded `individual`. No `company_id`. |
| `createCancellationFeeInvoice` in `utils/policyCalculations.ts` | No caller. Hard-coded `individual`. Also omits `tenant_id`. Dead path. |
| `convertQuoteToInvoice` | Updates the quote row to an invoice and does not set or clear `company_id`. |
| `POST /api/invoices/update`, `POST /api/staff/update-invoice`, `POST /api/admin/invoice-save` | Allowlists do not include `company_id`. Updates still run the invoice triggers. Staff update can set `paid_at`. Invoice-save for `superadmin` can update another tenant's billing text without a tenant filter on the update. |
| `POST /api/admin/companies/assign-user` | Updates `users.company_id` only. |
| Payment, dunning, resend, download, credit | Do not set `company_id`. Any invoice `UPDATE` still runs the existing triggers. |
| `POST /api/admin/invoices/link-company` | Exists only on draft PR #459. Not on this branch. |

## Confirmation

- No historical invoice was updated.
- No payment status, amount, or journal was changed.
- No backfill ran.
- No migration was added or applied.
- No production change and no deploy ran.
- PR #459 was not modified.
- This pull request stays a draft. It is not merged.
