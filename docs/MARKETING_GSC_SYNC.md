# Marketing Search Console sync (`sync-marketing-gsc`)

**When to use:** Daily GSC import missing or failing; backfilling `marketing_gsc_daily`; rotating OAuth credentials; understanding why the cron no longer uses `googleapis`.

Verified against source (Sep 2026). Commit `0ff658a1` (#153). Bundle-size context: [VERCEL_SERVERLESS_BUNDLE.md](./VERCEL_SERVERLESS_BUNDLE.md).

---

## Intent

`/api/cron/sync-marketing-gsc` pulls Google Search Console Search Analytics into `marketing_gsc_daily` for the tenant matched to the configured GSC site. It used to call `googleapis`’ Search Console client. That SDK inflated the shared Vercel `__fallback` function past the 250 MiB limit, so the cron now:

1. Refreshes an access token via `https://oauth2.googleapis.com/token`
2. POSTs to Webmasters API v3 `…/searchAnalytics/query` with `fetch`

Behavior (dimensions, pagination, upsert) stays the same.

---

## Schedule and auth

| Item | Value |
|------|--------|
| Cron | `0 4 * * *` → `POST/GET /api/cron/sync-marketing-gsc` (`vercel.json`) |
| Handler max duration export | `maxDuration = 120` |
| Gate | `assertCronRequest` — Vercel Cron (`x-vercel-cron: 1`) **or** `Authorization: Bearer $CRON_SECRET` |

### Required env

| Variable | Role |
|----------|------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN` | Long-lived refresh token |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Site property (e.g. `sc-domain:example.ch` or `https://…`) |

Missing any of the four → `{ success: false, reason: 'missing_credentials', present: {…} }` (no throw).

### Tenant resolution

`getTenantIdByGscSite(siteUrl)` matches `tenants.gsc_site_url` (with `sc-domain:` / `https://` variants), then falls back to `MARKETING_TENANT_ID`. No match → **500** (`could not resolve tenant_id for GSC site`).

---

## Date range and pagination

Default body (empty / daily cron): last **5** days, end capped at **today − 2** (GSC lag).

| Body | Effect |
|------|--------|
| `{}` | Lookback 5 days |
| `{ "days": 90 }` | Lookback N days (clamped to **500**) |
| `{ "startDate": "2025-01-01" }` | From that date until today − 2 |

History floor: not earlier than today − **500** days (~16 months GSC max).

Fetch strategy:

- Chunks of **7** days
- Dimensions: `date`, `query`, `page`; `type: web`
- Page size **25_000**; keep paging with `startRow` until a short page
- Safety cap per chunk: `startRow >= 250_000` → stop that chunk, increment `truncatedChunks`

Token failure → `{ success: false, reason: 'token_error', detail }`.  
Chunk API failure → `{ success: false, reason: 'gsc_api_error', chunk, detail }`.

---

## Upsert contract

Rows map to:

`tenant_id`, `date`, `query`, `page`, `clicks`, `impressions`, `ctr`, `position`

Written with `upsert` on conflict **`tenant_id,date,query,page`**, batches of **1000**. Success payload: `{ success: true, rows, pages, truncatedChunks, range: { from, to } }`.

---

## Manual backfill example

```bash
curl -X POST "https://app.simy.ch/api/cron/sync-marketing-gsc" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"days": 90}'
```

---

## Pitfalls

- **Do not reintroduce `import { google } from 'googleapis'`** in this route (or other `server/` marketing crons) — see bundle runbook.
- Offline scripts may still use `googleapis`; that is intentional and must stay outside the Nitro server import graph.
- Site URL format mismatches break tenant discovery — set `tenants.gsc_site_url` consistently or rely on `MARKETING_TENANT_ID`.
- Empty credentials soft-skip; wrong refresh token returns `token_error` (check OAuth client + refresh token pair).
- Full pages forever are truncated at the safety cap — watch `truncatedChunks` in the response/logs.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/cron/sync-marketing-gsc.ts` | OAuth token, REST query, upsert |
| `server/utils/marketing-tenant.ts` | `getTenantIdByGscSite` + `MARKETING_TENANT_ID` fallback |
| `server/utils/cron-auth.ts` | `assertCronRequest` |
| `server/utils/supabase-admin.ts` | Service-role client for upsert |
| `vercel.json` | Cron schedule entry |
| [VERCEL_SERVERLESS_BUNDLE.md](./VERCEL_SERVERLESS_BUNDLE.md) | Why REST replaced `googleapis` on server |
