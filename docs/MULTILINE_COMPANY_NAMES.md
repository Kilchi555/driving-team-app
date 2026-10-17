# Multiline company names (search, invoices, PDFs)

**When to use:** Admin company search misses names that wrap with Enter; invoice / correspondence envelope window overlaps street under a long name; Swiss QR debtor shows a broken line; debugging #223 / `billing-address-map` / `pdf-window-company-name`.

Verified against source (Sep 2026). Merge `be5fda1f` (#223).

Related: invoice PDF + Swiss QR slip layout (`invoice-pdf.ts`, `swiss-qr.ts`); not payment amounts or Wallee.

---

## Intent

Swiss creditors often need a **two-line** company name on the envelope window (e.g. `Schweizerische Bundesbahn` + `SBB Kreditoren Infrastruktur`). #223 keeps intentional line breaks in storage and UI, while **search**, **list titles**, and **Swiss QR debtor** always use a single flattened line.

---

## Contract

### Normalization helpers (`utils/billing-address-map.ts`)

| Helper | Behavior |
|--------|----------|
| `normalizeMultilineCompanyName` | Canonical storage/display: CRLF/`\r`/Unicode separators → `\n`; strip other C0 controls; trim edges; **keep** intentional LF |
| `flattenCompanyName` | Newlines → spaces; collapse runs of spaces — for search, QR, single-line titles |
| `snapshotBillingCompanyName` | `normalize…` then empty → `null` (invoice / company writes) |
| `companyNameMatchesSearch(stored, query)` | Flatten both; case-insensitive **substring**; empty query → `false` (callers skip the filter). Query spaces stay spaces — `%` / `_` are **literal**, not SQL wildcards |

### Surfaces

| Surface | Rule |
|---------|------|
| Admin companies form / billing address modal | `<textarea rows="2">` — Enter = line break; hint “Enter = Zeile umbrechen” |
| Admin list / invoice modals | `whitespace-pre-line` so stored LF renders as wrap |
| `GET/POST /api/admin/companies` | Writes via `snapshotBillingCompanyName`. Search: ILIKE prefilter on **first flattened token** (escaped `%`/`_`), then JS `companyNameMatchesSearch` is source of truth |
| Client-side company filter (`pages/admin/companies.vue`) | Same `companyNameMatchesSearch` / `flattenCompanyName` |
| Invoice / correspondence create & update | Persist `billing_company_name` via `snapshotBillingCompanyName` (`invoices/create`, `admin/invoice-save`, `staff/update-invoice`, `invoice-persist-and-send`) |
| Envelope window PDF | `drawWindowCompanyName` measures height, caps so street + city stay in the C5/C6 window, returns `nextY` for street |
| Swiss QR «Zahlbar durch» | `invoiceQrDebtorName` / invoice-pdf debtor use **`flattenCompanyName`** — single line only (`swiss-qr` `pad()` also strips newlines) |

### PDF window layout (`server/utils/pdf-window-company-name.ts`)

- Font: `Helvetica-Bold` 11pt (`WINDOW_COMPANY_NAME_*`).
- `measureWindowCompanyNameHeight` ≥ 14pt floor.
- `drawWindowCompanyName` reserves street/city blocks; does **not** mutate stored name.

---

## Pitfalls

1. **Turning query spaces into SQL `%`** — spaces are not wildcards; only the first flattened token is used for ILIKE candidate narrowing.
2. **Expecting ILIKE alone to match across a stored newline** — DB sees `Line1\nLine2`; match correctness is the JS flatten filter after the prefilter.
3. **Feeding multiline names into Swiss QR / SPS fields** — always flatten; QR payload must stay single-line.
4. **Hard-coding a fixed Y for street under the window name** — use `drawWindowCompanyName(…).nextY`; tall names push the street down (capped by window bottom).
5. **Replacing `<textarea>` with a single-line `<input>`** — drops intentional LF on edit.
6. **Global `* 100` or payment helpers** — unrelated; this runbook is naming/layout only.

---

## Codepaths

| Path | Notes |
|------|-------|
| `utils/billing-address-map.ts` | Normalize / flatten / search / snapshot |
| `server/api/admin/companies.ts` | Tenant-scoped list + ILIKE prefilter + JS match; create/update name snapshot |
| `server/utils/pdf-window-company-name.ts` | Envelope window measure + draw |
| `server/utils/invoice-pdf.ts` / `correspondence-pdf.ts` | Window name + flattened QR debtor |
| `server/utils/invoice-billing-snapshot.ts` | `invoiceQrDebtorName` |
| `server/utils/swiss-qr.ts` | `pad()` strips newlines in QR string fields |
| `components/BillingAddressEditModal.vue`, `pages/admin/companies.vue` | Textarea + search |
| `server/utils/__tests__/billing-address-map.test.ts` | Flatten / search / `%` `_` literal cases |
| `server/utils/__tests__/pdf-window-company-name.test.ts` | Height cap / nextY |
| `server/utils/__tests__/invoice-billing-snapshot.test.ts` | QR debtor flatten |
| `server/utils/__tests__/swiss-qr.test.ts` | Debtor newline → space |

---

## Quick verify

```bash
npx vitest run \
  server/utils/__tests__/billing-address-map.test.ts \
  server/utils/__tests__/pdf-window-company-name.test.ts \
  server/utils/__tests__/invoice-billing-snapshot.test.ts \
  server/utils/__tests__/swiss-qr.test.ts
```
