# Website-prospect outbound pipeline

**When to use:** Super-admin “Website-Prospects” flow; analyze URL → score → generate draft Simy site → review email draft; shell tenants cluttering tenant list; preview unpublished; confuse with normal tenant website builder.

Verified against source (Aug 2026). Builder mechanics for *claimed* sites: draft `TENANT_WEBSITE_LANDING_BUILDER` (open doc PR #8). Product lock for `website_only`: draft `WEBSITE_ONLY_TENANTS` (#49).

---

## Intent

Outbound sales pipeline: scrape a prospect’s existing site, score opportunity, optionally **generate a unpublished `website_only` trial tenant + landing**, and prepare an outreach email draft. **Send only after human review** — APIs do not auto-mail.

---

## Data model

Table: `public.website_prospects` (`sql_migrations/20260822_website_prospects.sql`)

- RLS on; **no** grants to `anon` / `authenticated` — service role only
- Unique: `place_id` (when set), `hostname` (when set)

| Field group | Notes |
|-------------|--------|
| Identity | `name`, `business_type`, `existing_url`, `hostname`, contact, address |
| `source` | `'manual'` \| `'places_cron'` |
| `status` | `discovered` → `scored` → `generated` → `review` → `approved` → `sent` → `claimed` (also `skipped` \| `rejected`) |
| JSON blobs | `pagespeed`, `scrape`, `analysis`, `revenue_model`, `email_draft`, `place` |
| Links | `tenant_id`, `website_id`, `preview_url`, `preview_token`, `matched_tenant_id` |

Shell tenants created by generate set:

- `tenants.website_only = true`
- `tenants.website_notes = 'website_prospect:{prospectId}'`
- Helper: `isWebsiteProspectShell(tenant)` in `server/utils/website-prospect-types.ts`

Statuses constant: `WEBSITE_PROSPECT_STATUSES` in the same file.

---

## APIs (super_admin only)

All under `/api/tenant-admin/website-prospects/*` via `requireSuperAdmin`.

| Method | Route | Role |
|--------|-------|------|
| `GET` | `/api/tenant-admin/website-prospects` | List |
| `GET` | `/api/tenant-admin/website-prospects/:id` | Detail |
| `PATCH` | `/api/tenant-admin/website-prospects/:id` | Status / notes (status must be in `WEBSITE_PROSPECT_STATUSES`) |
| `POST` | `/api/tenant-admin/website-prospects/analyze` | Body: `url`, optional `name`, `city`, `business_type`; `generate: false` skips site build |
| `POST` | `/api/tenant-admin/website-prospects/:id/generate` | Re-run / finish `generateWebsiteProspectSite` |

UI: `pages/tenant-admin/websites/prospects/index.vue`, `pages/tenant-admin/websites/prospects/[id].vue`.

---

## Pipeline

```
analyzeWebsiteProspect (website-prospect-analyze.ts)
  resolve place (Places) → scrape HTML → PageSpeed (optional)
  score (speed/seo/freshness/opportunity)
  revenue model + email draft
  decideProspectArchitecture (one vs multi landing)

generateWebsiteProspectSite (website-prospect-generate.ts)
  if tenant_id already linked → refresh pages / finish
  else insert tenants (website_only trial) + website_tenants (unpublished)
  ingestProspectMedia + stock photos
  buildLandingPage / applyProspectArchitecture
  update prospect status, preview_url, email_draft
```

Analyze with `generate !== false` (default) calls generate after analyze; generate failures return `generated: false` + `generate_error` without failing the whole analyze response.

---

## Pitfalls

1. **No client RLS** — Only service role / super-admin APIs. Do not expose table to tenant admins.
2. **Shell tenants are real rows** — `website_only` trial with `website_notes` prefix. Deleting casually breaks prospect links; filter shells with `isWebsiteProspectShell` / notes prefix.
3. **Unpublished by default** — `website_tenants.is_published = false` until someone claims/publishes through normal website ops.
4. **Email is draft only** — `email_draft` + `email_approved_at` / `email_sent_at` fields; analyze/generate do **not** send mail.
5. **Idempotent-ish generate** — Re-generate with existing `tenant_id` refreshes rather than creating a second tenant; new generate without link creates another shell.
6. **Hostname / place uniqueness** — Duplicate analyze of same host/place can conflict on unique indexes.
7. **Not the landing builder runbook** — Slot schema / `slots-save` still apply once the shell is a normal website tenant; this pipeline only bootstraps outbound drafts.
8. **Theme color fallback** — Primary from scrape `theme_color` unless white/`#FFFFFF`, else `#0F766E`.

---

## Smoke test

1. As super_admin open `/tenant-admin/websites/prospects`, paste a public school URL, run analyze.
2. Confirm row in `website_prospects` with scores + `email_draft`; optional linked `tenants` / `website_tenants` with `website_notes` like `website_prospect:…` and `is_published = false`.
3. PATCH status through `review` → `approved` without expecting outbound mail from the API.
4. `generate: false` on analyze → scored prospect, no new tenant.

---

## Codepaths

| Path | Role |
|------|------|
| `sql_migrations/20260822_website_prospects.sql` | Table + RLS revoke |
| `server/utils/website-prospect-types.ts` | Statuses, shell helper, types |
| `server/utils/website-prospect-analyze.ts` | Scrape / score / draft |
| `server/utils/website-prospect-generate.ts` | Shell tenant + landing |
| `server/utils/website-prospect-scrape.ts` | HTML parse |
| `server/utils/website-prospect-score.ts` | Opportunity scoring |
| `server/utils/website-prospect-email.ts` | `buildProspectEmailDraft` |
| `server/utils/website-prospect-architecture.ts` | one vs multi page |
| `server/api/tenant-admin/website-prospects/*` | HTTP surface |
| `pages/tenant-admin/websites/prospects/*` | SA UI |
| `server/utils/__tests__/website-prospect-score.test.ts` | Unit coverage |
