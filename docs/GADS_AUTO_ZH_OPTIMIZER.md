# Google Ads — Auto Zürich Optimizer

Ops runbook for the Driving Team «Fahrschule Zürich / Altstetten» Search campaign repair and 4-variant landing test. Verified against source (Aug 2026).

## Intent

Keep the Altstetten campaign healthy after deploys wipe ad-hoc UI edits, and measure which of four ad-group × landing hypotheses converts best. Conversion tracking setup lives in `docs/SERVER_SIDE_CONVERSION_SETUP.md`; this doc covers **campaign mutation + scorecard**.

Hardcoded campaign IDs (Driving Team account):

| Campaign | ID | Role |
|----------|-----|------|
| Fahrschule Zürich / Altstetten | `24103567599` | Active test host |
| Fahrschule Zürich Umgebung | `23868553846` | Kept paused (high CPA) |

## Surfaces

| Surface | Path |
|---------|------|
| Admin UI | `/admin/marketing/google-ads-tools` → Auto ZH optimize / variants |
| Optimize (repair) | `POST /api/admin/gads-optimize-auto-zh` |
| Seed variants | `POST /api/admin/gads-auto-zh-variants` |
| Scorecard | `GET /api/admin/gads-auto-zh-variants-report?days=14` |
| Offline runner | `node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs` |

Auth via `resolveGadsAuth`:

1. `Authorization: Bearer $CRON_SECRET` → env `GOOGLE_ADS_CUSTOMER_ID` (DT account)
2. Admin session → tenant `google_ads_customer_id` under MCC (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`)

## Variant matrix (Welle 1)

Created/upserted by `gads-auto-zh-variants` (idempotent; also pauses legacy AGs `Fahrschule Zürich`, `Fahrschule Altstetten`, `Quartiere 10km`):

| Ad group | Landing + `utm_content` |
|----------|-------------------------|
| `AG_Local` | `/auto-fahrschule-zuerich/?utm_content=ag_local` |
| `AG_Probe` | `/auto-fahrschule-zuerich-probe/?utm_content=ag_probe` |
| `AG_Preis` | `/auto-fahrschule-zuerich-preis/?utm_content=ag_preis` |
| `AG_Quartier` | `/auto-fahrschule-zuerich/?utm_content=ag_quartier` |

Base host: `https://drivingteam.ch`.

## Optimize endpoint (what it mutates)

Default **`dry_run: true`** (must pass `dry_run: false` to apply).

1. Keep Umgebung paused (`keep_umgebung_paused`, default true)
2. Add missing campaign negatives (competitors, wrong product, geo leaks)
3. Require `AG_Local` (fails with hint to run variants first if missing)
4. Add/re-enable Exact core city keywords on `AG_Local` (CPC ~3.8–4.2 CHF)
5. Pause ultra-broad Probe KW `erste fahrstunde` (PHRASE)
6. Optional budget: `daily_budget_chf` clamped **30–80**
7. Ensure Altstetten campaign ENABLED

Offline script mirrors the same mutations (`--dry-run` default, `--apply`, `--budget=55`).

## Scorecard

`gads-auto-zh-variants-report` (days clamped **7–60**, default 14):

- Google Ads metrics by ad group (cost, clicks, conv)
- Joins `booking_proposals` with `utm_content` in `ag_local|ag_probe|ag_preis|ag_quartier` (also `ilike ag_%`)
- CPA proxy = cost / (Ads conversions + proposals)
- Recommendation: scale best CPA AG; pause AGs with ≥40 clicks and zero Ads+proposal signal
- `ready_for_decision` when clicks ≥ 50 **or** window ≥ 14 days

## Examples

```bash
# Dry-run repair
curl -X POST https://app.simy.ch/api/admin/gads-optimize-auto-zh \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": true }'

# Apply + budget
curl -X POST https://app.simy.ch/api/admin/gads-optimize-auto-zh \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": false, "daily_budget_chf": 55 }'

# Scorecard
curl "https://app.simy.ch/api/admin/gads-auto-zh-variants-report?days=14" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```bash
node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs --dry-run
node --env-file=.env.vercel server/scripts/run-gads-optimize-auto-zh.mjs --apply --budget=55
```

## Pitfalls

- **Code is the source of truth** for negatives/keywords — re-run after deploy if someone edited live Ads UI.
- Optimize needs `AG_Local` already present; seed with variants first.
- RSA upsert **removes** existing RSAs on the variant AGs then recreates (not merge).
- Scorecard CPA mixes Google Ads conversions and DB proposals — use as relative ranking, not finance close.
- Winner rule is CPA (inquiry+booking), not CTR.
- Cron auth hits the DT env customer ID; session auth only works if the tenant Ads account is linked under the MCC.

## Codepaths

- `server/api/admin/gads-optimize-auto-zh.post.ts`
- `server/api/admin/gads-auto-zh-variants.post.ts`
- `server/api/admin/gads-auto-zh-variants-report.get.ts`
- `server/scripts/run-gads-optimize-auto-zh.mjs`
- `server/utils/gads-auth.ts`
- `pages/admin/marketing/google-ads-tools.vue`
