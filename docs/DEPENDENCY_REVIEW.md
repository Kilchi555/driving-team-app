# Dependency review CI gate

**When to use:** A PR is blocked by the **Dependency review** check; Dependabot bumps look fine locally but GitHub fails the PR; clarifying whether old High/Critical advisories on `main` must be fixed before merging unrelated work.

Verified against source (Sep 2026). Commit `38ba0f1b` (#100). Companion: root [`SECURITY.md`](../SECURITY.md) for private vulnerability reports (not a substitute for this CI gate).

---

## Intent

Pull requests into `main` must not **introduce new** High or Critical dependency advisories. Existing Dependabot debt already on `main` is **not** re-litigated by this job — the action diffs the PR’s dependency changes only.

---

## Contract

| Item | Value |
|------|--------|
| Workflow | `.github/workflows/dependency-review.yml` |
| Trigger | `pull_request` → `main` |
| Action | `actions/dependency-review-action@v4` |
| Fail threshold | `fail-on-severity: high` (High **and** Critical fail; Moderate/Low do not) |
| Permissions | `contents: read` |
| Timeout | 10 minutes |

This is separate from **Test and lint** / **E2E login** (required for squash auto-merge). Treat Dependency review as a required security hygiene check when it appears on the PR; do not disable it to unblock merges.

---

## Pitfalls

1. **“Main already has High CVEs”** — Expected. The gate only fails when the PR’s lockfile/manifest **adds or upgrades into** a new High/Critical advisory (or otherwise introduces one relative to the base). Cleaning historical debt is a separate Dependabot / upgrade effort.
2. **Transitive bumps** — A minor direct bump can pull a transitive package with a High advisory. Fix by upgrading further, choosing a different version, or replacing the direct dependency — not by skipping the workflow.
3. **Apps workspaces** — Advisories under `apps/simy` / `apps/website` lockfiles still count when the PR changes those manifests. Review the check annotations for the exact package path.
4. **Not a substitute for CodeQL / secret scanning** — Dependency review is advisory-database based. Runtime auth bugs and leaked secrets use other workflows and `SECURITY.md`.

---

## Ops checks

On a failing PR:

1. Open the **Dependency review** job → expand the step annotations for package name, severity, and advisory URL.
2. Reproduce locally with an updated lockfile (`npm audit --omit=dev` is a rough signal; GitHub’s GHSA set can differ — trust the Action output for merge decisions).
3. Prefer upgrading the offending package (or its parent) in the same PR; avoid `fail-on-severity` relaxations.

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/dependency-review.yml` | PR gate into `main` |
| `package-lock.json` / `apps/*/package-lock.json` | Manifests the Action diffs |
| `SECURITY.md` | Private vulnerability disclosure contact |
| `.github/workflows/ci.yml` | Separate Test and lint / E2E login (auto-merge) |
