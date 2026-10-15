# SIMY Handoff — PR #431 Minimal Token-Security Remediation

**Date:** 2026-10-15  
**Verdict:** **IMPLEMENTED (partial race closure) — DRAFT UPDATED**

## Identity

| Item | Value |
|------|--------|
| PR | https://github.com/Kilchi555/driving-team-app/pull/431 (draft) |
| Prior tip | `4569491a` |
| Base | `0770ad2e` |
| Final HEAD | *(after push)* |

## Changes (minimal)

1. **Exact equality unit test** — `isWithinRegistrationTokenReissueWindow(t, Date.parse(t)) === false`  
   File: `server/utils/__tests__/registration-email-verification.test.ts`

2. **Sequential TOCTOU narrowing** — double `tenantHasAdminUser` probe immediately before mint; comment documents residual concurrent race  
   File: `server/utils/registration-email-verification.ts`

3. **Regression** — admin appears between probes → reissue returns `used`  
   Same test file

4. **Honest residual-risk doc** — `docs/incidents/2026-10-14_registration-token-reissue-race.md`

## Race-condition analysis

| Approach | Outcome |
|----------|---------|
| Shared DB txn spanning reissue mint + create-admin | Would require moving/signing secret in DB or folding create-admin into one RPC → **broad rewrite, rejected** |
| App-only double-check | **Done** — shrinks sequential window; unit-tested |
| True concurrent close | **Not claimed** — residual documented |

`create-admin` still returns 409 if a primary admin already exists — late HMAC cannot create a second primary admin.

## Tests run (real)

```
npx vitest run registration-email-verification / registration-token / tenant-registration-abuse-contract
→ exit 0 (24 tests)

npx eslint registration-email-verification.ts + test —max-warnings 0
→ exit 0

npm run lint
→ exit 0
```

**Not run:** live Resend/UI, multi-connection concurrency, staging/Production config.

## CI

Required Actions on final head: report after push (subscribe). Prior tip `4569491a` had Test and lint + E2E green.

## Non-actions

No merge, undraft, deploy, Production/simy-test access, migration apply, secret inspection, or live email testing.

## Remaining risks

Concurrent reissue-vs-create-admin may still mint one post-admin HMAC (TTL-bound). Not fixed atomically in this scope — see race doc.
