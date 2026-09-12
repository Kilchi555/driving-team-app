# SARI staff calendar sync (session moves)

**When to use:** Instructor calendar still shows old PGS/SARI dates after SARI moved sessions; course title shows the original group date; calendar block starts at 09:00 instead of 08:00 on Vercel; staff never got a “Termine geändert” mail.

Verified against source (Aug 2026). Commit `6dba78a2` (#92).

---

## Intent

When SARI (or admin course upsert) changes session wall-clock times, **already assigned** instructors keep their `staff_id`, so the “new assignment” path is skipped. The app must still:

1. Rebuild padded staff calendar appointments (`notes = course:{id}`).
2. Title each block with **that block’s** session date/time.
3. Email/push the instructor about the new schedule (multi-staff tenants).
4. Keep course display names on the **earliest session** date, not stale `group.date`.

---

## Contract

### Calendar blocks

`buildAppointmentBlocks` / `createStaffCourseAppointments`:

- Merge consecutive sessions (gap ≤ 5 minutes) into one block.
- Pad **45 minutes before** first session start and **15 minutes after** last end.
- Store `event_type_code: 'course'`, `notes: course:{courseId}`, `status: confirmed`.
- Title via `staffCourseBlockTitle`: category/name + short date + Zurich time range for **this** block’s sessions (not the course’s first session only).

`syncStaffCourseCalendar`:

1. Load sessions with non-null `staff_id`.
2. Load existing appointments with `notes = course:{id}` for those staff.
3. Per staff: if `staffCalendarBlocksMatch` → skip; else delete + recreate + `notifyStaffCourseTimesChanged`.

### When sync runs

| Caller | Trigger |
|--------|---------|
| `sari-sync-engine` after session update | Always after post-sync instructor match (covers assigned staff SARI skipped) |
| `POST /api/courses/update-status` | Status transitions that need calendar alignment |
| Manual upsert / instructor reassignment | Create/delete/notify via same helpers (`admin/courses/upsert`, update-session-instructors) |

### Zurich wall clock → UTC

Admin upsert writes session `start_time` / `end_time` with `zurichLocalToUtcIso(date, time)`. Treating Zurich local as UTC on Vercel (server TZ UTC) shifts summer blocks by **+2h** after the 45-minute prep pad (e.g. 08:00 → block appears as 09:00 Zurich). Tests lock DST examples in `zurich-time.test.ts`.

### Course title vs `group.date`

`sariCourseDisplayName` sorts session `date` strings and formats the earliest as `dd.mm.yyyy`. SARI `group.date` is only a fallback when no session dates exist — it often stays at the original group start after moves.

### Staff notifications

`notifyStaffCourseTimesChanged` / `notifyStaffAssigned` skip when `shouldNotifyAssignedStaff` is false (solo / ≤1 active staff — admin already gets course mail). Subject: `Kurs-Termine geändert: …`. Push path still attempted if email missing.

---

## Pitfalls

1. **Assigned staff were invisible to “new match” logic** — Pre-#92, only newly matched instructors got calendar rebuilds; SARI date moves left stale blocks. Always run `syncStaffCourseCalendar` after session time updates.
2. **Title copied from first session** — Multi-block courses showed the same start on every block; use per-block sessions in `staffCourseBlockTitle`.
3. **UTC vs Zurich** — Never `new Date(\`${date}T${time}:00\`)` without offset on the server; use `zurichLocalToUtcIso`.
4. **Stale course name date** — UI/lists using `group.date` look “wrong” after moves; prefer `sariCourseDisplayName`.
5. **Solo tenant silence** — No staff date-change email is expected when the tenant has ≤1 active staff.
6. **Checkout races are separate** — Mid-checkout SARI leftovers / 3h open-checkout skip live in `SARI_CHECKOUT_RACES.md` (open docs PR), not this calendar path.

---

## Smoke test

1. SARI moves a PGS session date for an already assigned instructor → appointments with `notes=course:…` match new padded times; staff gets date-change email (multi-staff tenant).
2. Course with two non-consecutive blocks → each appointment title shows its own date/time.
3. Admin upsert session `08:00` Zurich in summer → stored UTC `06:00Z`; padded block starts `05:15Z` (07:15 Zurich), not 09:00 Zurich.
4. Session dates moved, `group.date` unchanged → `sariCourseDisplayName` uses earliest session date.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/course-staff-notifications.ts` | Blocks, sync, titles, staff emails/push |
| `server/utils/sari-sync-engine.ts` | Calls `syncStaffCourseCalendar` after session updates |
| `server/utils/sari-course-title.ts` | Display name from earliest session date |
| `server/utils/zurich-time.ts` | Zurich local → UTC ISO for upsert |
| `server/api/admin/courses/upsert.post.ts` | Session write + staff appointment rebuild |
| `server/api/courses/update-status.post.ts` | Status-driven calendar sync |
| `server/utils/__tests__/staff-course-calendar.test.ts` | Block title / match |
| `server/utils/__tests__/sari-course-title.test.ts` | Title vs group date |
| `server/utils/__tests__/zurich-time.test.ts` | DST / anti-UTC regression |

Related: [SARI_SOAP_COURSES_V3_API.md](./SARI_SOAP_COURSES_V3_API.md) (external SOAP contract). Checkout race runbook is separate when that docs PR merges.
