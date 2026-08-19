# Website-Only Tenants — Product Mode & Billing Lock

**When to use:** Tenant registered via website product cannot see full Simy admin; publish blocked after trial; hosting lock sends users only to billing; session loses `website_only` flags after refresh.

Verified against source (Aug 2026). Landing/editor internals may also be covered by open draft runbooks for the website builder — this doc is the **product flag + billing gate**.

---

## Intent

`tenants.website_only = true` marks a tenant that signed up for the **website product only** (`/tenant-register?product=website`). They share the same tenant row and auth stack as full Simy, but admin is a **slim surface** and billing is setup fee + monthly host/care — not the SaaS subscription plans.

Default Simy register never sends `website_only`; column default stays `false`.

---

## Flag & columns

| Column | Role |
|--------|------|
| `website_only` | Product mode (boolean, default false) |
| `website_status` | Set to `pending_review` on website-only register; `live` / `disabled` on publish/unpublish |
| `website_setup_paid_at` | One-time setup (CHF **490**) paid |
| `website_hosting_plan` | `host` (CHF **29**) or `care` (CHF **49**), else null in free window |
| `trial_ends_at` | Same **30-day** trial helper as SaaS (`SAAS_TRIAL_DAYS`) |

Migrations: `sql_migrations/20260816_tenant_website_only.sql`, `20260816_website_billing.sql`.

Stripe price env vars: `STRIPE_PRICE_WEBSITE_SETUP`, `STRIPE_PRICE_WEBSITE_HOST`, `STRIPE_PRICE_WEBSITE_CARE`.

---

## Admin surface

Allowed prefixes while website-only and **not** hosting-locked (`utils/website-only.ts`):

- `/admin/website`, `/admin/website-analytics`
- `/admin/categories`
- `/admin/billing`, `/admin/profile`

Middleware `middleware/website-only.global.ts` (client):

- `/admin` → `/admin/website`
- any other admin path → `/admin/website`
- **Hosting locked** (trial ended, no `host`/`care` plan): only `/admin/billing` and `/admin/profile`; else → billing

Account switch is disabled for website-only tenants.

Login / post-auth home: `adminHomePath(website_only)` → `/admin/website` vs `/admin`.

---

## Billing & publish

Checkout: `POST /api/website/checkout` — **rejects** non–website-only tenants.

- Can include setup (unless `website_setup_paid_at` set) + hosting plan (`host`|`care`).
- Stripe metadata: `product=website`, `tenant_id`, `hosting_plan`, `include_setup`, `publish_after_pay`.
- Webhook applies hosting via `applyWebsiteHostingFromSubscription` (`subscription_plan` becomes `website_host` / `website_care`).

Publish gate (`websitePublishBlockedReason`):

- Not website-only → no block from this helper.
- Has hosting plan → ok.
- Else if trial still open (or no `trial_ends_at`) → ok (**setup fee is not a second gate during trial**).
- After trial without hosting → block reason `'hosting'`.

Unpublish sets website + pages unpublished and `website_status=disabled`.

---

## Session persistence

Client cache must keep website billing fields or middleware cannot lock correctly before `trial-status` returns:

- `utils/session-persistence.ts` / auth store: `website_only`, `website_setup_paid_at`, `website_hosting_plan`
- `withWebsiteOnlyFlag` merges the flag into trial info early

If these fields drop on restore, users may briefly hit full admin routes or miss the lock.

---

## Pitfalls

1. **Wrong register URL** — omitting `product=website` creates a normal Simy trial tenant (`website_only=false`).
2. **Missing Stripe price env** — checkout 500s with `Missing STRIPE_PRICE_WEBSITE_*`.
3. **Trial vs lock** — publish can go live unpaid during the 30-day window; after `trial_ends_at` without hosting, admin collapses to billing/profile and publish blocks on hosting.
4. **Setup fee timing** — collected at checkout; not required to publish during an open trial.
5. **Account switch / full SaaS features** — intentionally unavailable; do not “fix” by bypassing middleware.
6. **Domain lookup / website-only session** — domain helpers and session field persistence were tightened so website tenants keep flags across reloads (`00161a02`).

---

## Codepaths

- `utils/website-only.ts`, `utils/website-billing.ts`, `utils/saas-trial.ts`
- `middleware/website-only.global.ts`, `middleware/trial.global.ts`, `middleware/features.ts`
- `server/utils/website-billing.ts` — prices, publish/unpublish, Stripe subscription apply
- `server/api/website/checkout.post.ts`, `server/api/tenants/register.post.ts`
- `server/api/admin/billing-status.get.ts`, `pages/admin/billing.vue`, `layouts/admin.vue`
- `stores/auth.ts`, `utils/session-persistence.ts`
- `sql_migrations/20260816_tenant_website_only.sql`, `20260816_website_billing.sql`
