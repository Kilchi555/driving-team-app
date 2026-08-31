# Appointment meeting links (confirmations & reminders)

**When to use:** Confirmation/reminder emails show a Zoom link for “Telefon” locations; http or javascript URLs in mail; Vercel build fails importing meeting helpers from reminder cron; invite meeting_type ignored.

Verified against source (Aug 2026). Commit `8b06b4f4`.

---

## Intent

Resolve meeting type and HTTPS link for non-lesson appointments from invite fields first, then location fallback — without guessing from the location **name**. Only safe `https://` URLs are rendered in email HTML.

---

## Contract

Shared helper: `server/utils/meeting-link.ts`.

### `sanitizeMeetingUrl(raw)`

| Accept | Reject |
|--------|--------|
| `https://…` URLs ≤ 2048 chars | `http://`, non-URLs, credentials in URL (`user:pass@`), empty / oversized |

Returns normalized `URL.toString()` or `undefined`.

### `normalizeMeetingType(raw)`

Only `'in_person' | 'phone' | 'online'`. Anything else → `undefined`.

### `resolveAppointmentMeeting({ location, invite })`

Priority:

1. Invite `meeting_type === 'phone'` → `{ meetingType: 'phone' }` (no link)
2. Invite `meeting_type === 'in_person'` → `{ meetingType: 'in_person' }`
3. Invite `meeting_link` (sanitized) → `{ meetingType: 'online', meetingLink }`
4. Location `meeting_url` (sanitized) → `{ meetingType: 'online', meetingLink }`
5. Invite `meeting_type === 'online'` without link → `{ meetingType: 'online' }`
6. Else `{}`

**Do not** infer phone/online from location name (e.g. “Telefon …”) — that hid real addresses and mislabeled in-person sites.

### `meetingLinkAnchor(url, color)`

Escaped `<a href>` for branded email HTML; returns `''` if URL sanitizes away.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| `dispatch-appointment-confirmation` | Loads `invited_customers.meeting_*` for non-lesson types; resolves meeting; feeds confirmation email |
| `GET /api/cron/send-appointment-reminders` | Same resolve + optional Meeting-Link row in reminder HTML |
| `appointment-notification-email` | Renders Meeting-Link via `meetingLinkAnchor` |

Lesson/exam/theory paths typically skip invite meeting lookup (`isLessonType`).

---

## Pitfalls

1. **Name-based inference** — Never reintroduce “if location name contains Telefon → phone”. Use explicit `meeting_type` / `meeting_url`.
2. **http links** — Silently dropped; ops must store `https://`.
3. **Invite type wins over location URL** — Explicit `phone` / `in_person` suppresses location Zoom links.
4. **Nitro import** — Reminder cron must import from `~/server/utils/meeting-link` (bundled helper). Missing export broke Vercel builds historically.
5. **XSS** — Always go through `meetingLinkAnchor` / `escapeAttr` / `escapeHtml`; never interpolate raw URLs into HTML.

---

## Smoke test

1. Invite `meeting_type: phone`, location has `meeting_url` → confirmation has phone, no Meeting-Link.
2. No invite type, location `meeting_url: https://zoom.us/j/1` → online + link in mail.
3. `meeting_link: javascript:alert(1)` → no anchor rendered.
4. Location named “Telefon Zürich” with street address, no meeting fields → no forced online/phone type.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/meeting-link.ts` | Sanitize, resolve, email anchor |
| `server/utils/dispatch-appointment-confirmation.ts` | Confirmation path |
| `server/api/cron/send-appointment-reminders.get.ts` | Reminder cron |
| `server/utils/appointment-notification-email.ts` | Meeting-Link HTML block |
| `server/utils/__tests__/meeting-link.test.ts` | Unit coverage |
