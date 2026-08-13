# Durable Appointment Confirmations

## Intent

Customer booking confirmations must survive Resend blips and short-lived serverless freezes. The shared dispatcher sends email **directly** (no nested HTTP `$fetch`), falls back to `outbound_messages_queue`, and records delivery state on the appointment so crons can retry safely without double-sending.

## Status columns

On `appointments` (migration `20260812_appointment_confirmation_email_tracking.sql`):

| Column | Values / meaning |
|--------|------------------|
| `confirmation_email_status` | `sent` · `queued` · `skipped` · `failed` |
| `confirmation_email_sent_at` | Set when successfully sent **or** terminal skip |

Idempotency: if status is already `sent`/`queued`, or `confirmation_email_sent_at` is set, dispatch returns `skipped` (`already_sent` / `already_queued`).

## Dispatcher contract

`dispatchAppointmentConfirmation({ appointmentId, userId, tenantId, skipStaffNotification? })`

1. Load tenant `booking_policy` for confirmation email/SMS modes and customer channel preference.
2. **Self-booking skip**: if `appointment.staff_id === userId` → `skipped` / `self_booking` (internal calendar blocks; no email/SMS/push).
3. Resolve channels via `customer-notification-channel` (`email_first` / `sms_first`, policy flags, valid email regex, phone presence).
4. Email: `sendAppointmentNotificationEmail` → on failure render + insert queue (`stage: appointment_confirmation`) → mark `queued`.
5. Push: fire-and-forget `sendPushToUser` when the customer email path runs (see [FCM_PUSH_NOTIFICATIONS.md](./FCM_PUSH_NOTIFICATIONS.md)).
6. SMS: optional via `sendTenantSMS` + confirmation SMS template.
7. Staff notify: only for **online** bookings where `created_by === userId`, staff has email, policy allows, and `skipStaffNotification` is false.

### Policy keys (`tenants.booking_policy`)

| Key | Default behavior |
|-----|------------------|
| `confirmation_email_enabled` | on unless `false` |
| `confirmation_email_mode` | `always` · `after_registration` · `never` |
| `confirmation_sms_enabled` | on unless `false` |
| `customer_notification_channel` | drives email vs SMS preference |
| `staff_booking_notification_enabled` | on unless `false` |

`after_registration` + `onboarding_status === 'pending'` holds email (and for `email_first`, also suppresses SMS) until onboarding completes — then `complete-onboarding` re-dispatches.

## Entry points

| Caller | Notes |
|--------|-------|
| `booking/create-appointment` | Online / staff booking |
| `booking/guest-book` | Guest checkout |
| `appointments/save` | Calendar create/save |
| `wallee/webhook` | After paid booking finalize |
| `students/complete-onboarding` | Releases held confirmations (`skipStaffNotification: true`) |
| `reminders/send-appointment-confirmation` | Manual/API trigger |
| `admin/resend-missed-confirmations` | Bulk repair (`skipStaffNotification: true`) |
| Cron `retry-missed-confirmations` | Every 5 minutes |

## Retry cron

`GET /api/cron/retry-missed-confirmations` — Bearer `CRON_SECRET`.

Selects appointments where:

- `confirmation_email_sent_at` is null
- status not cancelled
- `confirmation_email_status` is null or `failed` (**not** `queued` — queue drain owns those)
- created between 3 minutes and 48 hours ago
- `start_time` not older than ~2 hours
- limit 40 per run

## Pitfalls

1. **`queued` is not retried by this cron** — `process-outbound-messages` must deliver the email. Do not clear `queued` to force a second direct send without checking the queue.
2. **Staff self-bookings look like “missing confirmations”** — status is intentionally `skipped` / `self_booking`.
3. **Invalid emails** (e.g. `outlook.con`) are treated as no-email; status becomes terminal `skipped` (unless waiting for registration).
4. **Course enrollment confirmations** use a separate path (`emails/send-course-enrollment-confirmation`) with tenant `from_email` when `resend_domain_verified` — not this dispatcher.
5. Push failures are non-critical and do not change `confirmation_email_status`.

## Debug SQL

```sql
SELECT id, start_time, confirmation_email_status, confirmation_email_sent_at, staff_id, user_id, source
FROM appointments
WHERE created_at > now() - interval '48 hours'
  AND confirmation_email_sent_at IS NULL
  AND coalesce(confirmation_email_status, '') NOT IN ('sent', 'skipped', 'queued')
  AND coalesce(status, '') IS DISTINCT FROM 'cancelled'
ORDER BY created_at DESC
LIMIT 50;
```

Admin repair: `POST /api/admin/resend-missed-confirmations` (authenticated admin).

## Codepaths

| Path | Role |
|------|------|
| `server/utils/dispatch-appointment-confirmation.ts` | Shared durable dispatcher |
| `server/utils/appointment-notification-email.ts` | Render + Resend send |
| `server/utils/customer-notification-channel.ts` | Channel resolution |
| `server/api/cron/retry-missed-confirmations.get.ts` | Missed-confirmation cron |
| `server/api/cron/process-outbound-messages.get.ts` | Queue drain (email/SMS/push) |
| `server/api/admin/resend-missed-confirmations.post.ts` | Manual bulk retry |
| `sql_migrations/20260812_appointment_confirmation_email_tracking.sql` | Status columns + retry index |
| `vercel.json` | `retry-missed-confirmations` `*/5 * * * *`; outbound processor `2,7,12,...` |
