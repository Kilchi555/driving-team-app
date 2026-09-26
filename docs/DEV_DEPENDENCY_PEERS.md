# Dev dependency peers (Nuxt UI 2 + TypeScript + Vitest)

**When to use:** Local or CI `npm ci` fails with `ERESOLVE`; UI/Tailwind utilities vanish after a Dependabot bump; deciding safe majors for `@nuxt/ui`, `typescript`, or `vitest`.

Verified against source and published peers (Sep 2026). Landed repairs: **#277** (`ca362053`), **#285** (`946676e6`). Draft **#274** described the pre-repair UI 4 / TS7 break and is **superseded** by this runbook — close it without merging.

---

## Intent

Keep install and CSS working with plain **`npm ci`** (no `--legacy-peer-deps`). CI (`.github/workflows/ci.yml`) runs `npm ci` for **Test and lint** and **E2E login**. Separately, `@nuxt/ui` must stay compatible with **Nuxt 3.17** so Tailwind utilities actually load.

## Contract (current `main`)

Root `package.json` pins (exact, not caret, for the repair set):

| Package | Version on `main` | Notes |
|---------|-------------------|--------|
| `@nuxt/ui` | **2.22.3** | Latest 2.x; `compatibility.nuxt: ">=3.10.0"` |
| `typescript` | **5.8.3** | Exact pin |
| `vitest` / `@vitest/ui` | **3.2.7** | Exact pin; majors must match each other |
| `nuxt` | `^3.17.7` | Resolves **Vite 6.3.5** in the lockfile |
| Tailwind (transitive) | **3.4.19** via `@nuxtjs/tailwindcss` **6.14.0** | Brought in by Nuxt UI 2; `tailwind.config.js` is Tailwind 3 format |

`@nuxt/ui@2.22.3` has **no** TypeScript peer. Optional validation peers (`zod`, `yup`, …) are unrelated to the install break.

Do **not** treat `npm install --legacy-peer-deps` / `--force` as a lasting fix. CI still uses plain `npm ci`.

## How we got here

1. **#128** — Dependabot raised `@nuxt/ui` 2.22.1 → **4.8.1**. UI 4 declares `compatibility.nuxt: ">=4.1.0"`. On Nuxt **3.17.7** Nuxt disables the module (`NUXT_B8013`). Tailwind stopped loading → production CSS missing utilities (`.flex`, `.fixed`, `.inset-0`, …).
2. **#182** — Dependabot raised `typescript` → **7** and `vitest` → **5**. With UI still at 4.8.1, `npm ci` also failed: UI 4 peers `typescript: ^5.6.3 || ^6` (TS 7 out of range) and Vitest 5 peers `vite: ^6.4` while the tree has Vite **6.3.5**.
3. **#277** — Pinned `typescript` **5.8.3** and `vitest` / `@vitest/ui` **3.2.7** so `npm ci` resolves again.
4. **#285** — Rolled `@nuxt/ui` back to **2.22.3**. Restored `@nuxtjs/tailwindcss` + Tailwind **3**; lockfile tree for UI deps only.

### Why not stay on Nuxt UI 3/4?

- **UI 4** needs **Nuxt ≥ 4.1**.
- **UI 3** (see open **#282**) can clear `NUXT_B8013` but pulls **Tailwind 4** and expects an app CSS entry with `@import "tailwindcss"`. This repo has none; utilities still missing until a Tailwind 3→4 class migration (e.g. many `bg-opacity-*` usages). **#285** restores the known-good UI 2 + Tailwind 3 stack instead.

## Pitfalls

1. **Re-bumping `@nuxt/ui` to 3.x/4.x** without a Nuxt 4 (or full Tailwind 4) migration — module disable and/or missing CSS return.
2. **Independent Dependabot majors** on `typescript` or `vitest` — can break `npm ci` even when UI is untouched; prefer exact pins until peers are re-verified.
3. **`@vitest/ui` major drift** — keep it on the **same** version as `vitest`.
4. **Assuming Vite 6.3 ≡ 6.4** — Vitest 5’s peer starts at **6.4.0**; Nuxt 3.17’s Vite **6.3.5** is not enough.
5. **Merging draft #274 as-is** — it still claims UI **4.8.1** + Vitest **4.1.11** as the compatible set; that narrative is obsolete after **#277** / **#285**.
6. **Local legacy-peer-deps success** — does not predict CI.

## Verify

From a clean tree (no `node_modules`):

```bash
npm ci
npm test
```

`npm ci` must exit **0** without force/legacy flags.

After a Dependabot PR that touches UI / TS / Vitest:

```bash
node -p "const p=require('./package.json'); ['@nuxt/ui','typescript','vitest','@vitest/ui'].map(k=>({k,v:(p.dependencies||{})[k]||(p.devDependencies||{})[k]}))"
npm view @nuxt/ui@$(node -p "require('./package.json').dependencies['@nuxt/ui'].replace(/^[^\d]*/,'')") peerDependencies
npm view vitest@$(node -p "require('./package.json').devDependencies.vitest.replace(/^[^\d]*/,'')") peerDependencies
```

Dev / CSS smoke (after `npm run dev` or a production build): served CSS should identify **tailwindcss v3.x** and include utilities such as `.flex`, `.fixed`, `.inset-0`. Startup must **not** show `NUXT_B8013` for `@nuxt/ui`.

## Codepaths / surfaces

| Path | Role |
|------|------|
| Root `package.json` / `package-lock.json` | Declared pins and lock resolutions |
| `nuxt.config.ts` | `modules` includes `@nuxt/ui` |
| `tailwind.config.js` | Tailwind **3** config format |
| `.github/workflows/ci.yml` | `npm ci` in **Test and lint** / **E2E login** |
| `vercel.json` | Docs branches `cursor/engineering-documentation-updates-*` skip Vercel deploys |

## Related

- Ship / required checks: draft `docs/SHIP_TO_MAIN.md` on PR **#263** (`auto-merge.yml` removed by **#222**; merge that runbook before treating it as canonical on `main`)
- Impact / architecture maps: `.cursor/docs/*` (**#143**)
- Close without merge: draft **#274** (stale UI4 / TS7 narrative)
