# Staff Discounts & First-Lesson Promos

**When to use:** Enabling free-amount staff discounts, reviewing usage history, or debugging first-lesson promo codes on public booking links.

---

## Intent

Two related discount surfaces:

1. **Staff manual discounts** — opt-in free-amount + note (e.g. paper vouchers), gated by booking policy.
2. **Promo codes / first-lesson codes** — public booking `?code=` preview for guests; hard enforcement at appointment creation after identity is known.

---

## 1. Staff manual discounts (opt-in)

### Policy

Stored on `tenants.booking_policy.staff_manual_discount_permission`:

| Value | Behavior |
|-------|----------|
| `hidden` (default) | Staff UI hides free-amount entry; API rejects manual amounts for non-admins |
| `allowed` | Staff may enter a free amount + reason |

Admins (`admin`, `tenant_admin`, `super_admin` / `superadmin`) always bypass the gate.

**Configure in UI:** Admin → Profile → Buchungsrichtlinien → “Manuelle Rabatte für Staff”.

**APIs:**

- `GET/POST /api/admin/booking-policy` — read/write policy (includes `staff_manual_discount_permission`)
- Enforcement helper: `server/utils/staff-manual-discount.ts` → `assertStaffCanApplyManualDiscount`

### Enforcement points

Manual discounts are rejected with `403` (`Manuelle Rabatte sind für Staff nicht aktiviert.`) when the policy is not `allowed`:

| Endpoint | How “manual” is detected |
|----------|--------------------------|
| `POST /api/appointments/save` | Body flag `isManualDiscount` + `discountAmountRappen > 0` |
| `POST /api/discounts/check-and-save` | Body `discountData.is_manual_discount` + amount > 0 |
| `POST /api/discounts/save` | Same pattern for staff-applied free amounts |

Code / preset discounts skip the check (`isManualDiscount === false`).

### UI surfaces

- `components/PriceDisplay.vue` — loads booking policy; shows free-amount controls only when allowed (or caller is admin)
- `components/ProductSaleModal.vue` — same policy gate for product sales
- `components/EventModal.vue` / `composables/useEventModalForm.ts` — appointment save path

### Usage history (“Verwendet”)

| Layer | Path |
|-------|------|
| Page | `pages/admin/discounts.vue` (tab **Verwendet**) |
| API | `GET /api/admin/discount-usage` |
| Table | `discount_sales` (tenant-scoped, `discount_amount_rappen > 0`) |

**Query params (selected):** `search`, `discount_type`, `status`, `kind` (`all` \| `manual` \| `code`), `date_from`, `date_to`, `sort_by`, `sort_dir`, `page`, `page_size` (max 100).

**Kind heuristic:** reason matching `/^Code:/i` → `code`; otherwise `manual`.

Auth: `requireAdminProfile` roles `admin`, `staff`, `superadmin`, `super_admin`.

---

## 2. First-lesson promo codes (guest preview)

### Guest preview vs hard check

| Stage | Endpoint / page | Behavior for `first_lesson_only` |
|-------|-----------------|----------------------------------|
| Price preview | `POST /api/discounts/validate` | Guests (no auth) may preview the discount. Logged-in users with existing `confirmed`/`completed` appointments are rejected. |
| Booking create | `POST /api/booking/create-appointment` | Hard check: after insert, count of `confirmed`/`completed` appointments for the user must be `≤ 1`. |
| Public UI | `pages/booking/availability/[slug].vue` | Reads `?code=` and shows discounted duration prices via validate. |

**Constraint:** Never trust guest preview alone — eligibility is re-validated server-side when the appointment is created.

### Staff promo booking links

`GET /api/staff/get-discounts?with_code=1` returns active discounts that have a non-empty `code`, filtered to:

- Tenant-wide (`staff_id` null) **or** assigned to the calling staff member
- Within `valid_from` / `valid_until` when set

Staff Links sheet (`components/StaffSettings.vue`) auto-lists these as booking URLs with `?code=...`.

Default (no `with_code`) still returns fixed-type discounts for the event modal.

---

## Common pitfalls

1. **Staff cannot enter a free amount** → policy is `hidden` (default). Enable under Buchungsrichtlinien, or use an admin account.
2. **Manual discount API 403 despite UI** → client must send `isManualDiscount` / `is_manual_discount`; server re-checks policy.
3. **Guest sees promo, then loses it at checkout** → user already has a confirmed/completed appointment; first-lesson hard check failed.
4. **Promo missing from Staff Links** → code empty, inactive, expired, or `staff_id` assigned to someone else.
5. **Usage tab empty but discounts applied** → rows need `discount_amount_rappen > 0` in `discount_sales`; code rows should use a `Code:` reason prefix for `kind=code` filtering.

---

## Related

- Proposed (outdated) architecture notes: `CREDIT_VOUCHER_DISCOUNT_ARCHITECTURE.md` — do not treat as current behavior.
