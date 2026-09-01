# Google Ads probe landing (Auto ZH → first lesson)

**When to use:** Ads for Fahrschule Zürich / Altstetten still point at Preise / Team / Motorrad; probe CTAs skip the booking path; sitelink GAQL errors make the fix job return HTTP 500; attribution lost between `drivingteam.ch` and `app.simy.ch`.

Verified against source (Aug 2026). Commits `0fb1fe06` (#104), `48c11b47` (#107).

---

## Intent

Paid search for campaign **`24103567599`** should land on the first-lesson page (`/auto-fahrschule-zuerich-probe/`) with code **`ERSTE30`**, not on pricing or fleet pages. Website CTAs then hop to `app.simy.ch/booking/availability/driving-team` while preserving click IDs.

Google Ads enforces **one website per ad group** — Final URLs stay on `drivingteam.ch`. Direct `app.simy.ch` Final URLs get disapproved (`ONE_WEBSITE_PER_AD_GROUP`).

---

## Contract

### Target URLs

| Surface | URL |
|---------|-----|
| RSA / keyword Final URL | `https://drivingteam.ch/auto-fahrschule-zuerich-probe/?code=ERSTE30&utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}` |
| Offer sitelinks | `https://drivingteam.ch/auto-fahrschule-zuerich-probe/?code=ERSTE30` |
| Probe page CTA | `/buchen?category=B%20Automatik&code=ERSTE30&utm_content=ag_probe` → 302 to booking app |
| Skip-landing bridge | `/go/buchen?...` → 302 to booking (server-side attribution upsert) |

### Leaky sitelinks (unlinked when not already probe)

Regex match on Final URL: `fahrschule-preise`, `auto-fahrschule-zuerich-preis`, `/team/`, `motorrad`, `vku-kurs`.

### Offer sitelinks created if missing

1. **Erste Lektion CHF 65** — «Nur die 1. Lektion» / «danach 95.– / 45 Min»
2. **Jetzt online buchen** — «Kat. B Automatik» / «Bahnhof Altstetten»

### Auth for the admin job

`resolveGadsAuth`:

- `Authorization: Bearer $CRON_SECRET` → env `GOOGLE_ADS_CUSTOMER_ID` (Driving Team)
- Admin session → tenant `google_ads_customer_id` under MCC (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`)

`dry_run` defaults to **true** (`dry_run !== false`). Send `"dry_run": false` to mutate.

### Website attribution hop

`enrichSimyUrl` / `enrich-booking-links` attach `session_id`, `dt_attr`, and first-class `gclid` / `gbraid` / `wbraid` / `fbclid` (plus `mc=1` when Meta consent accepted) to `simy.ch`, `/buchen`, and `/go/buchen` links. `/buchen` client-redirects to the booking app; `/go/buchen` upserts `marketing_attributions` server-side then 302s (bots skipped).

---

## How to run the Ads fix

Dry-run (safe):

```bash
curl -X POST https://app.simy.ch/api/admin/gads-fix-probe-landing \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": true }'
```

Apply:

```bash
curl -X POST https://app.simy.ch/api/admin/gads-fix-probe-landing \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": false }'
```

Offline scripts (same logic, env file — never print secrets):

```bash
node --env-file=/tmp/simy-app-prod.env server/scripts/apply-probe-landing.mjs          # dry-run
node --env-file=/tmp/simy-app-prod.env server/scripts/apply-probe-landing.mjs --apply
node server/scripts/run-fix-probe-landing-via-prod.mjs /tmp/simy-app-prod.env       # hits prod API
node server/scripts/run-fix-probe-landing-via-prod.mjs /tmp/simy-app-prod.env --apply
```

---

## Pitfalls

1. **Sitelink GAQL failure must not 500 the whole job** — Keyword / sitelink query errors are recorded under `query_errors`; ads planning still returns. Apply mode skips sitelink unlink/create when the sitelink query failed (`unlinkErrors` / `sitelink_error`), instead of throwing.
2. **RSA Final URL patch can fail** — Job tries `ads:mutate` `finalUrls`, then recreate RSA + remove old ad-group-ad. Check `applied.ads_errors`.
3. **Keyword Final URLs only when set** — Empty keyword Final URLs are left alone (`needs_update` requires `current.length > 0`).
4. **Do not point ad Final URLs at `app.simy.ch`** — Use probe path or `/go/buchen` on `drivingteam.ch`.
5. **`/buchen` is noindex** — Fine for CTAs; SEO landing stays on `/auto-fahrschule-zuerich-probe/`.
6. **Campaign hard-coded** — Job only touches `24103567599` (Altstetten). Umgebung / other campaigns are out of scope here.

---

## Smoke test

1. Dry-run → `ok: true`, `probe_url` contains `auto-fahrschule-zuerich-probe` + `ERSTE30`; inspect `ads.to_update` / `sitelinks.unlink`.
2. Apply → RSA Final URLs include probe path; leaky sitelinks gone; offer sitelinks present or `already_present`.
3. Open probe page → hero CTA goes to `/buchen?...ERSTE30...` → lands on booking with code + attribution params.
4. Force a sitelink query failure in a fork → HTTP 200 with `query_errors.sitelinks`, not 500.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/admin/gads-fix-probe-landing.post.ts` | Prod dry-run / apply job |
| `server/scripts/apply-probe-landing.mjs` | CLI twin |
| `server/scripts/run-fix-probe-landing-via-prod.mjs` | Curl wrapper via CRON_SECRET |
| `server/utils/gads-auth.ts` | Cron vs session Ads auth |
| `apps/website/pages/auto-fahrschule-zuerich-probe.vue` | Landing + CTA |
| `apps/website/pages/buchen.vue` | Same-domain → booking 302 |
| `apps/website/server/routes/go/buchen.get.ts` | Ads skip-landing bridge |
| `apps/website/utils/enrich-simy-url.ts` | Click-ID enrichment |
| `apps/website/plugins/enrich-booking-links.client.ts` | Early DOM enrichment |

Related (may live on open docs PRs): Auto ZH optimizer (`GADS_AUTO_ZH_OPTIMIZER.md`), Erste30 offer (`GADS_ERSTE30_OFFER.md`), server-side conversions (`SERVER_SIDE_CONVERSION_SETUP.md`).
