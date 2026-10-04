# Tenant Website / Landing Builder — Engineering Runbook

Verified against source on branch `cursor/engineering-documentation-updates-091e` (Aug 2026). Covers the one-pager wizard, slot editor, add-on pages, custom domains, public SSR, SEO surfaces, and media.

---

## Intent / architecture

Simy gives each tenant a **marketing landing site** stored in Supabase and rendered SSR under `/s/{subdomain}` (optionally on a verified custom domain).

| Layer | Role |
|-------|------|
| `website_tenants` | One row per tenant: subdomain, brand colors, SEO, publish flags, custom domain, `addon_pages_enabled` |
| `website_pages` | Home + optional add-on pages; **source of truth** is `blocks` JSON (`LandingPagePayload`) |
| Builders | `website-landing-builder` (home), `website-addon-builder` (location/category/prices) |
| Slot schema | `utils/website-slot-schema.ts` — only CR/SEO-safe fields editable after generate |
| Public SSR | `pages/s/[subdomain]/*` → `/api/public/website/*` |
| Custom domain | Middleware `02.custom-domain.ts` rewrites host → `/s/{subdomain}` |

**Not used by public renderer:** `website_content_blocks` (legacy; wizard explicitly does not dual-write).

Block types in payload: `hero` | `services` | `testimonials` | `faq` | `cta` | `contact`. Home template id: `onepager@v1`. Add-ons: `{page_type}@v1`.

Industry copy uses `getTerminologyDefaults(business_type)` (multi-vertical).

---

## Setup / init / publish workflow (tenant admin)

Admin UI under `pages/admin/website/` (`layout: admin`, middleware `admin`):

| Route | Purpose |
|-------|---------|
| `/admin/website` | Lead dashboard + links to editor/addons/setup |
| `/admin/website/setup` | 5-step wizard (Wer bist du → Services → Erfolg → Kontakt → SEO) |
| `/admin/website/editor` | Slot editor (home or `?page={slug}` add-on) |
| `/admin/website/addons` | Generate/list add-on pages (gated) |

### Typical flow

1. **Init** — `POST /api/website/init` (idempotent). Creates `website_tenants` + home `website_pages` (`slug=index`, `page_type=home`, empty `blocks`). Subdomain from `slugifySubdomain(tenant.slug|name)` with clash suffix.
2. **Load seed data** — `GET /api/website/init-data` pulls tenant, staff, categories, pricing, 5★ testimonials, stats, branding, SEO suggestions, Google review places.
3. **Wizard save** — `POST /api/website/wizard-save` runs `buildLandingPage`, writes home `blocks` + SEO columns, syncs brand/SEO onto `website_tenants`.  
   - **`publish` defaults to `true`** unless body sets `publish: false`.  
   - On publish: `tenants.website_status = 'live'`, email via `notifySuperadminsWebsitePublished`.  
   - On draft: `website_status = 'draft'`.
4. **Slot edit** — Editor loads `GET /api/website/pages/{slug}`, saves via `POST /api/website/slots-save` (`publish` only if `=== true`). Unknown slots rejected (`Slot nicht erlaubt / locked`).
5. **Publish-only** — `POST /api/website/publish` marks all pages + website published, sets `tenants.website_status = 'live'`, notifies superadmins.

Wizard media uploads use **`/api/tenant/upload-logo`** (client compress). Editor media uses **`/api/website/media/upload`** (server sharp normalize / video accept).

Custom domain attach/verify/remove lives in the wizard UI (`GET/POST/DELETE /api/website/custom-domain`, `POST .../verify`).

---

## Public serving path

### Subdomain (app host)

- Home: `/s/{subdomain}` → `pages/s/[subdomain]/index.vue` → `GET /api/public/website/{subdomain}`
- Add-on: `/s/{subdomain}/{slug}` → `[slug].vue` → `GET /api/public/website/{subdomain}/{slug}`
- Layout: `site`, `ssr: true`
- `?preview=1` serves unpublished site/page; sets `robots: noindex,nofollow`; skips analytics pageview
- Live prices overlaid via `applyLivePricesToLanding` (matches service ids to `pricing` table)
- Google reviews: `GET /api/public/website/{subdomain}/reviews` (cached 6h); can replace/inject testimonials block
- If verified custom domain exists and request is on app host → **301** to `https://{custom_domain}/` (home page SSR)

### Custom domain

`server/middleware/02.custom-domain.ts`:

- Skip app hosts (`isAppHost`: app.simy.ch, vercel.app, simy.ch, localhost, …)
- Lookup `website_tenants.custom_domain = host` (60s in-memory cache)
- Unknown custom host on `/` → **404** German message
- Rewrite `/` → `/s/{subdomain}`; `/{slug}` → `/s/{subdomain}/{slug}`
- **Does not rewrite** `/api/`, `/_nuxt/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/booking`, `/admin`
- Foreign `/s/{other}` on custom host → 302 to `https://{host}/`
- Middleware selects `is_published` but **does not gate** rewrites on it — publish gating is in public APIs

Canonical URL prefers verified custom domain; otherwise `app.simy.ch/s/{subdomain}` (or request host).

---

## Add-on pages unlock flow

Migration `sql_migrations/20260809_website_addon_pages.sql`:

- `website_pages.page_type` ∈ `home|location|category|prices`
- `source_ref`, `addon_inputs` JSONB
- `website_tenants.addon_pages_enabled` (default `false`) — comment: superadmin unlock; billing later

**Unlock:** Superadmin UI `pages/tenant-admin/websites/[id].vue` →  
`POST /api/tenant-admin/websites/{tenantId}/addon-unlock` `{ enabled: true|false }`  
Auth: role `super_admin` or `superadmin` only.

**Tenant generate:** `/admin/website/addons` → `POST /api/website/addon/generate`  
Requires `addon_pages_enabled`. Uses Claude Haiku (`claude-haiku-4-5`) with `fallbackAddonCopy` on failure. Inserts **unpublished** page; editor URL `/admin/website/editor?page={slug}`.

**Gates:**

| Surface | Behavior if add-ons disabled |
|---------|------------------------------|
| `addon/generate` | 403 |
| `slots-save` on non-home | 403 |
| Public `{subdomain}/{slug}` | 404 (unless `preview=1`) |

Publishing an add-on via slots-save can set `website_tenants.is_published = true` if the site was not live yet.

---

## Key APIs and auth constraints

### Authenticated tenant APIs (`getAuthenticatedUser` + user's `tenant_id`)

Most `/api/website/*` endpoints only require a logged-in user with a `tenant_id` — **they do not re-check admin role** (except media upload). Rely on admin page middleware for UI; treat API role gaps as a known constraint.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/website/init` | Idempotent create |
| GET | `/api/website/init-data` | Wizard seed |
| POST | `/api/website/wizard-save` | Build+save; publish default **true** |
| POST | `/api/website/slots-save` | Merge slots; publish opt-in |
| POST | `/api/website/publish` | Publish all pages |
| GET/PUT | `/api/website/pages/[[slug]]` | PUT rejects raw `blocks`; prefer slots-save |
| POST | `/api/website/media/upload` | Roles: `admin`, `tenant_admin`, `super_admin`, `superadmin` |
| GET/POST/DELETE | `/api/website/custom-domain` | Attach / status / detach |
| POST | `/api/website/custom-domain/verify` | DNS + Vercel verify |
| GET | `/api/website/addon/pages` | List; returns `enabled` |
| POST | `/api/website/addon/generate` | AI draft |
| POST | `/api/website/ai-optimize` | Haiku suggestions for wizard |
| POST | `/api/website/analytics/track` | **No auth**; inserts `website_analytics_events` with IP hash |

### Superadmin

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/tenant-admin/websites/[id]/addon-unlock` | super_admin / superadmin |

### Public

| Method | Path | Publish gate |
|--------|------|--------------|
| GET | `/api/public/website/[subdomain]` | yes (bypass `preview=1`) |
| GET | `/api/public/website/[subdomain]/[slug]` | yes + addon flag |
| GET | `/api/public/website/[subdomain]/reviews` | yes; cached |
| GET | `/api/public/website/[subdomain]/og.png` | **no publish check** |

Notify on publish: active users with role `super_admin`/`superadmin`, else `SIMY_WEBSITE_NOTIFY_EMAIL` / `info@simy.ch`. Non-blocking on failure.

---

## SEO / robots / llms / sitemap / OG

Resolver: `server/utils/website-seo-context.ts` — subdomain from query, custom host, or `/s/{sub}` path; returns null if not published.

| Surface | App host | Tenant custom domain | Per-sub path |
|---------|----------|----------------------|--------------|
| robots.txt | Platform robots (`public/robots.txt` or hardcoded Simy/DrivingTeam sitemaps) | Tenant Allow + Disallow `/*?preview=1` + Sitemap | `/s/{sub}/robots.txt` |
| sitemap.xml | Index pointing to simy.ch + drivingteam.ch | Published pages under `baseUrl` | `/s/{sub}/sitemap.xml` |
| llms.txt | 404 if no tenant ctx | Tenant markdown page list | `/s/{sub}/llms.txt` |

`baseUrl`: verified custom domain → `https://{domain}`; else `{proto}://{host}/s/{subdomain}`.

**OG:** `renderWebsiteOgCard` (sharp 1200×630). Public pages set `og:image` to absolute `/api/public/website/{sub}/og.png` (optional `?slug=`). Cache-Control `max-age=3600, s-maxage=86400`.

**Page head:** `de-CH`, canonical, JSON-LD from `landing.schema` (home `@graph` LocalBusiness/WebSite/FAQPage; Google aggregateRating may be patched live). Preview → `noindex,nofollow`.

Fonts: Manrope + Syne preloaded via `utils/website-landing-head.ts`.

---

## Media storage constraints

| Asset | Bucket | Processing | Limits |
|-------|--------|------------|--------|
| Logo / hero image (editor upload) | `tenant-logos` | sharp → WebP (+ AVIF); logo 400×400 contain; hero 1600×900 cover | Input ~6MB logo / 12MB hero; WebP budgets 120KB / 420KB |
| Hero video | `website-media` | No transcode; sniff MP4/WebM | Max **40MB**; public read; **service_role write only** |
| Wizard logo/hero | via `/api/tenant/upload-logo` | Client compress | Separate path from editor |

Migration `sql_migrations/20260809_website_media_bucket.sql` creates `website-media` (public, 40MB, jpeg/png/webp/gif/avif/mp4/webm).

Upload path pattern: `{tenant_id}/website/{slot}-{hash}.{ext}`. Logo upload also updates `tenants.logo_url` / `logo_square_url`. Image upload syncs `website_tenants.logo_url` / `hero_image_url`.

---

## Superadmin review surface

`pages/tenant-admin/websites/*` (`middleware: super-admin`):

- List tenants with `website_status` ≠ `none` (pending_review / approved / live / disabled)
- Detail CMS edits tenant contact/prices/staff/branding fields (Supabase client)
- Approve → `website_status=approved` + `/api/notifications/website-approved`
- Add-on unlock checkbox → addon-unlock API
- Preview links use **`/s/${tenant.slug}`** — if `website_tenants.subdomain` was uniquified with a suffix, this can **diverge** from the real public URL

`tenants.website_status` vs `website_tenants.is_published` are related but updated by different paths (wizard/publish set `live`/`draft`; SA approve sets `approved`).

---

## Common pitfalls (verified from code)

1. **`wizard-save` publish default is true** — omitting `publish` publishes.
2. **Raw `blocks` PUT disabled** — must use slots-save / slot patch.
3. **Empty home `blocks` after init only** — editor/slots-save 404 until wizard or generate ran (`isLandingPayload` required).
4. **Add-ons need superadmin unlock** — generate/edit/public all gated; UI says “Aufpreis / Billing später”.
5. **Preview bypasses publish** — anyone with the URL can view drafts (`?preview=1`); robots disallow pattern helps crawlers but URL is not secret.
6. **OG PNG ignores publish flag** — card can be fetched for unpublished sites.
7. **Custom-domain middleware does not check `is_published`** — unpublished sites still rewrite; API returns 404 without preview.
8. **Domain cache 60s** — DNS/verify changes may lag in middleware.
9. **Subdomain ≠ tenant.slug** after clash suffix — SA preview `/s/{slug}` may 404.
10. **Two upload pipelines** — wizard (`upload-logo`) vs editor (`website/media/upload`); different buckets/normalization.
11. **Hero video: no server transcode** — API returns note to upload ≤720p; muted autoplay + poster = hero image.
12. **Live prices only patch services whose ids match `pricing.id`** — baked labels remain if ids diverge.
13. **Analytics track is unauthenticated** — accepts any `website_id`.
14. **Vercel domain API optional** — without token/project, attach still stores domain; verify can succeed on DNS alone (`vercelApiMissing`).
15. **Invalid custom hostnames** — rejects app hosts, `*.simy.ch`, `*.vercel.app`.
16. **`website_content_blocks` is dead for `/s/*`** — do not dual-write.

---

## Env / ops checklist

- `NUXT_PUBLIC_APP_URL` / `NUXT_PUBLIC_BASE_URL` / `APP_BASE_URL` — absolute booking/site URLs
- `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` (or runtimeConfig) — custom domain automation
- Anthropic credentials for AI optimize / addon generate
- `googleMapsApiKey` — live Google reviews
- `SIMY_WEBSITE_NOTIFY_EMAIL` — publish notify fallback
- Apply SQL: `20260803_website_custom_domain_status.sql`, `20260803_website_hero_image.sql`, `20260809_website_addon_pages.sql`, `20260809_website_media_bucket.sql`

---

## File paths (citation index)

### Admin / SA UI
- `pages/admin/website/index.vue`
- `pages/admin/website/setup.vue`
- `pages/admin/website/editor.vue`
- `pages/admin/website/addons.vue`
- `pages/tenant-admin/websites/index.vue`
- `pages/tenant-admin/websites/[id].vue`

### Public pages
- `pages/s/[subdomain]/index.vue`
- `pages/s/[subdomain]/[slug].vue`

### Tenant website APIs
- `server/api/website/init.post.ts`
- `server/api/website/init-data.get.ts`
- `server/api/website/wizard-save.post.ts`
- `server/api/website/slots-save.post.ts`
- `server/api/website/publish.post.ts`
- `server/api/website/pages/[[slug]].get.ts`
- `server/api/website/pages/[[slug]].put.ts`
- `server/api/website/media/upload.post.ts`
- `server/api/website/custom-domain.get.ts`
- `server/api/website/custom-domain.post.ts`
- `server/api/website/custom-domain.delete.ts`
- `server/api/website/custom-domain/verify.post.ts`
- `server/api/website/addon/pages.get.ts`
- `server/api/website/addon/generate.post.ts`
- `server/api/website/ai-optimize.post.ts`
- `server/api/website/analytics/track.post.ts`
- `server/api/tenant-admin/websites/[id]/addon-unlock.post.ts`

### Public APIs
- `server/api/public/website/[subdomain].get.ts`
- `server/api/public/website/[subdomain]/[slug].get.ts`
- `server/api/public/website/[subdomain]/og.png.get.ts`
- `server/api/public/website/[subdomain]/reviews.get.ts`

### Utils / middleware / SEO routes
- `server/utils/website-landing-builder.ts`
- `server/utils/website-addon-builder.ts`
- `server/utils/website-publish-notify.ts`
- `server/utils/website-seo-context.ts`
- `server/utils/website-og-card.ts`
- `server/utils/website-media-normalize.ts`
- `server/utils/website-live-prices.ts`
- `server/utils/custom-domain.ts`
- `server/middleware/02.custom-domain.ts`
- `server/routes/robots.txt.ts`
- `server/routes/sitemap.xml.ts`
- `server/routes/llms.txt.ts`
- `server/routes/s/[subdomain]/robots.txt.ts`
- `server/routes/s/[subdomain]/sitemap.xml.ts`
- `server/routes/s/[subdomain]/llms.txt.ts`
- `utils/website-slot-schema.ts`
- `utils/website-landing-head.ts`
- `utils/website-icons.ts`
- `components/website/WebsiteIcon.vue`
- `components/website/AIOptimizationSuggestion.vue`

### Migrations
- `sql_migrations/20260803_website_custom_domain_status.sql`
- `sql_migrations/20260803_website_hero_image.sql`
- `sql_migrations/20260809_website_addon_pages.sql`
- `sql_migrations/20260809_website_media_bucket.sql`
