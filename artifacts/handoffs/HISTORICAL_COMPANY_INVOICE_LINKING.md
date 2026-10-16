# Historical company invoice linking

Date: 2026-10-16  
Branch: `cursor/historical-company-invoice-link-ea11`  
Base: `origin/main` `e1248c0b`  
Mode: draft implementation. Production was read with `SELECT` only. No backfill, no `UPDATE`, no migration, no merge, no deploy.

## Implementation gate

```
IMPLEMENTATION GATE

Change:
Admin workflow to assign one historical company invoice to one company in the same tenant, with confirmation, an audit row, and a refusal when existing invoice triggers would change amounts or payment status.

CHANGE CLASS:
* UI
* API
* Authorization
* Database (application update of invoices.company_id only; no DDL)

In Scope:
List unlinked company invoices, search/select a company, show decision metadata, require confirmation, enforce tenant and role on the server, audit user/time/invoice/old/new company id, refuse cross-tenant and already-linked rows, keep POST /api/invoices/create writing company_id when the client sends it.

Out of Scope:
Production updates, backfills, payment status, amounts, accounting, dunning, RLS changes, new tables, new privileges, auto-linking from users.company_id or billing name, changing auto-invoice, merging or deploying.

Hotspots:
P0: multi-tenant isolation, Supabase admin client, authorization (requireAdminProfile). Dependency of the invoice write path because BEFORE UPDATE triggers can rewrite totals and payment status.

Blast Radius: Medium

Change Risk: CRITICAL

Decision Required:
User requested this workflow in the task. That request is the approval for this scope. The executor did not self-approve a wider change.

Direct Impact:
New admin page and two admin endpoints. Existing company page gains a link. invoices.company_id is the only business column the new write sets.

Indirect Impact:
public.calculate_invoice_vat and public.update_invoice_status run on every invoices UPDATE. The endpoint refuses rows those triggers would change, then re-reads the saved row.

Potential Impact:
POST /api/invoices/create and the generic invoice update allowlist stay unchanged. persistInvoiceAndSend still does not receive a company_id.

Out-of-scope findings (REPORT ONLY):
Auto-invoice sets billing_type company from a saved billing company name. persistInvoiceAndSend inserts that draft without company_id. New unlinked company invoices are still being created. Inferring company_id from the current membership would violate the historical-evidence rule, so that path was not changed.

Dependency Evidence:
Company tab reads only invoices.company_id (GET /api/admin/companies/:id/invoices). POST /api/invoices/create checks the company tenant and stores company_id. POST /api/invoices/update allowlist does not include company_id. audit_logs already has user_id, auth_user_id, action, resource_type, resource_id, status, details, tenant_id, created_at. No new table.

Security Impact: Critical
Database Impact: High
Multi-Tenant Impact: Critical
Regression Risk: Medium
Breaking Change: No

TEST LEVEL: L1 + L4 (targeted Vitest). L3 browser path unverified: no admin session.

Required Tests:
Vitest company-invoice-link and company-invoice-link.http. Project ESLint on those tests. CI Test and lint, E2E login, Dependency review after the draft PR opens. Those CI runs are not a merge.

Manual Verification:
Admin opens /admin/company-invoice-links, sees only unlinked company invoices, selects a company, confirms, and sees the invoice leave the list. A second admin with a stale updated_at gets a conflict. Accountant and client cannot use the endpoint.

Security Verification:
Tenant comes from the authenticated profile. Client tenant id is not read. Other-tenant invoice and company return 404. Existing company_id is not overwritten. Suggestions are marked authoritative false and are not written unless that company id is explicitly confirmed.

Database Verification:
Read-only catalog and counts on 2026-10-16. No migration applied.

Recommendation:
IMPLEMENT WITH CAUTION
```

## 1. Root cause and affected data

The company invoice tab shows rows with a direct `invoices.company_id`. Historical company invoices stored the recipient on the billing snapshot (`billing_type = company`, billing name and address) and left `company_id` null. `users.company_id` is the customer's current company, not the invoice's company at the time it was issued. An exact billing-name match is the same kind of hint. Neither is proof.

Read-only counts on 2026-10-16, `document_kind = invoice` and `billing_type = company`:

| Status | Count |
| --- | ---: |
| `company_id` null | 60 |
| `company_id` set | 11 |
| Tenants with null `company_id` | 2 |
| Null rows with a user | 60 |
| Null rows without a tenant | 0 |
| Current membership suggestion | 29 |
| No current membership | 31 |
| Membership company created after the invoice | 14 |
| Distinct companies in those membership hints | 11 |
| Exact normalized name suggestion | 25 |
| Ambiguous exact name | 0 |
| Existing update trigger would change payment status | 15 |
| Amount formula already matches the VAT trigger | 60 |
| Safe for a `company_id`-only update under that guard | 45 |

Per tenant, null company invoices only:

| Tenant | Count | Oldest `created_at` | Newest `created_at` |
| --- | ---: | --- | --- |
| `64259d68-195a-4c68-8875-f1b44d962830` | 43 | 2026-02-09 | 2026-10-16 |
| `660b72a9-c67b-4763-85d7-b7ba6605e59e` | 17 | 2026-07-22 | 2026-10-04 |

Unlinked company invoices are still being created (October includes 2026-10-16). The company modal path (`InvoiceCreateModal` → `POST /api/invoices/create`) writes `company_id` when a company is selected. `persistInvoiceAndSend`, used by auto-invoice, does not. Auto-invoice sets `billing_type` to `company` when a saved billing company name exists and does not set `company_id`.

The previously reviewed invoice `9364490e-7c25-4f4a-a5d6-35b3299fff86` was created before company `525bf160-906c-4886-9284-b6e68eb6195c`. Current membership and a name match are not sufficient. This workflow does not assign it.

`calculate_invoice_vat` rewrites `vat_amount_rappen` and `total_amount_rappen` on every invoice update. For these 60 rows the rewritten values equal the stored values. `update_invoice_status` would change status or payment status for 15 of them (`due_date` in the past with status `sent`, or `paid_amount_rappen` already covering the total while payment status is not `paid`). `update_appointment_status_on_invoice_paid` runs only when status changes to `paid`. A normal update is therefore unsafe for those 15 rows.

## 2. Workflow

Admin page `/admin/company-invoice-links`, linked from Firmenkunden.

1. `GET /api/admin/invoices/unlinked-company` lists this tenant's invoices with `company_id` null, `document_kind = invoice`, and `billing_type = company`. The response shows invoice number, date, created time, billing company name, ZIP, and city. It does not return amounts, payment status, user id, email, or street.
2. Suggestions come from the user's current `users.company_id` in the same tenant and from an exact normalized billing-name match. Each suggestion has `authoritative: false`. Choosing one only fills the form.
3. The admin searches companies through the existing `GET /api/admin/companies` and must check an explicit confirmation.
4. `POST /api/admin/invoices/link-company` accepts only `invoice_id`, `company_id`, `expected_updated_at`, and `confirm: true`. The role list matches the companies API: `admin`, `staff`, `super_admin`, `superadmin`. Tenant id comes only from the authenticated profile.
5. The invoice and the company must both belong to that tenant. A foreign or unknown id is 404. An invoice that already has `company_id` is 409 and is not overwritten. A different `updated_at`, or an update that matches zero rows, is 409.
6. The write is refused with 409 when the VAT trigger would change amounts or the status trigger would change payment status. The update sets only `company_id` and `updated_at`, and it matches the previously read money, status, and `updated_at` columns. The saved row is read back. If payment status or amounts differ, the company id is set back to null when that revert still matches this write.
7. A successful link inserts the existing `audit_logs` row: user, auth user, time, tenant, invoice id, `previous_company_id: null`, `new_company_id`. No billing name or amount is stored. If the audit insert fails, the company id is cleared again.

No new table and no new database privilege. `POST /api/invoices/create` is unchanged and still stores a client-supplied `company_id` after the company tenant check.

## 3. Files and tests

- `server/utils/company-invoice-link.ts`
- `server/api/admin/invoices/unlinked-company.get.ts`
- `server/api/admin/invoices/link-company.post.ts`
- `pages/admin/company-invoice-links.vue`
- `pages/admin/companies.vue` (link only)
- `server/utils/__tests__/company-invoice-link.test.ts`
- `server/utils/__tests__/company-invoice-link.http.test.ts`

Vitest: 19 tests passed (`company-invoice-link.test.ts`, `company-invoice-link.http.test.ts`) on 2026-10-16. ESLint on those files passed. Covered cases: successful link and audit, missing role, other-tenant invoice, other-tenant company, unknown company, already linked, stale `updated_at`, concurrent miss, missing confirmation, extra payment field, trigger guard, trigger mutation rolled back, audit failure rolled back, list isolation, suggestions not written by themselves, create path still assigns `company_id`.

Authenticated browser pass: not run. No admin session was available.

## 4. Security and tenant isolation

- Unauthenticated and disallowed roles fail in `requireAdminProfile` before the admin client is used.
- Both reads and the update filter `profile.tenant_id`. A company or invoice outside that tenant is not distinguishable from a missing id.
- The body cannot carry `tenant_id`, amounts, or payment status.
- An existing `company_id` is never replaced.
- Suggestions cannot save themselves.
- Service role is still used because `companies` RLS has no policies the user client can rely on. Isolation is therefore the application filter, which the tests assert.
- The audit row records the acting profile, including impersonation ids when that cookie is present.

## 5. Remaining risks

- Fifteen candidate rows stay unlinked on purpose. Linking them with the current triggers can change payment status and, in one of those cases, can mark the invoice paid and then mark related appointments paid. They need a separate human decision and a trigger-safe write. This PR does not add that function.
- The VAT trigger still assigns totals on every update. Current candidates match the formula. A future row that does not match is refused, and a trigger change that escapes the pre-check is rolled back only for `company_id`. A crash between the update and the audit insert can leave a link without an audit row.
- Auto-invoice can keep adding unlinked company invoices. That was not changed.
- Staff may call the API and may still be unable to open the admin page, same as Firmenkunden.
- The page was not exercised in a browser.
- Name and membership hints can both point at the wrong historical entity, including a company created after the invoice.

## 6. Next approval step

Review the draft PR. Do not merge it, do not mark it ready, and do not run any production `UPDATE`.

After a human merge, an admin may confirm individual safe rows in the new page. Do not bulk-apply suggestions. The invoice `9364490e-7c25-4f4a-a5d6-35b3299fff86` still needs a person to decide; membership and the name match are not enough.

The 15 trigger-blocked rows need a separate approval before anyone changes triggers or adds a database function. Until then they must stay unlinked.
