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

## 1. Environment

| Variable | Required? | Notes |
|----------|-----------|--------|
| `RESEND_API_KEY` | Yes (existing) | Verification emails |
| `RESEND_FROM_EMAIL` / platform from | Existing | |
| `NUXT_REGISTRATION_TOKEN_SECRET` | **Required** (≥32 chars) | HMAC for post-verify create-admin / invite / rollback. **No insecure fallback** — missing/empty/short secret fail-closes mint+verify. |
| `HCAPTCHA_SECRET_KEY` | Optional | Needed when captcha is enabled for signup |
| `VITE_HCAPTCHA_SITE_KEY` | Optional | Frontend widget (required before enabling) |
| `TENANT_REGISTER_REQUIRE_HCAPTCHA` | Optional | Set `1` only after the signup widget is live |
| `NUXT_PUBLIC_SITE_URL` or `SITE_URL` | Recommended | Absolute verify link base |

### Validate secrets without exposing values

```bash
# Presence / length only — do not print values
test -n "$RESEND_API_KEY" && echo RESEND_API_KEY=set || echo RESEND_API_KEY=missing
if [ -n "$NUXT_REGISTRATION_TOKEN_SECRET" ] && [ "${#NUXT_REGISTRATION_TOKEN_SECRET}" -ge 32 ]; then
  echo REG_TOKEN_SECRET=set_ok_len
else
  echo REG_TOKEN_SECRET=missing_or_too_short
fi
test -n "$HCAPTCHA_SECRET_KEY" && echo HCAPTCHA_SECRET=set || echo HCAPTCHA_SECRET=missing
echo "REQUIRE_HCAPTCHA=${TENANT_REGISTER_REQUIRE_HCAPTCHA:-unset}"
```

**Registration token secret:** must be set identically on every app instance that serves verify / create-admin / invite-staff-batch / rollback. Do not enable public signup until this check prints `set_ok_len`.

**Captcha behavior:** enforcement is active only when `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` **and** secret is set **and** the tenant-register UI posts a valid `captcha_token`. Do **not** set the flag until the widget is wired — otherwise signup fails closed with missing_token.

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

## 4. Signup smoke-test checklist (simy-test / non-prod)

**Human gate — agent cannot complete this without Resend + mailbox access.**

Environment: non-prod app pointed at **simy-test** (`kssqalisscxkhvorqwgy`) with migration already applied, `RESEND_API_KEY` set, and `NUXT_REGISTRATION_TOKEN_SECRET` length ≥ 32. Leave `TENANT_REGISTER_REQUIRE_HCAPTCHA` unset (UI has no captcha widget yet).

1. Confirm secret checks (§1) print `REG_TOKEN_SECRET=set_ok_len` and `RESEND_API_KEY=set` (values never printed).
2. Open `/tenant-register`, register a disposable tenant with a mailbox you control.
3. Confirm API/UI shows pending verification and **no** `registration_token` yet; DB: `is_active=false`, `registration_status=pending_email_verification`.
4. Receive Resend email → open link → admin password form appears with a `registration_token`.
5. Refresh the verify URL once → still within email-token `expires_at` → recovery re-issues HMAC (admin form still works).
6. Complete create-admin → login works.
7. Replay verify URL after admin exists → rejected (`used`).
8. Optional: register another pending tenant, wait past email-token expiry (or set `expires_at` in the past on simy-test for that row only) → replay must **not** mint a new registration token.
9. Confirm invite-staff (if used in flow) requires the post-verify token.
10. Do **not** enable captcha flag until the register page posts `captcha_token`.

Checklist summary:

- [ ] Register → pending, no registration_token
- [ ] Resend deliver + first verify issues HMAC
- [ ] Refresh within `expires_at` still recovers
- [ ] After admin / after `expires_at` replay rejected
- [ ] Create-admin + invite authz OK
- [ ] Captcha flag left unset (or UI wired first)

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
