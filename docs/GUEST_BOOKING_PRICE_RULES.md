# Guest / online booking price rules

**When to use:** Guest checkout completes at CHF 0 for a normal Fahrstunde; attacker-style `service_type=beratung` or swapped `category_code` undercharges a reserved slot; per-event-type tenants (mental coach / consulting) show wrong prices; free Erstgespräch / discovery should be CHF 0 but paid lessons must not; preview shows 0 while checkout returns 503.

Verified against source (Sep 2026). Commits `6010dc07` (#119), `0a87a6fc` (#120). Related CHF-0 *completion* guards live in draft `SUSPICIOUS_ZERO_PAYMENTS` (docs PR #133) — this runbook is about **how the sticker price is chosen** before insert.

---

## Intent

Public and guest booking must price from the **correct** `pricing_rules` row for the reserved slot — never from “any active rule for the category” (consultation / admin_fee rows are often CHF 0). After #119/#120:

1. Slot guest checkout only books **Fahrstunden**; spoofed Theorie/Beratung `service_type` is rejected.
2. Client `category_code` must match the reserved slot’s category when both are present.
3. Prefer category `base_price`; fall back to per-event-type `event_price`.
4. **Intentional** free public events (`event_types.require_payment = false` and `public_bookable !== false`) may book at CHF 0 with no pricing row.
5. Missing or zero `base_price` for a driving lesson aborts checkout (503) — do not silently insert a free lesson.

---

## Contract

### Rule types

| `pricing_rules.rule_type` | Used when |
|---------------------------|-----------|
| `base_price` | Practical lesson for a license category (`category_code`) |
| `theory` / `consultation` | Mapped from room service type — **not** allowed on slot guest checkout |
| `event_price` | Per-event-type tenants; keyed by `event_type_code` (often the same string the UI sends as `category_code`) |
| `admin_fee` | Separate row; applied for FS category bookings only (skipped for `event_price` / free public events) |

Helpers in `server/utils/guest-booking-price-rule.ts`:

| Helper | Behavior |
|--------|----------|
| `guestBookingPriceRuleType(serviceType)` | `theorie` → `theory`, `beratung` → `consultation`, else `base_price` |
| `normalizeGuestSlotServiceType` | Slot guest path: only `fahrstunde` / empty / null OK; else `spoofed_non_lesson_service` |
| `guestSlotCategoryMismatchReason` | Slot vs body `category_code` must match when both non-empty |
| `invalidPersistedLessonPricingReason` | Persisted practical lesson must not be priced via `consultation` / `theory` |
| `invalidDrivingLessonBasePriceReason` | For `base_price` only: require positive ppm unless `allowFreePublicEvent` |

### Free public event

```
freePublicEvent =
  event_types row for body.category_code exists
  AND require_payment === false
  AND public_bookable !== false
```

Effects:

- Missing pricing rule is allowed (price stays 0).
- `invalidDrivingLessonBasePriceReason` is skipped via `allowFreePublicEvent`.
- Admin fee calculation is skipped (no category fee rows for these flows).
- Authenticated `create-appointment` may stamp payment metadata with `free_public_event` / `allow_zero_completion`.

Signup seeds free catalog items via register `free_event` toggle → `require_payment = false` (often **no** `event_price` row by design).

### Surfaces

| API | Pricing behavior |
|-----|------------------|
| `POST /api/booking/guest-book` | Full guards above; no rule + not free → **503** |
| `POST /api/booking/create-appointment` | Same rule preference + free-public-event + base-price validation |
| `POST /api/booking/preview-price` | `base_price` then `event_price`; **if neither**, returns success with **0** totals (UI preview only — does not abort) |

---

## Pitfalls

1. **“Any active rule for category”** — Loading the first active `pricing_rules` row for a category often hits consultation / admin_fee at CHF 0. Always filter by `rule_type` (`base_price` / `event_price` / …).
2. **Spoofed `service_type` on slot checkout** — Guest UI routes Theorie/Beratung through the proposal form. Accepting `beratung`/`theorie` on `guest-book` would price from CHF-0 rules while still consuming a driving slot. Server returns 400 `INVALID_SERVICE_TYPE`.
3. **Category swap under a hold** — Holding a B-slot while posting a cheaper/free `category_code` is rejected (`category_slot_mismatch`) when both codes are present.
4. **Preview CHF 0 vs checkout 503** — `preview-price` returns zeros when no rule exists; `guest-book` / `create-appointment` fail closed unless `freePublicEvent`. Treat preview 0 as “unknown / free UI”, not “confirmed free lesson”.
5. **CHF 0 after voucher/wallet is OK** — Netting to zero via discount/credit is allowed. Abort only when the **base** driving rule is missing or itself priced at ≤ 0 (and it is not a free public event).
6. **Do not confuse with suspicious zero-completion** — Cron / process guards that block *completing* unexpected CHF-0 payments are separate (docs PR #133). Free public events opt into `allow_zero_completion` on purpose.

---

## Ops checks

```sql
-- Category has consultation/admin_fee but no usable base_price (classic silent CHF-0)
SELECT category_code, rule_type, price_per_minute_rappen, is_active
FROM pricing_rules
WHERE tenant_id = 'TENANT_UUID'
  AND category_code = 'B'
ORDER BY rule_type, created_at DESC;

-- Free public event types (intentional CHF 0)
SELECT code, require_payment, public_bookable, is_active
FROM event_types
WHERE tenant_id = 'TENANT_UUID'
  AND require_payment = false
  AND public_bookable IS DISTINCT FROM false;
```

Unit coverage: `server/utils/__tests__/guest-booking-price-rule.test.ts`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/guest-booking-price-rule.ts` | Rule-type map, spoofing / mismatch / base-price guards |
| `server/api/booking/guest-book.post.ts` | Guest slot checkout pricing + free public event |
| `server/api/booking/create-appointment.post.ts` | Authenticated / online appointment pricing (same rules) |
| `server/api/booking/preview-price.post.ts` | UI preview (`base_price` → `event_price`; empty → 0) |
| `server/api/booking/get-pricing.post.ts` | Related pricing fetch (includes `event_price`) |
| `pricing_rules` / `event_types` | Canonical price + free-event flags |
| `server/utils/zero-payment-completion.ts` | Separate completion guard (see #133 runbook) |
