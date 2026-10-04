# Invoice Billing Address — Private / Company / Suggest

**When to use:** Staff invoice bookings show the wrong address, company name suggest does not attach the firm, PDFs miss street/city, or `company_billing_addresses` / `users.company_id` look out of sync.

Verified against source (Aug 2026).

---

## Intent

Invoice bookings need a postal billing target before PDF/persist. Staff can:

1. One-click **Privatadresse** from the student profile
2. One-click **company** from `users.company_id`
3. Type a company name and pick an existing tenant company (or create one on save)

Server resolve fills gaps when draft invoices lack street/zip/city or use placeholder email.

---

## Surfaces

| Surface | Role |
|---------|------|
| `PriceDisplay.vue` (payment method `invoice`) | Privat / Firma buttons, company search, name suggest dropdown |
| `GET /api/admin/companies?search=` | `ilike` name search (active companies, tenant-scoped) |
| `POST /api/admin/companies/assign-user` | Sets `users.company_id`; optionally upserts billing |
| `GET /api/addresses/get-by-user` | Loads active `company_billing_addresses` + linked company |
| `billing-from-company.ts` | Resolve / upsert billing rows |
| `invoice-billing-snapshot.ts` | PDF + persist fallbacks from profile/company |

---

## Staff UI contract (`PriceDisplay`)

`billingSource`: `'private' | 'company' | 'custom' | null`.

### Default when switching to invoice

`applyDefaultBillingSource()`:

1. Load linked company if `selectedStudent.company_id` is set
2. Prefer **company** when linked and saved billing is empty **or** `billingLooksLikeCompany` (saved `company_name` equals company `name`, case-insensitive)
3. Else if saved billing has content and **no** `company_name` → **private**
4. Else if saved billing has content → **custom**

### Privatadresse

`applyPrivateAddress` → `billingFieldsFromPerson(student)`. If the student object lacks street/zip/city, fetches `/api/admin/get-user-for-edit` first.

### Company

`applyLinkedCompanyAddress` / suggest pick → `billingFieldsFromCompany(company, student)` then `confirmCompanyAssign(true, company)`.

### Company name suggest

While `selectedPaymentMethod === 'invoice'`, typing `invoiceData.company_name` debounces (~220ms) to `GET /api/admin/companies?search=…` (max 12 rows). Picking a row assigns the company **and** applies billing (`apply_company_billing: true`).

### Save: ensure company exists

`ensureCompanyForInvoice()` (before persisting invoice billing with a non-empty company name):

1. If linked company name matches typed name → assign if `company_id` missing
2. Else search; exact normalized name match → assign
3. Else `POST /api/admin/companies` `action: 'create'` from form fields → assign

Normalization: trim, collapse whitespace, lower-case.

---

## Assign-user billing rules

`POST /api/admin/companies/assign-user`:

| `apply_company_billing` | Existing active billing row? | Upserts company → `company_billing_addresses`? |
|-------------------------|------------------------------|-----------------------------------------------|
| `true` | any | Yes |
| `false` | any | No (only `users.company_id`) |
| omitted | no | Yes (default) |
| omitted | yes | No |

Upsert updates the latest active billing row for the user (or inserts), sets `users.default_company_billing_address_id`, maps company fields via `billingFieldsFromCompany`.

---

## Server resolve order

`resolveStudentBillingAddress(student)`:

1. `default_company_billing_address_id` if active
2. Else latest active `company_billing_addresses` for `user_id`
3. Else map from `companies` via `company_id` (no write)
4. Else person address from student; **null** if no street/zip/city

`applyMissingInvoiceBilling` only fills missing postal fields / placeholder email (`''` or `keine e-mail`). It does **not** overwrite a complete invoice billing snapshot.

`pdfBillingFields(invoice, user?)`: if invoice already has postal data, use it (email may still fall back to user); else fall back to user profile street/zip/city/email.

Name helpers: `collapseDuplicatePersonName` / `billingPersonNameParts` avoid duplicated surnames on company PDFs.

---

## Pitfalls

1. **Suggest attaches the firm** — picking a suggestion runs assign + billing apply; it is not a free-text-only fill.
2. **Existing billing blocks silent overwrite** — assign without `apply_company_billing: true` will not replace a prior `company_billing_addresses` row.
3. **Company match is exact after normalize** — “Acme AG” ≠ “Acme” in `ensureCompanyForInvoice`; a near-miss creates a second company.
4. **Private fill needs profile address** — empty `users.street/zip/city` leaves Privatadresse thin until the profile is completed.
5. **PDF placeholder email** — invoice email `keine e-mail` is treated as missing and replaced from the user/company resolve path.
6. **Partial remaining balance** — separate runbook on open docs PR (`PARTIAL_PAYMENT_INVOICING.md`); this doc is address selection only.

---

## Codepaths

- `components/PriceDisplay.vue` — Privat / Firma / suggest / `ensureCompanyForInvoice`
- `utils/billing-address-map.ts` — field mapping + `billingLooksLikeCompany`
- `server/utils/billing-from-company.ts` — `resolveStudentBillingAddress`, `upsertBillingFromCompany`
- `server/utils/invoice-billing-snapshot.ts` — `applyMissingInvoiceBilling`, `pdfBillingFields`, `invoicePersonNames`
- `server/api/admin/companies.ts` — list/search/create
- `server/api/admin/companies/assign-user.post.ts`
- `server/utils/invoice-persist-and-send.ts`, `server/api/invoices/{create,download,resend}.post.ts`
