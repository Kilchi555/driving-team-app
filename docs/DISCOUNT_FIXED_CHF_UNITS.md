# Discount fixed-value units (CHF vs rappen)

**When to use:** Wallee charges ~1/100 of an expected fixed discount (e.g. CHF 190 code → CHF 1.90 off); shop/course totals look 100× too high after a voucher; debugging #246 / `discount-amount.ts`.

Verified against source (Sep 2026). Merge `79030db4` (#246).

Related but separate: staff appointment server quote (#218), Wallee remaining-after-credit (#224), payments JWT write closure (#232). This runbook is **source-aware unit conversion** only.

---

## Intent

Checkout money math mixed two storage conventions:

| Source table / shape | `discount_type === 'fixed'` value unit |
|----------------------|----------------------------------------|
| `discounts.discount_value` | **CHF** (major units) |
| `voucher_codes.discount_value` | **rappen** (minor units) |
| Gift card `vouchers.amount_rappen` (mapped as fixed) | **rappen** |

Treating `discounts.fixed` as rappen under-charged Wallee (CHF 190 → 190 rappen = CHF 1.90). #246 centralizes conversion in `server/utils/discount-amount.ts` and wires course enroll, public payment process, shop create-payment, and appointment discount resolve through it.

**Never apply a global `* 100` to every discount source.**

---

## Contract

### `discountKindForSource(source, discountType)`

| `discountType` | Kind (any source) |
|----------------|-------------------|
| `percentage` | `percentage` |
| `free_lesson` / `free_product` | `free_lesson` |
| other + `source === 'discount'` | `fixed_chf` |
| other + `voucher_code` / `gift_card` | `fixed_rappen` |

### `computeDiscountAmountRappen` / `payableAfterSourceDiscount`

- `fixed_chf`: `round(value * 100)` rappen, then clamp to base / optional `max_discount_rappen`.
- `fixed_rappen`: `round(value)` rappen (no ×100).
- `percentage`: percent of base rappen.
- `free_lesson`: full base.
- Payable path also returns `walleeAmountIncludingTax` as **CHF major units** (`rappen / 100`) for Wallee line amounts.

Client-supplied `amount` / `discountAmountRappen` must not control the payable; server recomputes from DB row + source.

### Example (course / public checkout)

Base CHF 240 (`24000` rappen), code from `discounts` with `fixed` / `190`:

| Step | Value |
|------|-------|
| Discount rappen | `19000` |
| Final rappen | `5000` |
| Wallee amount | `50` (not `238.1`, not `1.9`) |

Same numeric `190` from `voucher_codes` would be wrong — vouchers store `19000` for CHF 190.

---

## Wired surfaces

| Path | Helper |
|------|--------|
| `server/api/courses/enroll-wallee.post.ts` | Resolves voucher_codes → gift card → discounts; `payableAfterSourceDiscount` |
| `server/api/payments/process-public.post.ts` | Same lookup order + payable helper |
| `server/api/shop/create-payment.post.ts` | `discountKindForSource` + `computeDiscountAmountRappen` |
| `server/utils/resolve-appointment-discount.ts` | Appointment booking: `discounts.fixed` → `fixed_chf` |

Lookup order on course/public paths (first hit wins): `voucher_codes` → unredeemed gift-card voucher → `discounts`.

---

## Pitfalls

1. **Assuming all `discount_value` columns are rappen** — only true for voucher_codes / gift cards; `discounts` fixed is CHF.
2. **Global ×100 “to be safe”** — breaks voucher_codes (`19000` → CHF 190_000).
3. **Trusting client discount amounts** — payable is recomputed server-side from the matched row.
4. **Confusing Wallee major CHF with rappen** — `walleeAmountIncludingTaxChf` is major units for the gateway.
5. **CSV / older audits** — `docs/DATABASE_TABLES.csv` lists `discount_value` without units; see the CHF note there + this runbook.

---

## Codepaths

| Path | Notes |
|------|-------|
| `server/utils/discount-amount.ts` | Kind mapping + rappen/CHF math |
| `server/utils/__tests__/discount-amount.test.ts` | CHF 190 / voucher 19000 / percentage / cap cases |
| `server/utils/__tests__/discount-source-wiring.test.ts` | Asserts enroll / process-public / shop import the helpers |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/discount-amount.test.ts server/utils/__tests__/discount-source-wiring.test.ts
```
