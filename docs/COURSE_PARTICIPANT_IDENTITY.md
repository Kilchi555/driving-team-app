# Course participant birthdate and LFA display

**When to use:** Gemperli / VKU roster, print list, or staff “Kurs morgen” email missing birthdate or LFA; debugging #242 / `participant-identity`.

Verified against source (Sep 2026). Merge `497e9540` (#242).

Related but separate: SARI license **validation** for enroll ([`SARI_LICENSE_EXPIRATION.md`](./SARI_LICENSE_EXPIRATION.md)); this runbook is **display-only** identity from the course registration row.

---

## Intent

Staff need Geburtsdatum and Lernfahrausweis (LFA) on VKU participant lists. Those values live on the **course registration**, not on ad-hoc user/SARI leftovers. #242 centralizes formatting in `utils/participant-identity.ts` and uses it from roster UI, print HTML, and staff email.

---

## Contract

### Fields (registration only)

| Helper | Source fields | Rule |
|--------|---------------|------|
| `participantBirthdate` | `birthdate` | Trimmed string or null |
| `participantDisplayLicenseLabel` | `license_number`, then `sari_faberid` | See LFA rules below |
| `formatParticipantBirthdate` | YYYY-MM-DD preferred | `DD.MM.YYYY` without timezone shift; invalid → `—` |
| `participantIdentityLine` | both | `birthdate · LFA…` or null if empty |

### LFA label rules

1. Prefer `license_number` as `LFA {number}`.
2. Else use `sari_faberid` as `LFA {id}` (same prefix when only SARI id exists).
3. If both exist and **differ** (ignoring spaces/dots for equality): `LFA {license_number} · SARI {sari_faberid}`.
4. If both exist and match after normalizing spaces/dots: show `license_number` once as `LFA {number}`.
5. **Do not** fall back to `sari_license_id`, user `faberid`, or `lernfahrausweis_nr` — those are ignored by the helpers.

### Surfaces

| Surface | Wiring |
|---------|--------|
| Admin course roster / session modal | `pages/admin/courses.vue`, `CourseSessionRosterModal.vue` → `participantIdentityLine` |
| Print participant list | `utils/print-participant-list.ts` |
| Staff email (`POST /api/courses/send-participant-list`) | `buildStaffEmail` in `server/utils/participant-list-staff-email.ts` (HTML-escaped identity cell) |
| Roster data load | `server/utils/course-roster.ts` selects `birthdate`, `license_number`, `sari_faberid` |

---

## Pitfalls

1. **Reading LFA from the user profile / live SARI payload** — display helpers only accept registration fields; missing columns in the select → empty identity line.
2. **`new Date(birthdate).toLocaleDateString` for list lines** — can shift timezone; prefer `formatParticipantBirthdate` for `YYYY-MM-DD`.
3. **Treating `license_number` and `sari_faberid` as always the same** — when they differ, both are shown on purpose.
4. **Unescaped HTML in staff email** — identity goes through `escapeHtml` in `buildStaffEmail`; do not concatenate raw registration strings into HTML.
5. **Confusing display with enroll validation** — showing LFA ≠ `validateLicense` / category checks.

---

## Codepaths

| Path | Notes |
|------|-------|
| `utils/participant-identity.ts` | Pure display helpers |
| `utils/print-participant-list.ts` | Print HTML uses identity line |
| `server/utils/participant-list-staff-email.ts` | Staff email table column |
| `server/utils/course-roster.ts` | Ensures identity columns are selected |
| `server/utils/__tests__/participant-identity.test.ts` | LFA / birthdate / ignore-leftover-keys cases |
| `server/utils/__tests__/send-participant-list-email.test.ts` | Email includes escaped identity |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/participant-identity.test.ts server/utils/__tests__/send-participant-list-email.test.ts
```
