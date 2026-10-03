# Idle student reminders

**When to use:** Clients stop booking without finishing training; admins enable “inaktive Schüler erinnern”; staff need the customers-list idle filter; pause links in mail/SMS fail; digests never arrive for solo schools.

Verified against source (Aug 2026).

---

## Intent

Daily cron finds **active clients** who still need lessons (exam not fully passed, not opted out) and have **no upcoming appointment** plus a last lesson older than the tenant threshold (or never). It queues client remessages and optional staff/admin digests via `outbound_messages_queue`. Clients can stop further reminders with a signed `/pause` link or from their profile.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Admin → Booking policy / Profile | Toggle + days / resend / channels / notify flags on `tenants.booking_policy` |
| Customers list | Idle filter (`≥ 2 Wo` … `Nie`, `Kein nächster`) via `useStudentIdleFilter` |
| Cron | `GET /api/cron/send-idle-student-reminders` — Vercel `15 8 * * *` |
| Public pause | `/pause?t=<userId.sig>` → `POST /api/idle-reminder/stop` |
| Client profile | Same stop/resume without token (authenticated client) |

Settings keys (defaults): `idle_student_reminder_enabled` (**false**), `…_days` (**30**, clamp 7–365), `…_resend_days` (**14**, 1–90), notify client/staff/admin (**true**), `…_client_channel` (**email_first**).

---

## Who counts as idle

Cron loads clients with `role=client`, `is_active`, `auth_user_id` set, `deleted_at` null, `no_further_lessons_at` null, then drops `isStudentOutOfTraining` (all enrolled categories passed **or** opted out).

Activity (`fetchStudentAppointmentActivity`):

- **Last lesson:** newest `start_time` whose status is **not** `cancelled` / `rescheduled`
- **Upcoming:** future start with status in `scheduled` | `confirmed` | `pending_confirmation` | `booked`
- Idle match: **no upcoming** and (no last lesson **or** last lesson ≤ now − `idleDays`)

---

## Message stages & dedup

Queued rows use `context_data.stage`:

| Stage | Recipient | Notes |
|-------|-----------|--------|
| `idle_student_reminder` | Client email and/or SMS | Pause URL in body |
| `idle_student_staff_digest` | Assigned staff email | **Only if tenant has 2+ staff** |
| `idle_student_admin_digest` | Admins + `tenants.contact_email` | Full idle list |

Dedup: same stage + recipient match inside `resendDays` among queue rows with status `pending` \| `sending` \| `sent` (lookback 90 days). Ops override: `?skip_dedup=1` and/or `?test_tenant_id=<uuid>` (still requires cron auth).

Client channels: `email` \| `sms` \| `email_first` \| `sms_first`. Strict `email`/`sms` disable the other channel via flags in `resolveIdleStudentClientChannels`. SMS cost constant: `IDLE_STUDENT_SMS_RP_PER_SEGMENT` (15).

---

## Pause / no further lessons

| Field | Meaning |
|-------|---------|
| `users.no_further_lessons_at` | Opt-out timestamp (excludes from cron + idle filters) |
| `users.no_further_lessons_reason` | `exam_passed` \| `stopped` |

Token: HMAC-SHA256 over `idle-stop:<userId>`, secret `NUXT_REGISTRATION_TOKEN_SECRET` or `CRON_SECRET` (dev fallback is insecure). URL always `https://app.simy.ch/pause?t=…`. Resume clears both columns (`action: resume`).

---

## Pitfalls

1. **Disabled by default** — No mail until `idle_student_reminder_enabled === true` in booking policy.
2. **Solo schools get no staff digests** — `notifyStaff` is ignored unless `getTenantsWithMultipleStaff` includes the tenant.
3. **Clients without auth** — Rows with null `auth_user_id` never enter the cron set.
4. **Cancelled lessons still “idle”** — Cancelled/rescheduled appointments do **not** refresh “last lesson”.
5. **Pause secret rotation** — Changing the HMAC secret invalidates outstanding pause links; profile stop still works when logged in.
6. **Channel with missing contact** — No email and no phone → client skipped (counted in `skipped`).

---

## Ops checks

```sql
-- Policy flags
SELECT id, name, booking_policy->'idle_student_reminder_enabled' AS enabled,
       booking_policy->'idle_student_reminder_days' AS idle_days
FROM public.tenants
WHERE (booking_policy->>'idle_student_reminder_enabled') = 'true';

-- Recent idle queue
SELECT created_at, channel, recipient_email, recipient_phone, status, context_data
FROM public.outbound_messages_queue
WHERE context_data->>'stage' LIKE 'idle_student%'
ORDER BY created_at DESC
LIMIT 50;

-- Opted-out clients
SELECT id, email, no_further_lessons_at, no_further_lessons_reason
FROM public.users
WHERE role = 'client' AND no_further_lessons_at IS NOT NULL;
```

---

## Codepaths

- `server/api/cron/send-idle-student-reminders.get.ts`
- `server/utils/idle-student-reminder-settings.ts` / `idle-student-reminder-emails.ts` / `idle-stop-token.ts` / `no-further-lessons.ts`
- `utils/student-appointment-activity.ts` / `utils/student-exam.ts`
- `server/api/idle-reminder/stop.post.ts` / `status.get.ts`
- `pages/pause.vue`, `pages/admin/booking-policy.vue`, `composables/useStudentIdleFilter.ts`
- `vercel.json` — cron path `/api/cron/send-idle-student-reminders`
