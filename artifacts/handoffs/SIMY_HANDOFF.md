# SIMY Handoff — PR #431 Token Security Fixes

**Date:** 2026-10-14  
**Verdict:** **IMPLEMENTED — DRAFT PR UPDATED; AWAITING CI + HUMAN STAGING SMOKE**

## Identity

| Item | Value |
|------|--------|
| PR | https://github.com/Kilchi555/driving-team-app/pull/431 (draft) |
| Base | `0770ad2e` |
| Prior reviewed head | `d41cf295` |
| Final HEAD (this fix) | `f8d216f8c1f84938768783938a816d34d64f3211` |

## IMPLEMENTATION GATE (authorized by user task)

```
Change: Bound registration-token reissue + remove insecure HMAC secret fallback
CHANGE CLASS: Authentication, Authorization
Change Risk: CRITICAL (security fix within approved PR #431 scope)
Hotspots: P0 Authentication
Decision: User authorized Priority 1 + Priority 2 implementation
Out of scope: undraft/merge/deploy/prod migration/prod config
```

## Fixes by finding

### P1 — Bound reissue (`registration-email-verification.ts`)

- **Authoritative deadline:** existing `tenant_registration_email_tokens.expires_at` (set at issue; never updated on consume/replay).
- **No new migration** — schema already has the deadline.
- `isWithinRegistrationTokenReissueWindow()` fail-closes on null/empty/malformed timestamps.
- Reissue requires: used token + verified/active tenant + no admin + `now < expires_at`.
- Past deadline → `expired`; after admin → `used`.
- Files: `server/utils/registration-email-verification.ts`

### P2 — Fail-closed secret (`registration-token.ts`)

- Removed hardcoded `insecure-dev-secret-change-in-production`.
- `getRegistrationTokenSecret()` requires `NUXT_REGISTRATION_TOKEN_SECRET` trimmed length ≥ 32 or throws `RegistrationTokenSecretError`.
- `generateRegistrationToken` throws if misconfigured; `verifyRegistrationToken` returns `false` (fail-closed, no secret leakage).
- Verify API returns 503 if secret missing before consume; consume refuses to mutate if secret unset.
- Callers (create-admin / invite-staff-batch / rollback / send-welcome-email): verify → false → existing 403 paths.
- Docs: rollout §1 marks secret **Required**; presence/length check without printing values.
- Files: `server/utils/registration-token.ts`, `server/api/tenants/verify-registration-email.post.ts`, `docs/incidents/2026-10-14_tenant-registration-abuse-rollout.md`

## Tests run (local)

```
npx vitest run registration-token / registration-email-verification /
  registration-upload-grant / tenant-registration-abuse-contract / rate-limiter-abuse
→ 5 files, 43+ tests PASS (re-run after contract update)
npm run lint → PASS
```

**Not run:** Resend/UI live signup, multi-connection concurrency harness, Production anything.

## Migration status

- **No new migration** for P1 (uses existing `expires_at`).
- Prior abuse-protection migration: staging (simy-test) applied earlier; **Production still unapplied** (must stay so).

## Staging gate (human — simy-test)

Exact steps: `docs/incidents/2026-10-14_tenant-registration-abuse-rollout.md` §4.

Must confirm: `NUXT_REGISTRATION_TOKEN_SECRET` length ≥ 32, Resend delivers, verify→admin, refresh within `expires_at` recovers, after admin / after expiry replay rejected. **Do not** set `TENANT_REGISTER_REQUIRE_HCAPTCHA=1` until UI posts captcha tokens.

## Remaining risks / human gates

1. Required CI must be green on final HEAD (Test and lint + E2E login).
2. Human Resend/UI smoke on simy-test before production enablement.
3. Ensure every deploy target has `NUXT_REGISTRATION_TOKEN_SECRET` set (no fallback).
4. Still **do not** merge/undraft/deploy/apply Production migration without explicit later authorization.

## Non-actions

No undraft, merge, deploy, Production migration, or Production config/data changes.
