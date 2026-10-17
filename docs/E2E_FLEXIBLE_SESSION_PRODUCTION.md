# Production E2E — flexible Kursart session templates

Verified from `main` after merge of `5ad1cf80` (#405).

**When to use:** Manually smoke unequal Kursart templates against live `https://app.simy.ch` / tenant `e2e-isolation` after app + (when ready) DB migration cutover. Companion to [`FLEXIBLE_COURSE_CATEGORY_SESSION_TEMPLATES.md`](./FLEXIBLE_COURSE_CATEGORY_SESSION_TEMPLATES.md).

---

## Intent

Provide an **opt-in, main-only** Playwright workflow that creates, edits, validates bounds, and deletes **one** uniquely named Kursart on Production — without coupling that suite into general PR CI or `npm run test:e2e`.

---

## Contract

| Piece | Behavior |
|-------|----------|
| Workflow | `.github/workflows/e2e-flexible-session-production.yml` — `workflow_dispatch` only |
| Branch gate | Fails before Playwright unless `github.ref == refs/heads/main` and checkout SHA matches `origin/main` and `GITHUB_SHA` |
| Target | Fixed `E2E_BASE_URL=https://app.simy.ch` (workflow refuses any other value) |
| Secret | Repository secret `E2E_ISOLATION_PASSWORD` only |
| Spec | `e2e/flexible-session-category.spec.ts` |
| Discovery | Ignored by default via `playwrightTestIgnoreForFlexibleSession` unless `SIMY_E2E_PRODUCTION_FLEX=1` |
| Retries | `--retries=0` (retries would multiply Production rows if cleanup fails later) |
| Isolation tenant | Email `e2e-isolation@simy.ch`, slug `e2e-isolation`, tenant id asserted in the spec |

### Cleanup fail-closed rules (`utils/e2e-flexible-session-safety.ts`)

Cleanup may delete only after:

1. Successful **GET** `/api/admin/course-categories` (exact path — not `/save`, not other course list endpoints).
2. List UI state is settled (`ready_empty` / `ready_populated`), not `loading` / `unknown`.
3. Exactly one active match for confirmed create id + exact name (`is_active` truthy, same filter as UI `activeCategories`).
4. UI shows exactly one card for that name before issuing delete (`requireUiMatchForApiDeleteDecision`).

Empty UI after a **failed or timed-out** list GET is **not** `already_gone`. Ambiguous matches fail. Failed cleanup is combined with the original test error (`formatCombinedTestFailure`) so orphans are visible.

---

## How to run

1. Ensure the flexible-template **app** is on `main` (and follow migration cutover in the companion runbook before relying on unequal DB writes).
2. GitHub Actions → **E2E flexible session (Production)** → Run workflow on **`main`**.
3. Do not dispatch from a PR branch — the job exits 1 before auth.

Local equivalent (still hits Production):

```bash
export E2E_ISOLATION_PASSWORD='…'   # never commit
export E2E_BASE_URL=https://app.simy.ch
export SIMY_E2E_PRODUCTION_FLEX=1
npx playwright test e2e/flexible-session-category.spec.ts --retries=0
```

Without `SIMY_E2E_PRODUCTION_FLEX=1`, Playwright ignores the spec (general CI stays clean).

---

## Pitfalls

1. **Not part of PR CI** — green PR checks do not mean this Production workflow ran.
2. **Do not add the spec to the default e2e suite** — it mutates Production isolation data.
3. **Never prefix-sweep** cleanup by name prefix; only exact identity from this run.
4. **List GET failure ≠ absent** — treating empty UI as success leaves orphans.
5. **Secret hygiene** — only `E2E_ISOLATION_PASSWORD`; do not paste it into logs/PRs.
6. **Unequal saves need migration cutover** — app validation alone may still hit the old DB CHECK if migration #384/#404 is undeployed.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/e2e-flexible-session-production.yml` | Main-only dispatch job |
| `e2e/flexible-session-category.spec.ts` | Production UI workflow |
| `utils/e2e-flexible-session-safety.ts` | Ignore flag + cleanup decision helpers |
| `playwright.config.ts` | Applies `testIgnore` unless env opt-in |
| `utils/__tests__/e2e-flexible-session-production-workflow.test.ts` | Contract tests for workflow + helpers (no live browser) |

---

## Verify (no Production)

```bash
npx vitest run utils/__tests__/e2e-flexible-session-production-workflow.test.ts
```
