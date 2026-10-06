# Binding booking conversions (Google Ads + Meta)

**When to use:** Debugging missing/double Ads or Meta Purchase events; deciding whether payment webhooks should fire conversions; understanding why CRM proposal “booking_confirmed” does not upload; applying claim uniqueness for concurrent webhooks.

Verified against source (Sep 2026). Commit `69a8e7f9` (#170). Complements the Ads env/setup guide in [`SERVER_SIDE_CONVERSION_SETUP.md`](./SERVER_SIDE_CONVERSION_SETUP.md).

---

## Intent

A **binding booking** is the conversion moment — not payment settlement.

| Binding event | Status that converts |
|---------------|----------------------|
| Lesson / appointment | `appointments.status` becomes **`confirmed`** |
| Course registration | `course_registrations.status` is **`confirmed`** |

Rules:

1. Payment completion is settlement state and must **not** fire a second primary conversion.
2. Fire only on the **transition** into confirmed (`becameBindingConfirmed`), not on every update of an already-confirmed row.
3. Primary Google / Meta Purchase uploads target **new customers** with a valid click id (`gclid`/`gbraid`/`wbraid` or Meta click signals).
4. Claim an audit row **before** calling Google or Meta so concurrent webhooks cannot double-send.

CRM proposal outcome `booking_confirmed` is a staff label only — it must **not** upload a booking conversion. Attribution may be stamped onto a later staff-created appointment; the conversion fires when that appointment becomes binding-confirmed.

---

## Eligibility contract

| Gate | Google primary | Meta Purchase |
|------|----------------|---------------|
| Status transition | Appointment: not confirmed → `confirmed`. Course: status is `confirmed` at report time | Same |
| Productive event | Appointment `event_type_code` not in `ECONOMICS_SKIP_EVENT_CODES` (vacation, meeting, …) | Same skip for appointments |
| Identity | `user_id` + `tenant_id` required | Same |
| New customer | No other `confirmed`/`completed` appointments (excl. skip codes) and no other `confirmed` course registrations for that tenant/user | Same history lookup |
| Click id | At least one of gclid / gbraid / wbraid | Meta click / cookie signal via `hasMetaClickId` |
| Dedup order id | Appointment UUID; course `course_{registrationId}` | event_id `capi_{appointmentId}` or `capi_course_{registrationId}` |

`newCustomerState` values: `new` | `existing` | `unknown`. Unknown (history lookup failed) → no upload.

Reporter outcomes: `uploaded` / `sent` / `skipped` / `failed` / `not_attempted`, plus optional `reason` (`not_productive`, `already_confirmed`, `existing_customer`, …).

Use `reportBindingAppointmentConversionSafely` / `reportBindingCourseConversionSafely` from call sites — exceptions must not break booking.

---

## Claim-before-upload

Tables:

- `google_ads_conversion_uploads` — unique on `order_id` and on `(appointment_id, conversion_action_id)` (nullable filters)
- `meta_capi_uploads` — unique on `(event_name, event_id)` and `(appointment_id, event_name)`

Flow: insert/claim audit row → only the winner calls the external API → mark success/failure. Retries reuse the same `order_id` / `event_id`.

Dev/test migration for indexes + backfill: `migrations/20260908_binding_booking_conversion_claim.sql` (header notes production apply is separate — do not treat that file as auto-applied prod).

Cron retriers: `server/api/cron/retry-google-ads-uploads.post.ts`, `server/api/cron/retry-meta-capi-uploads.post.ts`.

---

## Pitfalls

1. **Payment webhook ≠ conversion** — Confirming after Wallee success may set `confirmed` and then the reporter runs **once** via `becameBindingConfirmed`. Do not also upload from “payment paid” alone.
2. **Proposal CRM label** — `update-booking-proposal-status` must not call the binding reporter; proposal helper only stamps attribution / skips CRM outcome uploads.
3. **Existing customers** — Repeat bookings with click ids still skip primary Google/Meta Purchase (`existing_customer`).
4. **Internal calendar codes** — `vacation`, `meeting`, `admin`, … never convert even if status is confirmed.
5. **Missing click ids** — New customer without gclid/Meta signal → `not_attempted` / skipped claim reasons; check attribution persistence on the appointment row first.
6. **Course order ids** — Google uses `course_{registrationId}`; Meta uses `capi_course_{registrationId}`. Do not reuse the bare registration UUID for Google orderId.
7. **Already confirmed updates** — Staff edits that leave status `confirmed` return `already_confirmed` and must not re-upload.

---

## Call sites (binding fire)

| Path | When |
|------|------|
| `server/api/booking/create-appointment.post.ts` | Online book lands as confirmed |
| `server/api/booking/guest-book.post.ts` | Guest book confirmed |
| `server/api/appointments/confirm.post.ts` | Staff/customer confirm |
| `server/api/appointments/confirm-with-payment.post.ts` | Confirm path with payment |
| `server/api/appointments/save.post.ts` | Save transitions into confirmed |
| `server/utils/wallee-appointment-checkout.ts` | Checkout confirms appointment |
| `server/api/wallee/webhook.post.ts` | Webhook confirms appointment / course |
| `server/api/courses/enroll-cash.post.ts` | Cash course confirmed |
| `server/api/courses/enroll-wallee.post.ts` | Wallee course confirmed path |

Shared logic: `server/utils/binding-booking.ts`, `server/utils/binding-booking-conversion.ts`, claim helpers in `server/utils/google-ads-conversion.ts` and `server/utils/meta-capi.ts`.

Tests: `server/utils/__tests__/binding-booking-conversion.test.ts`.

---

## Ops checks

```sql
-- Recent Google claims for an appointment / course order
SELECT id, order_id, appointment_id, upload_status, conversion_value, created_at
FROM google_ads_conversion_uploads
WHERE order_id = '<appointment-uuid-or-course_…>'
ORDER BY created_at DESC;

-- Meta CAPI by stable event_id
SELECT id, event_name, event_id, appointment_id, upload_status, created_at
FROM meta_capi_uploads
WHERE event_id IN ('capi_<appointment-uuid>', 'capi_course_<registration-uuid>')
ORDER BY created_at DESC;
```

If two success rows share the same claim key, uniqueness is missing or not applied in that environment.
