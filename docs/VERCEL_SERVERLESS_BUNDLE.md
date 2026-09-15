# Vercel serverless bundle size (`__fallback`)

**When to use:** Deploy fails with serverless function over **250 MiB**; cold start / boot errors resolving `uuid/wrapper.mjs` after a Nitro bump; deciding whether a heavy Google client library can live in `server/`.

Verified against source (Sep 2026). Commits `0ff658a1` (#153), related Nitro bump `571e2e8f` (#150).

---

## Intent

The Nuxt/Nitro **`vercel` preset packs every `/api/**` route (including crons) into one shared serverless function** (`__fallback`). That single artifact must stay under Vercel’s **250 MiB** unzipped size limit. Concurrent invocations also share the function’s memory pool — see `nitro.vercel.functions` below.

#153 kept production deployable by:

1. Turning off **Nitro server source maps** (~10 MiB of inflation).
2. Removing **`googleapis` from the GSC cron server path** (OAuth + REST `fetch` instead) so NFT does not pull the mega-client into `__fallback`.
3. Declaring **`uuid` as a direct dependency** so NFT ships a complete ESM export path after the Nitropack 2.13 bump.

Preview *skip* logic is a separate topic (draft runbook `VERCEL_PREVIEW_BUILDS` on docs PR #118). This page is about the **deployed function size and boot**.

---

## Contract

| Knob | Value / rule | Where |
|------|----------------|-------|
| Size limit | Unzipped serverless function ≤ **250 MiB** | Vercel platform |
| Server source maps | **`nitro.sourceMap: false`** | `nuxt.config.ts` |
| Client / Vite maps | Unrelated — controlled separately under Vite | `nuxt.config.ts` |
| Shared function memory | **3009 MB** (Vercel Pro Node max) | `nitro.vercel.functions.memory` |
| Shared function duration default | **60 s** | `nitro.vercel.functions.maxDuration` |
| Route override example | GSC cron exports `maxDuration = 120` | `server/api/cron/sync-marketing-gsc.ts` |
| Heavy Google SDK | **Do not import `googleapis` from `server/`** | Use REST + OAuth (see [MARKETING_GSC_SYNC.md](./MARKETING_GSC_SYNC.md)) |
| `uuid` | **Direct** `dependencies` entry (`^11.1.0`) | `package.json` — required by several booking/auth SMS routes |

`googleapis` may remain in `package.json` for **offline scripts** (e.g. `.github/scripts/seo-report.mjs`, `scripts/upload-data-safety.mjs`). Those paths are not part of the Nitro server graph and must stay that way.

---

## Pitfalls

- **Re-importing `googleapis` (or similarly huge SDKs) under `server/`** will bloat `__fallback` again even if the GSC cron itself stays on `fetch`.
- **Do not re-enable `nitro.sourceMap: true`** for production convenience — use local/debug builds instead. Server maps alone were ~10 MiB.
- **Do not demote `uuid` to a transitive-only dep** after Nitro/NFT upgrades. After #150, missing direct `uuid` caused boot failures resolving `uuid/wrapper.mjs`.
- **Memory vs size are different failures:** OOM under concurrent crons → raise / respect `nitro.vercel.functions.memory`; deploy rejected for package size → shrink dependencies / maps (this runbook).
- Docs-only branches under `cursor/engineering-documentation-updates-*` already skip Vercel deploy via `vercel.json` `git.deploymentEnabled` — that does **not** fix a broken `__fallback` on `main`.

---

## Ops checks

1. After adding a large server dependency, inspect the Vercel build “Serverless Function” size for `__fallback` before merging.
2. If boot logs mention missing `uuid/…` ESM files, confirm `uuid` is listed under root `dependencies` and lockfile is regenerated.
3. Prefer thin HTTP clients over full Google/AWS SDKs inside Nitro routes that share `__fallback`.

---

## Codepaths

| Path | Role |
|------|------|
| `nuxt.config.ts` | `nitro.sourceMap: false`; `nitro.vercel.functions` memory/duration; `externals` for Chromium |
| `package.json` | Direct `uuid`; `googleapis` kept for scripts only |
| `server/api/cron/sync-marketing-gsc.ts` | GSC via OAuth+REST (no `googleapis`) |
| `server/api/booking/guest-book.post.ts` (and other `uuid` importers) | Need complete `uuid` ESM in the bundle |
| `.github/scripts/seo-report.mjs` | Offline `googleapis` usage (OK outside `server/`) |
| `scripts/upload-data-safety.mjs` | Offline `googleapis` usage (OK outside `server/`) |
| `vercel.json` | Crons + docs-branch deploy disable |
| [MARKETING_GSC_SYNC.md](./MARKETING_GSC_SYNC.md) | GSC cron auth, pagination, upsert |
