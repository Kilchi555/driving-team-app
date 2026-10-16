# PR #444 — Final production verification

**Verdict at audit time: BLOCKED** — UTC day grouping could misplace a local midnight slot.

**Fix status:** draft only, not merged, not deployed.

**Observation:** 2026-10-16T06:38:56Z (audit). Fix committed after that on a separate branch.

## Repository at audit time

| Item | Value |
| --- | --- |
| `origin/main` | `a75e065eed1ed7143b0e49718976b9b0209979bd` |
| PR #444 | MERGED, 2026-10-16T04:56:04Z, merge commit `a75e065e…` |
| Final head / base | `48a3676f527dc21ea71b45f822158a6a1c4e314f` / `6ad955193e6b0122a08c08749ba98808a27f69c3` |

## Date grouping

`groupedTimeSlots` keyed days with `toISOString().split('T')[0]` (UTC). The heading used the tenant-local date of the first slot only.

Executed with the real formatters: `2026-10-16T22:30:00Z` is 17 October 00:30 in Europe/Zurich, but the UTC key was 16 October. With an earlier slot on that UTC day, 00:30 rendered under 16 October. Winter and Asia/Tokyo showed the same split. Daytime `2026-10-17T05:00:00Z` stayed 07:00 on 17 October.

## Draft fix

https://github.com/Kilchi555/driving-team-app/pull/452

Branch `cursor/fix-booking-day-group-878a`, base `a75e065eed1ed7143b0e49718976b9b0209979bd`.

`groupSlotsByTenantLocalDate` groups by `slotLocalDateKey(start_time, bookingTimeZone)`. The booking page uses that helper. Headings still use `formatBookingWeekday` and `formatBookingNumericDate` with the same zone. Stored instants are not rewritten.

Files in that draft:

- `utils/group-slots-by-local-date.ts`
- `utils/__tests__/group-slots-by-local-date.test.ts`
- `pages/booking/availability/[slug].vue`
- this handoff

Local tests, exit 0, Vitest 3.2.7, 33 tests, 2026-10-16T06:44:11Z:

```
npx vitest run utils/__tests__/group-slots-by-local-date.test.ts server/utils/__tests__/website-slot-timezone.test.ts server/utils/__tests__/website-public-security.test.ts
```

`npx eslint utils/group-slots-by-local-date.ts utils/__tests__/group-slots-by-local-date.test.ts --max-warnings 0` exit 0.

## Still unverified

- **UNVERIFIED — AUTHORIZED VERCEL ACCESS UNAVAILABLE.** `app.simy.ch` and `drivingteam.ch` are not bound to deployment `a75e065e`. GitHub production records 7111350071 and 7111289809 are not that binding. This grouping fix does not close that gap.
- **Live course card.** No published page with `when_label` was observed (`/s/fahrschule-muster` has none; Driving Team public website route is 404). Not closed by this fix.

No production data was written. Do not merge or undraft PR #452 without a separate human decision.
