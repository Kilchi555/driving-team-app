# Rollout — Tenant registration abuse protection

**Code readiness ≠ production approval.** Apply in this order after draft PR review.

## 0. Staging validation already performed (2026-10-14)

| Step | Result |
|------|--------|
| Target | **simy-test only** (`kssqalisscxkhvorqwgy`) — not production |
| Applied | `tenant_registration_abuse_protection_20261014` via Supabase `apply_migration` |
| CHECK regression | `tenant_register` / `create_admin` / verify+resend / `sari_%` insert OK; unknown op rejected |
| `consume_rate_limit` | Advisory lock present; max=3 → 3 allowed + 1 blocked |
| Token RPC | Single successful consume + replay `used`; disposable tenant deleted |
| Production (`unyjaetebnaexaflpyoc`) | **Not migrated** — confirmed old CHECK still in place |

Remaining before claiming full staging signup validation: deploy this branch to a non-prod app environment pointed at simy-test and run the smoke checklist in §4 (end-to-end Resend + UI).

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

### Validate secrets without exposing values

```bash
# Presence only — do not print values
test -n "$RESEND_API_KEY" && echo RESEND_API_KEY=set || echo RESEND_API_KEY=missing
test -n "$NUXT_REGISTRATION_TOKEN_SECRET" && echo REG_TOKEN_SECRET=set || echo REG_TOKEN_SECRET=missing
test -n "$HCAPTCHA_SECRET_KEY" && echo HCAPTCHA_SECRET=set || echo HCAPTCHA_SECRET=missing
echo "REQUIRE_HCAPTCHA=${TENANT_REGISTER_REQUIRE_HCAPTCHA:-unset}"
```

**Captcha behavior:** enforcement is active only when `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` **and** secret is set. Otherwise signup does not claim bot protection.

## 2. Database migration (staging first — then prod with explicit approval)

Apply `sql_migrations/20261014_tenant_registration_abuse_protection.sql`:

- Replaces closed three-value `rate_limit_logs.operation` CHECK with **explicit allowlist** (+ `sari_%`)
- Adds `consume_rate_limit()` with `pg_advisory_xact_lock` (atomic check+insert)
- Adds `tenants.email_verified_at`, `tenants.registration_status` (backfill existing → `active`)
- Adds `tenant_registration_email_tokens` (hash-only) + `consume_tenant_registration_email_token()`

**Do not** run this migration against production without explicit ops approval.

### Locking / compatibility / backfill

- Constraint drop+add is brief; existing rows only use historically allowed ops (`login`/`register`/`password_reset`) so re-add is compatible.
- Tenant column backfill sets legacy rows to `registration_status='active'` and fills `email_verified_at` from `created_at` when null.
- Token table is empty initially; RLS enabled; no anon grants on consume RPCs (service_role only).

### Rollback feasibility

| Window | Feasibility |
|--------|-------------|
| Before any verification tokens issued / before app deploy | Relatively safe: drop new functions/table/columns; restore old three-value CHECK **only if** app code is also rolled back (otherwise `tenant_register` inserts fail again / fail-closed). |
| After tokens issued or pending signups exist | **Not safely fully reversible** without stranding pending tenants. Prefer forward fix. Documented in migration header. |

## 3. Deploy ordering

1. Apply migration on the target environment DB  
2. Deploy application code that expects new columns/RPCs  
3. Deploying code **before** migration will fail closed on abuse rate-limits (RPC missing) and break tenant inserts that write new columns — intentional fail-closed, not silent allow

## 4. Signup smoke-test checklist (non-prod)

- [ ] Register disposable tenant → response has **no** `registration_token`; tenant `is_active=false` / `pending_email_verification`
- [ ] Receive verify email (Resend) → link works once → tenant active / `email_verified` → `registration_token` issued
- [ ] Replay verify link → rejected
- [ ] Expired/malformed token → rejected
- [ ] Create-admin succeeds only after verify with bound token
- [ ] Unverified tenant cannot create-admin / invite staff
- [ ] Burst > limit register attempts from one IP → HTTP 429
- [ ] Independent email-key limit triggers with different IPs same email (and vice versa)
- [ ] Spoofed `X-Forwarded-For: 1.2.3.4` does not change limiter key when Vercel/`x-real-ip` present
- [ ] With `TENANT_REGISTER_REQUIRE_HCAPTCHA` unset: signup works; no claim of captcha
- [ ] With require=1 + secret: invalid/missing captcha rejected

## 5. Monitoring signals

```sql
-- Orphan / unverified pending tenants (last 24h)
SELECT id, slug, created_at, contact_email, registration_status, is_active
FROM tenants
WHERE registration_status = 'pending_email_verification'
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Rate limit health for registration ops
SELECT operation, status, count(*)
FROM rate_limit_logs
WHERE operation IN (
  'tenant_register', 'tenant_register_email',
  'create_admin', 'verify_registration_email',
  'resend_registration_verification'
)
  AND created_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 1, 2;
```

App logs (best-effort audit — must not change security decisions): registration outcomes, rate-limit denials/infra failures, verification requested/sent/completed/expired/rejected/replayed, admin creation outcomes. Never log raw verification/registration tokens or service-role credentials.

**Required for enforcement:** awaited `consume_rate_limit` / token consume RPCs.  
**Best-effort:** structured audit log lines if logger fails.

## 6. Rollback strategy (prod — only with approval)

1. Revert app deploy to previous release (signup returns to prior behavior — **not** recommended while abuse continues).
2. Prefer **forward** hotfix over restoring old CHECK.
3. If absolute schema rollback required before tokens issued: drop token table/functions/columns; restore prior CHECK only together with app rollback.
4. Do **not** auto-suspend/delete tenants as part of rollback.

## Out of scope this PR

- Suspending/deleting existing suspicious tenants
- Production migration execution / production deploy
- Automatic orphan cleanup job
- Broad MX/DNS blocking of custom domains
