# Vercel preview build skipping

**When to use:** Docs-only PR never gets a Preview; E2E falls back to production; Dependabot burns Build CPU; help article edit did not redeploy `app.simy.ch`; need to force a preview with `[vercel deploy]`.

Verified against source (Sep 2026). Commits `9506ecf1` (#114), `aefc87a9` (#116).

---

## Intent

Cut unused Vercel Build CPU by skipping previews (and some production builds) when the commit does not touch that project. Exit codes for Ignored Build Step:

| Exit | Meaning |
|------|---------|
| **0** | Skip the build |
| **1** | Continue / build |

---

## Surfaces

| Project | `ignoreCommand` | Relevant paths |
|---------|-----------------|----------------|
| App (`app.simy.ch`) | `node scripts/vercel-should-build.mjs app` | Everything **except** `apps/website/**` and `apps/simy/**` |
| Marketing website | `node ../../scripts/vercel-should-build.mjs website` | `apps/website/**` |
| Simy marketing | `node ../../scripts/vercel-should-build.mjs simy` | `apps/simy/**` |

Configured in root `vercel.json`, `apps/website/vercel.json`, `apps/simy/vercel.json`.

Also: `git.deploymentEnabled` disables entire deployment trees for `dependabot/**`, `renovate/**`, `cursor/engineering-documentation-updates-*`, `bot-report/**`.

---

## Decision order (`decide()`)

1. Unknown project name → **build** (safe).
2. Commit message matches `/\[vercel deploy\]/i` → **build**.
3. Preview only:
   - Dependabot / Renovate branch or author → **skip**.
   - App project that is **not** the CI host (`app.simy.ch` / `simy-app` / known `prj_Dhk…`) → **skip** duplicate app project.
4. Cannot list changed files → **build**.
5. No project-relevant files after ignore rules → **skip**.
6. Otherwise → **build**.

---

## Ignore rules (all projects)

Skipped everywhere (unless force flag):

- Prefixes: `docs/`, `.github/`, `.cursor/`, `.agents/`, `.githooks/`, `ios/`, `android/`, `e2e/`, `migrations/`, `supabase/`, `scripts/`
- Exact: `playwright.config.ts`, `vitest.config.ts`, `LICENSE`, `CODEOWNERS`, `.gitignore`, `.editorconfig`
- `*.sql`, `**/__tests__/`, `*.test.ts`, `*.spec.ts`
- Most `*.md` / `*.mdc` — **exceptions**:
  - Marketing Content under `apps/website/` or `apps/simy/`
  - **In-app help**: `content/help/**/*.md` (not `content/help/README.md`) — these are read at runtime by `/api/help/articles`, so the **app** must rebuild (#116)

---

## CI / E2E

`scripts/wait-for-simy-preview.mjs` (used by `.github/workflows/ci.yml`):

- Waits for GitHub deployment environment matching Preview + `simy-app`.
- Reuses the same `decide({ project: 'app', … })` logic on the head commit’s file list.
- If the preview would be skipped (docs-only, Dependabot, …), writes `url=https://app.simy.ch` and `skipped=true` instead of waiting ~8 minutes.

---

## Pitfalls

- Force a build with `[vercel deploy]` in the commit message (any project).
- Editing only `docs/**` or root markdown reports will **not** deploy the app — expected.
- Editing `content/help/foo.md` **must** deploy the app; if it does not, check that `isAppHelpArticle` still treats the path as relevant and that Ignored Build Step is the shared script (not a stale copy).
- CI falls back to production when preview is skipped — E2E may pass against live data; do not assume a PR-specific URL for docs-only PRs.
- `scripts/` itself is ignored for relevance, but the ignore **command** still runs from the deployed commit’s tree.

---

## Codepaths

| Path | Role |
|------|------|
| `scripts/vercel-should-build.mjs` | Ignore decision + CLI |
| `server/utils/__tests__/vercel-should-build.test.ts` | Unit coverage |
| `scripts/wait-for-simy-preview.mjs` | CI preview wait / production fallback |
| `vercel.json` / `apps/website/vercel.json` / `apps/simy/vercel.json` | `ignoreCommand` + branch deploy disables |
| `.github/workflows/ci.yml` | Invokes wait-for-simy-preview |
