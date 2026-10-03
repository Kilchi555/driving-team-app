# Wallet and discount atomic RPCs

**When to use:** Double-spend of student credit; usage_count exceeding limit; gift card wallet redeem vs checkout race; missing RPC / PostgREST schema cache causing silent partial updates.

Verified against source (Aug 2026). Migrations `20260826_wallet_atomic_ops.sql`, `20260828_giftcard_reserve_payments_rls.sql`. Commit `131945b7` (#89).

---

## Intent

All balance and usage mutations that matter for money go through **SECURITY DEFINER RPCs** granted only to `service_role`. TypeScript wrappers in `wallet-atomic.ts` map SQL errors to typed failures and **fail closed** when an increment RPC is missing (no client-side counter bump).

---

## Contract

### Student credit

| RPC | Behavior |
|-----|----------|
| `deduct_student_credit` | Subtracts only if `balance - pending_withdrawal >= amount`; else `insufficient_available_credit` |
| `increment_balance` | Adds (or creates row); negative add without row → insufficient |
| `add_pending_withdrawal` | Freezes amount into `pending_withdrawal_rappen` with same available check |

TS: `deductStudentCredit`, `incrementStudentCredit`, `addPendingWithdrawal` → throw `InsufficientAvailableCreditError` on insufficient.

### Catalog usage (promo codes)

| RPC | Behavior |
|-----|----------|
| `increment_discount_usage` | +1 if under `usage_limit` (or unlimited); returns `false` if capped |
| `increment_voucher_code_redemption` | Same for `voucher_codes.current_redemptions` / `max_redemptions` |
| `decrement_*` | Soft undo (≥ 0); used when releasing a claimed checkout benefit |

Missing increment RPC → wrapper returns `false` (checkout treat as unavailable). Do **not** fall back to a non-atomic `UPDATE usage_count = usage_count + 1` from the app.

### Gift card → wallet

| RPC | Behavior |
|-----|----------|
| `redeem_gift_card_for_wallet` | Marks voucher redeemed **only if unreserved**; credits `student_credits`; raises `held_by_other` / `already_redeemed` |
| `redeem_promo_for_wallet` | Promo credit path used by `/api/vouchers/redeem` |

TS: `redeemGiftCardForWallet` / `redeemPromoForWallet` → `VoucherRedeemError` with German messages.

---

## Surfaces

| Surface | Uses |
|---------|------|
| Booking / course checkout credit apply | `deductStudentCredit` |
| `POST /api/vouchers/redeem` | `redeemGiftCardForWallet` / `redeemPromoForWallet` / `incrementStudentCredit` |
| `lockCheckoutBenefits` (catalog branch) | `incrementDiscountUsageAtomic` / `incrementVoucherCodeRedemptionAtomic` |
| Payment cancel/fail trigger | SQL `decrement_*` + gift release (see gift-card runbook) |

---

## Pitfalls

1. **Available ≠ balance** — Pending withdrawals reduce spendable credit. Deduct/withdraw RPCs enforce this; raw `balance_rappen` reads in UI can look higher than spendable.
2. **Fail closed on missing RPC** — If migrations are not applied in an environment, discount lock fails rather than racing. Deploy SQL before relying on gift/discount checkout.
3. **service_role only** — `REVOKE` from `PUBLIC`/`anon`/`authenticated`. Browser clients must never call these RPCs directly.
4. **Gift redeem vs reserve** — Wallet redeem while another payment holds the card fails with held message; see [GIFT_CARD_CHECKOUT_RESERVE.md](./GIFT_CARD_CHECKOUT_RESERVE.md).
5. **Course Wallee enroll** — Mixes gift consume + `deductStudentCredit`; insufficient credit must abort that branch without leaving a half-applied discount.

---

## Smoke test

1. Student with 50 CHF balance and 20 CHF pending withdrawal → deduct 40 CHF fails; deduct 30 CHF succeeds.
2. Discount with `usage_limit = 1` already used → `lockCheckoutBenefits` returns unavailable.
3. Redeem gift card to wallet while reserved for another payment → `VoucherRedeemError` held message.
4. Cancel pending payment that claimed a catalog code → `usage_count` decremented by trigger.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/wallet-atomic.ts` | TS wrappers + error mapping |
| `migrations/20260826_wallet_atomic_ops.sql` | Credit + increment usage RPCs |
| `migrations/20260828_giftcard_reserve_payments_rls.sql` | Redeem-to-wallet, decrement, grants |
| `server/api/vouchers/redeem.post.ts` | Wallet redeem API |
| `server/utils/checkout-benefits.ts` | Catalog claim via increment helpers |
| `server/utils/__tests__/wallet-atomic.test.ts` | Unit coverage |

Related: [GIFT_CARD_CHECKOUT_RESERVE.md](./GIFT_CARD_CHECKOUT_RESERVE.md).
