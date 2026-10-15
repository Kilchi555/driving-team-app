# Registration-token reissue vs create-admin race (residual)

**Status:** Narrowed, not fully closed  
**PR:** #431  
**Date:** 2026-10-15

## Race

`reissueRegistrationTokenForVerifiedPendingAdmin` checks that no admin exists, then mints an HMAC in application memory. `create-admin` inserts an admin in a separate request/transaction. Under concurrency:

1. Reissue observes no admin  
2. Create-admin inserts primary admin  
3. Reissue may still mint a short-lived HMAC  

## Why a full close is out of this minimal remediation

Closing the race atomically requires a **shared database lock or single SECURITY DEFINER transaction** that spans both HMAC authorization and admin creation. HMAC signing uses `NUXT_REGISTRATION_TOKEN_SECRET` in the app process (must not move into Postgres). Folding create-admin into one DB function would be a broad registration rewrite.

## Mitigations present

| Control | Effect |
|---------|--------|
| Absolute `expires_at` on email token | Reissue window cannot be extended by replay |
| Double admin probe immediately before mint | Shrinks sequential TOCTOU; covered by unit test |
| `create-admin` rejects existing primary admin (409) | Second admin cannot be created with a late HMAC |
| HMAC 30-minute TTL + tenant binding | Limits usefulness of a late-minted token |

## Concurrency testing limitation

No reliable multi-connection / parallel HTTP harness for this race exists in the current CI stack without standing up disposable Postgres + coordinating two real requests. Unit tests simulate the sequential “admin appears between probes” case only. **Do not claim concurrent closure.**

## Residual risk (honest)

A concurrent reissue might still obtain one HMAC after an admin already exists. Privilege escalation to a second primary admin is blocked by create-admin. Invite/rollback with that HMAC remain gated by their own checks and the short TTL.
