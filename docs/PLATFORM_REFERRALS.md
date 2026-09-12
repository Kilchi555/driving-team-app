# Platform Tenant→Tenant Referrals (Simy SaaS)

**When to use:** Tenant asks why a Simy invite reward did not credit, registration `?ref=` did not stick, Stripe balance credit missing after the second invoice, or you need to distinguish this from the **client affiliate** program.

---

## Intent

Simy B2B referrals: an existing tenant invites another **tenant** to register on Simy. Separate from intra-tenant client affiliate (`affiliate_*` tables / `/affiliate-dashboard`).

**Reward:** `PLATFORM_REFERRAL_REWARD_RATE = 0.5` → **50% of the pure plan line-item** (starter / professional / enterprise price IDs) on the referred tenant’s **2nd paid plan invoice**, as a **Stripe Customer Balance credit** on the referrer (`amount` negative = credit, CHF).

Add-on-only / unknown-price invoices do not advance the counter.

---

## Lifecycle

| Status | Meaning |
|--------|---------|
| `attributed` | Code accepted at tenant register |
| `pending_second` | First paid plan invoice seen |
| `qualified` | 2nd+ paid plan invoice; reward about to / failed mid-flight |
| `rewarded` | Stripe balance TX written (`stripe_balance_tx_id`) |
| `failed` | Stripe credit failed (`last_error`); webhook may retry on same invoice |
| `cancelled` | Reserved in schema |

Idempotency: same Stripe invoice id as `first_paid_invoice_id` / `qualified_invoice_id` is not double-counted; `failed`/`qualified` may retry `creditReferrerBalance` with idempotency key `platform_ref_reward_{referral.id}`.

---

## Attribution flow

1. Marketing / app `?ref=CODE` → middleware stores **both** `affiliate_ref` and `platform_ref` in `localStorage` (30-day expiry). Wrong table at consume time = no-op.
2. Share URL builder: `{NUXT_PUBLIC_MARKETING_URL|/https://simy.ch}/?ref=CODE` (`buildPlatformReferralShareUrl`).
3. `pages/tenant-register.vue` posts `platform_referral_code`.
4. `POST /api/tenants/register` → `attributePlatformReferral` (non-blocking).
5. On success: row in `platform_referrals`, `tenants.referred_by_code` set.

### Anti-abuse rejects (`reason`)

- `invalid_code` / inactive code / `empty_code`
- `self_referral` (same tenant as code owner)
- `same_email`, `same_uid`
- `same_email_domain` for non-freemail domains (Gmail/etc. allowlisted as freemail)
- `already_attributed` (unique `referred_tenant_id`)

Schema: `sql_migrations/20260806_platform_referrals.sql`.  
RLS: no client access; server uses service role.

---

## Billing hook

Stripe webhook `invoice.paid` with `amount_paid > 0` → `handlePlatformReferralInvoicePaid`:

- Requires a known plan price id from env: `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PROFESSIONAL` / `STRIPE_PRICE_ENTERPRISE` (via `extractPlanLineFromInvoice`)
- Count 1 → `pending_second`
- Count 2+ → qualify + credit **this** invoice’s plan line × 50%
- Referrer must have `tenants.stripe_customer_id` or status → `failed` (`referrer_no_stripe_customer`)

Errors in the webhook are non-fatal (logged).

---

## Admin surface

| Surface | Path | Auth |
|---------|------|------|
| Code + stats | `GET /api/admin/platform-referral` | `admin` / `super_admin`; ensures code via `ensurePlatformReferralCode` |
| Debug intro email | `POST /api/debug/send-tenant-affiliate-intro` | Debug only — different email helper |

Code format: `{SLUG_UP_TO_12}-{4}` from `generatePlatformReferralCode`.

---

## Common pitfalls

1. **Not the client affiliate program** — different tables, reward rules, and dashboards.
2. **First paid plan invoice never rewards** — by design; need a second.
3. **Missing Stripe price env map** → plan line extraction returns null → invoice ignored.
4. **Referrer without `stripe_customer_id`** → `failed` until fixed and webhook retries.
5. **Same `?ref=` cookie** is shared with client affiliate storage; only tenant-register consumes `platform_ref`.
6. Reward uses the **2nd invoice’s** plan amount (not the first).

---

## Codepaths

- `server/utils/platform-referral.ts`
- `sql_migrations/20260806_platform_referrals.sql`
- `middleware/affiliate-referral.global.ts`
- `composables/usePlatformRef.ts`
- `pages/tenant-register.vue`
- `server/api/tenants/register.post.ts`
- `server/api/stripe/webhook.post.ts` (`invoice.paid`)
- `server/api/admin/platform-referral.get.ts`
