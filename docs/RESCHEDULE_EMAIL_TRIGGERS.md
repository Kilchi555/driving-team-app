# Reschedule notification triggers (booking policy)

**When to use:** Customer got (or did not get) a change mail after staff edited an appointment; admin wants mail only on time moves; SMS fired without email or vice versa; Absage/Verschiebung mail looks like Simy chrome instead of the school.

Verified against source (Aug 2026). Commit `6dba78a2` (#92).

---

## Intent

Admins choose **which customer-visible field changes** send a reschedule notification. Default is **datetime only**, so swapping instructor, location, or vehicle does not spam the student unless enabled. Cancellation notifications are unchanged by this list.

Mails use **tenant branding** (school colors/logo), matching confirmation mail — not Simy marketing chrome.

---

## Contract

### Trigger values (`booking_policy.reschedule_email_triggers`)

| Value | Detected when |
|-------|----------------|
| `datetime` | `startDate` or `startTime` (HH:MM) changes |
| `duration` | `duration_minutes` changes |
| `staff` | `staff_id` changes (both sides non-empty) |
| `location` | `location_id` or `custom_location_name` changes |
| `resource` | `vehicle_id`, `room_id`, or `vehicle_mode` changes |

Defaults: `['datetime']` (`DEFAULT_RESCHEDULE_EMAIL_TRIGGERS`).

Normalization:

- Missing / non-array policy → default `['datetime']`.
- Explicit **empty array** → never notify on edits (`normalizeRescheduleEmailTriggers`).
- Invalid strings filtered out.

`shouldNotifyRescheduleChange(policyTriggers, changedFields)` is true if any changed field is in the enabled list.

### Detection

`detectRescheduleChanges(before, after)` builds the changed-field list from appointment snapshots (EventModal / save flows). API callers may pass `changedFields` into `notifyCustomerAppointmentChange` / `appointments/notify-change`.

Legacy: omitted `changedFields` parses as `['datetime']` via `parseRescheduleChangedFields`.

### Channels

`notifyCustomerAppointmentChange`:

1. If `type === 'rescheduled'` and policy does not match → `{ skipped: true }` (no email, no SMS).
2. Email follows `customer_notification_channel` when the user has email.
3. **Reschedule SMS** only when `reschedule_sms_enabled !== false` **and** `changedFields` includes `datetime` — staff/location/resource-only edits never SMS even if those email triggers are on.
4. Cancellation uses `cancellation_sms_enabled` separately.

Admin UI: `pages/admin/booking-policy.vue` toggles; persisted via `GET/POST /api/admin/booking-policy`.

### Branding

Cancel/reschedule HTML goes through tenant-branded appointment notification helpers (`appointment-notification-email` / `sendTenantEmail` paths). Hardcoded Simy-red Absage styling was removed in #92.

---

## Pitfalls

1. **Empty array means silence** — Unlike “missing → default”, `[]` is intentional “never email on edit”. Confirm before saving an empty selection in admin.
2. **SMS ≠ email triggers** — Enabling `staff` / `location` / `resource` emails does not enable SMS; SMS stays datetime-gated.
3. **Legacy callers** — Omitting `changedFields` behaves as datetime-only. New save paths should pass `detectRescheduleChanges` output.
4. **Staff id both required** — `detectRescheduleChanges` only flags `staff` when before and after ids are non-empty; clearing staff may not count.
5. **Channel policy still applies** — `customer_notification_channel` can suppress email or SMS even when triggers match.

---

## Smoke test

1. Policy default → change only staff → no customer notification (`skipped`).
2. Enable `staff` trigger → change instructor → branded reschedule email; no SMS.
3. Change start time with default policy → email (+ SMS if phone + SMS enabled).
4. Set triggers to `[]` → any edit → skipped.
5. Cancel appointment → cancel mail/SMS path still runs (independent of reschedule triggers).

---

## Codepaths

| Path | Role |
|------|------|
| `utils/reschedule-email-triggers.ts` | Valid set, normalize, detect, shouldNotify |
| `server/utils/notify-customer-appointment-change.ts` | Policy gate + email/SMS |
| `server/api/appointments/notify-change.post.ts` | API entry |
| `server/api/admin/booking-policy.get.ts` / `.post.ts` | Persist triggers on `tenants.booking_policy` |
| `pages/admin/booking-policy.vue` | Admin toggles |
| `server/utils/appointment-notification-email.ts` | Branded HTML |
| `server/utils/__tests__/reschedule-email-triggers.test.ts` | Unit coverage |
| `server/utils/__tests__/appointment-notification-email.test.ts` | Branding |

Related SMS From-ID branding (alphanumeric sender derivation) lives in `server/utils/sms-sender.ts` — used by confirmation/cancel SMS, not the trigger list itself.
