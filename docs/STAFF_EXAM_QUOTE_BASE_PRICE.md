# Staff exam quote → category base_price fallback

**When to use:** Staff saves an `exam` appointment and gets `NO_PRICE_RULE` / HTTP **503** even though the license category has a normal lesson `base_price` rule; exam priced as 0 incorrectly; debugging #227.

Verified against source (Sep 2026). Merge `5b9dd1dd` (#227), on top of staff server quote (#218).

Related but separate:

- Full staff server-quote contract (#218) — draft `STAFF_APPOINTMENT_SERVER_QUOTE` on docs PR #225. **Fold this addendum into that runbook when #225 rebases/merges.**
- Public slot-bound pricing (#213) — same `resolveOfferPrice` engine; public booking does not use staff exam fallback unless the same hint path runs.
- Unmerged overlay-authority work (#201/#220) — does not change this fallback.

---

## Intent

Driving-school exams are usually priced like lessons (`base_price` × duration). An optional `rule_type='exam'` row still wins when present. When no exam row exists, `resolveOfferPrice` must fall back to the **same tenant + category** `base_price` rule instead of failing closed.

---

## Contract

Precedence inside `resolveOfferPrice` (paid offers):

1. Active `event_price` for `(tenant, event_type_code)`
2. Category rule for `ruleTypeHint` (`exam` when `staffRuleTypeHint('exam')`)
3. **If hint is `exam` and step 2 missed:** category `base_price` for the same `categoryCode` (#227)
4. Else if `require_payment === false` → free (do **not** inherit category price)
5. Else → unpriced → `throwIfUnpriced` → staff save **503**

`staffRuleTypeHint` still returns `'exam'` for event type code `exam` so an explicit exam rule is preferred when it exists.

```text
event_type_code = exam
  + categoryCode set
  + require_payment
  + no event_price
  + no rule_type=exam
  + category base_price exists
→ paid quote from base_price (not NO_PRICE_RULE)
```

---

## Pitfalls

1. **Missing category on the appointment** — fallback needs `categoryCode`; without it, exam with no exam/event_price row still fails closed.
2. **Expecting free exam without `require_payment=false`** — paid exams without any category price remain unpriced.
3. **Theory/consultation do not get this fallback** — only `hint === 'exam'`.
4. **Client-planted prices** — still ignored on save (#218); this only widens **server** rule resolution.

---

## Codepaths

| Path | Notes |
|------|-------|
| `server/utils/resolve-offer-price.ts` | Step 2b exam → `base_price` |
| `server/utils/quote-staff-appointment.ts` | `staffRuleTypeHint('exam')` + docs on fallback |
| `POST /api/appointments/save` | Uses `quoteStaffAppointmentOffer` |
| `server/utils/__tests__/resolve-offer-price.test.ts` | Fallback cases |
| `server/utils/__tests__/quote-staff-appointment.test.ts` | Staff wrapper |
| `server/utils/__tests__/staff-appointment-save-price.http.test.ts` | Save HTTP |
