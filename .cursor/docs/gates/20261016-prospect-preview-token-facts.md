# IMPLEMENTATION GATE — Prospect preview token + factual integrity

**Date:** 2026-10-16  
**Base:** `origin/main` @ `a75e065eed1ed7143b0e49718976b9b0209979bd`  
**Requested by:** User (explicit implement mission)  
**Executor approval role:** User-authorized implementation (not self-approval)

## Intent

1. Mint canonical preview tokens when generating prospect sites; store tokenized preview URLs; fail closed on mint failure.
2. Stop fabricating services, USPs, categories, and unverified ratings in prospect generation.

## Classification

| Item | Value |
|------|-------|
| Change risk | **MEDIUM** (shared util call sites in prospect generate; uses existing preview-token API without weakening gate) |
| Hotspots | Preview access util (authz for unpublished sites) — **touched as consumer only**; gate logic unchanged |
| Auth / tenant / RLS / Stripe | Preview mint **reuse** of `#299` helpers; no RLS/schema/billing/claim changes |
| Activation | Impact Analysis required → **User approved implementation** via task brief |

## Out of scope

Claim SQL, checkout, publish, #302 merge, SSRF rewrites, production migrations, paid API calls.

## Recommendation

**SAFE TO IMPLEMENT** within stated scope after User authorization.

## Test floor

- Unit: prospect landing facts + preview URL mint fail-closed + authorizePublicWebsiteRead regressions
- Lint on touched tests if available
- No production smoke
