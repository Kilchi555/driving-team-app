# Public slot offer pricing (identity bind)

**When to use:** Online booking shows the wrong sticker price after a slot hold; preview succeeds at CHF 0 while checkout fails (or the reverse); client sends `category_code` / `event_type_code` that do not match the reserved slot; catalog mixes license classes and public event types; debugging #213.

Verified against source (Sep 2026). Merge `600bff28` (#213).

Related but separate:

- Draft `GUEST_BOOKING_PRICE_RULES` (docs PR #161, #119/#120) — older rule-type / spoofing helpers still used for `service_type` on guest slot checkout.
- Staff calendar pricing authority (open PRs #201 / #218 / #220) — not this runbook.
- Suspicious CHF-0 *completion* guards (docs PR #133) — post-insert payment completion, not offer selection.

---

## Intent

Public preview / guest / authenticated slot checkout must:

1. Derive the **canonical offer identity from the reserved `availability_slots` row**, not from client-chosen codes alone.
2. Treat client `event_type_code` / `category_code` / `appointment_type` as a **consistency assertion** — mismatch is rejected (`400`), never silently overwritten.
3. Price from one server resolver (`resolveOfferPrice`) with fail-closed missing paid rules (`503`).
4. Keep catalog rows honest: license categories and public event types may share a picker UI, but identity fields stay separate (`_source`, `category_code`, `event_type_code`).

---

## Contract

### Slot → identity

`availability_slots` stores only `category_code` (no `event_type_code` column). That field is overloaded:

| Slot `category_code` | Canonical identity |
|----------------------|--------------------|
| Matches an active tenant `event_types.code` | `eventTypeCode = slot code`, `categoryCode = null` (`slot_event_type`) |
| License class (e.g. `B`) and tenant has `lesson` | `eventTypeCode = lesson`, `categoryCode = slot code` (`slot_category_lesson`) |
| Otherwise | Unresolved → `400` `EVENT_TYPE_UNRESOLVED` |

Implemented in `deriveCanonicalSlotOfferIdentity` → `bindPublicSlotOfferIdentity`.

After identity is resolved, the event type must be **active + `public_bookable = true`**, else `400` `EVENT_TYPE_NOT_PUBLIC`.

### Client mismatch

`slotOfferIdentityMismatchReason` requires **exact** equality of both `eventTypeCode` and `categoryCode` (null must match null). Empty client fields are **not** a skip.

| Error `data.code` | HTTP | Meaning |
|-------------------|------|---------|
| `EVENT_TYPE_UNRESOLVED` | 400 | Slot/client cannot map to an event type |
| `CATEGORY_SLOT_MISMATCH` | 400 | Client offer ≠ reserved slot |
| `EVENT_TYPE_NOT_PUBLIC` | 400 | Event type not publicly bookable |
| `NO_PRICE_RULE` | 503 | Paid offer has no usable pricing rule |
| `INVALID_SERVICE_TYPE` | 400 | Guest slot path: spoofed non-lesson `service_type` (still via `normalizeGuestSlotServiceType`) |

### Price precedence (`resolveOfferPrice`)

One offer identity → one price. Never silently return CHF 0 for an unpriced **paid** offer.

1. Active `pricing_rules.rule_type = event_price` for `(tenant, event_type_code)` (newest `valid_from` / `created_at`).
2. Else if the event type requires payment (or is unknown) **and** `categoryCode` is set: category rule (`ruleTypeHint`, default `base_price`).
3. Else if `event_types.require_payment === false`: `kind: free` (do **not** inherit a category price).
4. Else `kind: unpriced` → callers use `throwIfUnpriced` → **503**.

Public booking APIs pass `ruleTypeHint: 'base_price'`.

### Preview vs checkout (post-#213)

`POST /api/booking/preview-price`, `guest-book`, and `create-appointment` all call `bindPublicSlotOfferIdentity` + `resolveOfferPrice` + `throwIfUnpriced`.

**Preview no longer returns success + `price_rappen: 0` for a missing paid rule.** That older behavior (documented in draft #161) is retired for these three surfaces.

Intentional free offers still preview/checkout at 0 via `kind: free` (`require_payment=false`).

### Public catalog (`get-booking-init`)

`selectPublicBookingCatalog` is **not** keyed by `business_type`:

1. Usable categories exist → catalog = category tree (`_source: category`).
2. Else public bookable event types → catalog = those rows (`_source: event_type`).
3. Else empty / not bookable.

Client payload helper: `publicBookingPayloadFromSelection` — event-type rows send `event_type_code`; license classes send `category_code`.

Legacy helper `selectPublicBookingCatalogLegacyByBusinessType` is characterization-only — do not use for new behavior.

---

## Surfaces

| API / UI | Role |
|----------|------|
| `POST /api/booking/preview-price` | Slot bind + offer price + admin fee / vehicle add-ons |
| `POST /api/booking/guest-book` | Same bind/price; plus guest `service_type` lesson-only guard |
| `POST /api/booking/create-appointment` | Authenticated public/slot path — same bind/price |
| `GET /api/booking/get-booking-init` | Catalog via `selectPublicBookingCatalog` |
| `pages/booking/availability/[slug].vue` | Sends payload from `publicBookingPayloadFromSelection` |
| `components/CategorySelector.vue` / `EventModal.vue` | Catalog `_source` / identity fields |

---

## Pitfalls

1. **Trusting client `category_code` alone** — After a hold, price and persist from the **slot** identity. Client codes only assert consistency.
2. **Overloading one field as both category and event type** — Keep `event_type_code` and `category_code` separate; use `_source` on catalog items.
3. **Assuming preview soft-fails to 0** — Missing paid rules are **503** on preview too. UI must treat that as “cannot book”, not “free lesson”.
4. **Free public event + category `base_price`** — `require_payment=false` returns free and must **not** inherit category pricing (step 3 before falling through).
5. **Multiple active rules** — Resolver picks newest by `valid_from` then `created_at` and logs a warning; clean up duplicate active rows in ops.
6. **Guest Theorie/Beratung on slot checkout** — Still rejected via `normalizeGuestSlotServiceType` (`INVALID_SERVICE_TYPE`); those flows use the proposal UI.
7. **Staff EventModal pricing** — Open staff-authority work is separate; do not assume #213 changed staff persist pricing.

---

## Ops checks

```sql
-- Slot identity overload: is this code a license class or an event type?
SELECT code, public_bookable, require_payment, is_active
FROM event_types
WHERE tenant_id = 'TENANT_UUID'
  AND is_active = true
ORDER BY code;

-- Paid lesson category rule
SELECT id, category_code, event_type_code, rule_type, price_per_minute_rappen, valid_from, is_active
FROM pricing_rules
WHERE tenant_id = 'TENANT_UUID'
  AND rule_type IN ('base_price', 'event_price')
  AND is_active = true
ORDER BY rule_type, valid_from DESC NULLS LAST, created_at DESC;
```

Unit / HTTP contracts:

- `server/utils/__tests__/bind-public-slot-offer.test.ts`
- `server/utils/__tests__/booking-offer-identity.test.ts`
- `server/utils/__tests__/resolve-offer-price.test.ts`
- `server/utils/__tests__/public-slot-offer-bind.http.test.ts`
- `server/utils/__tests__/select-public-booking-catalog.test.ts`
- `server/utils/__tests__/booking-offer-price.characterization.test.ts`

---

## Codepaths

| Path | Role |
|------|------|
| `utils/booking-offer-identity.ts` | Infer / derive / mismatch / client payload |
| `server/utils/resolve-booking-offer-identity.ts` | `bindPublicSlotOfferIdentity` + public_bookable check |
| `server/utils/resolve-offer-price.ts` | Authoritative sticker price |
| `server/utils/select-public-booking-catalog.ts` | Init catalog selection |
| `server/utils/parse-price-chf.ts` | CHF parsing helpers used by booking |
| `server/utils/guest-booking-price-rule.ts` | Guest `service_type` + persistence sanity (not the main resolver) |
| `server/api/booking/preview-price.post.ts` | Preview surface |
| `server/api/booking/guest-book.post.ts` | Guest checkout |
| `server/api/booking/create-appointment.post.ts` | Authenticated slot checkout |
| `server/api/booking/get-booking-init.get.ts` | Catalog bootstrap |
