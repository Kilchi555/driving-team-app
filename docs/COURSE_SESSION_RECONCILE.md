# Course session identity-preserving reconcile

Verified from `main` after merge of `45a34525` (#383).

## Intent

Non-SARI course updates must **keep existing `course_sessions.id` values** when an admin saves the course. The old delete-all / recreate path broke foreign keys (registrations, SARI memberships, session swaps, room bookings keyed by `course_session_id`).

SARI-managed courses are out of scope for this path — upsert rejects session edits when `courses.sari_managed === true`.

## Contract

Helper module: `server/utils/course-session-reconcile.ts`.  
Call site: `POST /api/admin/courses/upsert` (existing non-SARI course with a sessions payload).

| Step | Behavior |
|---|---|
| Classify | Payload items **with** a UUID → update; **without** id → insert. Duplicate / invalid UUIDs → 400 |
| Ownership | Every update id must already exist for this `course_id` + `tenant_id`. Unknown / foreign ids → 403 (no silent insert) |
| Update | `UPDATE … WHERE id AND course_id AND tenant_id`. Preserves `session_number` and confirmation state |
| Insert | New rows get `session_number = max(remaining)+1…` |
| Remove | Sessions present in DB but absent from payload are candidates. Removals are blocked when unsafe (409) |
| Room sync | `syncRoomBookingsForSessions` updates/inserts/cancels `room_bookings` by `course_session_id` — it never deletes `course_sessions` |

Pre-validate runs **before** the course row mutation (`validateCourseSessionReconcilePlan`) so a rejected session plan does not leave a half-updated course.

### Removal blockers (`evaluateRemovalBlockers`)

A candidate cannot be deleted when any hold:

- `custom_sessions` JSON on a same-tenant registration references the session id
- `registration_sari_memberships` row for the session
- non-empty `confirmation_status` on the session
- the course has any active (non-cancelled, non-deleted) `course_registrations`

Room/vehicle bookings are **cancelled first**, then the session row is deleted — they are not blockers.

Conflict message (DE): `Session kann nicht entfernt werden: Es bestehen Abhängigkeiten (Buchungen, Anmeldungen, Bestätigungen oder Session-Tausch).`

## Architecture

```
POST /api/admin/courses/upsert
  → (existing + sessions) reject if sari_managed
  → validateCourseSessionReconcilePlan
  → mutate course row
  → reconcileCourseSessions   // update / insert / safe delete
  → syncRoomBookingsForSessions  // by course_session_id
```

Room booking sync:

- Cancel bookings whose session no longer needs a room (or session gone)
- Conflict-check other courses on the same room before insert/update
- Update existing booking by `course_session_id`; insert when missing
- Room booking write failures after sessions saved are logged as warnings (sessions still committed)

## Constraints & pitfalls

1. **Never** restore delete-all + recreate for non-SARI admin upsert — breaks identity for every dependent table.
2. Do not invent session ids client-side for “new” sessions — omit `id` so the server inserts.
3. Foreign session UUIDs must hard-fail (403), not fall through to insert.
4. SARI session edits stay on the SARI sync path; this helper is admin non-SARI only.
5. Presence of `courseHasActiveRegistrations` blocks **any** session removal on that course — product-defined safe action, not a per-session attendance check.

## Codepaths

- `server/utils/course-session-reconcile.ts`
- `server/api/admin/courses/upsert.post.ts`
- Tests: `server/utils/__tests__/course-session-reconcile.test.ts`
