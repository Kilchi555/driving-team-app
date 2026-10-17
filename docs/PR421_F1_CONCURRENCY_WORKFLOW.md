# PR #421 F1 concurrency workflow (dispatch registration)

Verified from `main` after merge of `0770ad2e` (#424).

**When to use:** Actions should list «PR421 F1 concurrency (disposable PG)» so an approved operator can later dispatch Path A preflight / concurrency against an approved feature-branch ref — without touching hosted databases.

This is **not** a merge of open [#421](https://github.com/Kilchi555/driving-team-app/pull/421) (atomic pending payment + cash enroll). #424 only registers the workflow file on the default branch.

---

## Intent

GitHub Actions only recognizes `workflow_dispatch` workflows that exist on the **default branch**. Gate A therefore landed a single file:

`.github/workflows/pr421-f1-concurrency.yml`

Byte-identical to Gate A commit `4e6d6837` on `cursor/f1-public-cash-pending-payment-bbb8`.

Merging #424:

- Does **not** start a workflow run (`workflow_dispatch` only; no `push` / `pull_request` triggers).
- Does **not** access any hosted database.
- Does **not** apply migrations or score concurrency until a **separate** dispatch is approved.

---

## Contract

### Trigger & permissions

| Setting | Value |
|---------|-------|
| Trigger | `workflow_dispatch` only |
| Input `run_mode` | `preflight` (default) or `concurrency` |
| Permissions | `contents: read` |
| Secrets | **None** — no `${{ secrets.* }}` |
| DB service | Job-local `postgres:17` on `127.0.0.1:5432`, DB `pr421_f1_concurrency` |

### Modes (gates)

| Mode | Gate | Behaviour |
|------|------|-----------|
| `preflight` | B | Identity / bootstrap / multi-session / advisory probe. Sets `PR421_CONCURRENCY_EXECUTION_APPROVED=0`. Does **not** score concurrency matrix. |
| `concurrency` | C | Only when operator deliberately chooses `concurrency` at dispatch. Sets `PR421_CONCURRENCY_EXECUTION_APPROVED=1`. Still requires harness scripts present on the checked-out ref. |

**Gate C remains unauthorized** until someone explicitly selects `run_mode=concurrency`. Choosing the default `preflight` never unlocks scoring.

### Identity denylist (workflow + harness)

Before bootstrap and before the harness, the job fails closed if:

- `SUPABASE_DB_URL` is present in the environment
- Host is not `localhost` / `127.0.0.1`
- URL/check strings contain Production / shared-staging / `supabase.co` identity substrings listed in the workflow

Local ephemeral password `pr421_local_only` is **not** a hosted secret; never echo it in logs as a credential for real infra.

### F1 migration checksum

Workflow env `F1_EXPECTED_SHA256` must match:

`migrations/20261012_enroll_public_cash_course_with_pending_payment.sql`

Expected digest (also hard-coded in the feature-branch harness):

`d8d10cd20a4fad2ea744bca5dfc36b1b1333e999f8f867cefeed9ea240291cab`

Mismatch → job fails before apply.

---

## What is on `main` vs feature branch

| Artifact | On `main` after #424? | Notes |
|----------|----------------------|-------|
| `.github/workflows/pr421-f1-concurrency.yml` | **Yes** | Registration only |
| `scripts/pr421/*` (`f1-concurrency.mjs`, `f1-minimal-schema.sql`, …) | **No** | Live on open #421 branch |
| `migrations/20261012_enroll_public_cash_course_with_pending_payment.sql` | **No** | Same; SHA pinned in workflow |

A dispatch that checks out **`main` alone will fail** at the checksum / bootstrap steps until those files land (or the dispatch targets an approved feature-branch ref that contains them).

Canonical feature ref at registration time: `cursor/f1-public-cash-pending-payment-bbb8` @ `4e6d6837` (confirm before any live dispatch).

---

## Ops sequence (separate approvals)

1. Confirm Actions UI lists **PR421 F1 concurrency (disposable PG)**.
2. **Separate approval** to dispatch `run_mode=preflight` against an approved feature-branch SHA that includes `scripts/pr421` + the F1 migration.
3. **Separate approval** for Gate C / `run_mode=concurrency` — never implied by preflight success.
4. Treat results as **disposable-schema only** — not production-equivalent. Feature-branch harness labels matrix cells (7–10, 26A); **26B** stays `NOT RUN — BLOCKED` on Path A.

Do not wire this workflow as a required `main` check until flake rate is known (comment in the YAML).

---

## Constraints & pitfalls

1. **#424 ≠ #421** — Documenting or dispatching this workflow does not ship the F1 enrollment migration.
2. **Never point Path A at hosted Supabase** — Production / simy-test / `SUPABASE_DB_URL` are hard-forbidden.
3. **Do not treat registration as execution approval** — preflight and concurrency each need their own operator decision.
4. If the F1 SQL changes on the feature branch, update **both** the file SHA expectation in the workflow **and** the harness constant before re-dispatching.
5. Complementary to open draft [#372](https://github.com/Kilchi555/driving-team-app/pull/372) cash ledger attribution and Staff POS credit timing — different subsystem; do not fold.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/pr421-f1-concurrency.yml` | Dispatch-only workflow on `main` (#424) |
| `scripts/pr421/f1-concurrency.mjs` | Harness (feature branch / #421) |
| `scripts/pr421/f1-minimal-schema.sql` | Disposable bootstrap schema |
| `scripts/pr421/f1-identity.mjs` | URL / live-server identity gates |
| `migrations/20261012_enroll_public_cash_course_with_pending_payment.sql` | F1 migration under test |

---

## Verify (static)

On `main`:

```bash
test -f .github/workflows/pr421-f1-concurrency.yml
rg -n "workflow_dispatch|postgres:17|F1_EXPECTED_SHA256|SUPABASE_DB_URL" .github/workflows/pr421-f1-concurrency.yml
```

Confirm no `push` / `pull_request` triggers and no `secrets.` references before any dispatch.
