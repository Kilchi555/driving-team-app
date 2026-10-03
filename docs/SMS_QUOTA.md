# SMS Quota & Stripe Metering

**When to use:** Tenant reports missing SMS, unexpected overage, hard-stop 402s, quota alert emails, or Stripe SMS meter lines look wrong.

---

## Intent

Per-tenant **SMS segment quota** with optional **Stripe Billing Meter** overage:

1. Prefer `sendTenantSMS` for tenant traffic
2. Count Twilio-style segments → write `sms_logs`
3. Soft-cap by default (keep sending); hard-stop only if `booking_policy.sms_hard_stop_on_quota === true`
4. Report only segments **above** the included plan allotment to Stripe

---

## Quota math

| Concept | Behavior |
|---------|----------|
| Segments | GSM-7: 160 / 153 concat; UCS-2: 70 / 67 (`countSmsSegments`). Sends use `Math.max(1, …)`. |
| Billable | `sms_logs.billable` (default `true`). Usage = sum of `segment_count` where `billable=true` and `sent_at >=` period start. |
| Period | **UTC calendar month** via `getBillingPeriodStart()` — **not** Stripe `current_period_*`. |
| Included | trial/unknown **20**; starter **20**; professional **50**; enterprise **100** (`getIncludedSmsSegments`) |
| Overage rate | `SMS_OVERAGE_CHF_PER_SEGMENT = 0.15` (must match Stripe metered price) |
| Hard-stop | Throws `SmsQuotaExceededError` (`SMS_QUOTA_EXCEEDED`); callers map to **402** |
| Soft-cap / trial | Without `stripe_subscription_id` + `stripe_customer_id`, sends continue and count; overage is **not** reported (warn only) |
| Alerts | At 80% / 100% of included, once per UTC month (`tenant_settings.setting_key = 'sms_quota_alerts'`). Emails tenant `contact_email`, `role=super_admin` users, and `info@simy.ch`. |

Schema: `migrations/20260802_sms_quota.sql` (`segment_count`, `billable`, `tenants.stripe_sms_subscription_item_id`).

---

## Stripe integration

| Step | Where | Notes |
|------|-------|-------|
| Env | `STRIPE_PRICE_ADDON_SMS_OVERAGE`, optional `STRIPE_SMS_METER_EVENT_NAME` | See `apps/simy/.env.example` |
| Attach metered price | Checkout, subscription update, webhook caches `stripe_sms_subscription_item_id`, backfill API | Safe checkout skips price if missing in current mode |
| Report usage | `reportSmsOverageUsage` → `stripe.billing.meterEvents.create` | `value` = overage segment **delta**; idempotency from Twilio/`messageSid` |
| Failures | Fail-soft (warn, no throw) | SMS still succeeds |

Missing secret/price/meter → UI still shows overage estimate, but **nothing is billed**.

---

## Admin surfaces

| Surface | Path |
|---------|------|
| Usage API | `GET /api/admin/sms-usage` — roles `admin` \| `superadmin` \| `staff` |
| Billing UI | `/admin/billing` — used / included / overage |
| Policy UI | `/admin/profile` — SMS toggles, hard-stop, short/long preview |
| Upgrade copy | `/upgrade` — included segments + CHF 0.15 |
| SA tenant detail | `GET /api/admin/tenants/[id]` → `sms` snapshot |
| Backfill metered items | `POST /api/admin/backfill-sms-subscription-items` |
| Manual send | `POST /api/sms/send` — session tenant; quota applies |

### Deep links (quota alert emails)

Primary CTA: `{SITE}/login?returnTo=%2Fadmin%2Fbilling`

- `middleware/admin.ts` stores `redirect_after_login` and appends `returnTo`
- `pages/login.vue` `resolveReturnTo()` accepts same-origin paths starting with `/` (not `//`)

---

## Operational pitfalls

1. **Quota month ≠ Stripe invoice period** (UTC calendar month vs subscription cycle).
2. **GSM extended chars** (`€`, `|`, …) affect encoding choice but are **not** counted as 2 septets — can undercount vs Twilio.
3. **`sms_logs` insert failure** is non-critical: Stripe may meter that send while the next usage sum misses it → possible **double overage** later.
4. Usage query loads all billable rows for the month and sums in JS (scale risk).
5. Metering silent-skips if price/meter/env wrong.
6. **Raw `sendSMS` bypasses** quota/log/meter (outbound queue without `tenant_id`, some auth/affiliate OTP paths).
7. Role string inconsistency: usage API allows `superadmin`; alert query uses `super_admin`.
8. Dev mode mocks Twilio send but still logs and may attempt Stripe reporting.

---

## Codepaths

- `server/utils/sms-quota.ts`
- `server/utils/sms.ts` (`sendTenantSMS`, `maybeSendSmsQuotaAlert`)
- `server/utils/sms-stripe.ts`
- `server/utils/sms-templates.ts`
- `utils/planFeatures.ts`
- `server/api/admin/sms-usage.get.ts`
- `server/api/admin/backfill-sms-subscription-items.post.ts`
- `server/api/admin/booking-policy.get.ts` / `.post.ts` (`sms_hard_stop_on_quota`)
- `server/api/sms/send.post.ts`
- `server/api/stripe/create-checkout-session.post.ts`
- `server/api/stripe/update-subscription.post.ts`
- `server/api/stripe/webhook.post.ts`
- `pages/admin/billing.vue`
- `pages/admin/profile.vue`
- `pages/login.vue`
- `middleware/admin.ts`
- `migrations/20260802_sms_quota.sql`
