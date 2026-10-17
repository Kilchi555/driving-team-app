# Website legal pages — sanitizer fallback

**When to use:** Public Impressum / Datenschutz returns empty or 500 when DOMPurify fails; tenant `tenant_reglements` HTML disappears after a sanitize outage; debugging #457 availability vs XSS tradeoffs.

Verified against `main` after `ecf9694f` (#457).

Related: website preview tokens / simy-test env (open draft [`SIMY_TEST_ENV` / `WEBSITE_PREVIEW_TOKENS`](https://github.com/Kilchi555/driving-team-app/pull/314)) — access gate only. This runbook is **what HTML is returned** when the sanitizer cannot run.

---

## Intent

Public legal pages must stay **available** when HTML sanitization cannot run (missing isomorphic-dompurify, JSDOM, or runtime throw), without ever returning **executable** tenant reglement HTML. #457 makes the legal GET fail closed to the escaped generator text instead of failing the whole page.

---

## Contract

### Route

`GET /api/public/website/:subdomain/legal?type=impressum|datenschutz`

Pages: `pages/s/[subdomain]/impressum.vue`, `pages/s/[subdomain]/datenschutz.vue` (and footer links from website index/slug).

Access: `authorizePublicWebsiteRead` (published site or valid preview). Bad/missing `type` → `400 subdomain and type required` even when the sanitizer is down.

### Sanitizer (`utils/sanitize-tenant-html.ts`)

| API | Behavior |
|-----|----------|
| `trySanitizeTenantHtml(html)` | `{ ok: true, html }` after DOMPurify, or `{ ok: false }` when purify cannot load or `sanitize` throws. **Never** returns the input unchanged on failure. |
| `sanitizeTenantHtml(html)` | Convenience: sanitized string, or `''` on failure. |
| Loader | Browser: static `dompurify`. Server: deferred `createRequire` → `isomorphic-dompurify` on first use (avoids Vite bundling `node:module` into client). |

Allowed reglement tags/attrs are fixed lists (`REGLEMENT_TAGS` / `REGLEMENT_ATTR`).

### Legal handler fallback (`legal.get.ts`)

1. **Stored Datenschutz reglement** (`tenant_reglements`, `type=datenschutz`, `is_active`): use sanitized HTML only if `trySanitizeTenantHtml` succeeds, result is non-empty, and `stillLooksExecutable` is false. Otherwise fall through.
2. **Generator path** (`buildImpressumHtml` / `buildDatenschutzHtml` from `website-premium`): builders already `escapeHtml` tenant fields. Prefer sanitized builder output; if sanitize fails or still looks executable → return **raw builder string** (escaped text, not tenant reglement).
3. **Executable heuristic** (`stillLooksExecutable`): `<script`, event-handler attrs, `javascript:` — blocks returning that HTML from reglement or sanitized builder output.

Cache headers via `setWebsitePublicCache` still apply on successful responses (`sMaxAge` 600 / `swr` 3600 when published).

---

## Constraints & pitfalls

1. **Reglement dropped on sanitize failure** — operators may see the generic Datenschutz generator instead of custom policy HTML. That is intentional; do not “fall back” to unsanitized reglement.
2. **Generator ≠ unsanitized CMS** — builder output is escaped field text. Do not treat “return built HTML when purify fails” as permission to echo stored HTML.
3. **Client import surface** — do not statically import `isomorphic-dompurify` / `jsdom` from shared utils used by browser pages; keep the deferred Node loader.
4. **4xx preserved** — sanitizer outages must not turn validation/access errors into 500; the outer handler rethrows 4xx and maps other errors to `500 Server Error`.
5. **Preview vs publish** — same HTML rules; preview only changes authorization / cache privacy via `authorizePublicWebsiteRead`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/public/website/[subdomain]/legal.get.ts` | Legal GET, reglement gate, generator fallback |
| `utils/sanitize-tenant-html.ts` | `trySanitizeTenantHtml`, deferred purify load |
| `server/utils/website-premium.ts` | `buildImpressumHtml` / `buildDatenschutzHtml` (escaped) |
| `pages/s/[subdomain]/impressum.vue` / `datenschutz.vue` | Public pages fetching the legal API |
| `server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts` | Purify throw / null → generator; no script leak |
| `server/utils/__tests__/website-legal-pages.http.test.ts` | Happy-path legal responses |

---

## Quick verify

```bash
npx vitest run \
  server/utils/__tests__/website-legal-sanitizer-fallback.http.test.ts \
  server/utils/__tests__/website-legal-pages.http.test.ts
```
