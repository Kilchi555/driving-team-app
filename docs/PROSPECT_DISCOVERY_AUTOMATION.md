# Prospect discovery automation (manual-first Places)

**When to use:** Understanding why the Places prospect cron is off by default, how manual «Jetzt ausführen» differs from the hourly Vercel tick, what a discovery run actually creates, and how public claim relates (and does not yet mint tokens).

Verified against current `main` (Oct 2026). Landed: **#303** (`2a274522`).

**Not this:** Open feat **#302** website-factory discovery (`/website-factory`, `POST /api/public/website-factory/discover`), website preview tokens (#299), or booking-proposal “claim” (`docs/PROPOSAL_FOLLOWUP_CLAIM.md`).

---

## Intent

Find weak Swiss driving-school websites via Google Places, draft **unpublished** `website_only` shells for **superadmin review**, and keep outbound email at **zero** in the job.

Automation stays **disabled** until a superadmin turns it on. The same discovery job powers both the manual button and the cron tick. Cron never emails the customer and never starts a SaaS trial on cron shells.

---

## Contract (current `main`)

### Settings + runs

| Surface | Detail |
|---------|--------|
| `prospect_discovery_settings` | Singleton `id = 1`; RLS on; **service_role only** |
| Seed / app defaults | `enabled: false`, `frequency: 'daily'`, `time: '04:30'`, `timezone: 'Europe/Zurich'` (`PROSPECT_AUTOMATION_DEFAULTS`) |
| Missing / unreadable settings | Treated as **disabled** |
| `prospect_discovery_runs` | One row per attempt; unique partial index → at most one `status = 'running'` |
| Stale lock | `STALE_PROSPECT_RUN_MS = 3 * 60 * 1000` — released before a new insert |
| `emails_sent` | DB check + app types force **`0`** |

SQL: `sql_migrations/20260927_prospect_discovery_automation.sql`.

### Manual vs cron

| Trigger | Gate | Slot / city |
|---------|------|-------------|
| `POST /api/tenant-admin/website-prospects/automation/run` | `requireSuperAdmin` only — **does not** require `enabled` | Does **not** consume the daily cron slot; city still from `cronCityForDate` (UTC day-of-year) |
| `GET /api/cron/discover-website-prospects` | `assertCronRequest` + `dispatchCronProspectDiscovery` | Needs `enabled`, due in local TZ (60 min after configured time), no cron start yet that **local** date |

Vercel schedule: `"30 * * * *"` → `/api/cron/discover-website-prospects` (hourly minute-30 tick; work only when due).

Cron skip tokens: `automation_disabled` | `not_due` | `already_running` (HTTP 200). Manual already-running → **409**.

### Discovery job (shared)

`startProspectDiscoveryRun` → `runCronWebsiteProspectDiscovery` → `runWebsiteProspectDiscovery`:

1. City rotation: Zürich → Bern → Basel → Luzern → St. Gallen → Winterthur (`PROSPECT_CRON_CITIES`)
2. Places Text Search `Fahrschule ${city}` (`region=ch`, `language=de`)
3. Skip known `place_id`s; Place Details **without** reviews/hours/photos
4. SSRF-guarded HTML scrape (+ capped PageSpeed); qualify weakness **and** `opportunity >= 55` (`OPPORTUNITY_MIN`)
5. Cap `MAX_NEW = 8` inserts; `source: 'places_cron'` → generate → `status: 'review'`
6. Cron shells: `is_trial: false`, `subscription_plan: null`, `is_published: false`, `website_only: true`; `refetchPlacePhotos: false`

Missing `GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` → `{ skipped: 'no_google_key', emailsSent: 0 }`.

### Admin automation API

| Route | Auth | Notes |
|-------|------|-------|
| `GET …/automation` | `requireSuperAdmin` | `{ settings, lastDispatch, activeRun, lastRun, persistent }` — `persistent: false` forces UI OFF |
| `PUT …/automation` | same | Body: `{ enabled, frequency: 'daily', time: 'HH:MM', timezone }` via `parseAutomationSettings` |
| `POST …/automation/run` | same | Manual start; 409 if lock held |

UI: `/tenant-admin/websites/prospects` (`middleware: ['superadmin']`).

URL paste analyze (`POST …/analyze`) is a **separate** entry — not gated by automation settings.

### Public claim (adjacent)

| Item | Detail |
|------|--------|
| SQL | `sql_migrations/20260929_website_prospect_claim.sql` — header: **“Not applied by this change.”** Apply separately |
| Columns | `claim_token_hash`, `claim_token_expires_at`, `claim_reserved_until` |
| TTLs | Token **72h** (`CLAIM_TOKEN_TTL_MS`); reservation **10 min** (`CLAIM_RESERVATION_MS`) |
| Route | `POST /api/public/website-claim` — `{ token, email, password, password_confirm }`; **5 attempts / IP / hour** |
| Mint | `prepareProspectClaim` exists in util/tests only — **no** `server/api/**` mint route on `main` |

Claim takes over an existing `website_only` shell; it does not create a second tenant.

### Safety

- Cron auth: `Authorization: Bearer ${CRON_SECRET}` (`assertCronRequest`); `x-vercel-cron` is **not** identity
- SSRF: `assertPublicHttpUrl` / `safeFetchPublic` / `safeFetchImage` (private hosts blocked, DNS pin, size/time caps)
- Error text: `sanitizeErrorSummary` redacts keys / Bearer / JWTs (max 240 chars)

---

## Pitfalls

1. **Cron returns 200 while doing nothing** — default `enabled: false` → `skipped: 'automation_disabled'`.
2. **Manual still works when automation is OFF** — intentional; do not require enable for «Jetzt ausführen».
3. **Hourly cron ≠ hourly discovery** — only inside the 60-minute local due window, once per local date for `trigger = 'cron'`.
4. **One running lock** — second manual/cron gets `already_running` / 409; stale after 3 minutes.
5. **Claim SQL may be undeployed** — without the claim migration, claim RPCs fail.
6. **No mint API** — public claim needs a pre-minted hash; nothing on `main` mints one via HTTP.
7. **Cron shells skip Place Photos refetch** — empty photo lists stay empty.
8. **Do not confuse with #302 website-factory** — different modules and no prospect automation tables.

---

## Verify

```bash
npx vitest run \
  server/utils/__tests__/prospect-discovery-automation.test.ts \
  server/utils/__tests__/prospect-discovery-automation-http.test.ts \
  server/utils/__tests__/website-prospect-discover.test.ts \
  server/utils/__tests__/website-prospect-discover-cron.test.ts \
  server/utils/__tests__/website-prospect-claim.test.ts

# Defaults stay off
rg -n "enabled: false|PROSPECT_AUTOMATION_DEFAULTS" server/utils/prospect-discovery-automation.ts
```

---

## Codepaths / surfaces

| Concern | Path / symbol |
|---------|---------------|
| Defaults + cron gate | `server/utils/prospect-discovery-automation.ts` — `PROSPECT_AUTOMATION_DEFAULTS`, `dispatchCronProspectDiscovery`, `startManualProspectDiscovery` |
| Discovery job | `server/utils/website-prospect-discover.ts` — `runWebsiteProspectDiscovery`, `qualifyProspect`, `cronCityForDate` |
| Cron route | `server/api/cron/discover-website-prospects.get.ts` |
| Admin automation | `server/api/tenant-admin/website-prospects/automation.{get,put}.ts`, `automation/run.post.ts` |
| Claim | `server/utils/website-prospect-claim.ts`, `server/api/public/website-claim.post.ts`, `website-prospect-guard.ts` |
| SSRF | `server/utils/ssrf-guard.ts` |
| Cron auth | `server/utils/cron-auth.ts` — `assertCronRequest` |
| Schedule | `vercel.json` → `/api/cron/discover-website-prospects` |
| UI | `pages/tenant-admin/websites/prospects/index.vue` |
