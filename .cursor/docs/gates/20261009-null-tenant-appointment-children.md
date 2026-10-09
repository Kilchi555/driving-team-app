# IMPLEMENTATION GATE — P2 NULL-tenant appointment children

## Approval

**User-approved scope** (explicit task): backfill 66 SAFE rows + harden hard-delete RPC.
Human approval: YES. Executor implements only this scope.

## Classification

* Database migration (data backfill)
* Hard-delete RPC hardening (tenant-scoped)
* Multi-tenant isolation / financial child rows

## Change risk

**CRITICAL** (tenant isolation + financial records + hard-delete)

## Hotspots

* Superadmin hard-delete path
* cash_transactions / discount_sales financial tables
* appointments FK NO ACTION

## Approved scope

1. Defensive backfill: `tenant_id := appointment.tenant_id` only when appointment exists and `appointment.tenant_id IS NOT NULL`
2. Fail migration on ambiguous/missing ownership for candidates
3. RPC: additionally clear NULL-tenant children scoped via target tenant’s appointments (same UPDATE-to-NULL pattern)
4. Focused tests; no FK ON DELETE changes; no production apply

## Out of scope

* Production apply / hard-delete execution
* Global NULL-tenant DELETE
* FK behavior changes
* Unrelated hard-delete changes

## Recommendation

**SAFE TO IMPLEMENT** within approved scope (user-approved).
