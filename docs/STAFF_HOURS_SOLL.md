# Staff Hours — Monthly Soll, Ist, Sick & Cancellations

Runbook for monthly-salary working-time math (Soll / Ist / Ferien / Krank / Diff / Saldo). Verified against source (Aug 2026).

## Intent

Monthly-salary instructors (`users.salary_type = 'monthly'`) get a calendar-month **Soll** from contracted weekly hours and Swiss working days. **Ist** comes from countable appointments. Diff/Saldo must include Ferien, Krank, and Admin so a full contracted month does not invent overtime.

## Formula (monthly staff)

```
Diff   = actual_hours + vacation_hours + sick_hours + admin_hours − target_hours
Saldo  = running Diff across months (+ year carry-over)
```

Timezone for month boundaries: **Europe/Zurich**.

### Soll (`target_hours`)

Constants in `swiss-holidays.ts`:

- Full-time week reference: **33.75 h/week**
- Working-day length at 100%: **6.5 h/day** (not `weekly/5` = 6.75)

```
dailyHours  = weekly_contracted_hours × (6.5 / 33.75)
targetHours = workingDaysInMonth(year, month) × dailyHours
```

`getWorkingDaysInMonth` = Mon–Fri minus Swiss public holidays.

`resolveMonthlyTargetHours` keeps genuine stored overrides; values that match the **legacy** `workingDays × (weekly/5)` formula are migrated to the 6.5h calculation.

### Ist (`actual_hours`)

From `shouldCountAppointment` + `appointmentHours` (`duration_minutes / 60`):

| Appointment | Counted in Ist? |
|-------------|-----------------|
| Not cancelled / not deleted | Yes |
| Cancelled + any payment still due/kept (`pending`, `completed`, `authorized`, …) | Yes (charged / short-notice) |
| Cancelled + only void payments (`cancelled`/`canceled`/`refunded`/`failed`) or no payment | No |
| `event_type_code = vacation` | Not in Ist — see Ferien |
| `status = deleted` | No |

### Ferien (`vacation_hours`)

- Only monthly staff; Mon–Fri vacation blocks
- Day credit: full day = 1, half day if `duration_minutes ≤ 420` → 0.5
- Hours = day credits × `getMonthlyDailyHours(weekly)`
- Entitlement (`ferienDayCredit`) skips titles like Vaterschaft/Mutterschaft/Elternzeit; hours calculator still uses vacation blocks for calendar hours

### Krank / Admin

- Stored on `staff_monthly_hours.sick_hours` / `admin_hours`
- Set via admin API `POST .../staff-monthly-hours` action `set_sick` (and admin-hours counterpart)
- Recalculation **preserves** manual sick/admin values
- UI (`StaffSettings`) shows «+Xh Krank» on month cards and a Krank column when any month has sick hours

## Surfaces

| Surface | Path |
|---------|------|
| Staff settings cards / table | `components/StaffSettings.vue` |
| Admin staff hours page | `pages/admin/staff-hours.vue` |
| Recalc service | `server/services/staff-hours-calculator.ts` |
| Counting rules | `server/utils/staff-hours-counting.ts` |
| Soll helpers | `server/utils/swiss-holidays.ts` |
| APIs | `get-staff-hours`, `staff-monthly-hours`, `staff/monthly-hours`, `working-hours-stats`, vacation balance |

Recalc skips **current and future** months. For monthly staff without a first saved month, wait for admin «gilt ab» unless force-recalc or actuals exist.

## Pitfalls

- Do not use `weekly_hours / 5` for Soll — that inflated long months (e.g. July).
- Charged cancellations **must** keep a non-void `payments.payment_status` or they disappear from Ist.
- Sick hours are **manual**; they are not inferred from calendar event types.
- Half-day Ferien threshold is **≤ 420 minutes** (full-day block is typically 720).
- Hourly-salary staff: vacation_hours stay 0 in the monthly table (no Soll system).
- Force target recalc (`forceTargetRecalc`) recomputes Soll from pensum and ignores stored overrides (use when employment % changes).

## Codepaths

- `server/utils/swiss-holidays.ts` — `MONTHLY_SOLL_*`, `getMonthlyTargetHours`, `resolveMonthlyTargetHours`
- `server/utils/staff-hours-counting.ts` — `shouldCountAppointment`, vacation/ferien helpers
- `server/services/staff-hours-calculator.ts` — upsert `staff_monthly_hours`, cumulative overtime
- `server/api/admin/staff-monthly-hours.post.ts` — `set_sick`
- `server/api/admin/get-staff-hours.get.ts`, `staff-monthly-hours.get.ts`, `staff/monthly-hours.get.ts`
- `components/StaffSettings.vue`
