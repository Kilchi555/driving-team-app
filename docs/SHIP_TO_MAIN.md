# Ship to main (auto-merge + required checks)

**When to use:** A ready PR into `main` sits “waiting for checks” forever; Cursor/Vercel shows green but GitHub will not merge; clarifying which jobs actually unblock production.

Verified against source (Sep 2026). Commit `72817536` (#86). Companion Cursor rule: `.cursor/rules/ship-to-main.mdc`.

---

## Intent

Production (`app.simy.ch`) deploys **only** from protected `main`. Non-draft PRs into `main` enable **squash auto-merge**; GitHub merges only after the required Actions jobs succeed. Vercel then deploys production from the merge commit.

---

## Contract

| Piece | Behavior |
|-------|----------|
| Workflow | `.github/workflows/auto-merge.yml` |
| Trigger | `pull_request` → `main` on `opened` / `ready_for_review` / `reopened` / `synchronize` |
| Draft PRs | Job skipped (`if: github.event.pull_request.draft == false`) — stay unmerged until marked ready |
| Action | `gh pr merge <n> --auto --squash` with `GITHUB_TOKEN` |
| Required checks (auto-merge waits) | **Test and lint** and **E2E login** from `.github/workflows/ci.yml` |
| Not required for auto-merge | Cursor Bugbot, Vercel preview “6/6”, Dependabot-only greenery |

CI workflow (`.github/workflows/ci.yml`):

| Job `name` | What runs | Blocks merge? |
|------------|-----------|---------------|
| **Test and lint** | `npm test`, `npm run lint`; `npm run audit:prod` is `continue-on-error` | Yes (tests + lint) |
| **E2E login** | Wait for simy-app preview (PRs) or use `https://app.simy.ch` (pushes to `main`); Playwright | Yes |

---

## Developer workflow

1. Branch from **`origin/main`** (not a dirty feature branch). Keep hotfixes small.
2. Open a PR into **`main`**. Never `git push` to `main`.
3. Keep WIP as a **draft**. Mark ready only when it should ship — that enables auto-merge.
4. Wait for **Test and lint** + **E2E login**. Ignore “all previews green” as a merge signal.
5. After squash merge, Vercel deploys production from `main`.

---

## Pitfalls

1. **Preview green ≠ mergeable** — Bugbot and Vercel status checks are not the branch-protection pair auto-merge waits on.
2. **Draft forever** — Auto-merge never arms until the PR is ready for review.
3. **Stale `preview` branch** — Not a staging path and not production.
4. **Checks never appear** — Open [Actions](https://github.com/Kilchi555/driving-team-app/actions). If `CI` did not start within about a minute, push an empty follow-up commit or re-run the workflow. Auto-merge cannot finish while GitHub still expects missing required checks.
5. **Docs / Dependabot PRs** — Preview builds may be skipped (`scripts/vercel-should-build.mjs`); E2E then falls back to production. That is expected — still wait for the Actions jobs, not a PR-specific preview URL.
6. **Do not drop branch protection** to unblock a stuck PR unless an owner explicitly asks after Actions failed to start.

---

## Ops checks

| Symptom | Check |
|---------|--------|
| Auto-merge queued, never merges | Are **Test and lint** and **E2E login** both green? Any still “Expected”? |
| E2E red on docs-only PR | Preview likely skipped → hitting `app.simy.ch`; confirm secrets `E2E_*` / bypass still valid |
| Auto-merge job skipped | PR is still draft |
| Want to force a preview for CI | Commit message containing `[vercel deploy]` (see Vercel ignore script) |

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/auto-merge.yml` | Enable squash auto-merge on non-draft PRs to `main` |
| `.github/workflows/ci.yml` | **Test and lint** + **E2E login** |
| `scripts/wait-for-simy-preview.mjs` | Preview wait / production fallback for E2E |
| `.cursor/rules/ship-to-main.mdc` | Always-on Cursor reminder (same policy) |
| `vercel.json` | Skips deploys for `cursor/engineering-documentation-updates-*` (docs branches) |
