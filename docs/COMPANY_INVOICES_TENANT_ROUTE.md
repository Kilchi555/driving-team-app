# Company invoices (tenant-scoped list route)

**When to use:** Firmenkartei invoice list is empty or wrong; debugging cross-tenant company IDs; understanding what counts as a “company invoice” after #446.

Verified against `main` after `e1248c0b` (#446).

Related: billing street-number snapshots when **creating** invoices ([`INVOICE_BILLING_STREET_NUMBER`](https://github.com/Kilchi555/driving-team-app/pull/448) / #442). Open drafts for historical linking / future writes (#459, #461, #462) are **not** this list route — do not fold until they merge.

---

## Intent

Admin Firmenkartei must show invoices that belong to the selected company **inside the caller’s tenant**, via a dedicated GET. Before #446, the UI lacked a tenant-scoped company invoice API; listing must not rely on billing-name fuzzy matches or “employee currently assigned to this company.”

---

## Contract

### Endpoint

`GET /api/admin/companies/:company_id/invoices`

| Rule | Behavior |
|------|----------|
| Auth | `requireAdminProfile` with roles `admin`, `staff`, `super_admin`, `superadmin` |
| Company lookup | `companies.id` **and** `companies.tenant_id = profile.tenant_id` → else `404 Firma nicht gefunden` |
| Invoice filter | `invoices_with_details`: same `company_id`, same `tenant_id`, `document_kind = 'invoice'` |
| Order / cap | Newest `created_at` first; hard limit `MAX_INVOICES = 500`. If `count` exceeds returned rows → `500 Rechnungsliste unvollständig` |
| Client tenant | Never reads a client-supplied `tenant_id`; authority is the authenticated profile |

Admin client bypasses RLS. Comments in the handler note `public.companies` may have RLS enabled with no policies — the **app-layer** tenant filters are the isolation contract.

### What is **not** a company invoice (for this route)

- Billing-name / string matches without `invoices.company_id`
- Invoices whose payer user merely has `users.company_id` set to this company
- Receipts / other `document_kind` values

Only rows with a **direct** `invoices.company_id` (exposed via `invoices_with_details`) qualify.

### Frontend load helpers (`utils/company-invoice-load.ts`)

| Helper | Role |
|--------|------|
| `companyInvoicesPath(id)` | `/api/admin/companies/${encodeURIComponent(id)}/invoices` |
| `startCompanyInvoiceRequest` | Sets `phase: 'loading'` for a generation |
| `applyCompanyInvoiceResult` | Applies response only if `generation` and selected `companyId` still match; otherwise returns `null` (ignore stale) |
| `companyInvoiceLoadErrorMessage` | Prefers API `statusMessage` / `message`; fallback `COMPANY_INVOICE_LOAD_ERROR` |

`pages/admin/companies.vue` uses generation counters so a fast company switch does not paint the previous company’s invoices.

---

## Constraints & pitfalls

1. **Direct `company_id` only** — linking employees to a Firma does not make their private invoices appear here.
2. **Cross-tenant UUID** — a valid company UUID from another tenant → `404`, not a leak of invoices.
3. **Incomplete list = hard fail** — over 500 matching invoices fails closed rather than silently truncating.
4. **Stale responses** — ignore `applyCompanyInvoiceResult === null`; do not clear the UI incorrectly on an outdated fetch.
5. **Future linking PRs** — open #459 / #461 / #462 change how historical or new writes attach `company_id`; this runbook documents the **read** path on main only.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/admin/companies/[company_id]/invoices.get.ts` | Tenant-scoped company + invoice list |
| `utils/company-invoice-load.ts` | Path, generation, apply/error helpers |
| `pages/admin/companies.vue` | Firmenkartei invoice panel + `$fetch` |
| `server/utils/__tests__/company-invoices.http.test.ts` | Auth, tenant isolation, direct `company_id` only, stale apply |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/company-invoices.http.test.ts
```
