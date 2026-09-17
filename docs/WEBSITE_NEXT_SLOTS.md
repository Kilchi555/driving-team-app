# Website next-slots teasers

## Intent

Show a handful of **live bookable slots** on marketing surfaces so visitors can jump into the booking calendar with category/location/date prefill. This is a **teaser**, not the full availability engine (`get-available-slots` / online booking probe).

Two implementations share the idea but differ in filtering:

| Surface | Entry | Filter model |
|---------|--------|--------------|
| Premium tenant sites (`/s/**`) | `loadWebsiteTeaserSlots` | Whole-tenant `availability_slots` |
| Driving Team marketing site (`apps/website`) | `GET /api/next-slots?page=` | Page key → location UUIDs + category codes |

## Architecture

```
availability_slots (is_available, reserved_until, category_code, …)
        │
        ├─ Tenant websites
        │    website-enrich-landing → slots block + JSON-LD Event schema
        │    GET /api/public/website/:subdomain/next-slots
        │         └── loadWebsiteTeaserSlots (server/utils/website-next-slots.ts)
        │
        └─ apps/website (Driving Team)
             UpcomingSlotsSection.vue
                  └── GET /api/next-slots?page=<page-key>
                       └── resolveNextSlotsFilter(page) → locationIds + categories
                            └── query availability_slots (DT tenant hardcoded)
```

## Contract (shared behavior)

| Knob | Tenant sites | DT marketing site |
|------|--------------|-------------------|
| Lookahead | 14 days | 14 days |
| Lead time | `tenants.minimum_booking_lead_time_hours` (default **12** if unset) | Fixed **12h** |
| Max slots returned | 9 | 6 |
| Max per `category_code` | 3 | 3 |
| In-process cache | 120s keyed by `tenantId:bookingUrl` | 120s keyed by `page` |
| HTTP cache | `setWebsitePublicCache` (~60s s-maxage, SWR) | `s-maxage=60`, SWR 300 |
| Slot filters | `is_available`, not reserved, start after lead | Same + `location_id IN (…)`, optional category `IN` |
| Book URL | `{app}/booking/availability/{tenant.slug}?category&prefill=partial&date` | Fixed `…/driving-team` + `category`/`location`/`prefill`/`date` |

Deep-link params use `%20` (not `+`) so Vue Router category matching stays reliable.

## Tenant websites

1. **SSR enrich** (`website-enrich-landing.ts`): loads teaser slots; injects/updates a `slots` landing block after `services`; builds Schema.org `Event` + `ReserveAction` via `buildSlotEventSchema` / `buildReserveActionSchema`.
2. **Public API** `GET /api/public/website/:subdomain/next-slots`:
   - Requires published `website_tenants` row (or `?preview=1`).
   - 404 if subdomain/tenant missing.
   - Returns `{ slots, booking_url, cached_hint_seconds }`.

Empty result on DB error → `[]` (logged), never throws from the loader.

## Driving Team page map

`apps/website/server/utils/next-slots-map.ts` maps marketing page keys (e.g. `fahrschule-lachen`, `auto-fahrschule-zuerich`) to:

- `locationIds` — meeting-point UUIDs (`locations` with type used in booking)
- `categories` — must match **`availability_slots.category_code`** exactly (e.g. `"B Automatik"`, not `"B"`)
- Optional `fallbackLocationIds` + `fallbackHint` when primary locations return zero rows in the window

Unknown `page` → empty slots (200), no throw.

UI: `UpcomingSlotsSection` — loading skeleton, slot cards → book URL, or empty state with proposal + booking CTAs. Shows amber hint when fallback was used (`used_fallback`).

Hardcoded tenant: Driving Team `64259d68-195a-4c68-8875-f1b44d962830`.

## Pitfalls

1. **Not the booking engine** — no staff pairing, school-vehicle filters, or online-bookable gates beyond what’s already reflected in `availability_slots`. Stale/missing slots usually mean availability recalc, not this teaser.
2. **Category code mismatch** — map/UI labels that don’t equal `category_code` yield empty teasers while the calendar still has slots.
3. **120s memory cache** — deploys/multi-instance don’t share cache; CDN/SWR can show slightly older teasers.
4. **Reserved slots** — rows with `reserved_until` in the future are excluded; expired reservations are included.
5. **DT vs tenant paths** — fixing a DT location page does not change premium `/s/{subdomain}` teasers (and vice versa).
6. **Missing Supabase on website** — DT `next-slots` returns 503 when service client can’t be created.

## Smoke test

**Tenant site**

```bash
curl -sS "https://<host>/api/public/website/<subdomain>/next-slots" | jq '.slots | length, .booking_url'
```

**DT page**

```bash
curl -sS "https://<website-host>/api/next-slots?page=fahrschule-lachen" | jq '{n:(.slots|length), used_fallback, hint, default_location_id}'
```

Compare a returned `category_code` / `location_id` against live booking with the same query params.

## Codepaths

| Path | Role |
|------|------|
| `server/utils/website-next-slots.ts` | Shared teaser loader + schema helpers |
| `server/utils/website-enrich-landing.ts` | Injects slots block + JSON-LD on premium landings |
| `server/api/public/website/[subdomain]/next-slots.get.ts` | Public JSON for tenant sites |
| `apps/website/server/api/next-slots.get.ts` | DT marketing teaser API |
| `apps/website/server/utils/next-slots-map.ts` | Page → location/category (+ fallback) |
| `apps/website/components/UpcomingSlotsSection.vue` | DT UI consumer |
