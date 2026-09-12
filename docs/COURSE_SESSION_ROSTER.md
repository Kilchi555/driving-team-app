# Course Session Roster & Participant PDF

**When to use:** Staff calendar course click shows wrong/empty attendees, PDF missing Teil columns, partial enrollments look wrong, or roster API returns 403.

---

## Intent

Staff/admin open a **course calendar appointment** and see who attends that Kursteil, then print the same **full-course** participant list used on `/admin/courses` (signature columns per Teil).

Course blocks on the staff calendar are tagged `appointments.notes = course:<uuid>` (`parseCourseIdFromAppointmentNotes`).

---

## Surfaces

| Surface | Path | Notes |
|---------|------|--------|
| Calendar UI | `components/CalendarComponent.vue` | Click `eventType === 'course'` / `event_type_code === 'course'` → roster modal (not EventModal) |
| Modal | `components/CourseSessionRosterModal.vue` | Day-filtered list + PDF button |
| Admin courses | `pages/admin/courses.vue` | Same print util |
| API | `GET /api/courses/roster` | `courseId` and/or `appointmentId` |
| Print | `utils/print-participant-list.ts` | Browser print dialog (A4 HTML), not server PDF |
| Attendance rules | `utils/course-session-attendance.ts` | Teil day-position + partial/individual filters |

Auth: `requireAdminProfile` default roles **`admin` | `staff` | `super_admin`** (not `tenant_admin` / clients).

---

## Contract (`GET /api/courses/roster`)

**Query**

- `appointmentId` — resolve course from `notes`, filter modal participants to that calendar day
- `courseId` — optional override / direct load (no day filter unless appointment also given)

**Authorization (after role gate)**

| Caller | Allowed when |
|--------|----------------|
| `admin` / `super_admin` / `tenant_admin`* | Any course in their `tenant_id` |
| `staff` | Owns a non-deleted appointment with `notes = course:<id>`, **or** is `course_sessions.staff_id` for a session |

\*Role check inside the handler includes `tenant_admin`, but the outer `requireAdminProfile` default list does **not** — `tenant_admin` currently gets **403** at the gate unless callers pass a wider role list.

**Participants source:** `course_registrations` for the course, `deleted_at IS NULL`, `status != 'cancelled'`.

**Response (key fields)**

| Field | Meaning |
|-------|---------|
| `participants` | Modal list — filtered to focus Teils when `appointmentId` matches session day(s) |
| `all_participants` | Full non-cancelled roster — **PDF always uses this** |
| `focus_sessions` / `focus_teils` | Sessions on the appointment’s calendar date |
| `filtered_by_session` | `true` when day filter applied |
| `course.course_sessions` | All sessions with assigned `teil` (day position) |

---

## Teil / partial enrollment rules

**Teil N** = chronological **day position** across sessions grouped by date (`YYYY-MM-DD` from `start_time`), not raw SARI `session_number` (can be weird, e.g. `-100001`).

`registrationAttendsTeil`:

1. `individual_session_number` set → only that session number **or** matching Teil
2. Else `partial_start_session` → attends Teils ≥ start
3. Else `is_partial_enrollment` without start → historically treated as from **Teil 3**
4. `custom_sessions[teil|sessionNumber]` set → **swap-out** (absent that day)
5. Otherwise attends

PDF marks non-attending cells as `kommt nicht` instead of a signature line. Badge labels: `Nur Teil N`.

---

## Common pitfalls

1. **Modal vs PDF counts differ** — modal can be day-filtered; PDF is always the full course roster with per-Teil absence marks.
2. **Missing `course:<uuid>` notes** — appointment is not linked; API returns 400 `Appointment is not linked to a course`.
3. **Staff 403** — not the appointment owner and not a session instructor for that course.
4. **Popup blocked** — `printParticipantList` uses `window.open`; returns `false` if blocked or empty participants.
5. **Same-day multi-session** — multiple sessions on one date share one Teil; day filter includes all of them.
6. **Cancelled / soft-deleted registrations** are excluded from both modal and PDF.

---

## Codepaths

- `components/CalendarComponent.vue` (course click → roster)
- `components/CourseSessionRosterModal.vue`
- `server/api/courses/roster.get.ts`
- `utils/print-participant-list.ts`
- `utils/course-session-attendance.ts`
- `utils/course-appointment.ts`
- `utils/format-course-sessions.ts`
- `pages/admin/courses.vue` (admin print entry)
