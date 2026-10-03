# Multi-Category Discount Filters

**When to use:** A promo works for one category but not another, ERSTE30 / Automatik+Schaltung codes fail validation, or staff promo deep-links preselect the wrong booking category.

---

## Intent

`discounts.category_filter` restricts which appointment category codes a discount applies to. Filters are stored as a **single string**:

| Stored value | Meaning |
|--------------|---------|
| `null` / `''` / `'all'` | All categories |
| `'B Automatik'` | Exact match (case-insensitive) |
| `'B Automatik,B Schaltung'` | Match **any** listed code (comma-separated) |

Matching and parsing live in one util so booking, validate, apply-discount, and by-category listing stay consistent.

---

## Contract

### Parse / match

```ts
parseDiscountCategoryFilter(filter) → string[] | null   // null = unrestricted
matchesDiscountCategoryFilter(filter, categoryCode) → boolean
primaryCategoryForDiscountFilter(filter) → string | null  // promo deep-link preselect
```

- Empty / missing `categoryCode` fails a restricted filter (does **not** match).
- Comparison is trim + case-insensitive.
- Multi-code promo links: if every code shares the same parent token before the first space (e.g. `B Automatik` + `B Schaltung` → `B`), that parent is used as `?category=`; otherwise the **first** code is used.

### Where it is enforced

| Surface | Behavior |
|---------|----------|
| `POST /api/discounts/validate` | Rejects with «Gutschein gilt nicht für diese Kategorie» |
| `POST /api/booking/create-appointment` | Re-checks against `body.category_code` before applying amount |
| `POST /api/appointments/apply-discount` | For lesson payments: loads appointment `type` and matches filter |
| `GET /api/discounts/by-category/:categoryCode` | Returns only discounts that match the route category |

### Editor & seed data

- Driving-school editor: `components/DiscountEditorModal.vue` — preset options include combined `B Automatik,B Schaltung`. Non–driving-school tenants clear `category_filter` on save.
- Example seed: `sql_migrations/20260810_erste30_first_lesson_discount.sql` sets ERSTE30 to `B Automatik,B Schaltung` + `first_lesson_only`.

### Promo booking deep-links

Staff / admin link sheets build `?code=CODE&category=…` from the filter:

- `components/StaffSettings.vue` → `primaryCategoryFromFilter` (local mirror of the util)
- `components/admin/AdminPortalLinks.vue` → same parent/first-code heuristic

Links come from `GET /api/staff/get-discounts?with_code=1`.

---

## Pitfalls

1. **Code `B` ≠ `B Automatik`** — exact string match only; a filter of `B` does not accept `B Automatik`.
2. **Guest preview vs checkout** — validate may show a discount for the selected category; create-appointment re-runs the filter against the booked `category_code`.
3. **Promo `?category=` is a preselect, not the filter** — multi-category discounts still validate against the actual booked category; the deep-link only picks a starting category for the UI.
4. **Whitespace / casing** — stored codes should match appointment `type` / booking `category_code` after trim; matching is case-insensitive but spelling must match.
5. **Apply-discount path** — category check runs only when the payment is a lesson payment with `appointment_id` (product-only flows skip that branch).

---

## Codepaths

- `server/utils/discount-category-filter.ts`
- `server/api/discounts/validate.post.ts`
- `server/api/discounts/by-category/[categoryCode].get.ts`
- `server/api/booking/create-appointment.post.ts`
- `server/api/appointments/apply-discount.post.ts`
- `server/api/staff/get-discounts.get.ts`
- `components/DiscountEditorModal.vue`
- `components/StaffSettings.vue`
- `components/admin/AdminPortalLinks.vue`
- `sql_migrations/20260810_erste30_first_lesson_discount.sql`
