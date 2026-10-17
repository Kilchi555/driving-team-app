# Automatic Invoicing (`auto_invoice_*`)

**When to use:** Tenant expects a Sammelrechnung that never arrived, invoices fire too early/late, wrong email recipients, or you need to test the daily cron for one tenant.

---

## Intent

Optional automation (both paths **default OFF** in `booking_policy`) that turns open **invoice** payments into draft invoices and emails them:

1. **On complete** — when appointments are marked completed (one invoice per payment)
2. **Scheduled** — daily cron; per-tenant schedule in `Europe/Zurich`; groups all eligible past open invoice-payments into **one Sammelrechnung per customer**

Neither path changes appointment status. Failures are logged; hooks never throw to callers.

---

## Policy fields (`tenants.booking_policy`)

| Field | Default | Notes |
|-------|---------|-------|
| `auto_invoice_on_complete` | `false` | Must be explicitly `true` |
| `auto_invoice_schedule` | `'off'` | `'off' \| 'daily' \| 'weekly' \| 'monthly'` |
| `auto_invoice_schedule_weekday` | `1` | ISO weekday 1=Mon … 7=Sun (weekly) |
| `auto_invoice_schedule_day` | `1` | Day of month **1–28** (monthly; days 29–31 rejected → 1) |
| `auto_invoice_recipient` | `'customer'` | `'customer' \| 'office' \| 'both'` |
| `auto_invoice_office_email` | `null` | Office/both; falls back to `tenants.contact_email` if unset |

Admin UI: `/admin/profile` → **Automatische Rechnungen**.  
APIs: `GET`/`POST /api/admin/booking-policy`.

Schedule match uses `zurichTodayParts()` / `scheduleMatchesToday()` — **Zurich calendar**, not UTC.

---

## Eligible payments (both paths)

From `payments`:

- `payment_method = 'invoice'`
- `payment_status ∈ ('pending', 'open')`
- `invoice_id IS NULL`
- Must have `user_id` (grouped/sent per student)

**On complete** additionally scopes to the completed `appointment_id`s.

**Scheduled** additionally requires:

- Appointment `start_time` **in the past** (relative to cron `now`)
- Appointment status **≠ `cancelled`**
- Does **not** require status `completed`

---

## Surfaces / triggers

| Surface | Path | Notes |
|---------|------|-------|
| Shared logic | `server/utils/auto-invoice-on-complete.ts` | `triggerAutoInvoiceOnComplete`, `runScheduledAutoInvoices` |
| Cron | `GET /api/cron/auto-invoice-scheduled` | Bearer `CRON_SECRET` only |
| Vercel | `20 6 * * *` (06:20 UTC daily) | `vercel.json` |
| Test one tenant | `?test_tenant_id=<UUID>` | Still requires cron auth |
| On-complete callers | `staff/batch-update-appointment-status`, `staff/save-criteria-evaluations`, `exams/save-result` | Fire-and-forget |
| Persist/send | `persistAndSendInvoiceDraft` | Creates invoice, links payments, emails |

Cron actor resolution: payment `staff_id` user, else earliest tenant `admin`.

---

## Recipients & missing email

| Mode | Email targets |
|------|----------------|
| `customer` | Billing/student email only |
| `office` | `auto_invoice_office_email` or `tenants.contact_email` |
| `both` | Both |

If customer email is missing and mode is `customer`/`both`, the invoice is still created/marked; admins get a **“Rechnung ohne Kunden-E-Mail”** alert (`skipAdminNotify: true` on the normal send path).

---

## Common pitfalls

1. **Two independent switches** — enabling on-complete does not enable the schedule (and vice versa).
2. **Scheduled invoices past non-cancelled appointments** even if never marked completed — open invoice dues after `start_time` are included.
3. **Cancelled appointments** are skipped by the schedule; on-complete only runs for IDs just completed.
4. **Monthly day capped at 28** — setting 31 silently normalizes to 1.
5. **On-complete = one payment → one invoice**; schedule = **Sammelrechnung per student** across many appointments.
6. Non-invoice payment methods (Wallee, cash, credits) are never auto-invoiced here.
7. Cron unauthorized without `Authorization: Bearer ${CRON_SECRET}` (no `x-vercel-cron` bypass on this route).

---

## Codepaths

- `server/utils/auto-invoice-on-complete.ts`
- `server/utils/invoice-persist-and-send.ts`
- `server/api/cron/auto-invoice-scheduled.get.ts`
- `server/api/admin/booking-policy.get.ts` / `.post.ts`
- `server/api/staff/batch-update-appointment-status.post.ts`
- `server/api/staff/save-criteria-evaluations.post.ts`
- `server/api/exams/save-result.post.ts`
- `pages/admin/profile.vue` (Automatische Rechnungen)
- `vercel.json` (`auto-invoice-scheduled`)
