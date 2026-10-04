# E2E against Vercel Preview (CI)

How Playwright login + tenant-isolation tests hit the **PR preview** instead of production. Verified against `.github/workflows/ci.yml` and `e2e/` (Aug 2026). Companion to tenant-isolation seeding (see open doc PR / `docs/E2E_TENANT_ISOLATION.md` when merged).

## Intent

PR E2E must exercise the commit under review. Pushes to `main` still run against `https://app.simy.ch`. Previews sit behind Vercel Deployment Protection, so CI needs a bypass secret and cookie seeding.

## Flow (pull_request)

1. Quality / unit jobs as defined in CI
2. **Wait for Vercel preview** — `node scripts/wait-for-simy-preview.mjs`
   - Looks up GitHub deployments for `E2E_PREVIEW_SHA` (= PR head SHA)
   - Picks environment matching `/preview/i` **and** `/simy-app/i`
   - Polls until a deployment status is `success` with `target_url` (default timeout 8 min, `E2E_PREVIEW_TIMEOUT_MS`)
   - On failure/error of one deploy, keeps waiting for a later deploy
   - Writes `url=…` to `GITHUB_OUTPUT`
3. Playwright runs with:
   - `E2E_BASE_URL` = preview URL (PR) or `https://app.simy.ch` (push to main)
   - `E2E_DEMO_PASSWORD`, `E2E_ISOLATION_PASSWORD`
   - `VERCEL_AUTOMATION_BYPASS_SECRET` (**required on PRs** — job fails if empty)

## Bypass contract

`e2e/auth.ts`:

- Extra headers on every context: `x-vercel-protection-bypass`, `x-vercel-set-bypass-cookie: true`
- Before login navigation, `unlockPreview` hits `GET /api/health` with those headers, `maxRedirects: 0`, so Chromium receives `_vercel_jwt` and does not 307-loop on `page.goto`

Isolation contexts must use `newE2EContext(browser)` (not a bare context) so the bypass headers apply.

## Required secrets

| Secret | Used for |
|--------|----------|
| `E2E_DEMO_PASSWORD` | Apple-review / demo tenant login |
| `E2E_ISOLATION_PASSWORD` | Second-tenant isolation user (from setup script) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Deployment Protection bypass on PR previews |

Also needs `GITHUB_TOKEN` (default Actions token) for the deployments API in the wait script.

## Local / debug

```bash
# Wait helper (needs repo token + SHA)
E2E_PREVIEW_SHA=<sha> GITHUB_REPOSITORY=Kilchi555/driving-team-app \
  GITHUB_TOKEN=$GH_TOKEN node scripts/wait-for-simy-preview.mjs

# Playwright against a known preview
E2E_BASE_URL=https://<preview>.vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=… \
E2E_DEMO_PASSWORD=… E2E_ISOLATION_PASSWORD=… \
  npx playwright test
```

## Pitfalls

- Missing bypass secret on PRs fails fast in the workflow (`VERCEL_AUTOMATION_BYPASS_SECRET is not set`).
- Wrong Vercel project environment name (must contain both `preview` and `simy-app`) → wait script never finds a candidate.
- Creating a Playwright context without `newE2EContext` drops bypass headers → login hangs on protection interstitial.
- First request without unlock can redirect-loop; always call `signIn` / `unlockPreview` before asserting pages.
- Production main runs do **not** need the bypass secret, but passwords are still required.

## Codepaths

- `.github/workflows/ci.yml` — Wait for Vercel preview + Playwright env
- `scripts/wait-for-simy-preview.mjs`
- `e2e/auth.ts` — `previewBypassHeaders`, `newE2EContext`, `unlockPreview`, `signIn`
- `e2e/login.spec.ts`, `e2e/isolation.spec.ts`
- `playwright.config.ts` (base URL from env)
