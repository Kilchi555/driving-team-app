# SMS Overage Waiver (Kulanz)

**When to use:** A goodwill tenant should not pay Stripe SMS overage for a while, paid SMS must resume after a date, or `/api/admin/sms-usage` shows waived overage cost as `0`.

Related (broader quota/metering): when `docs/SMS_QUOTA.md` is merged from the open docs PR, fold this runbook into that page and keep a short pointer here or delete this file.

---

## Intent

Tenants have a monthly included SMS segment allotment. Segments above that normally meter to Stripe. **Kulanz** skips Stripe overage reporting while still sending and logging SMS:

| Policy field | Effect |
|--------------|--------|
| `booking_policy.sms_overage_waived === true` | Indefinite waiver (prefer clearing this when paid overage is desired) |
| `booking_policy.sms_overage_waived_until` | ISO date `YYYY-MM-DD` (or full timestamp) — waived through **end of that UTC day** (inclusive) |

`isSmsOverageWaived(policy, now)` is true if **either** flag applies.

---

## Billing behavior while waived

In `sendTenantSMS`:

1. `overageWaived = isSmsOverageWaived(policy)`
2. `canBillOverage = !overageWaived && stripe_subscription_id && stripe_customer_id`
3. Overage segment deltas are **not** reported to Stripe when waived (info log instead)
4. Hard-stop (`sms_hard_stop_on_quota`) is independent — waiver does **not** disable hard-stop
5. Quota alerts still run; estimated overage CHF in the alert path uses the normal rate for messaging, while the usage snapshot zeroes billed cost when waived

### Usage API

`GET /api/admin/sms-usage` returns:

- `usage.overageCostChf` — `0` when currently waived (`getTenantSmsQuotaSnapshot`)
- `policy.sms_overage_waived` — **effective** boolean from `isSmsOverageWaived` (not the raw indefinite flag alone)
- `policy.sms_overage_waived_until` — raw date string from policy (or `null`)

---

## How to set / clear (ops)

There is **no** dedicated toggle in the admin profile UI today (only `sms_hard_stop_on_quota` and channel toggles). Set via SQL / service-role update on `tenants.booking_policy` JSON, or by POSTing the fields through `POST /api/admin/booking-policy` (merge-all body — fields are typed on GET defaults).

**Time-bound kulanz (preferred):**

```sql
-- Waive through end of 2026-09-30 UTC, then resume Stripe overage
UPDATE public.tenants
SET booking_policy = booking_policy
  || jsonb_build_object(
    'sms_overage_waived', false,
    'sms_overage_waived_until', '2026-09-30'
  )
WHERE id = '<tenant-uuid>';
```

**Indefinite (legacy):** set `sms_overage_waived` to `true` and clear `sms_overage_waived_until`. Clear the boolean when the tenant opts into paid overage.

**Resume immediately:** set `sms_overage_waived` to `false` and `sms_overage_waived_until` to `null` (or a past date).

---

## Pitfalls

1. **Prefer `sms_overage_waived_until`** — indefinite `sms_overage_waived: true` is easy to forget; comments on the policy type say to clear it when paid SMS resumes.
2. **Date is UTC end-of-day** — `2026-09-30` stays waived until `2026-09-30T23:59:59.999Z`, not Zurich local midnight.
3. **Usage API field name** — response `policy.sms_overage_waived` means “waived **right now**”, even if only `_until` is set.
4. **Waiver ≠ free unlimited SMS under hard-stop** — if `sms_hard_stop_on_quota` is true, sends still stop at the included allotment.
5. **No UI** — ops must update `booking_policy` carefully; a full-policy POST from the profile page can overwrite JSON if the client omits unknown keys (profile currently keeps defaults from GET merge).

---

## Codepaths

- `server/utils/sms-quota.ts` (`isSmsOverageWaived`, `getTenantSmsQuotaSnapshot`)
- `server/utils/sms.ts` (`sendTenantSMS` overage / Stripe branch)
- `server/api/admin/booking-policy.get.ts` (defaults + field docs)
- `server/api/admin/booking-policy.post.ts` (JSON merge)
- `server/api/admin/sms-usage.get.ts`
