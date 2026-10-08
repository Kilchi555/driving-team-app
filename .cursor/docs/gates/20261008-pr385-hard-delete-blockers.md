# IMPLEMENTATION GATE — PR #385 Hard Delete Blocker Fixes

**Date:** 2026-10-08  
**Change risk:** CRITICAL (tenant isolation, service-role, hard delete)  
**PR:** #385  
**Approval:** User message explicitly set `MODE: IMPLEMENTATION` and mandated fixing every security-review blocker. Scope is limited to PR #385 hard-delete fixes only.

## Intent
Close all BLOCKED findings from the read-only security review without redesigning the feature or applying production migrations / deleting tenants.

## Scope (allowed)
1. Fail-closed: remove destructive JS fallback after RPC failure  
2. Fix `website_prospects` cross-tenant DELETE  
3. Remove slug-prefix storage deletion  
4. Clear payment NO ACTION/RESTRICT deps before `DELETE payments`  
5. Clear appointment NO ACTION deps before tenant/appointment cascade  
6. Schema-driven preview/verify inventory  
7. Stronger verification + regression tests  
8. Migration SQL updates (not applied to production in this task)

## Out of scope
- Production migration apply  
- Any tenant deletion  
- Financial auto-blockers  
- External Stripe/Wallee/Resend/SARI destructive APIs  
- Unrelated refactors  

## Recommendation
IMPLEMENT WITH CAUTION — user-approved CRITICAL remediation on draft PR only.

## Test floor
Unit/regression tests covering all mandatory blockers; no production execution.
