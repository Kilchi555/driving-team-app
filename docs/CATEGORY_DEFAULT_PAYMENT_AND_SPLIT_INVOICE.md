# Category default payment method and split public invoice controls

Verified from `main` after merge of `4d73c62a` (#408), `42c6ceb3` (#409), and `398b2e77` (#411).

**When to use:** Admins set a Kursart Standard-Zahlungsart; new courses inherit it; public **course** vs **appointment** invoice toggles must not be conflated; customer flows must fail closed on invoice when the scoped flag is off.

Open draft [#377](https://github.com/Kilchi555/driving-team-app/pull/377) `COURSE_INVOICE_PUBLIC_ISSUANCE` covers **when** public course invoices are issued (timing / issuer). This runbook is **payment-method selection and customer invoice opt-in** only — do not fold into #377.

---

## Intent

Three related layers:

| Layer | Role |
|-------|------|
| `course_categories.default_payment_method` | Optional default for **new** courses (`WALLEE` / `CASH_ON_SITE` / `INVOICE` / `NULL` = tenant Standard) |
| `courses.payment_method` | Snapshot on the course — create inherits category→tenant; updates never re-inherit |
| Tenant payment settings | Separate public invoice opt-ins for courses vs individual appointments |

Admin **Standard-Zahlungsart** (category/course) is independent of customer-facing **„Rechnung als Zahlungsoption erlauben“**. The toggle gates booking/enrollment only (#409).

---

## Contract

### Category default (`utils/category-default-payment-method.ts`)

| Input | Result |
|-------|--------|
| `null` / `''` / omitted | `NULL` → Mandantenstandard |
| `WALLEE` / `CASH_ON_SITE` / `INVOICE` | Stored as category default |
| Other | 400 / thrown German error |

`resolveNewCoursePaymentMethod`: non-null category wins; else `mapTenantDefaultToCoursePaymentMethod(tenantDefault)`.

UI rule (`shouldApplyCategoryPaymentDefault`): category change reapplies the default; manual payment edits stick until the category changes again.

### Admin save (no invoice-option gate)

- `POST /api/admin/course-categories/save` — whitelists `default_payment_method`; parses via `parseCategoryDefaultPaymentMethod`. **Does not** call `assertInvoicePaymentMethodAllowed`.
- `POST /api/admin/courses/upsert` — on **create** with omitted/`null` payment method, loads category `default_payment_method` (tenant-scoped) and resolves; on **update**, only writes `payment_method` when the client sends the key. Explicit admin `INVOICE` is allowed even when course invoices are disabled for customers.

### Legacy create is dead

`POST /api/admin/courses/create` always returns **410** with a pointer to upsert (#408). Do not revive payment-method writes on that path.

### Customer fail-closed (courses)

`assertInvoiceEnrollmentAllowed` / `INVOICE_ENROLLMENT_DISABLED_MESSAGE` in `server/utils/course-enrollment-payment-method.ts`:

- Course `payment_method === 'INVOICE'` **and** course invoice flag off → **400**, no silent rewrite to cash/Wallee.
- Flag source: `resolveCourseInvoicePaymentsEnabled` (`course_invoice_payments_enabled`, else legacy `invoice_payments_enabled`).

Used by `enroll-cash` / `enroll-wallee`.

### Split public invoice controls (#411)

Stored under `tenant_settings` `payment` / `payment_settings` JSON:

| Key | Scope |
|-----|-------|
| `course_invoice_payments_enabled` | Public course enrollment „Rechnung“ |
| `individual_appointment_invoice_payments_enabled` | Public individual appointment booking „Rechnung“ |
| `invoice_payments_enabled` | **Legacy fallback only** when a scoped key is absent |

Resolution (`server/utils/tenant-default-payment-method.ts`):

1. If the scoped key is **explicitly present** (including `false`) → use that boolean.
2. Else fall back to legacy `invoice_payments_enabled === true`.
3. Never treat a **missing** scoped key as `false`.

Admin UI (`pages/admin/profile.vue`): two toggles write the scoped keys; they intentionally omit scoped keys from defaults so “absent → legacy” survives until first toggle.

Public API: `GET /api/settings/invoice-payment-settings` returns raw legacy + resolved scoped flags (auth or `?slug=`). Composable `useInvoicePaymentSettings` exposes `courseInvoiceEnabled` / `appointmentInvoiceEnabled` and fails **closed** on error.

Appointment booking (`resolve-online-booking-payment-method.ts`):

- Allowed invoice = `resolveIndividualAppointmentInvoicePaymentsEnabled`.
- Explicit `payment_method=invoice` when disabled → **400** `APPOINTMENT_INVOICE_DISABLED` (create-appointment / guest-book). Other disallowed methods may fall back; **invoice never silently substitutes**.

---

## Architecture

```
Admin Kursarten (courses.vue)
  → default_payment_method on category save
  → new course form applies category/tenant default until manual edit

POST /api/admin/courses/upsert (create)
  → resolveNewCoursePaymentMethod(category → tenant)
  → persist courses.payment_method snapshot

Public course enroll
  → resolveCourseInvoicePaymentsEnabled
  → assertInvoiceEnrollmentAllowed if course is INVOICE

Public appointment book
  → resolveIndividualAppointmentInvoicePaymentsEnabled
  → resolveOnlineBookingPaymentMethod (fail-closed on invoice)
```

---

## Pitfalls

- Do not use `assertInvoicePaymentMethodAllowed` / `INVOICE_PAYMENT_DISABLED_MESSAGE` to block **admin** category/course Standard-Zahlungsart saves — that message is for customer-facing gates only.
- Do not use `getTenantInvoicePaymentsEnabled` for new code — prefer scoped resolvers.
- Turning off only the **appointment** invoice toggle must not hide course invoice (and vice versa) once scoped keys exist.
- Existing courses keep their `payment_method` snapshot after a category default change.
- Independent of `invoice_timing_mode` / public issuance (#377).
- Migrations: `migrations/20261011_course_categories_default_payment_method.sql` (CHECK on allowed values). Confirm apply in the target env before relying on the column.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/category-default-payment-method.ts` | Parse / resolve / customer gate helper |
| `server/utils/course-enrollment-payment-method.ts` | Enroll fail-closed for INVOICE courses |
| `server/utils/tenant-default-payment-method.ts` | Scoped + legacy invoice flags |
| `server/utils/resolve-online-booking-payment-method.ts` | Appointment method policy |
| `server/api/admin/course-categories/save.post.ts` | Persist category default |
| `server/api/admin/courses/upsert.post.ts` | Create inherit / update snapshot |
| `server/api/admin/courses/create.post.ts` | Legacy 410 |
| `server/api/courses/enroll-cash.post.ts` / `enroll-wallee.post.ts` | Course invoice gate |
| `server/api/booking/create-appointment.post.ts` / `guest-book.post.ts` | Appointment invoice fail-closed |
| `server/api/settings/invoice-payment-settings.get.ts` | Public/auth flags |
| `composables/useInvoicePaymentSettings.ts` | UI flags (fail closed) |
| `pages/admin/profile.vue` | Split invoice toggles |
| Tests | `category-default-payment-method*.test.ts`, `split-invoice-payment-settings*.test.ts`, `legacy-courses-create.http.test.ts` |
