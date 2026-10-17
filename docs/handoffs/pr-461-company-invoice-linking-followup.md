# PR #461 follow-up — company check before credit

Observation: 2026-10-16T15:05:01Z

## Verdict

`CONDITIONAL PASS — DATABASE PROOF OR SPECIFIC APPROVAL STILL REQUIRED`

The credit-ordering bug is fixed and tested. A disposable Postgres run proved the service-role lookup and the insert read-back on a reconstructed schema. A human still has to accept that this schema is not a production dump, and that Postgres does not itself reject a cross-tenant `company_id`.

This verdict is for human merge review only. The PR stays a draft. It was not merged or deployed.

`.cursor/rules/agent-handoff.mdc` is not in the repository. This file follows the request’s handoff list.

## PR state before this follow-up

Checked live, not assumed:

- PR https://github.com/Kilchi555/driving-team-app/pull/461
- Open draft
- Branch `cursor/company-invoice-future-writes-ea11`
- Base `main` `ecf9694ff5b6626539ad0230fee2ca1c3a3d6121`
- Head before this follow-up `88732d0020619b0e97a200066e81648a461cc3b6`
- Implementation commit `90fbae28474dd9f77e091465d09d7470ff93cdf8`

The draft head after this follow-up is the commit that adds this file. A commit cannot store its own hash. The pull request description is updated with `git rev-parse HEAD` after the push.

## Root cause and change

`POST /api/invoices/send-draft` applied student credit, then called `persistAndSendInvoiceDraft`, which validated the company id. A 400, 404, or 503 from that check left the credit writes in place and created no invoice.

`server/api/invoices/send-draft.post.ts` now calls `companyIdForInvoiceInsert` before `applyStudentCreditToPayments`. The returned id, including null, is passed to persist as `linkedCompanyId`.

`server/utils/invoice-persist-and-send.ts` uses that value when the property is present and does not query `companies` again. Auto-invoice does not pass the property, so persist still resolves the draft itself. There is one validation implementation.

## Order on send-draft

1. Auth, staff role, draft shape, draft tenant.
2. `companyIdForInvoiceInsert` (explicit id, same tenant, fail closed).
3. Student credit, only if step 2 succeeds and `apply_available_credit` is set.
4. Persist reuses `linkedCompanyId`.
5. Payment claim, then invoice-number allocation, then invoice insert.

The check and the insert are not one transaction. A company removed after step 2 can still fail the insert. Credit for that request would already be applied. That is the same window as any other insert failure, not a second company-rule implementation.

## What the tests ran

Command:

`npx vitest run server/utils/__tests__/invoice-company-link.test.ts server/utils/__tests__/invoice-company-link.db.test.ts server/utils/__tests__/invoice-tenant-isolation.test.ts`

Result at 2026-10-16T15:04:34Z: 3 files, 38 tests, all passed.

`npx eslint` on the two company-link test files and `invoice-company-link.ts` passed with `--max-warnings 0`.

Send-draft cases, in-memory, with `apply_available_credit: true`:

- Invalid id: HTTP 400. Credit function not called. No payment read, no invoice number, no new invoice.
- Foreign tenant id: HTTP 404 `Firma nicht gefunden`. Same, no credit and no insert.
- Unknown id: HTTP 404. Same.
- Company select error: HTTP 503. Same.
- Same-tenant id: credit is called once, companies is queried once, the stored `company_id` is that id, and the open payment is claimed.
- Company name without an id: credit runs, `company_id` stays null, `companies` is not queried.
- Individual draft with a stray company id: credit runs, `company_id` stays null, `companies` is not queried.

The 13 existing payment-claim tests passed. They do not open a database.

## Database proof

Engine: `@electric-sql/pglite` 0.3.14, embedded Postgres, created inside the test process and closed at the end. No production or staging connection. No migration was applied anywhere except inside that disposable database.

Schema loaded in the test, from repository text:

- `companies` RLS enabled, no policies, `REVOKE ALL` from `PUBLIC` and `authenticated`, `GRANT ALL` to `service_role`. Source: `migrations/20260826_rls_wave3_critical.sql`.
- `service_role` is `BYPASSRLS`. `authenticated` is not.
- `calculate_invoice_vat` BEFORE INSERT OR UPDATE, from `database_migration_invoices.sql`. No later file replaces it.
- `update_invoice_status` BEFORE UPDATE, from `sql_migrations/20260819_invoice_quotes.sql`.

`invoices.company_id` is selected by `invoices_with_details`, but this repository has no `ADD COLUMN` for it. The test table uses a nullable uuid and no foreign key. That is a reconstruction, not a production catalog.

What the PGlite tests actually showed:

- As `service_role`, the real `companyIdForInvoiceInsert` helper finds tenant A’s company. The following INSERT’s read-back `company_id` is that company.
- The VAT trigger rewrote the stored total from 10000 to 10810 (8.1% of 10000) and left `company_id` unchanged. `payment_status` stayed `pending` on insert.
- A past-due `sent` invoice stayed `pending` on INSERT. A later UPDATE changed it to `overdue` and kept `company_id`. The status trigger is BEFORE UPDATE only.
- Foreign and unknown ids throw 404 and leave the invoice count unchanged.
- `authenticated` gets `permission denied for table companies`. The helper returns 503 and inserts nothing.
- A direct INSERT of tenant B’s company id onto a tenant A invoice succeeds. This schema has no constraint that the company and the invoice share a tenant. The helper is what stops that write on the send-draft path.

Service-role versus API: the lookup SQL runs as `service_role` on Postgres. The HTTP handler, credit function, and payment claim were not executed inside Postgres. Those remain the in-memory send-draft tests. PostgREST was not running.

## Remaining limits

- Check and insert are not atomic.
- No database constraint stops a different writer from storing a cross-tenant `company_id`. `POST /api/invoices/create` is still that separate writer and was not changed.
- PGlite is not the production instance. Trigger bodies are the copies in git.
- In-memory tests still do not prove RLS.

## Confirmation

No production or staging write. No migration applied outside the disposable test database. No backfill. No historical invoice change. No merge, undraft, approval, deploy, or workflow dispatch. PR #460 was not read or changed.

## Next human action

Read this draft, including the direct-insert result. If that reconstructed-schema limit is acceptable, review and merge by hand under the normal ruleset. If it is not, ask for a test against a database whose `invoices.company_id` definition matches production. Do not merge from this note.
