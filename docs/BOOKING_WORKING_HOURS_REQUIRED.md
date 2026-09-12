# Bookable slots require active working hours

**When to use:** Online booking shows Mon–Fri 08–18 for staff who never configured hours; slots remain after working hours were cleared; a recalc job errors with `writeSlots requires tenantId or staffId`; debugging empty availability after onboarding staff.

Verified against source (Sep 2026). Commit `7a9c11e4` (#157).

---

## Intent

Bookable availability must come only from **active** rows in `staff_working_hours`. The system must **not** invent synthetic Mon–Fri 08:00–18:00 defaults when hours are missing. After #157:

1. Backend `AvailabilityCalculator` loads only `is_active = true` hours and skips staff with none.
2. Frontend `useAvailabilitySystem` no longer fabricates default hours in-memory.
3. Recalc still **clears stale** `availability_slots` when zero slots are generated (so old defaulted rows disappear).
4. Stale cleanup is **scoped** — service-role deletes bypass RLS, so `writeSlots` refuses unscoped runs.

Related: multi-day external Ferien still block via overlap queries (separate busy-overlap runbook on docs PR #118).

---

## Contract

| Rule | Behavior |
|------|----------|
| Source of hours | `staff_working_hours` with `is_active = true` only |
| Missing hours | **Zero** bookable slots for that staff (no Mon–Fri default) |
| Day with no rows | That UTC weekday is skipped in slot generation |
| Empty generation | Upsert skipped; stale cleanup still runs for the scoped window |
| Scope required | `writeSlots` throws unless `tenantId` **or** `staffId` is set |
| Day numbering | DB / calculator: **1=Monday … 7=Sunday** (JS Sunday=0 converted) |

Typical entry points:

- Cron / queue → `availabilityCalculator.calculateAvailability({ tenantId, … })`
- Staff change → `recalculateForStaff(tenantId, staffId)`
- Admin / debug triggers that must pass tenant or staff scope

---

## Pitfalls

1. **“Staff has locations but no slots”** — Check `staff_working_hours` for that `staff_id` with `is_active = true`. Online-bookable `staff_locations` alone is not enough.
2. **Stale Mon–Fri slots after removing hours** — Trigger a scoped recalc (tenant or staff). Empty generation is intentional so cleanup deletes previously defaulted rows; actively reserved slots (`reserved_by_session` + future `reserved_until`) are kept.
3. **Unscoped calculator calls** — Calling `writeSlots` / `calculateAvailability` without `tenantId` and without `staffId` fails hard. Do not “fix” this by deleting globally — service role would wipe across tenants.
4. **Frontend vs DB** — Client preview paths that call `loadWorkingHours` also refuse defaults. If the API returns `[]`, the UI must show no slots, not invent hours.
5. **Inactive hours still in table** — Rows with `is_active = false` are ignored by the calculator query; toggling inactive without recalc leaves old slots until the next scoped cleanup.

---

## Ops checks

```sql
-- Staff online-bookable but missing active hours
SELECT u.id, u.first_name, u.last_name
FROM users u
JOIN staff_locations sl ON sl.staff_id = u.id AND sl.is_online_bookable AND sl.is_active
WHERE u.role = 'staff' AND u.is_active
  AND NOT EXISTS (
    SELECT 1 FROM staff_working_hours wh
    WHERE wh.staff_id = u.id AND wh.is_active = true
  );
```

After fixing hours: enqueue or run recalc for that `tenant_id` / `staff_id`, then confirm `availability_slots` for the window match working days only.

---

## Codepaths

| Path | Role |
|------|------|
| `server/services/availability-calculator.ts` | `loadWorkingHours` (no defaults); `writeSlots` scope + empty-slot cleanup |
| `composables/useAvailabilitySystem.ts` | Client load path — empty hours → no synthetic Mon–Fri |
| `staff_working_hours` | Canonical schedule (`day_of_week`, `start_time`, `end_time`, `timezone`, `is_active`) |
| `availability_slots` | Precomputed bookable inventory; stale rows cleared on scoped recalc |
| Cron / `availability_recalc_queue` consumers | Must pass `tenantId` and/or `staffId` into calculator |
