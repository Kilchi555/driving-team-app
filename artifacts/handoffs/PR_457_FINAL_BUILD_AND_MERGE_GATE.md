# PR 457 — final build and merge gate

Verdict: **CONDITIONAL — SPECIFIC BLOCKERS**. Do not merge, undraft, or deploy.

The client-build failure on `a37f0f0a` is fixed on the product tree below. A real `NITRO_PRESET=vercel` Nuxt build completed, and the emitted legal handler was imported and called. Required GitHub checks have not been observed on this updated head. Production `app.simy.ch` was not redeployed and is not claimed fixed. The original production exception string is still unknown.

## Heads

| Role | SHA |
| --- | --- |
| Blocked head named in the task | `a37f0f0a66e0647969aeba2c5ff29091dd4d25fc` |
| Sanitizer boundary fix | `752a23ad79e96ee59dd9ccdbcb7adab50cbba911` |
| `origin/main` merged into the branch | `e1248c0b7fc5a08a439e9c3e1c15a3ce175a1a2e` |
| Product tree that was built and tested | `b8e0ae2d105910206ea8691a7db9be05352c3c61` |
| Handoff commit (this file only) | filled after the introducing commit; parent is `b8e0ae2d` |

Branch: `cursor/legal-pages-http-500-adc4`. PR: https://github.com/Kilchi555/driving-team-app/pull/457 (draft).

`git diff b8e0ae2d HEAD` must stay limited to this markdown file. A later tip whose only change is this file does not change the sanitizer or the legal handler.

GitHub still showed base `57543d57` while the remote branch was `a37f0f0a`. Local `origin/main` is `e1248c0b`. The merge commit brings that main commit onto the branch. The merge adds the company-invoice route from #446. It does not change the sanitizer.

## What changed for the client/server boundary

`utils/sanitize-tenant-html.ts` no longer statically imports `node:module`, `jsdom`, or `isomorphic-dompurify`.

- The browser path uses the static `dompurify` import only when `window` and `document` exist.
- The server path calls `process.getBuiltinModule('module').createRequire(import.meta.url)('isomorphic-dompurify')` inside `loadNodePurify()`, on the first sanitize call.
- A loader failure or a sanitize throw is cached as no purifier. `trySanitizeTenantHtml` returns `{ ok: false }` and does not return the input. `sanitizeTenantHtml` and `sanitizeSvgMarkup` return `''`.
- The legal route still throws HTTP 400 `subdomain and type required` for a missing type, an unknown type, and an empty subdomain before it sanitizes.

Files in `752a23ad`:

- `utils/sanitize-tenant-html.ts`
- `server/utils/__tests__/website-legal-pages.http.test.ts`

Files brought in by the main merge, outside this fix:

- `pages/admin/companies.vue`
- `server/api/admin/companies/[company_id]/invoices.get.ts`
- `server/utils/__tests__/company-invoices.http.test.ts`
- `utils/company-invoice-load.ts`

## Build

Command, on the product tree above:

```
NITRO_PRESET=vercel NODE_OPTIONS=--max-old-space-size=4096 npx nuxt build
```

Log: `/tmp/nuxt-vercel-build.log`. Finished 2026-10-16 12:47:46 UTC.

- Nuxt 3.17.7, Nitro 2.13.4, Vite 6.3.5
- Client: 1910 modules transformed, `Client built in 49190ms`
- Server: `Server built in 27739ms`
- Preset line: `Building for Nitro preset: vercel`
- Output: `.vercel/output/functions/__fallback.func` (227 MB, 105 MB gzip)
- Last lines: `[nitro] ✔ You can deploy this build using npx vercel deploy --prebuilt` and `EXIT:0`
- That deploy command was not run

The previous head `a37f0f0a` failed the client build: Vite reported `createRequire` is not exported by `__vite-browser-external` from `utils/sanitize-tenant-html.ts`. This build does not report that error.

esbuild warnings about BigInt and `import.meta` in `utils/logger.ts` are the existing Nitro warnings. They are not this sanitizer change.

`npx vercel deploy` was not run. Nothing was deployed.

## Tests and lint

2026-10-16 13:04:30 UTC, after the merge:

```
npx vitest run \
  server/utils/__tests__/website-legal-pages.http.test.ts \
  server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts \
  server/utils/__tests__/p1-upload-vhtml-hours.test.ts \
  server/utils/__tests__/website-public-security.test.ts
```

Vitest 3.2.7. 4 files, 35 tests, exit 0 (16 legal, 6 sanitizer fallback, 7 P1 upload, 6 public security).

```
npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0
```

Exit 0.

These are unit tests. Supabase is an in-memory double. The success paths run the real Node sanitizer. The fallback tests replace the loader. They are not a production request.

The boundary test reads `utils/sanitize-tenant-html.ts` and rejects static imports of `node:module`, `node:*`, `jsdom`, and `isomorphic-dompurify`. It requires `getBuiltinModule` / `getBuiltin?.('module')` and `nodeRequire('isomorphic-dompurify')`. It also checks these callers import the shared module and do not mention `node:module` or `isomorphic-dompurify`:

- `pages/onboarding/[token].vue`
- `pages/register/[tenant].vue`
- `pages/booking/availability/[slug].vue`
- `pages/admin/marketing/aktion.vue`
- `components/TenantLogo.vue`
- `components/ConfirmationDialog.vue`
- `components/admin/ReglementeManager.vue`
- `server/api/public/website/[subdomain]/legal.get.ts`

There is no CI `typecheck` script. `nuxt typescript.typeCheck` is false. No separate typecheck was run.

## Server-bundle evidence

Artifact inspected: `.vercel/output/functions/__fallback.func` from the build above.

`chunks/nitro/nitro.mjs` (2,756,683 bytes) contains no `isomorphic-dompurify`, `jsdom`, `JSDOM`, or `dompurify`.

`chunks/routes/api/public/website/_subdomain/legal.get.mjs` inlines the loader. The only `isomorphic-dompurify` occurrence is inside `loadNodePurify()`:

- `process.getBuiltinModule("module").createRequire(globalThis._importMeta_.url)("isomorphic-dompurify")`
- `loadPurify()` is reached from `trySanitizeTenantHtml`, not from module scope
- `handleLegal` throws `createError({ statusCode: 400, statusMessage: "subdomain and type required" })` when the subdomain is empty or the type is not `impressum` or `datenschutz`, before `getSupabaseAdmin()` and before `trySanitizeTenantHtml`
- `index.mjs` sets `globalThis._importMeta_={url:import.meta.url,env:process.env}` before the Nitro chunks load

Runtime import of that built handler, with `_importMeta_.url` set to the function `index.mjs` URL, then `Module._cache` filtered for `jsdom`, `dompurify`, and `isomorphic-dompurify`:

- import completed in 1263 ms
- cache hits after import: `[]`
- calling the default export with the same event shape as the unit tests:
  - missing `type` → status 400, message `subdomain and type required`
  - `type=nope` → status 400, message `subdomain and type required`
  - blank subdomain → status 400, message `subdomain and type required`
- cache hits after those three calls: `[]`

The first import of this handler in an earlier probe was left running after it had already printed an empty hit list; that process was killed. The timed run above exits on its own.

Companion chunk `chunks/build/sanitize-tenant-html-Cmi87Xyx.mjs` is the SSR copy of the same loader. Importing it loaded none of those three packages. The first call `s('<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>')` returned `<p>ok</p>` and then the cache contained `isomorphic-dompurify/index.js`, `dompurify/dist/purify.cjs.js`, and `jsdom/lib/api.js` (plus the rest of the JSDOM graph). `a('<svg><script>alert(1)</script><circle r="1"/></svg>')` returned `<svg><circle r="1"></circle></svg>`.

`__fallback.func/node_modules` still contains `isomorphic-dompurify`, `dompurify`, and `jsdom`, so the lazy `createRequire` can resolve them on a real sanitize. They are not evaluated at handler import.

## Client bundle

`.vercel/output/static/_nuxt/B7rEGl8y.js` (30,492 bytes):

- `node:module` index: -1
- `jsdom` index: -1
- `from "node` index: -1
- `ho()` contains `process.getBuiltinModule("module")` and `createRequire(import.meta.url)("isomorphic-dompurify")`
- `_o()` uses the browser DOMPurify path when `window` and `document` exist, and calls `ho()` only on the other path
- the chunk exports the sanitize functions and does not call them at load

The client build can include the server loader as an uncalled function. It no longer has a static `node:module` import, which is what failed Vite on `a37f0f0a`.

## Required checks

Observed on the old head `a37f0f0a` only (2026-10-16, draft PR 457):

| Check | Result on `a37f0f0a` | Counts for this head |
| --- | --- | --- |
| Test and lint | success | no |
| E2E login | success | no |
| Dependency review | success | no |
| CodeQL | success | not a required ruleset check |
| App \| Default, App \| Default \| Archive - iOS | failure / action required | not a merge blocker |
| Vercel – simy-app, simy-website, driving-team-website | reported success | no |

Those Vercel statuses were for a markdown-only tip. `scripts/vercel-should-build.mjs` exits 0 (skip) when `HEAD^..HEAD` has no app files. A skip is reported as success and is not a successful app build. Do not count `Canceled by Ignored Build Step` as a build.

This handoff commit is markdown under `artifacts/handoffs/`. Vercel will ignore it. The local Nitro build of `b8e0ae2d` is the app-build evidence. Required checks on the pushed tip were not yet available when this file was written. They must be read from the live PR after the push. A green result on `a37f0f0a` does not apply to `b8e0ae2d` or to the tip.

## Remaining blockers

- Required checks (Test and lint, E2E login, Dependency review) must pass on the final pushed head. They have not been recorded here as green.
- The PR stays draft. Merging, undrafting, deploying, production SQL, and payment changes stay human decisions.
- `app.simy.ch` was not requested again in this pass. The last live read still showed HTTP 500 for the legal API and “Nicht gefunden” on the HTML pages. This build does not change that.
- The original production exception is not confirmed. The client-build failure and the eager JSDOM evaluation in `isomorphic-dompurify` are the reasons for this change. They are not a captured production stack.
- A Vercel check that only skips this markdown commit is not evidence the app compiled on Vercel.

## Out of scope, unchanged

Address duplication in the impressum generator, testimonials, team roles, SEO, catalog, schema, migrations, and the fahrschule-sara.ch cutover were not touched. Wix stays live. No production write.
