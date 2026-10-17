# Booking funnel tracking & first-lesson offer

**When to use:** Marketing funnel rates look wrong; wizard drop-off missing on tenant-admin marketing; ERSTE30 / CHF 65.– banners do not land on booking with code; `/buchen` opens a blank embed; `booking_events` has no `step` / `step_label`.

Verified against source (Aug 2026). Cross-links: [`SERVER_SIDE_CONVERSION_SETUP.md`](./SERVER_SIDE_CONVERSION_SETUP.md) (gclid / CAPI upload).

---

## Intent

Measure the public booking wizard **per step**, attribute website CTAs (especially the **first Auto lesson CHF 65.–** offer via code `ERSTE30`), and keep same-domain ad links working despite Simy’s `X-Frame-Options: SAMEORIGIN`.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Website offer UI | `apps/website/components/ErsteOfferBanner.vue` — default href `/buchen?category=B&code=ERSTE30` |
| Same-domain hop | `apps/website/pages/buchen.vue` — **302** to `https://app.simy.ch/booking/availability/driving-team` + query (strips `embed`) |
| Session / events | `plugins/booking-session-tracking.client.ts` → `POST /api/booking-events` |
| Wizard | `pages/booking/availability/[slug].vue` — `trackWizardStep` emits `started` + `step` with labels |
| Ops UI | Tenant-admin marketing overview — `wizardSteps` + funnel KPIs from `marketing-overview.get.ts` |
| Schema | `migrations/20260821_booking_events_wizard_step.sql` — columns `step`, `step_label`; event type `step` |

Offer copy is **marketing**: first Kat. B lesson 45 Min. at CHF 65.– (list CHF 95.–). Discount application still depends on an active code (`ERSTE30`) with `first_lesson_only` (or equivalent) in `discounts` — banners do not hard-code the price in the booking API.

---

## Event contract

`POST /api/booking-events` accepts:

| Field | Notes |
|-------|--------|
| `session_id` | Required |
| `event_type` | `viewed` \| `started` \| `step` \| `completed` \| `abandoned` \| `inquiry_submitted` |
| `page` | Must include `/booking/` or `/availability/` or API returns `{ ok: false }` |
| `step` / `step_label` | Wizard position (numeric; labels e.g. `Hauptkat.`, `Termin`) |
| `tenant_id`, `appointment_id`, … | Optional |

Persistence rules:

- Missing Supabase env → `{ ok: true }` (no throw)
- **No `VERCEL_ENV`** (local) → events are **not** inserted (still `{ ok: true }`)
- Failures never break the booking UX

Client plugin also:

- Fires `viewed` on load of booking paths
- Fires `abandoned` via `sendBeacon` on `beforeunload` if not completed
- On `completed`, Meta Pixel `Purchase` with `eventID: capi_{appointment_id}` when consent/`fbq` present

### Wizard step labels (typical)

| `step` | `step_label` |
|--------|----------------|
| 0 | Start |
| 1–7 | Hauptkat. → Unterkat. → Dauer → Standort → staff label → Termin → Adresse/Bestätigung |
| 4.5 | Treffpunkt |
| 9 / 10 | Anfrage bestätigt / Gast-Erfolg |

`started` fires once when entering steps 1–7; every step change also emits `event_type=step` (deduped per step value).

---

## `/buchen` hop

Simy refuses iframes from drivingteam.ch (`SAMEORIGIN`). Header/offer links use **same-origin** `/buchen`, which:

1. Forwards all query params except `embed`
2. Client-side enriches via `enrichSimyUrl` (attribution)
3. `navigateTo(..., { external: true, redirectCode: 302 })`

Example: `/buchen?category=B&code=ERSTE30&utm_content=ag_local` → booking URL with the same params.

---

## Pitfalls

1. **Local/dev has no rows** — Without `VERCEL_ENV`, inserts are skipped; funnel dashboards stay empty.
2. **Wrong page path** — Events from non-booking pages are rejected by the API.
3. **Embed / iframe** — Do not reintroduce iframe booking on the marketing site; use `/buchen` 302.
4. **Price ≠ code** — Banner text is CHF 65.–; checkout still needs a valid `code` (and first-lesson rules) or the customer pays list price.
5. **Category query** — Home may use `category=B Automatik`; other pages use `B`. Mismatch → wrong preselect in the wizard.
6. **Cross-domain session** — Attribution needs `session_id` / `dt_attr` / click IDs on the hop; see server-side conversion doc.

---

## Ops checks

```sql
-- Recent wizard steps
SELECT created_at, event_type, step, step_label, page, session_id, tenant_id
FROM public.booking_events
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 50;

-- Drop-off by step (last 30 days)
SELECT step, step_label, count(DISTINCT session_id) AS sessions
FROM public.booking_events
WHERE event_type IN ('step', 'started')
  AND created_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1;
```

UI: tenant-admin → marketing → wizard step bars (`wizardSteps` from `/api/tenant-admin/marketing-overview`).

---

## Codepaths

| Path | Role |
|------|------|
| `apps/website/components/ErsteOfferBanner.vue` | CHF 65.– offer CTAs |
| `apps/website/pages/buchen.vue` | Same-domain 302 hop to booking |
| `plugins/booking-session-tracking.client.ts` | Session, attribution, `__trackBookingEvent` |
| `server/api/booking-events.post.ts` | Persist events (Vercel only) |
| `pages/booking/availability/[slug].vue` | Wizard step tracking |
| `server/api/tenant-admin/marketing-overview.get.ts` | Funnel + `wizardSteps` aggregation |
| `migrations/20260821_booking_events_wizard_step.sql` | `step` / `step_label` + `step` event type |
| `docs/SERVER_SIDE_CONVERSION_SETUP.md` | Ads conversion upload after completed booking |
