# Staff Teaching Base & Max Travel

**When to use:** Online booking hides slots that should be reachable because the instructor is “returning home”; `max_travel_minutes` blocks Treffpunkt slots after a pickup; staff with several standard locations need the correct modal PLZ as travel base.

Verified against source (Aug 2026).

---

## Intent

`AvailabilityCalculator` still enforces travel **time + buffer** between stops, but **`max_travel_minutes` must not block**:

1. A return to the staff member’s **teaching base** (modal PLZ among online-bookable standard locations), or
2. The next stop after a **customer pickup** (or when there is no prior appointment to measure from).

Without this, common patterns (lesson far away → back to Altstetten Treffpunkt) disappear from the bookable grid.

---

## Teaching base (`base_postal_codes`)

Computed in `assignBasePostalCodes`:

1. Take locations with `location_type === 'standard'`, a `postal_code`, and a staff↔category mapping for that instructor.
2. Count PLZ frequency.
3. Keep every PLZ tied for the highest count (ties are all bases).
4. Empty set if the staff has no matching standard locations.

`home_plz` from staff settings is still loaded for other uses; it is **not** the fallback origin for the max-travel check when there is no prior appointment.

Destination is exempt from max-travel when `newLocationPostalCode` is in `staff.base_postal_codes`.

---

## Max-travel origin selection

When max-travel applies (destination is not teaching base, and `max_travel_minutes > 0`):

| Previous stop | Used as `fromPlz`? |
|---------------|--------------------|
| Latest appointment with PLZ, not `location_type=pickup` | Yes (if newer than busy time) |
| Latest external busy time with PLZ | Yes (if newer than appointment) |
| Latest appointment is a **pickup** | No — max-travel skipped for this slot |
| No prior appointment / busy | No — max-travel skipped |

Travel duration still comes from `getTravelTimeForSlot(fromPlz, dest, slotStart)`. Exceeding `max_travel_minutes` marks the slot blocked (`return true` from the conflict helper).

---

## Pitfalls

1. **Wrong base PLZ** — base is modal among *standard* locations mapped to the staff, not “first location” and not `home_plz`. Mis-tagged `location_type` (e.g. Treffpunkt as pickup) skews the mode.
2. **Ties** — multiple bases stay exempt; intentional when staff teach equally in two PLZs.
3. **Buffer / travel-time checks still apply** — only the *max_travel preference* is waived for base/pickup cases.
4. **Appointment load must select `location_type`** — without it, pickup exemption never fires.

---

## Related: stale confirmation emails

Same release also skips queued `appointment_confirmation` outbound messages when the appointment is already `cancelled`/`canceled`, or `start_time` is more than **30 minutes** in the past. Queue row is marked `failed` with `Appointment already started or cancelled` (`server/api/cron/process-outbound-messages.get.ts`). Fold into the appointment-confirmations runbook when that draft merges.

---

## Codepaths

- `server/services/availability-calculator.ts` — `assignBasePostalCodes`, max-travel block in slot conflict checks
- `server/api/cron/process-outbound-messages.get.ts` — stale confirmation skip (related)
