# Dev dependency peers (Nuxt UI 4 + TypeScript + Vitest)

## Intent

Keep local and CI installs working with **`npm ci`** (no `--legacy-peer-deps`). CI (`.github/workflows/ci.yml`) runs `npm ci` for **Test and lint** and **E2E login**; an `ERESOLVE` failure stops the pipeline before tests run.

This repo uses **Nuxt 3.17** (Vite **6.3.x** in the tree) and **`@nuxt/ui` 4.x**. Those packages constrain TypeScript and Vitest more tightly than Dependabot’s default major bumps.

## Contract (peer ranges)

Verified against published package metadata and this repo’s lockfile:

| Package | Constraint that matters here | Why |
|---------|------------------------------|-----|
| `@nuxt/ui@4.8.1` | peer `typescript`: `^5.6.3 \|\| ^6.0.0` | TypeScript **7** is outside the peer range |
| `vitest@5.0.1` | peer `vite`: `^6.4.0 \|\| ^7 \|\| ^8` | Nuxt 3.17 resolves **Vite 6.3.5** → Vitest 5 conflicts |
| `vitest@4.1.11` | peer `vite`: `^6.0.0 \|\| ^7 \|\| ^8` | Compatible with Vite 6.3.5 |

**Compatible pin set** (last known good on `main` before the break):

- `typescript` **5.8.3** (stay on 5.8.x while `@nuxt/ui` is 4.x)
- `vitest` **4.1.11**
- `@vitest/ui` **4.1.11** (must match the Vitest major; do not leave `@vitest/ui@2` next to Vitest 4/5)
- `@nuxt/ui` **4.8.1** (unchanged)

Do **not** treat `npm install --legacy-peer-deps` / `--force` as a lasting fix. It hides the conflict that CI still rejects.

## Current breakage on `main`

As of `e32c5acb` (Dependabot **#182** development-group bump), root `package.json` declares:

- `typescript`: `^7.0.2`
- `vitest` / `@vitest/ui`: `^5.0.1`
- `@nuxt/ui`: `^4.8.1`

`npm ci` fails with:

```text
ERESOLVE could not resolve
peer typescript@"^5.6.3 || ^6.0.0" from @nuxt/ui@4.8.1
Found: typescript@7.0.2
```

### How we got here

1. **#128** — `@nuxt/ui` 2.22 → **4.8.1** (TypeScript peer becomes `^5.6.3 \|\| ^6`).
2. Still OK while TypeScript stayed **5.8.3** and Vitest **4.1.11** (post-**#180**).
3. **#182** — Dependabot bumped TypeScript → **7** and Vitest → **5**, which violates the peers above.

Open repair PRs (not yet on `main` at doc time): **#265**, **#270**. Re-check `package.json` after they merge; update the “Current breakage” section if `npm ci` is green again.

## Pitfalls

- **Independent Dependabot majors** — bumping `typescript` or `vitest` alone can break install even when `@nuxt/ui` is untouched.
- **`@vitest/ui` major drift** — keep it on the same major as `vitest`.
- **Assuming Vite 6.3 ≡ 6.4** — Vitest 5’s peer starts at **6.4.0**; Nuxt 3.17’s Vite **6.3.5** is not enough.
- **Skipping the peer check** — if `npm ci` only works with `--legacy-peer-deps` locally, CI will still fail.

## Verify

From a clean tree (no `node_modules`):

```bash
npm ci
npm test
```

`npm ci` must exit **0** without force/legacy flags.

To re-check published peers after a Dependabot PR:

```bash
npm view @nuxt/ui@4.8.1 peerDependencies.typescript
npm view vitest@$(node -p "require('./package.json').devDependencies.vitest.replace(/^[^\d]*/,'')") peerDependencies
```

## Codepaths / surfaces

- Root `package.json` / `package-lock.json` — declared ranges and lock resolutions
- `.github/workflows/ci.yml` — `npm ci` in **Test and lint** and **E2E login**
- `vercel.json` — docs-only branches `cursor/engineering-documentation-updates-*` skip Vercel deploys (install issue is still a local/CI concern)

## Related docs

- Ship / required checks: draft `docs/SHIP_TO_MAIN.md` on PR **#263** (auto-merge removed by **#222**; merge that runbook before treating it as canonical on `main`)
- Impact / architecture maps: `.cursor/docs/*` (**#143**)
