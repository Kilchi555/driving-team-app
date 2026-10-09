# Staff appointment server quote

**When to use:** Staff calendar saves the wrong lesson price; client-planted `basePriceRappen` / totals stick; paid event with no pricing rule still inserts; vehicle/room surcharge comes from the browser; debugging #218.

Verified against source (Sep 2026). Merge `e105afc7` (#218).

Related but separate:

- Public slot-bound offer identity + `resolveOfferPrice` — `PUBLIC_SLOT_OFFER_PRICING` / #213 (docs PR #221). Same price engine; staff has **no** reserved `availability_slots` row.
- Draft Phase-1 staff lesson-price authority (#201) and follow-ups (#220) — may extend overlay authority; this runbook documents **what is on `main` after #218**.
- Wallee charge after wallet credit — `WALLEE_WALLET_CREDIT_INTEGRITY` / #224.
- Suspicious CHF-0 *completion* guards (docs PR #133) — post-insert completion, not staff quote-on-save.

---

## Intent

Staff create/edit via `POST /api/appointments/save` must:

1. Quote the **lesson/offer price on the server** from authenticated appointment identity (`tenant`, `event_type_code`, optional category `type`, `duration_minutes`, `start_time`).
2. Ignore client `basePriceRappen` / `totalAmountRappenForPayment` for the offer base and resulting totals.
3. Fail closed when a **paid** offer has no usable pricing rule (`NO_PRICE_RULE`, HTTP **503**) — **no** appointment/payment insert.
4. Keep intentional free events (`require_payment=false`) at lesson 0 with **no** payment row.
5. Quote vehicle/room surcharge from tenant-scoped DB rows, never from client `resourceSurcharges[].rappen`.

One engine: `resolveOfferPrice` (same as public booking). Staff wraps it in `quoteStaffAppointmentOffer`.

---

## Contract

### Identity (no public slot)

```text
staffOfferIdentityFromAppointment({
  tenantId,          // caller tenant (super_admin may use appointment tenant)
  eventTypeCode,     // appointmentData.event_type_code
  categoryCode,      // appointmentData.type (license class when set)
  durationMinutes,
  startTime,
})
```

`staffRuleTypeHint(eventTypeCode)`:

| Event type code | `ruleTypeHint` |
|-----------------|----------------|
| `theory` | `theory` |
| `consultation` | `consultation` |
| `exam` | `exam` |
| anything else | `base_price` |

### Quote → payment composition

1. `quoteStaffAppointmentOffer` → `resolveOfferPrice` + `throwIfUnpriced`.
2. `quoteStaffResourceSurcharge` → vehicle/room hourly / lesson tiers for the appointment duration.
3. `composeStaffPaymentFromOffer(quote, overlays)`:
   - **Server:** `lessonPriceRappen`, `resourceSurchargeRappen`
   - **Still client-supplied in #218:** admin fee, products, discount, credit used
   - `totalAmountRappen = max(0, lesson + admin + products + resource − discount)`
   - `remainingAmountRappen = max(0, total − credit)`

Free offer (`kind: free` / `require_payment=false`): lesson 0; save path skips creating a payment row.

### Follow-on writers (do **not** re-quote the offer)

These recompose amounts from the **persisted** `lesson_price_rappen` via `staffQuoteFromPersistedLesson` + `composeStaffPaymentFromOffer`:

| Surface | Role |
|---------|------|
| `POST /api/appointments/update-payment-with-products` | Product line changes |
| `POST /api/appointments/apply-discount` | Discount / gift overlays |
| `POST /api/staff/update-payment` | Staff payment edits (resource surcharge re-quoted when vehicle/room present) |

Do **not** use `staffQuoteFromPersistedLesson` to invent a new offer price — it only wraps an already-saved lesson amount.

---

## Surfaces

| API / util | Role |
|------------|------|
| `POST /api/appointments/save` | Primary: quote before any appointment/payment write |
| `server/utils/quote-staff-appointment.ts` | Identity, offer quote, payment composition |
| `server/utils/quote-staff-resource-surcharge.ts` | Vehicle/room surcharge from DB |
| `server/utils/resolve-offer-price.ts` | Shared public/staff price engine |
| `components/EventModal.vue` / `composables/useEventModalForm.ts` | UI still shows estimates; server is authoritative on save |

---

## Pitfalls

1. **Trusting EventModal sticker price** — Display can differ; persist uses server quote only.
2. **Planting `basePriceRappen` in the client** — Ignored for lesson/total authority on save.
3. **Missing paid rule → silent free lesson** — Save returns **503** `NO_PRICE_RULE`; nothing is written.
4. **Client resource surcharge arrays** — Overwritten by `quoteStaffResourceSurcharge`.
5. **Re-quoting on product/discount endpoints** — Those use persisted lesson; change duration/event type via **save** to get a fresh offer quote.
6. **Confusing with public slot bind** — Staff has no `availability_slots` hold; category comes from appointment `type`, not slot `category_code`.
7. **Open #201 / #220** — Overlay fields may become more server-authoritative later; do not document unmerged PR behavior here.

---

## Ops checks

```sql
-- Active rules for a tenant (newest wins in resolveOfferPrice)
SELECT id, rule_type, event_type_code, category_code, price_rappen, price_per_minute_rappen,
       valid_from, is_active, created_at
FROM pricing_rules
WHERE tenant_id = 'TENANT_UUID'
  AND is_active = true
ORDER BY rule_type, event_type_code NULLS LAST, category_code NULLS LAST, valid_from DESC NULLS LAST, created_at DESC;

-- Event types that must be free vs paid
SELECT code, require_payment, is_active, public_bookable
FROM event_types
WHERE tenant_id = 'TENANT_UUID'
ORDER BY code;
```

Manual smoke:

1. Paid staff lesson (e.g. category B, 45 min): payment `lesson_price_rappen` matches rule, not a planted client amount.
2. Edit duration 45 → 90: lesson/total update from server quote.
3. Paid type with no rule: **503**, no rows.
4. Vacation / `require_payment=false`: appointment ok, no payment row.

---

## Codepaths

- `server/api/appointments/save.post.ts` — quote + compose before create/edit writes
- `server/utils/quote-staff-appointment.ts` — `quoteStaffAppointmentOffer`, `composeStaffPaymentFromOffer`, `staffQuoteFromPersistedLesson`
- `server/utils/quote-staff-resource-surcharge.ts`
- `server/utils/resolve-offer-price.ts` — shared engine with public booking
- Tests: `server/utils/__tests__/quote-staff-appointment.test.ts`, `staff-appointment-save-price.http.test.ts`, `quote-staff-resource-surcharge.test.ts`
