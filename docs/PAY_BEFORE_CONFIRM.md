# Pay-before-confirm (Wallee online booking holds)

**When to use:** Admin enabled “Zahlung vor Bestätigung”; booking stays `pending` forever or vanishes after ~10 minutes; Wallee charged full price despite voucher/credit; invoice/cash unexpectedly held; confirmation email only after TWINT; recovery cron Phase 5 counts.

Verified against source (Aug 2026). Complements `WALLEE_PAYMENT_RECOVERY.md` (stuck *payments*). This page covers **appointment holds** gated by booking policy.

---

## Intent

When `booking_policy.require_payment_before_confirm` is true, online Wallee bookings stay **`pending` until money is captured** (or authorized). Unpaid holds expire after **10 minutes** and release the slot. Invoice/cash still confirm immediately. Default remains **off**.

Also documents charging Wallee only the **remaining** amount after voucher/gift-card discount and wallet credit (same checkout path).

---

## Setting

| Key | Storage | Default |
|-----|---------|---------|
| `require_payment_before_confirm` | `tenants.booking_policy` JSON | `false` |

- Admin toggle: `pages/admin/booking-policy.vue`
- Read/merge: `GET /api/admin/booking-policy`, `POST /api/admin/booking-policy` (boolean validation)
- Public: `GET /api/booking/get-booking-init` → `bookingPolicy.require_payment_before_confirm`
- UI copy on wizard when on: “Zuerst zahlen, dann bestätigt…”; **cash tip is hidden** (`!requirePaymentBeforeConfirm`)

---

## Hold decision

`shouldHoldAppointmentUntilPaid` in `server/utils/pay-before-confirm.ts`:

```
hold = requirePaymentBeforeConfirm
    && paymentMethod === 'wallee'
    && amountRappen > 0
```

| Method | Held? |
|--------|-------|
| `wallee` + remaining > 0 | Yes → appointment `pending`, payment `metadata.pay_before_confirm: true` |
| `invoice` / `cash` | No — confirm immediately |
| Remaining `0` (full voucher/credit) | No — promote pending → `confirmed` |

Constant: `PAY_BEFORE_CONFIRM_HOLD_MINUTES = 10`

---

## Booking → checkout → confirm / release

```
create-appointment / guest-book
  resolve discount → net amount
  optional wallet credit → remainingDue
  mayHoldUntilPaid (policy + wallee method)
  insert appointment status pending|confirmed
  insert payment (+ pay_before_confirm metadata)
  recompute hold from remainingDue
  if hold: require tenants.wallee_enabled + customer email
           createWalleeCheckoutForPayment (charges remainingDueRappen)
           return paymentUrl / requires_payment

Wallee webhook (completed|authorized)
  update appointment pending → confirmed|scheduled
  on completed: dispatchAppointmentConfirmation (+ Meta CAPI helpers)
  on failed|cancelled: releaseUnpaidPendingAppointment

Recovery cron /api/cron/recover-pending-wallee-payments
  Phase 1: confirmHeldAppointmentAfterPayment on recovered txs
  Phase 5: releaseExpiredUnpaidPendingAppointments()
```

Release rules (`canReleaseUnpaidHold`):

- Must have at least one payment with `metadata.pay_before_confirm === true`
- Must **not** release if any related payment is `completed` \| `authorized` \| `processing`
- On release: cancel appointment + pending payments, void open Wallee tx, free `availability_slots`, queue recalc

---

## Remaining amount after voucher / credit

Same path as ordinary online booking; critical for holds because hold uses **post-credit** remaining.

1. **Discount / gift card** — `resolveAppointmentDiscount` (server-trusted; never client amount). Sources: `voucher_code` \| `gift_card` \| `discount`. Net via `netAfterAppointmentDiscount`. Caps at lesson + admin + travel.
2. **Wallet credit** — `applyRequestedStudentCredit` / `applyStudentCreditToPayments`; due via `remainingDueRappen(payment)` = `total − credit_used − (partial amount_paid)`.
3. **Wallee line item** — `createWalleeCheckoutForPayment` charges `remainingDueRappen(...)`; refuses if `amountRappen <= 0` (`Kein Betrag zur Onlinezahlung`).
4. Gift-card consume on webhook completed: `consumeGiftCardForPayment`.

If credit apply fails while `mayHoldUntilPaid`, booking is released and returns 500 (`Guthaben konnte nicht verrechnet werden`).

---

## Pitfalls

1. **Default off** — Existing tenants keep immediate confirm until an admin flips the toggle.
2. **Invoice still immediate** — Policy does not hold invoice/cash; only Wallee with remaining > 0.
3. **Full credit/voucher** — Remaining 0 confirms without redirect; do not expect a payment URL.
4. **Wallee disabled / no email** — Hold path returns 402 / 400 and **releases** the pending appointment (slot freed).
5. **10-minute expiry** — Phase 5 cancels `status=pending` + `source=online` older than 10m **only** when `canReleaseUnpaidHold` (metadata flag). Staff-created pending leftovers without the flag are **not** auto-cancelled.
6. **Confirmation timing** — Customer confirmation email is deferred until webhook/cron marks completed (not at insert).
7. **Return URL open-redirect** — `safeCheckoutReturnUrl` allows only `NUXT_PUBLIC_APP_URL` / `https://app.simy.ch` origin.
8. **Do not charge gross** — Checkout must use `remainingDueRappen` after discount + credit; charging `total_amount_rappen` double-bills.

---

## Smoke test

1. Toggle `require_payment_before_confirm` on a tenant with Wallee enabled.
2. Book online with card → appointment `pending`, payment metadata `pay_before_confirm: true`, redirect to Wallee for **net** amount.
3. Complete payment → appointment `confirmed` + confirmation email.
4. Abandon checkout → within ~10–20 min (cron) appointment `cancelled`, slot free; `phase5_unpaid_holds_released` increments.
5. Apply voucher/credit covering part → Wallee amount equals remaining; covering all → confirmed, no checkout.
6. Choose invoice (if enabled) → confirmed immediately even with policy on.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/pay-before-confirm.ts` | Hold / release predicates |
| `server/utils/wallee-appointment-checkout.ts` | Checkout, `confirmHeldAppointmentAfterPayment`, `releaseUnpaidPendingAppointment`, Phase 5 helper |
| `server/utils/resolve-appointment-discount.ts` | Server-side voucher/gift/discount |
| `server/utils/apply-student-credit.ts` | `remainingDueRappen`, wallet apply |
| `server/api/booking/create-appointment.post.ts` | Logged-in online book + hold |
| `server/api/booking/guest-book.post.ts` | Guest book + hold |
| `server/api/wallee/webhook.post.ts` | Confirm on success; release on fail |
| `server/api/cron/recover-pending-wallee-payments.get.ts` | Phase 1 confirm + Phase 5 expiry |
| `pages/admin/booking-policy.vue` | Admin toggle |
| `server/utils/__tests__/pay-before-confirm.test.ts` | Unit matrix |
