# Returning-customer booking prefill

**When to use:** Dashboard “Fahrstunde buchen” lands on step 0 despite past lessons; wrong category for Haku/Sara tenants; cancelled/exam appointments driving the wizard; deep-link `?prefill=` ignored; duration not snapping to offered options.

Verified against source (Aug 2026). Commit `bbc92e6d`.

---

## Intent

Returning clients skip category / duration / location / instructor when their last usable appointment still matches what the public wizard can book. Prefill is advisory: each step still validates against live availability.

---

## Contract

Shared helper: `utils/booking-prefill.ts` → `deriveBookingPrefill(appointments, { bookableCodes? })`.

| Field | Source | Notes |
|-------|--------|-------|
| `mode` | Derived | `full` when category + staff UUID + duration + (location **or** pickup PLZ); else `partial` |
| `category` | `appointments.type` or `event_type_code` | License code for Fahrschule (`B`, `A1`, …); public event code for consulting/Haku |
| `staffId` / `locationId` | UUIDs only | Non-UUID values dropped |
| `durationMinutes` | `duration_minutes` or `end − start` | Snapped later via `snapDuration` |
| `pickupPlz` / `pickupAddress` | Pickup fields | PLZ from column or first `\b\d{4}\b` in address; address max 200 chars |

### Skip rules

| Skip | Codes / values |
|------|----------------|
| Event codes | `vacation`, `break`, `staff_meeting`, `meeting`, `training`, `maintenance`, `admin`, `team_invite`, `exam`, `theory`, `consultation`, `nothelfer`, `vku` |
| Statuses | `cancelled`, `canceled`, `aborted`, `deleted` |
| Soft-delete | `deleted_at` set |
| Generic `type` | `lesson`, `exam`, `theory`, `consultation`, `other` are not wizard categories |

Walk appointments **newest first**; first usable row wins. When `bookableCodes` is provided, the derived category must be in that set (case-insensitive).

### Query encoding

`bookingPrefillToQuery`:

```
prefill=true|partial
category=<code>
staff=<uuid>           # optional
location=<uuid>        # optional
duration=<minutes>     # optional
pickup_plz=<4 digits>  # optional
pickup_address=<text>  # optional
```

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| `GET /api/customer/last-booking-prefs` | Auth client only; rate-limit 30/min/IP (`register` bucket); loads last 25 appointments (service role); builds `bookableCodes` from active `categories` (driving school) or `public_bookable` `event_types` (other) |
| `CustomerDashboard.navigateToLessonBooking` | Prefers in-memory `deriveBookingPrefill(appointments)`; falls back to the API |
| `pages/booking/availability/[slug].vue` | If `?prefill=true\|partial` + `category` → `applyAppointmentPrefill`; else if logged in and no deep-link → fetch last-booking-prefs; else `localStorage` `simy_booking_prefs_{slug}` |
| `snapDuration` | Exact match or nearest offered duration |

Staff-handle / category-only deep links (`?staff=`, `?category=`, `?service=fahrstunde`) are **not** prefill mode — they run only when `prefill` query is absent.

---

## Pitfalls

1. **Exam / theory last appointment** — Skipped by event-code list; prefill walks further back. Empty history → no skip.
2. **Dashboard list vs API** — Client-side `appointments` may lack fields or bookable-code filtering; API path is authoritative for bookable codes.
3. **`full` vs `partial`** — Missing location **and** pickup PLZ forces `partial` even with staff + duration; wizard stops earlier.
4. **Stale staff/location** — Prefill applies IDs; if instructor left the location, UI stops after location / duration step.
5. **Guests** — History fetch needs a session; guests use localStorage restore only.
6. **Rate limit key** — Endpoint reuses the `register` rate-limit bucket (30 / 60s / IP).

---

## Smoke test

1. Client with a recent confirmed `type: B` lesson → dashboard book → URL has `prefill=true` (or `partial`) + `category=B` → wizard lands past category.
2. Last appointment `event_type_code: exam` then older `lesson` B → prefill uses B.
3. Consulting tenant: last `discovery` public_bookable → category `discovery`.
4. Unauthenticated open of booking slug → no last-booking-prefs call; localStorage prefs may still apply.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/booking-prefill.ts` | Derive / encode / snap helpers |
| `server/api/customer/last-booking-prefs.get.ts` | Authenticated history API |
| `components/customer/CustomerDashboard.vue` | Dashboard CTA query |
| `pages/booking/availability/[slug].vue` | Apply query / history / localStorage |
| `server/utils/__tests__/booking-prefill.test.ts` | Unit coverage |
