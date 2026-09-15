# Public bookable locations and staff

**When to use:** Booking page shows zero locations after a users RLS change; consulting/event tenants see empty staff while Fahrschule works (or the reverse); debugging which staff appear for a category on `/booking/availability/{slug}`.

Verified against source (Sep 2026). Commit `4913b705` (#75). Complements the readiness probe (open draft `BOOKING_READINESS` when merged) — this runbook is the **assignment resolver** and the **service_role** read path.

---

## Intent

The public booking UI has no session. After users RLS locked down anon `SELECT` on `users` (PII), location/staff discovery must use the **service role** and still return only tenant-scoped, online-bookable pairs. Assignment logic lives in a pure helper so Fahrschule stays strict while event-type (consulting) tenants can fall back when `staff_locations` were never configured.

---

## Surface

| Item | Contract |
|------|----------|
| Route | `POST /api/booking/get-locations-and-staff` |
| Auth | Public (no session) — uses `getSupabaseAdmin()` |
| Body | `{ tenant_id, category_code }` required |
| Success | `{ success, locations[], staff_count, location_count }` — only locations with ≥1 `available_staff` |
| Staff photo | From `users.metadata.photo_url` or `avatar_url` |

### Mode detection

| Condition | Mode |
|-----------|------|
| Active `categories` row matches `category_code` | Driving school (category booking) |
| No category, but active `event_types` with `public_bookable=true` matches code | Event-type booking |
| Neither | Still loads data; event-type flags stay false → strict staff-only path |

---

## Assignment rules (`resolveLocationStaffAssignments`)

Inputs: locations (`location_type=standard`, active), staff (role filter below), and `staff_locations` rows with `is_online_bookable=true` + `is_active=true`.

| Mode | Bookable user roles | Empty `staff_locations` | With `staff_locations` |
|------|---------------------|-------------------------|------------------------|
| Driving school | `staff` only | **No** invented pairs → empty map | Require row; honor `locations.staff_ids` allowlist if non-empty; category must match effective categories |
| Event-type | `staff`, `admin`, `tenant_admin` | **Fallback:** every bookable person × every location | Configured rows only (no category filter on the event type code — those columns hold topic codes) |

### Effective categories (driving school)

1. Prefer `staff_locations.available_categories` when it is an array.
2. Else intersect staff `users.category` with location `available_categories` (if location list empty → use staff categories alone).
3. Staff is kept only if `category_code` is in that effective list.

---

## Pitfalls

1. **Empty booking after RLS** — Do not switch this endpoint back to the anon client for `users`; service_role is required for names. Keep filters tenant-scoped.
2. **Fahrschule with no online `staff_locations`** — Returns zero locations by design. Configure `staff_locations.is_online_bookable`, not only `locations.public_bookable`.
3. **Event type filtered as a category** — Filtering `staff_locations.available_categories` by the event type code wipes the page. Event mode skips that filter; topic codes are not the booking code.
4. **Solo admin consulting tenant** — Empty online `staff_locations` triggers admin×all-locations fallback. Once any online rows exist, only those rows count.
5. **`locations.staff_ids` allowlist** — Non-empty list excludes staff not listed even if `staff_locations` says online-bookable.
6. **Locations without staff dropped** — Final response filters `available_staff.length > 0`.

---

## Ops checks

| Symptom | Check |
|---------|--------|
| Zero locations (FS) | Active online `staff_locations` for tenant? Staff role `staff` + active? Category on staff/location match? |
| Zero locations (event) | `event_types.public_bookable`? If `staff_locations` empty, are admin/staff active? If rows exist, do they point at standard locations? |
| Staff missing photo | `metadata.photo_url` / `avatar_url` on the user row |
| 400 | Missing `tenant_id` or `category_code` |

Unit coverage: `server/utils/__tests__/bookable-locations.test.ts`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/booking/get-locations-and-staff.post.ts` | Public endpoint + service_role queries |
| `server/utils/bookable-locations.ts` | Roles, parsers, `resolveLocationStaffAssignments` |
| `server/utils/__tests__/bookable-locations.test.ts` | FS vs event fallback / category filter |
| `server/utils/supabase-admin.ts` | Admin client used by the endpoint |
