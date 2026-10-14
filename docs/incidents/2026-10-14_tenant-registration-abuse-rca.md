# RCA — Public tenant registration rate-limit failure (2026-10-14)

**Status:** Investigation complete (Phase 1)  
**Related:** `docs/incidents/2026-10-14_suspicious-tenant-registration-donaldtrumpldt.md`

## Root cause (confirmed)

`POST /api/tenants/register` calls `checkRateLimit(ip, 'tenant_register', 3, 3600_000)`, but production table `rate_limit_logs` still has:

```sql
CHECK (operation IN ('login', 'register', 'password_reset'))
```

Inserts with `operation = 'tenant_register'` (and `create_admin`, etc.) **fail the CHECK**. The limiter:

1. Queries count → 0 rows for that operation
2. Allows the request
3. Fire-and-forgets the insert; CHECK errors are swallowed
4. Fails **open** on query/client errors

Live evidence: 0 rows for `tenant_register` / `create_admin` while hundreds of registrations used operation name `register` historically.

## Contributing factors

| Factor | Effect |
|--------|--------|
| Fire-and-forget insert | Concurrent instances never see each other’s attempts |
| Process-local memory cache | Useless across serverless isolates |
| First `x-forwarded-for` hop | Client-spoofable IP for register / create-admin |
| No email verification | Live `is_active` trial + `email_confirm: true` admin |
| Weak placeholder heuristics | Celebrity / joke address data allowed |

## Additional same-day registrations (read-only)

Beyond the Trump-named cluster, later same-day trial tenants included `5donylad` and `dt213232` (masked). Not independently attributed; treated as further signal that limits did not contain bursts.

## Safest activation gate (chosen)

Add `registration_status` + `email_verified_at`. Create tenants as **`is_active = false`** until email verification succeeds, then activate and issue the HMAC `registration_token` for `create-admin`. Do not auto-confirm Supabase email until after our verification step.

## Fix package (this PR)

1. Widen/drop `rate_limit_logs` operation CHECK; await inserts; fail-closed for abuse ops; `getClientIP`
2. Email verification link (hashed single-use token) via Resend
3. Gate create-admin / staff invites on verified + active
4. Layered rate limits (IP + normalized email); optional/required hCaptcha when configured
5. Richer audit logging (slug on failures; create-admin outcomes)

**Not in this PR:** production migration apply, tenant suspension/deletion, automatic orphan cleanup job execution against production.

---

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
