# Suspicious CHF-0 payments + guest pricing

**When to use:** Guest booking completes at CHF 0; `/api/payments/process` returns `SUSPICIOUS_ZERO_PAYMENT`; free public events (Erstgespräch); daily ops alert for zero-priced online lessons; wrong `pricing_rules` row loaded.

Verified against source (Sep 2026). Commits `6010dc07` (#119), `0a87a6fc` (#120), `52932ed1` (#121).

---

## Intent

Two layers stop the “online Fahrstunde booked free because the wrong pricing rule was CHF 0” amp:

1. **Booking-time** — pick the correct `pricing_rules.rule_type`, reject spoofed service types / missing base price, allow intentional free public events.
2. **Process-time + daily cron** — refuse to mark a payment completed at CHF 0 without a documented benefit; email ops about residual rows.

---

## Guest / create booking price rules

`server/utils/guest-booking-price-rule.ts`:

| Helper | Behavior |
|--------|----------|
| `guestBookingPriceRuleType(serviceType)` | `theorie` → `theory`; `beratung` → `consultation`; else `base_price` |
| `normalizeGuestSlotServiceType` | Slot checkout (`guest-book`) only accepts `fahrstunde`. `beratung`/`theorie` → `spoofed_non_lesson_service` (those flows use the proposal form) |
| `guestSlotCategoryMismatchReason` | Body `category_code` must match the reserved slot category |
| `invalidPersistedLessonPricingReason` | Practical `event_type_code` must not be priced with consultation/theory rules |
| `invalidDrivingLessonBasePriceReason` | For `base_price`: require a rule with `price_per_minute > 0`, unless `allowFreePublicEvent` |

Also supported: per-event-type `event_price` rows and free public events (below). Preview pricing (`preview-price`) loads `event_price` for those tenants.

---

## Free public events

An event type is a free public event when it is `public_bookable` and `require_payment === false` (e.g. discovery / Erstgespräch with no `event_price` row by design).

Booking then sets payment metadata:

```json
{ "free_public_event": true, "allow_zero_completion": true }
```

Wallet-covered or voucher/discount zeros may set `allow_zero_completion` without `free_public_event`. Surfaces: `guest-book`, `create-appointment`.

---

## Process-time guard

`suspiciousZeroPaymentCompletionReason` runs in `POST /api/payments/process` when `finalAmountToPay <= 0`.

**Allowed (returns null):**

- Wallet credit covering the due amount (`creditToDeduct` + already used > 0)
- Discount or voucher > 0
- `payment_method === 'free'`
- Metadata `free_public_event` or `allow_zero_completion`

**Blocked (422 `SUSPICIOUS_ZERO_PAYMENT`):**

| Reason code | Meaning |
|-------------|---------|
| `zero_due_without_credit` | Positive total but zero-due path without credit |
| `zero_lesson_without_benefit` | Lesson + total 0, no discount/voucher/credit/allow flag |
| `zero_total_without_benefit` | Total 0 without documented benefit |

On block: unlock `processing` → `pending`, write `fallback:suspicious-zero-payment-block` via `logFallbackUsed`, audit `process_payment_suspicious_zero`.

---

## Daily cron

`GET /api/cron/detect-suspicious-zero-payments`

| Item | Value |
|------|-------|
| Schedule | `30 6 * * *` UTC (`vercel.json`) |
| Auth | `x-vercel-cron: 1` or `Authorization: Bearer $CRON_SECRET` |
| Lookback | 48 hours |
| Match | `lesson_price_rappen = 0` and `total_amount_rappen = 0`, online non-cancelled practical (or completed credit with no credit used), not “documented free” |
| Dedup | Prior **cron digest** rows only (`error_logs.component = fallback:suspicious-zero-payment`, `data.alert_channel = cron_digest`) — not process-time blocks |
| Email | Attempted first; digest marker written only after successful send (failed mail retries next run) |

Dashboard hint in alerts: `https://app.simy.ch/tenant-admin/errors`.

---

## Pitfalls

- Loading “any active pricing rule for category” often hits a CHF-0 consultation / admin_fee row — always filter by `rule_type` from `guestBookingPriceRuleType`.
- Do not accept client `service_type=beratung` on slot guest-book; that was the classic spoof.
- Intentional free events **must** stamp metadata, or process + cron will treat them as suspicious.
- Process-time block ≠ cron digest: a blocked process still needs staff to fix amount; cron catches rows that slipped in earlier or via other paths.
- Amounts are **rappen** (CHF × 100) in helpers and DB columns.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/guest-booking-price-rule.ts` | Rule type + spoof / base-price guards |
| `server/utils/zero-payment-completion.ts` | Process-time allow/deny |
| `server/api/booking/guest-book.post.ts` | Guest checkout pricing + free-event metadata |
| `server/api/booking/create-appointment.post.ts` | Staff/public create pricing + metadata |
| `server/api/booking/preview-price.post.ts` | Preview incl. `event_price` |
| `server/api/payments/process.post.ts` | Completes or 422 on suspicious zero |
| `server/api/cron/detect-suspicious-zero-payments.get.ts` | Daily digest |
| `server/utils/__tests__/guest-booking-price-rule.test.ts` | Booking pricing tests |
| `server/utils/__tests__/zero-payment-completion.test.ts` | Process guard tests |
| `vercel.json` | Cron schedule |
