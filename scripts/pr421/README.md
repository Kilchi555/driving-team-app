# PR #421 Path A — F1 concurrency harness (disposable PG17)

**Not production-equivalent. Proofs apply only to this disposable schema.**

## Forbidden targets

- Production Supabase ref `unyjaetebnaexaflpyoc`
- Shared staging ref `kssqalisscxkhvorqwgy`
- Any `SUPABASE_DB_URL` / hosted DB secret
- Supabase MCP fallback

## Approvals

| Gate | Meaning |
|------|---------|
| **A** | Files in this directory + workflow + `pg` dep (done when merged/approved) |
| **B** | `workflow_dispatch` → `preflight` only |
| **C** | `workflow_dispatch` → `concurrency` (sets `PR421_CONCURRENCY_EXECUTION_APPROVED=1`) |

Do not run concurrency scoring without Gate C.

## Workflow

`.github/workflows/pr421-f1-concurrency.yml` — `workflow_dispatch` only, `permissions: contents: read`, `postgres:17` service.

## Local (optional, disposable PG17 only)

```bash
# Start your own postgres:17 on loopback with DB pr421_f1_concurrency — never hosted.
export PR421_PGHOST=127.0.0.1 PR421_PGPORT=5432 PR421_PGUSER=postgres
export PR421_PGPASSWORD=... PR421_F1_PGDATABASE=pr421_f1_concurrency
psql … -f scripts/pr421/f1-minimal-schema.sql
# verify SHA-256 then:
psql … -f migrations/20261012_enroll_public_cash_course_with_pending_payment.sql
node scripts/pr421/f1-concurrency.mjs --mode=preflight
# Gate C only:
PR421_CONCURRENCY_EXECUTION_APPROVED=1 node scripts/pr421/f1-concurrency.mjs --mode=concurrency
```

## Matrix labels

| Cell | Label |
|------|-------|
| 7 | `PASS (7 — advisory lock wait witness + postconditions)` or FAIL/BLOCKED |
| 8–10 | as implemented in harness |
| **26A** | `PASS (26A — DB dual-drainer)` only |
| **26B** | Always `NOT RUN — BLOCKED (PG-only Path A)` |

Never emit a generic `Test 26 PASS`.

## Drift

See `SCHEMA-DRIFT.md`. Refresh checkboxes during Gate B.
