# Booking attribution hop (click IDs)

**When to use:** Google/Meta conversions miss after `drivingteam.ch` → `app.simy.ch`; UTMs survive but `gclid`/`fbclid` do not; debugging `dt_attr`, `booking_redirects`, or Meta `_fbc` minting after #190.

Verified against source (Sep 2026). Commit `e9677e6e` (#190).

**Related (do not merge topics):**

- [SERVER_SIDE_CONVERSION_SETUP.md](./SERVER_SIDE_CONVERSION_SETUP.md) — Ads env / OAuth / conversion action setup
- Binding fire/claim rules (#170) — when a `confirmed` booking uploads (draft runbook `BINDING_BOOKING_CONVERSIONS.md` on docs PR #185). This page is **hop persistence only**.

---

## Intent

Preserve first-class ad click IDs across UTM-only pageviews and the website → booking-app hop so server-side attribution still has a click id when the booking confirms. Conversion **eligibility** rules are unchanged by #190; this work is plumbing.

---

## Contract

### Click IDs preserved

| Key | Role |
|-----|------|
| `gclid`, `gbraid`, `wbraid`, `fbclid` | First-class URL keys (`FIRST_CLASS_CLICK_ID_KEYS`) |
| `fbc`, `fbp` | Also merged/persisted (Meta cookie + browser id) |
| UTMs + `landing_page` | Merged with existing attribution |

`mergeAttributionFields`: truthy click IDs win; empty/`null` must **not** wipe a previously stored click id.

Landing page refreshes when incoming has `utm_source` **or** any of the four first-class click IDs.

### Meta `_fbc`

- New `fbclid` → `resolveFbcForIncomingFbclid` (prefer cookie/stored/`dt_attr` `_fbc` only if it already encodes this `fbclid`; else mint `fb.1.{ts}.{fbclid}`).
- Meta Purchase eligibility (`hasMetaClickId`): **`fbclid` OR `fbc`**. **`fbp` alone is not enough**.

### Hop surfaces

| Surface | Role |
|---------|------|
| Website `marketing-attribution.client.ts` | Capture/merge; session id via `crypto.getRandomValues` |
| `enrich-simy-url.ts` | Append `session_id`, `dt_attr`, first-class click IDs to simy + `/buchen` |
| `booking-redirect.post.ts` | `resolveBookingRedirectClickIds(body, marketing_attributions row)` → insert; `tenant_id` from `getWebsiteTenantId` (not client body) |
| `go/buchen.get.ts` | SSR hop; construct `fbc` from `fbclid`; persist then 302 |
| App `booking-session-tracking.client.ts` | Recover URL + `dt_attr` on `app.simy.ch` |
| `resolve-marketing-attribution.ts` | Merge client + `marketing_attributions` + `booking_redirects` |

### Dual utility copies

Keep in sync:

- `apps/website/utils/booking-attribution-hop.ts`
- `server/utils/booking-attribution-hop.ts`

(Website app cannot import the root copy; comment in file calls out the sync requirement.)

### Schema

`sql_migrations/20260909_booking_redirects_meta_click_ids.sql` — `ADD COLUMN IF NOT EXISTS` `fbclid`, `fbc`, `fbp` on `booking_redirects`.

---

## Pitfalls

1. **UTM-only merge must not clear click IDs** — Empty incoming fields are non-destructive.
2. **Stale `_fbc` after a new `fbclid`** — Always run `resolveFbcForIncomingFbclid`; Meta prefers `_fbc` over raw `fbclid`.
3. **`fbp` alone ≠ Meta Purchase** — Need `fbclid` or `fbc`.
4. **Do not trust client `tenant_id` on redirects** — Server resolves website tenant.
5. **Dual-file drift** — Edit both hop utility copies (or regenerate) when changing merge rules.
6. **Setup guide diagram is incomplete** — `SERVER_SIDE_CONVERSION_SETUP` still emphasizes gclid/`dt_attr`; Meta columns and hop helpers live here.

---

## Codepaths

| Path | Role |
|------|------|
| `apps/website/utils/booking-attribution-hop.ts` | Website hop helpers |
| `server/utils/booking-attribution-hop.ts` | App/server hop helpers (keep in sync) |
| `apps/website/plugins/marketing-attribution.client.ts` | Client capture |
| `apps/website/utils/enrich-simy-url.ts` | Link enrichment |
| `apps/website/server/api/booking-redirect.post.ts` | Persist redirect row |
| `apps/website/server/routes/go/buchen.get.ts` | SSR hop |
| `plugins/booking-session-tracking.client.ts` | App-side recovery |
| `server/utils/resolve-marketing-attribution.ts` | Merge for booking APIs |
| `server/utils/meta-capi.ts` | `hasMetaClickId` Purchase gate |
| `sql_migrations/20260909_booking_redirects_meta_click_ids.sql` | Meta columns on redirects |
| `server/utils/__tests__/fbclid-hop.test.ts` | Hop merge / `_fbc` regressions |
