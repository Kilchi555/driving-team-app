# Booking: multi-day external busy overlap

**When to use:** Online booking still shows slots during staff Ferien; `external_busy_times` has a multi-day block but slot queries look empty of busy rows; reserve/create succeeds over a vacation window.

Verified against source (Sep 2026). Commit `c4b353ae` (#115).

---

## Intent

A multi-day external busy block (e.g. Ferien **25 Aug → 6 Sep**) must block slots queried for a later window (e.g. **1–7 Sep**). Filtering with only `start_time >= windowStart` drops those rows and leaves bookable holes.

Canonical overlap:

```text
existing.start < rangeEnd  AND  existing.end > rangeStart
```

---

## Helpers (`server/utils/time-range-overlap.ts`)

| Export | Use |
|--------|-----|
| `intervalsOverlap(aStart, aEnd, bStart, bEnd)` | Pure interval check |
| `applyTimeRangeOverlap(query, rangeStart, rangeEnd)` | Adds `.lt('start_time', rangeEnd).gt('end_time', rangeStart)` to a Supabase query builder |
| `slotOverlapsAnyBusy(slot, busyTimes)` | Filters precomputed slots against loaded busy rows (same `staff_id`) |
| `findStaffBusyOverlap(supabase, { staffId, startTime, endTime, tenantId? })` | Fail-closed probe before create / reserve / guest-book |

---

## Surfaces

**Read paths** (hide slots that still overlap busy even if `available_slots` is stale):

- `GET /api/booking/get-available-slots`
- `POST /api/booking/get-slots-for-pickup`
- `server/utils/booking-slot-probe.ts`
- `server/services/availability-calculator.ts` (appointments + `external_busy_times` loads)

**Write paths** (reject booking when an overlap exists):

- `POST /api/booking/create-appointment`
- `POST /api/booking/reserve-slot`
- `POST /api/booking/guest-book`

---

## Pitfalls

- Prefer `applyTimeRangeOverlap` over hand-rolled `gte('start_time', …)` when loading busy or appointments for a date window.
- Slot endpoints also filter in memory with `slotOverlapsAnyBusy` so a lagging availability recalc cannot re-open Ferien days.
- Overlap is half-open in spirit of “touching ends”: equal edge times that only meet (`end === start`) do **not** overlap (`start < otherEnd && end > otherStart`).
- Always scope busy queries by `tenant_id` (and `staff_id` when known) — same helper, caller supplies filters before `applyTimeRangeOverlap`.

---

## Example

Ferien row: `2026-08-25T00:00Z` → `2026-09-06T23:59Z`.  
Query window: `2026-09-01` → `2026-09-07`.

```sql
-- Overlap filter (same as applyTimeRangeOverlap)
start_time < '2026-09-07T23:59:59Z'
AND end_time > '2026-09-01T00:00:00Z'
```

The Ferien row matches; slots for that staff in the window are removed / rejected.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/time-range-overlap.ts` | Shared overlap helpers |
| `server/utils/__tests__/time-range-overlap.test.ts` | Unit coverage |
| `server/api/booking/get-available-slots.get.ts` | Live busy filter on slot list |
| `server/api/booking/get-slots-for-pickup.post.ts` | Pickup slots |
| `server/api/booking/create-appointment.post.ts` | Create guard |
| `server/api/booking/reserve-slot.post.ts` | Reserve guard |
| `server/api/booking/guest-book.post.ts` | Guest book guard |
| `server/services/availability-calculator.ts` | Recalc queries |
| `server/utils/booking-slot-probe.ts` | Probe / precompute filter |
