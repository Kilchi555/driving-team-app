# Invoice billing street number snapshots

**When to use:** New invoices show a blank or stale house number after picking a company or private customer; admin user search omits address columns; street lines duplicate the number; debugging #442 / `billing-address-map` party address helpers.

Verified against `main` after `6ad95519` (#442).

Related: multiline company **names** (#223 / open draft [`MULTILINE_COMPANY_NAMES`](https://github.com/Kilchi555/driving-team-app/pull/266)) — naming/layout only. This runbook is **house numbers on billing snapshots**, not company-name LF handling.

---

## Intent

Invoice create/edit must copy the party's current street + house number into `billing_street` / `billing_street_number` when an admin selects a company or private customer. Before #442, company search / Firmenkartei initial selection dropped `street_nr`, and private-customer search did not return address columns — so new invoices kept a blank or stale `billing_street_number`.

---

## Contract

### Party address snapshot (`utils/billing-address-map.ts`)

| Helper | Behavior |
|--------|----------|
| `invoicePartyAddress(party)` | Always replaces street, **house number**, zip, city. Maps `party.street_nr` → `billing_street_number`. `null`/missing number → `''` (clears a previous party's number). |
| `companyInvoiceSearchHit` / `initialCompanySelection` | Search/Firmenkartei hit includes `street_nr` from the company row via `invoicePartyAddress`. |
| `privateCustomerSearchHit` | Same for users; expects `street` / `street_nr` / `zip` / `city` on the API payload. |
| `resolveInvoiceStreetNumber` | Canonical `billing_street_number` wins when the key is present (including `''`). Legacy `billing_street_nr` is fallback **only** when the canonical key is absent. |
| `formatInvoiceStreetLine` / `joinStreetAndNumber` | Renders street + number; collapses duplicate person tokens; if the street's last token already equals the number (case-insensitive), does not append again. |

Selection in `InvoiceCreateModal` uses `Object.assign(formData, invoicePartyAddress(hit))` for both company and private hits — partial assign that leaves other billing fields alone but **always** overwrites the four address keys.

### Admin user search

`GET /api/admin/users/search` select list includes `street, street_nr, zip, city` (`USER_SEARCH_SELECT`). Without those columns, `privateCustomerSearchHit` cannot populate house numbers.

### Display

| Surface | Rule |
|---------|------|
| Invoice create summary / edit inputs | Bind `billing_street_number` (not a separate `street_nr` form field on create) |
| Invoice preview / detail customer line | `resolveInvoiceStreetNumber` + `formatInvoiceStreetLine` / `joinStreetAndNumber` |
| Explicit blank on an existing invoice | Keep blank — do **not** backfill from the linked company/user when the canonical column is present as `''` |

---

## Constraints & pitfalls

1. **Blank is intentional** — `invoicePartyAddress` clears the number when the selected party has none. Do not merge with the previous party's `billing_street_number`.
2. **Canonical empty vs missing** — `billing_street_number: ''` must not fall through to legacy `billing_street_nr` (`resolveInvoiceStreetNumber`).
3. **Search without address columns** — dropping `street_nr` from `USER_SEARCH_SELECT` (or company list payloads) recreates blank snapshots.
4. **Duplicated street tokens** — prefer `joinStreetAndNumber` / `formatInvoiceStreetLine`; concatenating `street + ' ' + number` duplicates when the street already ends with the number.
5. **Not company-name LF** — do not fold this into open #266; house numbers are orthogonal to multiline names.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/billing-address-map.ts` | `invoicePartyAddress`, search hits, `resolveInvoiceStreetNumber`, `formatInvoiceStreetLine`, `joinStreetAndNumber` |
| `server/api/admin/users/search.get.ts` | Returns address columns for private-customer hits |
| `components/admin/InvoiceCreateModal.vue` | Selection → `invoicePartyAddress`; Firmenkartei → `initialCompanySelection` |
| `components/InvoicePreviewModal.vue` | Preview/edit street line via resolve + join helpers |
| `components/admin/InvoiceDetailModal.vue` | Customer address display via `joinStreetAndNumber` / `formatInvoiceStreetLine` |
| `server/utils/__tests__/billing-address-map.test.ts` | Clear-on-switch, search hits, canonical vs legacy number |
| `server/utils/__tests__/admin-user-search-address.http.test.ts` | Search select includes address columns |
| `server/utils/__tests__/invoice-billing-snapshot.test.ts` | Snapshot street-number coverage |

---

## Quick verify

```bash
npx vitest run \
  server/utils/__tests__/billing-address-map.test.ts \
  server/utils/__tests__/admin-user-search-address.http.test.ts \
  server/utils/__tests__/invoice-billing-snapshot.test.ts
```
