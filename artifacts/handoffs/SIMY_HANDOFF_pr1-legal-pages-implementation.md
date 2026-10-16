# SIMY Handoff — PR 1 Legal Pages Implementation

## Verdict

`CONDITIONAL PASS`

The code change is ready for review. It is not merge approval, not a production deploy, and not permission to point `fahrschule-sara.ch` at SIMY. The Wix site stays production.

## Base and result

| Item | SHA / state |
|---|---|
| Requested base | `f1efbe6d471584ecc1da0f621dabb52727088ec4` |
| `origin/main` at implementation start | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| Branch | `cursor/legal-pages-http-500-5594` |
| Resulting commit | filled in after commit |

`main` had moved by one commit: `security(invoices): reject payment fields on generic invoice update (#445)`. That commit does not touch the legal route, the sanitizer, or website HTML. The safe base used is current `origin/main`.

`artifacts/handoffs/SIMY_HANDOFF_pr1-legal-pages-gate.md` is not in the working tree or on `origin/main`. The implementation follows the contract in the PR 1 task. No other legal-page branch was reused. Open PRs were listed and none is this change.

## Root cause

**Confirmed mechanism.** `isomorphic-dompurify@2.35.0` (Node entry `index.js`) does this while the module is evaluated, before any caller runs:

```js
module.exports = global.DOMPurify = global.DOMPurify || (
  typeof window !== "undefined"
    ? dompurify
    : (function () {
        const { JSDOM } = require("jsdom");
        const { window } = new JSDOM("<!DOCTYPE html>");
        return DOMPurify(window);
      })()
);
```

`server/api/public/website/[subdomain]/legal.get.ts` imported `sanitizeTenantHtml`, which imported that package at module scope. If `new JSDOM(...)` throws, Nitro never registers the handler. Validation cannot run, and the platform returns a generic HTTP 500 with no stack.

**Why this matches the live failure, without a captured Vercel stack.**

- `GET /api/public/website/fahrschule-sara/legal?type=impressum` and `type=datenschutz` returned HTTP 500, `x-vercel-cache: MISS`, body only `Server Error` (16 Oct 2026, about 11:34–11:37 UTC).
- The HTML routes returned HTTP 200 and rendered “Nicht gefunden” because `pages/s/[subdomain]/impressum.vue` and `datenschutz.vue` treat any fetch error as missing.
- Supabase edge logs for those requests did not show this route’s tenant select (`legal_form`, `handelsregister_nr`, `contact_person_first_name`). Other public website routes on the same host returned HTTP 200 and did query Supabase.
- Those other routes do not import `isomorphic-dompurify`. This legal route did.

**Remaining hypothesis.** In this environment `require('isomorphic-dompurify')` succeeds in about 300 ms. The production exception text was not in the HTTP body and is not in a Vercel log this session could read. A different import-time failure of the same module would look identical. A failure after the handler starts would not: the handler now catches that and either returns escaped generator HTML or a controlled HTTP 500.

## Files

| File | Why |
|---|---|
| `utils/sanitize-tenant-html.ts` | Load DOMPurify on first use via `createRequire`. Importing the module no longer constructs JSDOM. Sync signature kept for existing Vue callers. |
| `server/api/public/website/[subdomain]/legal.get.ts` | Validate type and subdomain before sanitizing. Unknown type is HTTP 404. Sanitizer failure on tenant reglement HTML is a closed HTTP 500. Sanitizer failure on generator HTML falls back to the already escaped generator string. Unexpected errors become HTTP 500 with `Legal page unavailable` and no internal message. |
| `server/utils/__tests__/public-website-legal.http.test.ts` | Route contract tests. Supabase and the sanitizer are mocked. |
| `server/utils/__tests__/p1-upload-vhtml-hours.test.ts` | Asserts the sanitizer has no top-level DOMPurify import. The existing script-stripping test still calls the real library. |

No DNS, Vercel, schema, production data, or domain changes.

## Tests

Executed:

```text
npx vitest run server/utils/__tests__/public-website-legal.http.test.ts server/utils/__tests__/p1-upload-vhtml-hours.test.ts
```

Result: 2 files, 21 tests, all passed.

```text
npx eslint "server/utils/__tests__/public-website-legal.http.test.ts" "server/utils/__tests__/p1-upload-vhtml-hours.test.ts" --max-warnings 0
npm run lint
```

Result: exit 0. `npm run lint` is ESLint on `server/utils/__tests__/**/*.ts` only.

| Test | Kind |
|---|---|
| Valid Impressum | Mocked route. Real `buildImpressumHtml` escaping. |
| Valid Datenschutz without reglement | Mocked route. Real `buildDatenschutzHtml` escaping. |
| Missing type → 400 | Mocked route. Sanitizer throw is not reached. |
| Unknown type → 404 | Mocked route. No database call. |
| Unknown subdomain → 404 | Mocked Supabase returns no website. |
| Missing tenant row → 404 | Mocked Supabase. |
| Sanitizer init failure still allows validation | Mocked sanitizer throws. 400/404 happen first. |
| Sanitizer failure does not return tenant HTML | Mocked throw and mocked pass-through of `<script>`. Response is HTTP 500 and the error body has no tenant script. |
| Empty sanitizer result falls back to escaped generator HTML | Mocked empty string. |
| Sanitizer throw falls back to escaped generator HTML | Mocked throw. |
| Unexpected tenant query error | Mocked throw. HTTP 500 text is `Legal page unavailable` and does not include the database error. |
| Tenant isolation | Mocked query log. Reglement read uses website `tenant_id` only. Other tenant marker is absent. |
| Real DOMPurify strips `<script>` | Executed in `p1-upload-vhtml-hours.test.ts` against installed `isomorphic-dompurify`. |
| No top-level DOMPurify import | Source assertion. |

Not executed:

- Live HTTP against `app.simy.ch` after this patch. Production was not deployed.
- Playwright / browser render of `/s/fahrschule-sara/impressum`.
- Full `vue-tsc` / `nuxi typecheck`. CI does not run a typecheck today. Nuxt types were generated locally with `nuxt prepare` so Vitest could parse `tsconfig.json`. That output is not part of the commit.
- A Vercel preview of the Nitro bundle. Local `require('isomorphic-dompurify')` succeeds, so this VM does not reproduce the production crash.

Passing unit tests do not mean production is fixed.

## HTTP behavior

| Request | Before (live 16 Oct 2026) | After this patch |
|---|---|---|
| `?type=impressum` for published `fahrschule-sara` | HTTP 500 `Server Error` | HTTP 200 with escaped Impressum HTML, sanitized when DOMPurify loads, otherwise the escaped generator string |
| `?type=datenschutz` with no active reglement | HTTP 500 | HTTP 200 with escaped Datenschutz HTML, same fallback rule |
| `?type=datenschutz` with active reglement HTML | Not Sara’s current data (no active row) | Sanitized HTML, or HTTP 500 if sanitizing fails. Raw reglement HTML is not returned |
| Missing `type` | HTTP 400 | HTTP 400 |
| Unknown `type` such as `agb` | HTTP 400 | HTTP 404 `Not found` |
| Unknown subdomain or missing tenant | HTTP 404 once the handler runs | HTTP 404 |
| Unexpected server error | HTTP 500 `Server Error`, sometimes before the handler | HTTP 500 `Legal page unavailable`, no stack and no driver message |

The Vue pages still show “Nicht gefunden” for any failed fetch. That text changes only when the API returns 200. Those Vue files were not edited.

## Sanitization and fallback

`buildImpressumHtml` and `buildDatenschutzHtml` in `server/utils/website-premium.ts` put tenant fields through `escapeHtml`, which encodes `&`, `<`, `>`, and `"`. Static markup is fixed template text. `mailto:` and `tel:` stay inside double-quoted attributes, so a quote in an email cannot break out.

Fallback is used only for that generator string, and only when the result does not still contain a raw `<script`, a closing script tag, an inline `on…=` handler, or a `javascript:` URL. Escaped text such as `&lt;script&gt;` does not match.

Tenant `tenant_reglements.content` never uses the fallback. If sanitizing throws, or the result still looks executable, the handler throws HTTP 500 and does not include the HTML.

`createRequire` keeps the first-call load synchronous for existing Vue callers. A failed load is remembered for the process so a broken JSDOM is not reconstructed on every request.

## Remaining blockers

1. Preview or production must be requested by a person, then `GET /api/public/website/fahrschule-sara/legal?type=impressum` and `type=datenschutz` must return HTTP 200 and the HTML pages must show the legal text rather than “Nicht gefunden”.
2. The Vercel exception string is still unread. If the preview still returns HTTP 500, the next step is that log, not a wider rewrite.
3. UID and Handelsregisternummer for this tenant are empty. That is a content/legal question, not this patch.
4. Custom-domain cutover stays blocked. `fahrschule-sara.ch` stays on Wix.

## Next permitted action

Human review of this branch. Opening a PR, merging, deploying, and changing DNS were not authorized by this task and were not done.
