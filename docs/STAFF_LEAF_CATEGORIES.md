# Staff profile leaf categories

**When to use:** Staff can save parent category codes (`B`, main `A`) that never match availability slots; debugging `users.category`, StaffSettings checkboxes, or `POST /api/staff/update-profile`; understanding #278 / `category-leaf`.

Verified against source (Sep 2026). Merge `f192e29d` (#278).

Related: category **groups** for admin fees / appointment counting (`resolveCategoryGroup` in `category-groups.ts`) — different concern. Slot generation still loads **subcategories only** (`parent_category_id` set) in `availability-calculator`; childless mains saved on the profile are not expanded into children at match time.

---

## Intent

Staff teach **leaf** topics (subcategories and mains that have no children). Availability slots are keyed by those leaf codes. Storing a parent that already has children (e.g. `B` when `B Automatik` / `B Schaltung` exist) never matches a slot.

#278 makes the profile picker and the update API share one leaf rule so parents-with-children cannot be persisted.

---

## Contract

### Leaf definition (`utils/category-leaf.ts`)

A row is a **leaf** when **no other row in the candidate set** points at it via `parent_category_id`.

- Resolution is by **category id**, not code: codes like `A` and `C` can exist as both a main and a subcategory.
- Childless mains (`BE`, `Boot`, `D`) are leaves and remain selectable.
- Empty selection is allowed (`[]`).

| Helper | Behavior |
|--------|----------|
| `filterLeafCategories(rows)` | Drop any id that appears as another row’s `parent_category_id` |
| `selectPersistableLeafCodes(requested, categories, tenantId)` | Accept only **active** leaf **codes** for that tenant; reject unknown / inactive / foreign / parent-with-children; dedupe + sort (`de` locale) |
| `dedupeSortedCategoryCodes(codes)` | Unique + sorted codes for stable writes |

Whole-write rejection: if any requested code fails, **none** of the category list is saved (`ok: false` + German `statusMessage`).

### Surfaces

| Surface | Rule |
|---------|------|
| StaffSettings profile picker | Checkbox list = `filterLeafCategories` of the tenant catalog; not every category row |
| Stale stored codes | Amber hint lists codes on the profile that are no longer selectable; **save** drops them (client filters to allowed leaves before POST) |
| `POST /api/staff/update-profile` | If `category` is present: must be `string[]`; empty → `[]`; non-empty → load active tenant categories, then `selectPersistableLeafCodes` → 400 on failure |
| Existing DB values | Untouched until the staff saves; legacy parent codes can remain until then |
| Availability match | Leaf-only: slot category code must appear in `users.category` (no parent→child expansion). Calculator loads subcategory rows for slot dimensions |

### Auth / scope

- Endpoint: `requireAdminProfile` with roles `admin`, `staff`, `superadmin`, `super_admin`.
- Category lookup is scoped to `profile.tenant_id` and `is_active = true`.

---

## Pitfalls

1. **Matching by code alone for leaf-ness** — use ids. Main `A` (id 23) is not a leaf when sub `A` (id 59) exists; the sub is.
2. **Expecting parent `B` to unlock all B-* slots** — it does not. Staff must store the leaf codes they teach.
3. **Re-binding the picker to `allCategories`** — regresses #278; tests assert the leaf import + `filterLeafCategories(rows)`.
4. **Confusing with `resolveCategoryGroup`** — that expands siblings/parent for fees/counting; profile persistence is leaf-only.
5. **Assuming calculator loads childless mains as slot dimensions** — `loadCategories` filters `.not('parent_category_id', 'is', null)`. Childless mains on the profile matter for other filters, not as generated slot category rows from that loader.
6. **Partial accept on mixed parent + leaf** — e.g. `['B', 'B Automatik']` → 400 for the whole write.

---

## Codepaths

| Path | Notes |
|------|-------|
| `utils/category-leaf.ts` | Shared leaf filter + persist decision |
| `server/utils/category-groups.ts` | Re-exports `filterLeafCategories` for website/invoice callers |
| `components/StaffSettings.vue` | Leaf picker, stale-code warning, save filters to allowed codes |
| `server/api/staff/update-profile.post.ts` | Server-side leaf validation on `category` |
| `server/services/availability-calculator.ts` | Leaf-only staff↔slot match comment + logic |
| `utils/__tests__/category-leaf.test.ts` | Leaf filter, persist rules, StaffSettings source guards |
| `server/utils/__tests__/staff-update-profile-category.http.test.ts` | HTTP handler accept/reject cases |

Also consume `filterLeafCategories` (display catalogs, not staff profile write): `server/api/website/init-data.get.ts`, `server/utils/website-services.ts`, `server/utils/invoice-line-templates.ts`, `server/api/website/media/suggest-hero.post.ts`.

---

## Quick verify

```bash
npx vitest run \
  utils/__tests__/category-leaf.test.ts \
  server/utils/__tests__/staff-update-profile-category.http.test.ts
```
