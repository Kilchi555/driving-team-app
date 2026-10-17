# CI Quality Gate & Dependabot

**When to use:** A PR is red on “Test and lint”, validators reject bad UUIDs in appointment/payment payloads, or Dependabot PRs need triage after the Monday batch.

---

## Intent

Vercel deploys from `main`. GitHub Actions workflow `.github/workflows/ci.yml` is the blocking gate before merge:

| Job | What runs | Blocking? |
|-----|-----------|-----------|
| `quality` | `npm test` (Vitest) + `npm run lint` (ESLint on the unit test suite) | Yes |
| `quality` | `npm run audit:prod` | No (`continue-on-error`) — known unfixed highs |
| `e2e` | Playwright login + tenant isolation | Yes |

PRs run E2E against the Vercel **simy-app** preview (needs `VERCEL_AUTOMATION_BYPASS_SECRET`). Pushes to `main` use `https://app.simy.ch`.

Local pre-push smoke tests are separate and skippable with `SKIP_SMOKE_TEST=1` — they are **not** a substitute for this CI gate.

---

## Unit tests (validators / UUID)

Vitest config: `vitest.config.ts` → `server/utils/__tests__/**/*.test.ts`.

Scripts:

| Script | Purpose |
|--------|---------|
| `npm test` | Full unit suite (what CI runs) |
| `npm run test:validators` | Only `validators.test.ts` |
| `npm run lint` | `eslint "server/utils/__tests__/**/*.ts" --max-warnings 0` |

### Appointment / payment UUID rules

`validateAppointmentData` / `validatePaymentData` in `server/utils/validators.ts` reject non-UUID ids:

| Field | Required UUID? |
|-------|----------------|
| Appointment `user_id`, `staff_id`, `tenant_id` | Yes |
| Payment `user_id` | Yes |
| Payment `appointment_id` | If present, must be UUID |

Invalid values surface as German field errors (e.g. `Ungültige Benutzer-ID`). Coverage lives in `server/utils/__tests__/validators.test.ts` (added with the quality-gate CI change).

---

## E2E (summary)

- Workflow sets `E2E_BASE_URL` to the preview URL on `pull_request`, else production app URL.
- PR without `VERCEL_AUTOMATION_BYPASS_SECRET` fails fast in the Playwright step.
- Isolation / bypass details: see `docs/E2E_PREVIEW_CI.md` / `docs/E2E_TENANT_ISOLATION.md` when those runbooks are on the branch (open docs PRs).

---

## Dependabot

Config: `.github/dependabot.yml`

| Ecosystem | Schedule | Open PR cap | Grouping |
|-----------|----------|-------------|----------|
| `npm` (`/`) | Weekly Monday | 5 | `production-patches` (prod minor/patch), `development` (dev deps) |
| `github-actions` (`/`) | Weekly Monday | 2 | (ungrouped) |

Security updates from GitHub Dependabot security alerts are separate from this weekly schedule.

**Ops tips:**

1. Prefer merging grouped patch/minor PRs after CI green; treat major bumps (e.g. Nuxt 4 in `/apps/website`) as product review.
2. Cap is intentional so Dependabot does not drown product PRs — expect a backlog if many majors open.
3. CI `audit:prod` staying yellow does not block merge; track xlsx / transitive Nuxt-Vite debt outside the red gate.

---

## Pitfalls

1. **Lint only covers unit tests** — `npm run lint` does not ESLint the whole app; green lint ≠ app-wide style compliance.
2. **Audit is report-only** — do not assume “CI green” means no critical npm advisories.
3. **Preview E2E secret** — missing bypass secret fails PRs even when unit tests pass.
4. **UUID validation is central** — callers must use `validateAppointmentData` / `validatePaymentData`; endpoints that skip them will not get this guardrail.
5. **Dependabot directory `/` only** — nested app lockfiles under `apps/*` may still get separate Dependabot PRs if GitHub detects them; check each PR’s path.

---

## Codepaths

- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `vitest.config.ts`
- `package.json` (`test`, `test:validators`, `lint`, `audit:prod`, `test:e2e`)
- `server/utils/validators.ts`
- `server/utils/__tests__/validators.test.ts`
- `server/utils/__tests__/tenant-terminology.test.ts` (also in CI unit suite)
