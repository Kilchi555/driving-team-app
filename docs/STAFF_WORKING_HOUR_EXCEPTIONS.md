# Staff working-hour exceptions

**When to use:** Date-specific open/closed hours that replace (not merge with) the weekly plan; debugging empty public slots on one civil date; StaffSettings / calendar gray spans; past-date immutability; `POST /api/staff/working-hour-exceptions`.

Verified against current `main` (Sep 2026). Landed: `b9b18855` (staff working hour exceptions + past-date guards).

Related but separate: the **booking working-hours required** gate (weekly `staff_working_hours` must exist before public booking) — different concern; do not treat exception rows as that gate.

---

## Intent

Weekly `staff_working_hours` is the default. For a specific civil date, a staff member (or tenant admin editing that staff) can set either:

- **CLOSED** — no working hours that day
- **Custom open intervals** — one or more wall-clock blocks that **fully replace** the weekly intervals for that date

Absence of an exception row means the weekly rule still applies. Saving UI mode **Normal** deletes any existing exception for that date; it never writes a copy of the weekly plan.

After every successful write/delete, the API enqueues an availability recalc (`trigger: 'working_hours'`). Slot generation and the staff calendar both resolve hours through `resolveEffectiveWorkingHours`.

---

## Contract (current `main`)

### Data model

| Table | Role |
|-------|------|
| `staff_working_hour_exceptions` | One parent row per `(tenant_id, staff_id, exception_date)`. `is_closed` + `timezone` (product writes `Europe/Zurich`) |
| `staff_working_hour_exception_intervals` | Child intervals for open exceptions. Composite FK keeps `tenant_id` / `staff_id` aligned with the parent |

Shape (enforced in RPC + deferred triggers):

- `is_closed = true` → **zero** intervals
- `is_closed = false` → **at least one** interval; max **8** blocks; no overlaps; `start_time < end_time`

### Resolution (`utils/effective-working-hours.ts`)

| Rule | Detail |
|------|--------|
| Replacement | If an exception exists for the civil date, weekly hours for that weekday are ignored |
| Closed / empty | Returns `[]` → no slots / full-day gray span |
| Civil dates | `YYYY-MM-DD`; weekday from civil parts (`1` = Monday … `7` = Sunday), not host timezone |
| Past cutoff | Zurich civil **today** (`Europe/Zurich`). Past dates rejected on validate, API delete, RPC, and DB triggers (including DELETE) |
| Batch limits | `1..62` dates per `validateExceptionDays` / `replace_staff_working_hour_exceptions` |

### API (`POST /api/staff/working-hour-exceptions`)

Auth: `requireTenantStaff` then `authorizeWorkingHoursMutation` — staff may only mutate **self**; `admin` / `tenant_admin` / `super_admin` may mutate any same-tenant staff. `tenant_id` always comes from the authenticated actor (body `tenant_id` is ignored for scope).

| `action` | Behavior |
|----------|----------|
| `list` | Requires `startDate` / `endDate` civil range; returns parents + sorted blocks |
| `upsert` | One day: `date`, `isClosed`, `blocks` → RPC replace |
| `upsert_many` | `days[]` → same validation + one RPC call (all-or-nothing) |
| `delete` | Removes parent for `date` (today or future only); cascades intervals |

Writes go through service-role + RPC `replace_staff_working_hour_exceptions`. Known RPC markers (e.g. `date_in_past`, `overlapping_intervals`) map to HTTP 400.

### UI entry (`utils/working-hour-exception-entry.ts`)

| Mode | Save plan |
|------|-----------|
| `normal` | Delete existing row if any; never upsert weekly clone |
| `closed` | Upsert `isClosed: true`, `blocks: []` |
| `custom` | Upsert open blocks |

Multi-date pencils stay on the **same weekday** (`civilDatesForWeekday`) so a Friday edit cannot write Monday rows.

### Calendar / availability

- Calculator: `loadWorkingHourExceptions` (tenant-scoped) → `resolveEffectiveWorkingHours` in the UTC civil day loop.
- Calendar gray spans: `utils/calendar-non-working-display.ts` via `nonWorkingSpans`.
- Public booking APIs do **not** query the exception tables directly; they see the effect through generated slots.

### Migrations (apply before relying on product code)

1. `migrations/20260922_staff_working_hour_exceptions.sql` — tables, RLS, RPC
2. `migrations/20260925_staff_working_hour_exception_not_past.sql` — INSERT/UPDATE past guard
3. `migrations/20260925_staff_working_hour_exception_past_delete.sql` — extends guard to DELETE

The base migration comments an explicit deploy order: apply SQL → verify objects → deploy app → verify queue / calendar / public availability.

---

## Pitfalls

1. **Merging exception intervals with weekly hours** — wrong. Presence of a row replaces the weekly plan for that date entirely.
2. **Using host/UTC “today” for past checks** — product cutoff is **Europe/Zurich** civil date in TS, RPC, and triggers.
3. **Editing yesterday to “fix”** — INSERT/UPDATE/DELETE of past `exception_date` raises `date_in_past` (API + DB).
4. **Deploying app before migrations** — calculator/API expect the tables and RPC; the migration header requires SQL first.
5. **Staff editing another staff without admin role** — `assertSelfOrTenantAdmin` → 403 before any table touch.
6. **Confusing with booking hours gate** — that gate is about whether weekly hours exist at all; exceptions are date overrides on top.
7. **Assuming public routes read exceptions** — they consume recalculated slots; empty day usually means CLOSED or no weekly hours for that weekday.
8. **Normal mode writing weekly clone** — `planExceptionSave` only deletes; regression would duplicate data and break “restore weekly” semantics.
9. **E2E gate** — `e2e/working-hour-exceptions.spec.ts` runs only when `E2E_DEMO_PASSWORD` is set **and** `E2E_WORKING_HOUR_EXCEPTIONS=1`.

---

## Verify

```bash
npx vitest run \
  utils/__tests__/effective-working-hours.test.ts \
  utils/__tests__/working-hour-exception-entry.test.ts \
  server/utils/__tests__/working-hour-exceptions-authz.test.ts \
  server/utils/__tests__/calendar-non-working-display.test.ts
```

Optional local E2E (simy-test + flag):

```bash
E2E_WORKING_HOUR_EXCEPTIONS=1 npm run test:e2e -- e2e/working-hour-exceptions.spec.ts
```

---

## Codepaths / surfaces

| Path | Role |
|------|------|
| `utils/effective-working-hours.ts` | Pure resolve / validate / Zurich today / non-working spans |
| `utils/working-hour-exception-entry.ts` | UI modes → delete/upsert plan |
| `utils/calendar-non-working-display.ts` | Calendar gray spans from effective hours |
| `server/api/staff/working-hour-exceptions.post.ts` | list / upsert / upsert_many / delete + recalc enqueue |
| `server/utils/require-tenant-auth.ts` | `authorizeWorkingHoursMutation` |
| `server/services/availability-calculator.ts` | Load exceptions + replace weekly per UTC civil day |
| `components/StaffSettings.vue` / `WorkingHourExceptionSheet.vue` | Staff UI |
| `components/CalendarComponent.vue` | Displays non-working spans |
| `migrations/20260922_staff_working_hour_exceptions.sql` | Schema, RLS, RPC |
| `migrations/20260925_staff_working_hour_exception_not_past.sql` | Past INSERT/UPDATE guard |
| `migrations/20260925_staff_working_hour_exception_past_delete.sql` | Past DELETE guard |
| `e2e/working-hour-exceptions.spec.ts` | Opt-in Playwright coverage |
