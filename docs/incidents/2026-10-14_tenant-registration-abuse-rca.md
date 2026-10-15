# RCA — Public tenant registration rate-limit failure (2026-10-14)

**Status:** Phase 2 implementation complete (draft PR); staging migration validated on `simy-test`  
**Related:** `docs/incidents/2026-10-14_suspicious-tenant-registration-donaldtrumpldt.md`  
**Rollout:** `docs/incidents/2026-10-14_tenant-registration-abuse-rollout.md`

## Root cause (confirmed)

`POST /api/tenants/register` calls `checkRateLimit(ip, 'tenant_register', ...)`, but production table `rate_limit_logs` still has:

```sql
CHECK (operation IN ('login', 'register', 'password_reset'))
```

Inserts with `operation = 'tenant_register'` (and `create_admin`, etc.) **fail the CHECK**. The limiter:

1. Queries count → 0 rows for that operation
2. Allows the request
3. Fire-and-forgets the insert; CHECK errors are swallowed
4. Fails **open** on query/client errors

Live evidence (Phase 1, read-only): 0 rows for `tenant_register` / `create_admin` while hundreds of registrations used operation name `register` historically.

**Production still unrepaired as of Phase 2 evidence close** (project `unyjaetebnaexaflpyoc` / Driving Team App): CHECK remains the three-value allowlist; `tenant_registration_email_tokens` absent. No production migration was applied by this work.

## Contributing factors

| Factor | Effect |
|--------|--------|
| Fire-and-forget insert | Concurrent instances never see each other’s attempts |
| Process-local memory cache used as security boundary | Useless across serverless isolates |
| First `x-forwarded-for` hop | Client-spoofable IP for register / create-admin |
| No email verification | Live `is_active` trial + `email_confirm: true` admin |
| Weak placeholder heuristics | Celebrity / joke address data allowed |

## Additional same-day registrations (read-only)

Beyond the Trump-named cluster, later same-day trial tenants included `5donylad` and `dt213232` (masked). Not independently attributed; treated as further signal that limits did not contain bursts.

## Safest activation gate (chosen)

Add `registration_status` + `email_verified_at`. Create tenants as **`is_active = false`** / `pending_email_verification` until email verification succeeds, then activate and issue the HMAC `registration_token` for `create-admin`. Do **not** use Supabase `email_confirm: true` to bypass application verification.

### State transitions

1. **Register (public):** tenant inserted `is_active=false`, `registration_status=pending_email_verification`, hashed single-use email token stored, verification email sent. **No** `registration_token` returned.
2. **Verify (atomic RPC):** consume hashed token (`FOR UPDATE` + one-shot `used_at`) → `email_verified_at` set, `registration_status=email_verified`, `is_active=true` → issue tenant-bound HMAC `registration_token`.
3. **Verify refresh / reissue:** a used email link may re-mint HMAC only while the tenant has no admin **and** `now <` the original email-token `expires_at` (absolute; not extended by replay). No schema migration required — `expires_at` is already persisted at issue time.
4. **Create-admin:** requires verified+active tenant + valid `registration_token`; creates admin without bypassing app email verification. HMAC secret (`NUXT_REGISTRATION_TOKEN_SECRET`, ≥32 chars) is mandatory — no insecure fallback.
5. **Staff invite / privileged paths:** reject unverified/inactive tenants; invite-staff-batch requires HMAC.

## Fix package (this PR)

1. **Migration** `sql_migrations/20261014_tenant_registration_abuse_protection.sql`
   - Narrowly scoped **explicit** `rate_limit_logs.operation` CHECK allowlist (includes `tenant_register`, `create_admin`, verify/resend ops) + `sari_%` prefix — not an unrestricted column
   - `consume_rate_limit()` with `pg_advisory_xact_lock` + count + insert in one transaction (atomic)
   - Verification columns, hash-only token table, `consume_tenant_registration_email_token()`
2. Rate limiter: await RPC persistence; fail-closed for abuse-sensitive ops; process memory is **non-authoritative soft cache only**
3. Trusted `getClientIP` (Vercel / real-ip / socket / last XFF hop)
4. Layered IP + normalized email limits; optional hCaptcha only when `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` **and** secrets present
5. Audit events for register/verify/rate-limit/admin outcomes (no raw tokens/secrets)

**Not in this PR:** production migration apply, tenant suspension/deletion, automatic orphan cleanup against production.

## Staging migration validation (simy-test)

| Item | Evidence |
|------|----------|
| Project | `simy-test` (`kssqalisscxkhvorqwgy`), eu-west-1, ACTIVE_HEALTHY |
| Migration name | `tenant_registration_abuse_protection_20261014` (version `20261014161558`) |
| Pre-state | CHECK = `login\|register\|password_reset` only; no token table / verify RPCs |
| Post-state | Allowlist CHECK accepts `tenant_register`, `create_admin`, verify/resend, `sari_%`; rejects unknown ops |
| Atomic limiter | `consume_rate_limit` contains `pg_advisory_xact_lock`; max=3 → 3 allowed + 1 blocked |
| Token consume | First consume activates tenant once; replay returns `used`; disposable tenant cleaned |
| Production | Untouched — old CHECK still present; no token table |

## Rate-limiter failure policy

| Operation class | Limiter infrastructure failure |
|-----------------|--------------------------------|
| Abuse-sensitive (`REQUIRE_ATOMIC_RPC_OPERATIONS`: `tenant_register`, `tenant_register_email`, `create_admin`, verify/resend, rollback, `staff_register`) | **Fail closed** — require `consume_rate_limit` RPC; no insert-then-count fallback |
| Auth ops (`login`, `register`, `password_reset`) | Fail closed if Supabase credentials missing / hard store failure; **may** use awaited insert-then-count when atomic RPC is not yet migrated (legacy CHECK still allows these three names). Intentional so previews/E2E remain usable before migration while registration stays fail-closed. |
| Other operations | Soft-fail / existing behavior preserved where intentional |

Soft in-process cache must not authorize abuse-sensitive traffic.

## Captcha policy

- **Required only when** `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` and `HCAPTCHA_SECRET_KEY` is configured.
- Presence of a secret alone does **not** enable enforcement.
- When not required: registration proceeds without claiming bot protection is active.

## IMPLEMENTATION GATE

```
Change: Harden public tenant registration (email verify, rate-limit fix, audit, optional hCaptcha)

CHANGE CLASS: API, Authentication, Authorization, Database, Middleware(rate-limit), Configuration

In Scope:
- rate-limiter fail-closed + await persist + operation CHECK migration
- email verification before active tenant / create-admin
- layered IP+email limits, getClientIP
- audit improvements; docs/RCA/rollout

Out of Scope:
- production migration apply / deploy
- suspending or deleting existing tenants
- unrelated product features

Hotspots: P0 Authentication, Multi-tenant isolation, Supabase admin client

Blast Radius: Large (signup funnel)

Change Risk: CRITICAL

Decision Required: User authorized Phase 2 implementation in task brief
(implementing Executor must not self-expand beyond stated scope)

Security Impact: Critical (positive hardening)
Database Impact: High (additive migration; not applied to prod by this PR)
Multi-Tenant Impact: High (activation gating)
Regression Risk: High (signup UX changes)
Breaking Change: Yes — register no longer returns registration_token until email verified

TEST LEVEL: L1 + L4 (unit/contract); L3 manual signup verify after staging migrate

Recommendation: IMPLEMENT WITH CAUTION — draft PR only; staging migrate → verify → prod approval
```
