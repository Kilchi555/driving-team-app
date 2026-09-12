# SMS overage price on Stripe Checkout (Basil)

**When to use:** Upgrade / subscribe Checkout returns **502** mentioning a metered price; SMS overage never attaches to new subscriptions; usage reporting silently skips; test-mode Checkout fails while live price IDs sit in env.

Verified against source (Aug 2026). Distinct from tenant **waiver** flags (`sms_overage_waived*`) — those skip usage reports after the item exists.

Cross-link when merged: SMS quota / overage waiver runbooks on older doc PRs.

---

## Intent

Stripe API **2025-03-31.basil+** cannot attach a legacy `usage_type=metered` price that has **no Billing Meter**. Checkout Session creation fails hard if that price is added as a line item.

Simy still wants SMS overage on the subscription **when** the configured price is Basil-compatible. Otherwise checkout must proceed **without** the SMS line (plan still sells).

---

## Contract

Env / price resolution: `getSmsOveragePriceId()` → typically `STRIPE_PRICE_ADDON_SMS_OVERAGE`.

| Helper | Behavior |
|--------|----------|
| `smsOverageCheckoutLineItem()` | Returns `{ price }` if env set — **unsafe** alone on Basil |
| `isBasilCompatibleRecurringPrice(price)` | `false` when `usage_type === 'metered'` and `recurring.meter` missing |
| `smsOverageCheckoutLineItemSafe()` | Retrieves price in **current** Stripe mode; skips line if missing or incompatible; logs warning |
| `getSmsMeterEventName()` | Prefers `STRIPE_SMS_METER_EVENT_NAME`, else meter linked on the price |
| `reportSmsOverageUsage()` | No-ops (warn) if no event name — does not throw into SMS send path |

### Surfaces

| Surface | Behavior |
|---------|----------|
| `POST /api/stripe/create-checkout-session` | Adds SMS line only via `smsOverageCheckoutLineItemSafe()` |
| `POST /api/stripe/update-subscription` | Retrieves SMS price; clears id if not Basil-compatible before `itemUpdates` |
| Upgrade UI | Shows overage CHF/segment copy; does not itself validate Stripe meter linkage |

---

## Pitfalls

1. **Legacy metered price in env** — Checkout 502 before the safe helper existed. Fix: create/link a Billing Meter on the price **or** point env at a licensed/metered+meter price; until then safe helper omits the line.
2. **Test vs live mismatch** — `STRIPE_SECRET_KEY=sk_test_…` with a live `price_…` → retrieve fails → line skipped (warn). Symptoms: “subscription works but no SMS overage item”.
3. **Waiver ≠ meter** — Waiving overage charges does not fix Checkout; meter compatibility is separate.
4. **Reporting still needs a meter** — Even after checkout without SMS line, later `reportSmsOverageUsage` needs `STRIPE_SMS_METER_EVENT_NAME` or a meter on the price; otherwise overage is never billed.
5. **Do not reintroduce raw `smsOverageCheckoutLineItem()` in Checkout** — Only the safe variant belongs on Session create.

---

## Ops checks

```bash
# Confirm price has a meter (Dashboard → Product catalog → price → Billing meter)
# Or set explicit event name:
# STRIPE_SMS_METER_EVENT_NAME=...

# Server logs to expect when skipping:
# "Skipping SMS overage checkout line — metered price has no Billing Meter (Basil)"
# "Skipping SMS overage checkout line — price not available in current Stripe mode"
```

Unit coverage: `server/utils/__tests__/sms-stripe.test.ts` (`isBasilCompatibleRecurringPrice`).

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/sms-stripe.ts` | Safe checkout line, Basil check, meter events |
| `server/api/stripe/create-checkout-session.post.ts` | Checkout Session line items |
| `server/api/stripe/update-subscription.post.ts` | Attach/skip SMS item on plan changes |
| `utils/planFeatures.ts` | `getSmsOveragePriceId()` |
| `pages/upgrade.vue` | Plan/SMS overage marketing copy |
