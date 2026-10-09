# Ship to main (required checks + production)

**When to use:** Clarifying how work reaches production (`app.simy.ch`); a PR sits “waiting for checks”; Cursor/Vercel looks green but GitHub will not merge; understanding auto-merge status after #222.

Verified against source (Sep 2026). Companion Cursor rule: `.cursor/rules/ship-to-main.mdc`. Impact gate: [IMPACT_ANALYSIS.md](./IMPACT_ANALYSIS.md) (#143).

---

## Intent

Production deploys **only** from protected `main` (Vercel). Engineers open PRs into `main`; required GitHub Actions must pass before merge. Work-in-progress stays **draft**.

**Auto-merge is currently disabled.** `#222` (`e79640f8`) removed `.github/workflows/auto-merge.yml`. Ready PRs do **not** arm `gh pr merge --auto`. Merge is a human (or explicitly authorized) action after required checks are green.

> Draft doc PR #168 and older runbooks that describe always-on squash auto-merge are **stale** relative to `main` until rebased against #222. Open PR #167 proposes restoring **GREEN-only** auto-merge with risk classification — document that behavior only after it lands.

---

## Contract

| Piece | Behavior on `main` today |
|-------|--------------------------|
| Production host | `app.simy.ch` from Vercel → `main` |
| Entry path | PR into `main` (never push directly to `main`) |
| Auto-merge workflow | **Absent** — `.github/workflows/auto-merge.yml` deleted in #222 |
| Required Actions (documented policy) | **Test and lint** and **E2E login** from `.github/workflows/ci.yml` |
| Preview “6/6” | Bugbot + Vercel previews — **not** a merge signal |
| Docs automation branches | `vercel.json` skips deploys for `cursor/engineering-documentation-updates-*` |

### CI jobs (`.github/workflows/ci.yml`)

| Job `name` | What runs | Policy role |
|------------|-----------|-------------|
| **Test and lint** | `npm test`, `npm run lint`; `npm run audit:prod` is `continue-on-error` | Required per ship-to-main |
| **E2E login** | Wait for simy-app preview (PRs) or use `https://app.simy.ch` (pushes to `main`); Playwright | Required per ship-to-main |

Also present (do **not** invent branch-protection membership without checking GitHub settings):

| Workflow | Notes |
|----------|-------|
| `.github/workflows/dependency-review.yml` | Job **Dependency review** on PRs to `main`; fails on new high/critical advisories |

### Composition with Impact Analysis (#143)

1. Impact Analysis / Implementation Gate when Activation Policy requires it
2. Implementation in approved scope only
3. Verification / test floor from the gate + `.cursor/docs/change-risk-guide.md`
4. This ship path (PR → Actions → merge → Vercel)

Hard rules:

- A **SAFE** Impact Gate does **not** replace required checks or merge discipline
- Green CI does **not** retroactively replace required Impact Analysis
- **CRITICAL** changes are not Ready-to-Ship until their Impact + change-risk verification floor is satisfied

---

## Developer workflow

1. Branch from **`origin/main`** (not a dirty feature branch). Keep hotfixes small.
2. Open a PR into **`main`**. Never `git push` to `main`.
3. Keep WIP as a **draft**. Mark ready only when it should ship.
4. Wait for **Test and lint** + **E2E login**. Ignore “all previews green” as a merge signal.
5. **Merge manually** (squash preferred unless the team says otherwise) once checks and any required Impact verification are done.
6. After merge, Vercel deploys production from `main`.

---

## Pitfalls

1. **Preview green ≠ mergeable** — Bugbot / Vercel status checks are not the Actions pair ship-to-main cares about.
2. **Expecting auto-merge** — The workflow file is gone on `main` (#222). Ready PRs will not self-merge.
3. **Draft forever** — Drafts should not be treated as ship candidates.
4. **Stale `preview` branch** — Not a staging path and not production.
5. **Checks never appear** — Open [Actions](https://github.com/Kilchi555/driving-team-app/actions). If `CI` did not start within about a minute, push a follow-up commit or re-run the workflow.
6. **Docs / Dependabot PRs** — Preview builds may be skipped (`scripts/vercel-should-build.mjs`); E2E then falls back to production. Still wait for Actions jobs.
7. **Do not drop branch protection** to unblock a stuck PR unless an owner explicitly asks after Actions failed to start.
8. **Do not document #167 auto-merge behavior as live** until that PR merges.

---

## Ops checks

| Symptom | Check |
|---------|--------|
| PR never merges by itself | Expected after #222 — merge manually when green |
| CI red / Expected | Are **Test and lint** and **E2E login** both green? Any still “Expected”? |
| E2E red on docs-only PR | Preview likely skipped → hitting `app.simy.ch`; confirm `E2E_*` / bypass secrets |
| Want a preview for CI | Commit message containing `[vercel deploy]` (see Vercel ignore script) |
| Elevated-risk change | Confirm Impact Gate + approval before treating the PR as Ready |

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/ci.yml` | **Test and lint** + **E2E login** |
| `.github/workflows/dependency-review.yml` | PR dependency advisory gate (present on `main`) |
| `scripts/wait-for-simy-preview.mjs` | Preview wait / production fallback for E2E |
| `scripts/vercel-should-build.mjs` | Vercel ignore / force-deploy heuristics |
| `vercel.json` | Skips deploys for `cursor/engineering-documentation-updates-*` |
| `.cursor/rules/ship-to-main.mdc` | Always-on Cursor reminder (same policy) |
| [IMPACT_ANALYSIS.md](./IMPACT_ANALYSIS.md) | Pre-implementation gate (#143) |
