# Booking vehicle capacity (school fleet)

**When to use:** Public booking shows zero slots for a category that requires a school car; fleet table empty but every Driving Team slot vanished; readiness probe disagrees with slot API; clients forcing capacity via query params.

Verified against source (Aug 2026). Commit `50f7c6f7` (#85).

---

## Intent

Hide slots only when a **configured school-vehicle option** lacks free fleet capacity. An empty `vehicles` table is treated as a setup gap by default — not as “fully booked” — so online booking keeps working while ops add cars.

---

## Contract

Settings live on `categories.vehicle_settings` and optional per-location override `locations.category_vehicle_settings[categoryCode]`. Shape:

```ts
{ mode: 'none' | 'options', options?: VehicleOption[] }
```

| Option field | Effect |
|--------------|--------|
| `key` | Stored on appointment as `vehicle_mode` |
| `requires_school_vehicle` | Creates `vehicle_bookings` placeholder on book; enables capacity checks |
| `enforce_capacity` | Soft vs hard empty-fleet behavior (see below) |

### Policy resolution (server-only)

`resolveSlotVehiclePolicy(locationSettings, categorySettings, categoryCode, vehicleMode?)`:

1. Resolve effective settings (location override wins when `mode === 'options'` with options, or location `mode === 'none'`).
2. Pick option by `vehicle_mode`, else default / first option.
3. Return:
   - `requiresSchoolVehicle` ← option flag
   - `enforceCapacity` ← `requires_school_vehicle && enforce_capacity`

Clients may pass `vehicle_mode` (option key only). They **cannot** pass `requires_school_vehicle` — that query flag was removed so capacity policy cannot be forged.

### `isSchoolVehicleAvailable`

Source of truth: active `vehicles` at location matching `category_codes`, vs non-cancelled overlapping `vehicle_bookings`.

| Fleet | Bookings | `enforceCapacity` | Result |
|-------|----------|-------------------|--------|
| 0 cars | any | `false` (default) | **Available** (setup gap) |
| 0 cars | any | `true` | **Unavailable** (hard) |
| N > 0 | overlapping &lt; N | either | Available |
| N > 0 | overlapping ≥ N | either | Unavailable |

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| `GET /api/booking/get-available-slots` | Loads category + location vehicle settings; filters slots via policy + `isSchoolVehicleAvailable` |
| `booking-slot-probe` / readiness | Same vehicle filter (empty fleet does not zero the probe by default) |
| `POST /api/booking/create-appointment` | If chosen option has `requires_school_vehicle`, inserts `vehicle_bookings` placeholder (`vehicle_id` null) |
| Admin → Categories | Checkbox “Schulfahrzeug nötig” maps to `requires_school_vehicle` only |

---

## Pitfalls

1. **Empty fleet hid all slots (pre-#85)** — Treated empty fleet as unavailable. After #85, empty fleet stays bookable unless `enforce_capacity` is set on that option.
2. **Admin UI does not expose `enforce_capacity`** — Saving the category form does not persist that flag. Hard empty-fleet blocking needs a DB/JSON edit (or a future UI control). The checkbox label mentions Kapazität but only sets `requires_school_vehicle`.
3. **Booked-out fleet still hides slots** — Once cars exist, overlapping placeholders/bookings reduce capacity regardless of `enforce_capacity`.
4. **Unknown `vehicle_mode`** — Falls back to the default option’s policy; clients cannot invent a school-car requirement.
5. **Location override** — Location `mode: 'none'` disables vehicle options for that category at that site even if the category has options.

---

## Smoke test

1. Category option with `requires_school_vehicle: true`, no `vehicles` rows → slots still returned from get-available-slots.
2. Same option with `enforce_capacity: true` in stored JSON → slots hidden when fleet empty.
3. One active vehicle + one overlapping `vehicle_bookings` → slot hidden for that window.
4. Booking with school option → `vehicle_bookings` row with `appointment_id` and `vehicle_id` null.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/vehicle-availability.ts` | Settings resolve, policy, fleet check, pricing helpers |
| `server/api/booking/get-available-slots.get.ts` | Public slot filter (Layer 5) |
| `server/utils/booking-slot-probe.ts` | Readiness / probe parity |
| `server/api/booking/create-appointment.post.ts` | Placeholder `vehicle_bookings` insert |
| `pages/admin/categories.vue` | Vehicle option editor |
| `server/utils/__tests__/vehicle-availability.test.ts` | Unit coverage |
