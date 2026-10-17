# Online-Booking Readiness Probe

**When to use:** An admin sees the onboarding checklist step “Online-Buchung prüfen”, the public booking page shows only the inquiry form / no slots, or you need to verify that event-type (non–driving-school) booking would expose availability the same way the UI does.

---

## Intent

Live probe that answers: **would `/booking/availability/{slug}` show bookable slots right now?**

It mirrors the public path:

1. Master switch `allow_online_booking`
2. Selectable services (`get-booking-init`: FS subcategories vs public_bookable event types)
3. Staff × location pairs (`get-locations-and-staff`: online-bookable only)
4. Slot filters (`get-available-slots`: lead time, reservation, category, duration, rooms) over a **28-day** window

`ready = allowOnlineBooking && slotsFound > 0`

---

## Surfaces

| Surface | Path | Auth |
|---------|------|------|
| Probe API | `GET /api/admin/booking-readiness` | `requireAdminOnly` → `admin` / `super_admin` |
| Onboarding API | `GET /api/admin/onboarding-status` | Any authenticated user with `tenant_id` (calls the same probe) |
| Shared logic | `probeBookingSlots(supabase, tenantId, { days: 28 })` | — |
| Checklist UI | `components/admin/OnboardingChecklist.vue` on `/admin` | Admin layout |
| Modal | `components/admin/BookingReadinessModal.vue` → re-runs probe | Bearer token |

Onboarding step `booking` uses `action: 'booking-readiness'` (opens modal; no href). Checklist patches local progress when the modal emits `@updated`.

---

## Checklist items (`checks[]`)

| id | Pass means |
|----|------------|
| `master` | `tenant_settings` `features.allow_online_booking` enabled (JSON `{ enabled }` or `'true'`/`'false'`; **default true** if unset) |
| `staff` | ≥1 active `users` with `role='staff'` |
| `hours` | ≥1 active `staff_working_hours` for those staff |
| `bookable` | ≥1 active `staff_locations` with `is_online_bookable=true` |
| `services` | FS: active subcategories with ≥1 `lesson_duration_minutes`; non-FS: active `event_types` with `public_bookable` and `default_duration_minutes > 0` |
| `slots` | Live probe found ≥1 slot |

`blockers` lists failed check labels, plus optional pending `availability_recalc_queue` count. Queue pending is informational — it does **not** alone set `ready=false` if slots already exist.

---

## Event-type vs driving-school path

| Concern | Driving school | Event-type (non-FS) |
|---------|----------------|---------------------|
| Services | Subcategories × `lesson_duration_minutes` | `event_types` with `public_bookable` |
| Staff×location category filter | Must offer service code | **Skipped** (topic codes ≠ event type codes) |
| Probe `source` | `'category'` | `'event_type'` |
| Create / guest-book pricing | `pricing_rules.base_price` by category | `event_price` by event type; free if `require_payment===false` |

Availability calculator falls back to public_bookable event types only when **no** subcategories exist. Empty `lesson_duration_minutes` on FS subcats ⇒ probe never finds services/slots.

---

## Probe limits (verified)

- Searches first **16** services × first **6** staff×location pairs; **stops at first combo with count > 0**
- `slotsFound` is that combo’s count, not tenant-wide
- Always uses `serviceType: 'fahrstunde'` for the room gate (theorie/beratung may differ in the UI)
- Does **not** apply the booking UI’s school-vehicle filter → probe can say ready while a vehicle-required option shows fewer/no slots
- API returns relative `bookingUrl`: `/booking/availability/{slug}`

---

## Common pitfalls

1. **Runtime gate is `staff_locations.is_online_bookable`**, not `locations.public_bookable`. Migration `sql_migrations/20260809_locations_public_bookable_default.sql` only seeds location defaults; staff assignment copies `public_bookable` into `is_online_bookable`.
2. Dual membership required: staff in `locations.staff_ids` **and** an online-bookable `staff_locations` row.
3. Master off + slots exist → `ready=false`; customers see inquiry form only (“Slots wären vorhanden” in the modal).
4. Auth asymmetry: onboarding-status is broader than booking-readiness (any authed tenant user vs admin/super_admin).
5. `hours` checklist item does not gate whether the live probe runs (only staff + bookable + services do).

---

## Related SA diagnostics

For cross-tenant empty calendars / support actions, use the super-admin **Setup** tab on `/tenant-admin/tenants` (`GET /api/admin/tenants/:id` + actions). A dedicated runbook may land separately as `TENANT_SETUP_DIAGNOSTICS.md`.

---

## Codepaths

- `server/utils/booking-slot-probe.ts`
- `server/api/admin/booking-readiness.get.ts`
- `server/api/admin/onboarding-status.get.ts`
- `components/admin/BookingReadinessModal.vue`
- `components/admin/OnboardingChecklist.vue`
- `pages/admin/index.vue`
- `server/api/booking/get-booking-init.get.ts`
- `server/api/booking/get-locations-and-staff.post.ts`
- `server/api/booking/get-available-slots.get.ts`
- `server/api/booking/create-appointment.post.ts`
- `server/api/booking/guest-book.post.ts`
- `pages/booking/availability/[slug].vue`
- `sql_migrations/20260809_locations_public_bookable_default.sql`
