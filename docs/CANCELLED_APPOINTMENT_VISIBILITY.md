# Cancelled appointments vs soft-delete

**When to use:** Cancelled unpaid online holds still block rebooking; ghost lessons appear in the customer dashboard; availability calculator or conflict checks treat `status=cancelled` as occupied; debugging why `deleted_at IS NULL` cancelled rows still matter.

Verified against source (Sep 2026). Commit `4dc17de4` (#171).

---

## Intent

`deleted_at` (soft-delete) and `status = cancelled` / `canceled` are **independent** domain states. After #171:

1. **Customer surfaces** (upcoming lessons, appointment lists) hide cancelled rows even when `deleted_at` is null.
2. **Schedule occupancy** (availability, conflicts, calculator) never treats cancelled rows as occupying a slot.
3. Unpaid online holds that are cancelled without soft-delete must not block the same slot forever.

Do not “fix” cancelled holds by only setting `deleted_at` — status filtering is required on every active/booking path.

---

## Contract

| Concern | Rule |
|---------|------|
| Visible to customer | `deleted_at IS NULL` **and** status not in `cancelled` / `canceled` |
| Upcoming for customer | Visible **and** `start_time` in the future |
| Occupies schedule slot | Not soft-deleted, status present, not `deleted` / `cancelled` / `canceled` |
| Pending / confirmed unpaid | **Does** occupy (payment ≠ occupancy) |
| Spelling | Prefer filtering **both** `cancelled` and `canceled` |

Shared helpers (use these instead of ad-hoc filters):

- `utils/customer-appointment-visibility.ts` — customer list / upcoming
- `utils/appointment-schedule-occupancy.ts` — availability / conflict occupancy

---

## Pitfalls

1. **Cancelled hold with `deleted_at` null** — Common for abandoned online payment holds. Must be excluded from customer UI **and** occupancy queries.
2. **Soft-delete alone is not enough** — Callers that only check `deleted_at` will still see cancelled rows as “live”.
3. **US vs UK spelling** — Some older queries use only `.neq('status', 'cancelled')`. Prefer `.not('status', 'in', '("cancelled","canceled")')` or the shared helpers so both spellings clear the slot.
4. **Payment status ≠ appointment status** — An unpaid but `confirmed` / `pending` appointment still occupies the calendar; cancellation is what frees it.
5. **Client-side defense** — Dashboard / modal filters are defense-in-depth; APIs must still filter so conflict checks and availability stay correct.

---

## Ops checks

```sql
-- Cancelled holds that are still soft-alive (typical ghost-slot suspects)
SELECT id, tenant_id, user_id, staff_id, status, deleted_at, start_time, end_time
FROM appointments
WHERE status IN ('cancelled', 'canceled')
  AND deleted_at IS NULL
  AND start_time > now()
ORDER BY start_time
LIMIT 50;
```

If these rows still appear in customer upcoming lists or block new bookings, the caller is missing the #171 filters.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/customer-appointment-visibility.ts` | `isVisibleCustomerAppointment`, `filterUpcomingCustomerAppointments` |
| `utils/appointment-schedule-occupancy.ts` | `occupiesScheduleSlot`, `filterOccupyingAppointments` |
| `components/customer/CustomerDashboard.vue` | Upcoming lessons via shared filter |
| `components/customer/UpcomingLessonsModal.vue` | Same client filter |
| `server/api/customer/get-appointments.get.ts` | Excludes cancelled + soft-deleted |
| `server/api/booking/get-customer-appointments.get.ts` | Conflict / rebooking list excludes cancelled |
| `server/api/booking/get-availability*.post.ts` | Occupancy queries exclude cancelled |
| `server/services/availability-calculator.ts` | Slot generation ignores cancelled holds |
| `server/utils/__tests__/customer-appointment-visibility.test.ts` | Regression: Dilara-style cancelled hold |
| `server/utils/__tests__/appointment-schedule-occupancy.test.ts` | Occupancy unit contract |
