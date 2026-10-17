# PR 1 Implementation — Legal pages HTTP 500

> Contract correction in `3f4f4642`: missing `type`, unknown `type`, and an empty subdomain again return HTTP 400 `subdomain and type required`, matching `origin/main`. The 404 note later in this file describes only the earlier commit `94f07a83`.



Implementation only. No pull request, merge, deploy, migration, production write, DNS change, or production configuration change.

## Verdict

`CONDITIONAL PASS`

The authorized code change is in place and the focused tests pass. This is not merge approval and it is not proof that the live HTTP 500 is gone. Production was not called again after the change. The original exception text was never captured, so lazy `isomorphic-dompurify` initialization remains the leading hypothesis that this change removes, not a stack-confirmed root cause.

## SHAs

| Item | Value |
| --- | --- |
| Required base at task start | `f1efbe6d471584ecc1da0f621dabb52727088ec4` |
| `origin/main` when implementation finished | `57543d57dd27b9ceabd84894cc74a1123fdb45dd` |
| Product commit | `94f07a8396415de74a50880422de6d5c9b6273d2` |
| Branch | `cursor/legal-pages-http-500-adc4` |
| This handoff | Committed on top of the product commit. The branch HEAD is that later commit. Its parent is `94f07a8396415de74a50880422de6d5c9b6273d2`. |

`origin/main` moved during the task. The only new commit is `57543d57` `security(invoices): reject payment fields on generic invoice update (#445)`. Its files are invoice update allowlisting and two invoice handoffs. It does not touch `legal.get.ts`, the sanitizer, the legal pages, `website-premium.ts`, or preview access. The legal-page gate still applies. No invoice code was edited here.

## Root cause

**Confirmed before this change.** On 2026-10-16, public GETs of `/api/public/website/fahrschule-sara/legal` returned Nitro's generic 500 for a missing type, an unknown type, impressum, datenschutz, and an unknown subdomain. The landing route for the same tenant returned 200. The legal handler's own `createError` branches were not running.

**Implemented, not stack-proven.** `utils/sanitize-tenant-html.ts` imported `isomorphic-dompurify` at module scope. That evaluates jsdom while the Nitro route module loads. A throw there happens before the handler, and before any try/catch inside it. The fix loads DOMPurify on first use with `createRequire`, inside try/catch.

**Still a hypothesis.** No production log line names the exception. If a post-deploy public GET with no `type` is still a generic 500, this hypothesis is wrong and the change must not be extended in place.

## Files

| File | Why |
| --- | --- |
| `utils/sanitize-tenant-html.ts` | Defer DOMPurify. `trySanitizeTenantHtml` returns `{ ok: false }` on init or sanitize failure and never returns the input unchanged. `sanitizeTenantHtml` and `sanitizeSvgMarkup` return `''` on failure, so onboarding, registration, admin preview, and SVG callers cannot echo raw markup. |
| `server/api/public/website/[subdomain]/legal.get.ts` | Explicit `h3` imports so the route can run under vitest. Missing type is 400. Unknown type is 404. Unknown or empty subdomain, unpublished site, and missing tenant are 404. Tenant query errors no longer copy `tenantError.message`. Stored reglement HTML is returned only after a successful non-empty sanitize. Generator output is the fallback. Unexpected throws become HTTP 500 `Server Error` with no original message. |
| `pages/s/[subdomain]/impressum.vue` | HTTP 5xx renders “Rechtstext vorübergehend nicht verfügbar”. Other errors stay “Nicht gefunden”. `v-html` remains only on the success payload. |
| `pages/s/[subdomain]/datenschutz.vue` | Same error split as Impressum. |
| `server/utils/__tests__/website-legal-pages.http.test.ts` | Handler regressions with fixture tenants A and B. No production client. |
| `server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts` | Sanitizer loader throws. Reglement HTML must not come back. |
| `server/utils/__tests__/p1-upload-vhtml-hours.test.ts` | Source scan also accepts `trySanitizeTenantHtml`. |

Not changed: `buildImpressumHtml` / `buildDatenschutzHtml`, address assembly, cache headers, map, schema.org, testimonials, reviews, team, SEO, FAQ, catalog, pricing, schema, migrations.

## HTTP behavior

Production “before” is the 2026-10-16 public GET from the gate. “After” is the vitest handler, not a live request.

| Case | Before (production) | After (unit handler) |
| --- | --- | --- |
| Missing `type` | 500 Nitro `Server Error` | 400 `type required` |
| `type=nope` | 500 Nitro `Server Error` | 404 `Unknown legal type` |
| Published impressum | 500 | 200, escaped generator HTML |
| Published datenschutz, no reglement | 500 | 200, existing short template |
| Datenschutz reglement with `<script>` | 500 | 200, script removed, allowed text kept |
| Unknown subdomain | 500 | 404 `Website not found` |
| Unpublished, no token | not separately measured live | 404 |
| Unpublished A with tenant B's preview token | not separately measured live | 404, no tenant A HTML |
| Non-string reglement content | not measured | 200 generated template, raw payload absent |
| Supabase client throws | 500 with whatever Nitro leaked | 500 `Server Error`, body has no internal message |
| Page on 5xx | “Nicht gefunden” | “Rechtstext vorübergehend nicht verfügbar” (template only) |
| Page on 404 | “Nicht gefunden” | “Nicht gefunden” |

Unknown `type` is 404 because this implementation task required 404. The earlier gate matrix said 400, which is also what the old handler intended (`subdomain and type required`). Empty subdomain is 404. A database failure is not turned into “Nicht gefunden”.

## Sanitizer and fallback

- Tenant reglement HTML is used only when `trySanitizeTenantHtml` returns `ok: true` and the sanitized string is non-empty.
- Init failure, sanitize throw, empty sanitize result, non-string content, or a query throw all skip the reglement row.
- The replacement is `buildDatenschutzHtml` / `buildImpressumHtml`. Those builders run private `escapeHtml` for `&`, `<`, `>`, and `"`. The fallback string is that builder output, not the tenant HTML field.
- If sanitizing the builder output fails, the handler still returns that already escaped builder string. It does not return unsanitized reglement markup.
- Other `sanitizeTenantHtml` callers get `''` when DOMPurify cannot run. They do not receive the original string.
- A quote inside an email is escaped to `&quot;`, so it stays inside the `mailto:` value.

## Tests executed

Executed, exit 0, 2026-10-16:

`npx vitest run server/utils/__tests__/website-legal-pages.http.test.ts server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts server/utils/__tests__/p1-upload-vhtml-hours.test.ts`

```
Test Files  3 passed (3)
Tests       24 passed (24)
```

`website-legal-pages.http.test.ts` 14 tests. `website-legal-sanitizer-fallback.http.test.ts` 3 tests. `p1-upload-vhtml-hours.test.ts` 7 tests.

`npx eslint "server/utils/__tests__/**/*.ts" --max-warnings 0` exit 0. That is the repository lint script (`npm run lint`).

Not executed:

- Full `npm test` (`vitest run` of the whole suite, plus `node --test scripts/ci/validate-supabase-db-url.test.mjs`).
- Playwright E2E login.
- Dependency review.
- A Nuxt or `vue-tsc` typecheck. CI has no typecheck step. `npm run lint` does not cover `server/api` or Vue files.
- A browser pass of Impressum / Datenschutz. The page change is the 5xx heading. The app was not started, and production was not used as a fixture.
- Any post-change request to `app.simy.ch`.

`npx nuxt prepare` was run locally so vitest could read `.nuxt/tsconfig.json`. That output is not part of the commit.

## Remaining blockers

1. Live legal URLs were not rechecked. Mocked 400/404/200 results do not show that production left the generic 500.
2. The production exception string is still unknown.
3. No pull request was opened. This task forbade creating or updating one.
4. Impressum address duplication is unchanged and stays in a later PR.

## Next authorized action

A person reviews `94f07a8396415de74a50880422de6d5c9b6273d2` on `cursor/legal-pages-http-500-adc4`. Opening a pull request, merging, deploying, and any later public GET of the legal route are separate human decisions. If a missing `type` is still a generic 500 after deploy, stop and treat the root cause as still open.
