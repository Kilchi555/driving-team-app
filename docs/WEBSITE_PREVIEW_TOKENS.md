# Public website tenant allowlist and preview tokens (#299)

**When to use:** Debugging draft website 404s; minting preview links; reviewing what tenant fields the public `/api/public/website/*` JSON may expose; confirming `?preview=1` is not an access control.

Verified against current `main` (Sep 2026). Landed: **#299** (`d7f0507d`). Schema: `sql_migrations/20260926_website_preview_token.sql`.

This is **not** Cloud Agent / Vercel preview-host allowlisting. It is tenant-website draft access on `/s/:subdomain`.

---

## Intent

Public website handlers must:

1. **Select an explicit tenant column allowlist** (no `select('*')`, no secrets).
2. **Keep unpublished / draft sites private** unless the request carries a matching, unexpired, website-bound preview token.
3. Treat **`?preview=1` as cache/UI hint only** — it never grants draft access by itself.

Raw tokens are shown once to the owning session. Persistence is `sha256(token)` + expiry on `website_tenants`.

---

## Contract (current `main`)

| Rule | Detail |
|------|--------|
| Published + published home | Readable without a token (`authorizePublicWebsiteRead` → `ok`, `draft: false`) |
| Unpublished site or unpublished page | Requires `?preview_token=<token>` that hashes to `website_tenants.preview_token_hash` and is not past `preview_token_expires_at` |
| Token shape | `^[A-Za-z0-9_-]{43,128}$` (base64url from 32 random bytes) |
| Storage | Only `preview_token_hash` (sha256 hex) + `preview_token_expires_at`; raw token never stored or logged |
| TTL | `PREVIEW_TOKEN_TTL_MS` = 7 days from issue |
| Cross-website | Token for website A does not open website B |
| Expired / missing / mismatch | Public handlers respond **404** (same as unknown subdomain), with private cache headers |
| `?preview=1` | Forces private-cache preference only; **not** authorization |
| Tenant JSON | Response keys ⊆ `PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS`; server-only fields (`id`, `website_only`, `booking_policy`, `minimum_booking_lead_time_hours`) stay server-side |
| Mint (tenant user) | `POST /api/website/preview-link` — authenticated; uses the caller’s `tenant_id`; **ignores** body `tenant_id` |
| Mint (superadmin) | `POST /api/tenant-admin/websites/:id/preview-link` — `:id` is **tenant id**; `requireSuperAdmin` |
| Robots | `robots.txt` disallows `preview_token` query URLs |

### Mint response shape

```json
{
  "preview_url": "https://app.simy.ch/s/<subdomain>?preview_token=<raw>",
  "expires_at": "<ISO-8601>"
}
```

Optional body `{ "slug": "impressum" }` builds `/s/<subdomain>/<slug>?preview_token=…`.

### Client helpers

`utils/website-preview-query.ts` reads the route token, builds `?preview_token=` suffixes, and derives a **hashed** `useAsyncData` key (`previewDataKey`) so the raw token is not used as a cache key. `withPreviewToken` only rewrites relative `/s/…` links.

---

## Pitfalls

1. **Relying on `?preview=1`** — pre-#299 habit; draft reads without a valid token now 404.
2. **Storing or logging the raw token server-side** — only the hash belongs in `website_tenants`.
3. **Selecting extra tenant columns “for convenience”** — extend `PUBLIC_WEBSITE_TENANT_RESPONSE_FIELDS` / `SERVER_FIELDS` deliberately; public JSON is a further projection via `projectPublicWebsiteTenant`.
4. **Assuming body `tenant_id` on `/api/website/preview-link`** — ignored; token is always for the signed-in user’s tenant website.
5. **Confusing tenant-admin `:id`** — route param is tenant id, not `website_tenants.id`.
6. **Migration not applied** — without `preview_token_hash` / `preview_token_expires_at`, issue/update fails and mint returns 503. Apply `sql_migrations/20260926_website_preview_token.sql` deliberately (file warns against automated audit applies).
7. **Sharing an expired link** — re-mint; each issue overwrites the stored hash (one current token per website).

---

## Verify

```bash
npx vitest run server/utils/__tests__/website-public-security.test.ts

# Spot-check: public website APIs authorize via helper; tenant select is allowlisted
rg -n 'authorizePublicWebsiteRead|PUBLIC_WEBSITE_TENANT_SELECT|projectPublicWebsiteTenant' \
  server/api/public/website

# Token must not appear in persisted columns as plaintext
rg -n 'preview_token_hash|preview_token_expires_at' sql_migrations/20260926_website_preview_token.sql
```

Expect: vitest covers allowlist, `?preview=1` denial, cross-website mismatch, expiry; `rg` shows public handlers using the helper + allowlist select.

---

## Codepaths / surfaces

| Path | Role |
|------|------|
| `server/utils/website-preview-access.ts` | Issue, hash, authorize, URL builder |
| `server/utils/website-public-tenant-select.ts` | Tenant column allowlist + response projection |
| `utils/website-preview-query.ts` | Client token read / link rewrite / data-key hash |
| `server/api/website/preview-link.post.ts` | Tenant-user mint |
| `server/api/tenant-admin/websites/[id]/preview-link.post.ts` | Superadmin mint |
| `server/api/public/website/[subdomain].get.ts` (+ `[slug]`, lead, legal, next-slots, og, pickup-check, reviews) | Authz gate + allowlisted tenant select |
| `pages/s/[subdomain]/**` | Pass preview query through client fetches |
| `pages/admin/website/**`, `pages/tenant-admin/websites/**` | UI that requests preview links |
| `server/routes/robots.txt.ts`, `server/routes/s/[subdomain]/robots.txt.ts` | Disallow preview query URLs |
| `sql_migrations/20260926_website_preview_token.sql` | Columns + index (manual apply) |
| `server/utils/__tests__/website-public-security.test.ts` | Allowlist + token authz regression |

Related but separate: website Stripe/hosting publish gates (`server/utils/website-billing.ts`); Cloud Agent preview host docs; public mutator removal (#304).
