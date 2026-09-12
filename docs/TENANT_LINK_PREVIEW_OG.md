# Tenant WhatsApp / Open Graph link previews

**When to use:** Sharing `app.simy.ch/{tenant}` (or login/register/booking URLs) in WhatsApp/Slack shows **Simy** or old **Driving Team** instead of the school; debugging crawler HTML vs the SPA; regenerating a stale preview card.

Verified against source (Sep 2026). Commit `1b78357a` (#200).

Website pages under `/s/**` already SSR their own OG tags — this runbook is about the **SPA product app**.

---

## Intent

The product app is SPA (`routeRules['/**'].ssr = false`). Link-preview crawlers do **not** run JavaScript, so they would only see the platform defaults in `nuxt.config.ts` (`Simy – Online buchen`).

For recognized preview crawlers on **app-surface** tenant URLs:

1. Resolve the tenant slug from the public path / `?tenant=`.
2. Load public branding (`tenants` via branding cache or service-role select, `is_active = true`).
3. Return a small HTML stub with tenant `og:*` / Twitter tags and a generated 1200×630 card at `/api/public/tenant/{slug}/og.png`.

A Nitro `render:html` hook also rewrites OG tags in the SPA shell for tenant app URLs (unknown crawlers / View Source). Humans and in-app browsers still get the Vue app.

---

## Contract

### Crawler detection (`isLinkPreviewCrawler`)

| UA pattern | Stub? |
|------------|-------|
| `WhatsApp/2.x`, `facebookexternalhit`, Slack/Telegram/Twitter/LinkedIn bots, etc. | Yes |
| `WhatsApp` **and** `Mozilla` (in-app browser) | **No** — serve SPA |
| Facebook in-app (`FBAN`/`FBAV`) without `facebookexternalhit` | **No** |
| Generic Googlebot | **No** (avoid indexing a stub) |

### URL → tenant (`resolvePublicTenantRef`)

| URL | Surface | Stub middleware |
|-----|---------|-----------------|
| `/{slug}`, `/login/{slug}`, `/register/{slug}`, `/booking/availability/{slug}`, `?tenant=` | `app` | Yes (if crawler) |
| `/s/{subdomain}/…` | `website` | **No** — page SSR owns SEO |
| `/api/*`, `/_nuxt/*`, static files with extensions | skipped | No |

Reserved top segments (`admin`, `login`, `booking`, …) are never treated as tenant slugs.

### Tags & image

| Field | Source |
|-------|--------|
| `og:title` | `brand_name`/`name` + tagline or terminology book action (≤70 chars) |
| `og:description` | `meta_description` → `brand_description` → local SEO default (≤160) |
| `og:site_name` | Brand / tenant name |
| `og:image` | `{origin}/api/public/tenant/{slug}/og.png` |
| Platform fallbacks in `nuxt.config` | **Simy** (not Driving Team) |

Stub response cache: `public, max-age=300, s-maxage=3600`. PNG: `max-age=3600, s-maxage=86400`. In-memory tenant OG source cache: 5 minutes (30s negative).

---

## Pitfalls

1. **WhatsApp caches aggressively** — after branding changes, re-share or refresh via [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
2. **Do not add Googlebot to the crawler list** — stubs are `noindex`; treating Googlebot as a preview bot would hurt indexing of public surfaces.
3. **Website `/s/**` must stay on page-level SEO** — middleware returns early when `surface !== 'app'`; the `render:html` plugin also skips website surfaces.
4. **Inactive / unknown slug** — `loadTenantOgSource` returns null → no stub rewrite; crawler may still see platform Simy defaults.
5. **Logo on the card** — only absolute `http(s)` logo URLs are embedded (`httpLogoUrl`); relative storage paths are skipped.

---

## Quick checks

```bash
# Stub HTML for a real tenant slug
curl -s -A 'WhatsApp/2.23.0' 'https://app.simy.ch/YOUR-SLUG' | head -40

# Humans / in-app browser must NOT get the stub
curl -s -A 'Mozilla/5.0 WhatsApp' 'https://app.simy.ch/YOUR-SLUG' | head -20

# OG card
curl -sI 'https://app.simy.ch/api/public/tenant/YOUR-SLUG/og.png'

npx vitest run \
  utils/__tests__/link-preview-crawler.test.ts \
  utils/__tests__/public-paths.test.ts \
  server/utils/__tests__/tenant-og.test.ts
```

---

## Codepaths

| Path | Role |
|------|------|
| `utils/link-preview-crawler.ts` | Preview-bot UA + skipped paths |
| `utils/public-paths.ts` | `resolvePublicTenantRef` / slug rules |
| `server/middleware/03.tenant-og-crawler.ts` | Crawler-only HTML stub |
| `server/plugins/tenant-og.ts` | SPA shell `render:html` OG rewrite |
| `server/utils/tenant-og.ts` | Load branding, build tags/HTML, caches |
| `server/api/public/tenant/[slug]/og.png.get.ts` | 1200×630 PNG card |
| `nuxt.config.ts` | Platform Simy OG defaults + SPA `routeRules` |
| `server/utils/__tests__/tenant-og.test.ts` | Tag/stub contracts |
| `utils/__tests__/link-preview-crawler.test.ts` | UA classification |
| `utils/__tests__/public-paths.test.ts` | Public slug resolution |
