# Rollout — Tenant registration abuse protection

**Code readiness ≠ production approval.** Apply in this order after draft PR review.

## 1. Environment (no new mandatory secrets)

| Variable | Required? | Notes |
|----------|-----------|--------|
| `RESEND_API_KEY` | Yes (existing) | Verification emails |
| `RESEND_FROM_EMAIL` / platform from | Existing | |
| `NUXT_REGISTRATION_TOKEN_SECRET` | **Strongly recommended** | HMAC for post-verify create-admin |
| `HCAPTCHA_SECRET_KEY` | Optional | Needed when captcha is enabled for signup |
| `VITE_HCAPTCHA_SITE_KEY` | Optional | Frontend widget (required before enabling) |
| `TENANT_REGISTER_REQUIRE_HCAPTCHA` | Optional | Set `1` only after the signup widget is live |
| `NUXT_PUBLIC_SITE_URL` or `SITE_URL` | Recommended | Absolute verify link base |

## 2. Database migration (staging first)

Apply `sql_migrations/20261014_tenant_registration_abuse_protection.sql`:

- Drops closed `rate_limit_logs.operation` CHECK (root cause of fail-open)
- Adds `consume_rate_limit()` atomic helper
- Adds `tenants.email_verified_at`, `tenants.registration_status` (backfill existing → `active`)
- Adds `tenant_registration_email_tokens` (hash-only)

**Do not** run this migration from the agent against production without explicit ops approval.

## 3. Deploy application

Deploy code **after** migration on that environment. Deploying code first will fail tenant inserts that reference new columns.

## 4. Verify

- Register a disposable non-prod tenant → receive verify email → verify → create-admin
- Burst >3 register attempts from one IP → HTTP 429
- Unverified tenant cannot create-admin / invite staff
- Spoofed `X-Forwarded-For: 1.2.3.4` does not change limiter key when Vercel/`x-real-ip` present

## 5. Monitoring (manual / SQL — no auto-delete)

```sql
-- Orphan / unverified pending tenants (last 24h)
SELECT id, slug, created_at, contact_email, registration_status, is_active
FROM tenants
WHERE registration_status = 'pending_email_verification'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Rate limit health for tenant_register
SELECT status, count(*)
FROM rate_limit_logs
WHERE operation IN ('tenant_register', 'tenant_register_email', 'create_admin')
  AND created_at > now() - interval '24 hours'
GROUP BY 1;
```

## Out of scope this PR

- Suspending/deleting existing suspicious tenants
- Production migration execution
- Automatic orphan cleanup job
- Broad MX/DNS blocking of custom domains
