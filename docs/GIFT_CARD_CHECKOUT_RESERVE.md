# Gift-card checkout reserve (fail closed)

**When to use:** Customer gets `DISCOUNT_UNAVAILABLE` / 409 after entering a Gutschein; same gift card appears in two concurrent checkouts; booking cancelled right after payment create; wallet redeem says card is held by another payment; code applied but charged full price.

Verified against source (Aug 2026). Commit `131945b7` (#89).

---

## Intent

A shop gift card (`vouchers` row) or catalog discount must be **locked to one payment** before Wallee/cash can charge a reduced amount. If the lock fails, checkout **must not** continue at a different (higher) amount — abort or delete the payment and return 409.

---

## Contract

### Two code families

| Source | Table | Lock mechanism |
|--------|-------|----------------|
| Shop gift card | `vouchers` | `reserve_gift_card_for_payment` → columns `reserved_for_payment_id`, `reserved_until` |
| Promo / catalog | `discounts` or `voucher_codes` | Atomic `increment_*` usage counters; metadata `discount_usage_claimed` |

`lockCheckoutBenefits` tries the gift-card RPC first. Statuses:

| RPC status | App result |
|------------|------------|
| `reserved` / `already_reserved` | OK (`kind: 'gift_card'`), marks `metadata.discount_usage_claimed` |
| `held_by_other` / `already_redeemed` | Fail closed with German reason |
| `not_found` | Fall through to catalog discount / `voucher_codes` increment |

TTL default **45 minutes** (clamped 5–180 in SQL). Same payment may re-reserve (`already_reserved`).

### Consume (after money is settled)

`consume_gift_card_for_payment` sets `redeemed_at`, clears reservation, deactivates the card. Callers: Wallee webhook, `payments/manage`, credit-apply helpers. Immediate redeem (`consumeGiftCardByCode` with `paymentId: null`) only succeeds if the card is **not** reserved.

### Wallet redeem vs checkout reserve

`redeem_gift_card_for_wallet` (student credits the card into their wallet) refuses active reservations (`held_by_other`). Customer must wait until the other checkout completes, cancels, or TTL expires.

### Client settlement lock

Trigger `trg_prevent_client_payment_mutation` blocks `role = client` from changing `payment_status`, `total_amount_rappen`, or `discount_amount_rappen` via authenticated/anon JWTs. Settlement stays on service_role paths.

---

## Surfaces

| Surface | On lock failure |
|---------|-----------------|
| `POST /api/booking/create-appointment` | `abortCheckoutAfterBenefitLockFail` → cancel payment **and** appointment → 409 `DISCOUNT_UNAVAILABLE` |
| `POST /api/booking/guest-book` | Same abort |
| `POST /api/payments/process-public` | Delete the just-created payment → 409 (no appointment abort) |
| `POST /api/appointments/apply-discount` | Return `{ isValid: false, error }` (no throw); release on later save failure |
| Payment `cancelled` / `failed` (from `pending`/`processing`) | DB trigger `trg_release_checkout_benefits` releases gift reservation + decrements claimed catalog usage |

Successful online settle still consumes via webhook/`manage` using `metadata.discount_code`.

---

## Pitfalls

1. **Fail closed means cancelled booking** — On create-appointment / guest-book, a held or redeemed code cancels the freshly created appointment. UI must surface the 409 reason, not retry as “pay full price with same code attached”.
2. **Race without reserve (pre-#89)** — Two checkouts could both price with the same gift card; one paid full after the other redeemed. Reserve + abort closes that window.
3. **TTL stuck hold** — Abandoned pending payments hold the card until `reserved_until` or cancel/fail. Ops: cancel the pending payment (trigger releases) or wait for TTL.
4. **Wallet redeem blocked during checkout** — Expected while another payment holds the card; not “already redeemed”.
5. **`not_found` is not always an error** — Missing gift-card row falls through to `discounts` / `voucher_codes`. Missing RPCs map to fail-closed for gift path (`held_by_other`-ish) or catalog increment false.
6. **Course enroll path** — `enroll-wallee` still uses immediate `consumeGiftCardByCode` in places; reserved cards from a parallel booking will not consume until released.
7. **Root `CREDIT_VOUCHER_DISCOUNT_ARCHITECTURE.md` is stale** — Prefer this runbook + `WALLET_ATOMIC_OPS.md` for current behavior.

---

## Smoke test

1. Apply a valid unused gift card on booking → payment metadata has `discount_code` + `discount_usage_claimed`; `vouchers.reserved_for_payment_id` set.
2. Second concurrent checkout with same code → 409 / German “gerade in einer anderen Zahlung”.
3. Cancel or fail the first pending payment → reservation cleared; second checkout can lock.
4. Complete Wallee payment → `redeemed_at` set, card inactive.
5. Client JWT update of `payment_status` / amounts → DB exception `clients_cannot_mutate_payment_settlement`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/checkout-benefits.ts` | Reserve / release / lock / abort / strip |
| `server/utils/consume-gift-card.ts` | Post-settle consume RPC wrapper |
| `migrations/20260828_giftcard_reserve_payments_rls.sql` | RPCs, reservation columns, release trigger, client mutation guard |
| `server/api/booking/create-appointment.post.ts` | Lock + abort on book |
| `server/api/booking/guest-book.post.ts` | Lock + abort on guest book |
| `server/api/payments/process-public.post.ts` | Lock + delete payment on fail |
| `server/api/appointments/apply-discount.post.ts` | Lock when applying code to existing payment |
| `server/api/wallee/webhook.post.ts` | Consume on successful settle |
| `server/api/payments/manage.post.ts` | Consume on manage complete |
| `server/utils/__tests__/checkout-benefits.test.ts` | Unit coverage |

Related: [WALLET_ATOMIC_OPS.md](./WALLET_ATOMIC_OPS.md), [WALLEE_PAYMENT_RECOVERY.md](./WALLEE_PAYMENT_RECOVERY.md) (pending cancel releases holds via trigger).
