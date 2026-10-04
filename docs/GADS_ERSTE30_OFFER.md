# Google Ads — Erste-Lektion offer (ERSTE30 / CHF 65)

**When to use:** Promote “Erste Lektion CHF 65 statt 95” on the Auto Zürich Altstetten Search campaign **without** raising daily budget or re-enabling Umgebung; AG_Probe paused or still selling coupon codes in RSA; Meta Auto ZH creative needs the same offer landing.

Verified against source (Aug 2026). Broader Auto ZH repair / variant scorecard lives in draft `GADS_AUTO_ZH_OPTIMIZER` (open doc PR). Conversion plumbing: [SERVER_SIDE_CONVERSION_SETUP.md](./SERVER_SIDE_CONVERSION_SETUP.md).

---

## Intent

Enable and refresh the first-lesson offer creatives on campaign **`24103567599`** (Fahrschule Zürich / Altstetten):

- Keep **budget unchanged**
- Keep Umgebung paused (this endpoint does not touch it)
- Sell the **price** in RSA copy — never the code `ERSTE30` in headlines
- Land Probe traffic on the probe page with `utm_content=ag_probe` (site already supports `?code=ERSTE30` where applicable)

---

## Surfaces

| Surface | Path |
|---------|------|
| Enable / refresh offer | `POST /api/admin/gads-enable-erste30` |
| Prerequisite variants | `POST /api/admin/gads-auto-zh-variants` (must create `AG_Probe`) |
| Scorecard (shared) | `GET /api/admin/gads-auto-zh-variants-report?days=14` |
| Meta creative (offline) | `node scripts/launch-meta-erste30.mjs` (`--dry-run` supported) |

Auth: `resolveGadsAuth` — `Authorization: Bearer $CRON_SECRET` (env `GOOGLE_ADS_CUSTOMER_ID`) **or** admin session with tenant `google_ads_customer_id` under MCC.

Default body: **`dry_run: true`** (omit or set true). Pass `"dry_run": false` to mutate.

---

## What the endpoint mutates

Campaign id hardcoded: `24103567599`.

1. **Ensure `AG_Probe` ENABLED** (fails with `ag_probe_missing` + hint to run variants first).
2. **Add missing Probe keywords** (PHRASE, geo-qualified “erste fahrstunde …”) with CPC ~3.2–3.8 CHF — skips existing text/match pairs.
3. **Replace Probe RSA** when headlines lack `Erste Lektion CHF 65` **or** still mention `ERSTE30` / `Code …`:
   - Final URL: `https://drivingteam.ch/auto-fahrschule-zuerich-probe/?utm_content=ag_probe`
   - Paths: `Erste` / `Lektion`
4. **Traffic groups `AG_Local` + `AG_Preis`:** if an ENABLED RSA exists and is missing offer headlines (`Erste Lektion CHF 65`, `statt CHF 95.–`, `Nur die 1. Lektion`), remove+recreate RSA with those headlines appended (max 15), keeping existing final URLs.

Does **not** change campaign budget. Does **not** pause/enable Umgebung.

---

## Examples

```bash
# Inspect planned mutations
curl -X POST https://app.simy.ch/api/admin/gads-enable-erste30 \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": true }'

# Apply
curl -X POST https://app.simy.ch/api/admin/gads-enable-erste30 \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "dry_run": false }'
```

Response highlights: `ag_probe.action`, `keywords_add` / `keywords_added`, `probe_rsa.action`, `traffic_rsa[]`, `budget: "unchanged"`, `next` (measure 7 days before raising budget).

### Meta (optional, separate channel)

```bash
node scripts/launch-meta-erste30.mjs --dry-run
node scripts/launch-meta-erste30.mjs
```

Attaches creative to known Auto ZH ad set `52612269006271` when present; landing includes `utm_campaign=erste30`. Requires Meta env (`META_SYSTEM_USER_TOKEN` / `META_AD_ACCOUNT_ID` / `META_PAGE_ID`). Uses macOS `sips` to convert the website hero WebP → JPG — not a Vercel cron.

---

## Pitfalls

1. **Run variants first** — Without `AG_Probe`, enable returns `ag_probe_missing`.
2. **RSA is replace, not merge** — Probe and traffic updates remove the enabled RSA then create a new one.
3. **Do not put `ERSTE30` in Ads headlines** — Endpoint treats code-style headlines as needing a swap; sell CHF 65 / 95.
4. **Budget discipline** — Endpoint never raises spend; wait for first-lesson bookings before touching optimize/`daily_budget_chf`.
5. **Optimize vs enable** — `gads-optimize-auto-zh` may pause the ultra-broad Probe KW `erste fahrstunde` (PHRASE). Enable adds **qualified** phrases; re-check after both run.
6. **dry_run default** — Forgetting `"dry_run": false` only reports `would_*` actions.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/admin/gads-enable-erste30.post.ts` | Offer enable / RSA + keyword refresh |
| `server/api/admin/gads-auto-zh-variants.post.ts` | Seeds `AG_Probe` and siblings |
| `server/api/admin/gads-optimize-auto-zh.post.ts` | Broader repair (budget, negatives) |
| `server/utils/gads-auth.ts` | Cron vs session Ads credentials |
| `scripts/launch-meta-erste30.mjs` | Meta Auto ZH offer creative |
| `docs/SERVER_SIDE_CONVERSION_SETUP.md` | Conversion measurement |
