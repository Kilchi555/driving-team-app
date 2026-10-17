# Public course invoice timing and issuance

Verified from `main` after merges of `98bd08fc` (course-level timing), `#357` / `09e198ad` (immediate public enrollment invoice), and `#367` / `d2a987f4` (tenant + category admin defaults).

Phase-1 schema/RPC (`issue_course_invoice`, registration snapshots, bindings) is documented separately on draft [#322](https://github.com/Kilchi555/driving-team-app/pull/322) (`COURSE_INVOICE_PHASE1`). This runbook covers the **app-layer resolver and public issuer** that call that RPC.

## Intent

When a public enrollment uses `payment_method=invoice` and timing resolves to `immediate`, create **one** invoice (and payment) for that registration, email it when possible, and **never** fail the enrollment if billing or mail fails.

## Timing resolution

`resolveCourseInvoiceTiming` in `server/utils/course-invoice-timing.ts` (pure; no DB):

| Priority | Source | Values |
|---|---|---|
| 1 | `courses.invoice_timing_mode` | `immediate` wins; any other non-empty value → `unsupported` |
| 2 | category `invoice_timing_mode` | `off` / `immediate` / `inherit` (else `unsupported`) |
| 3 | `tenants.default_invoice_timing_mode` | `off` / `immediate` (else `unsupported`) |

- Course `NULL` means “no override” and falls through to category.
- Category `off` does **not** inherit tenant `immediate`.
- Unknown modes fail closed (`unsupported` → billing skipped).

Admin saves:

| Surface | API / helper | Allowed |
|---|---|---|
| Tenant default | `GET`/`PUT /api/admin/tenant/course-invoice-timing` | `off`, `immediate` (client tenant ids ignored) |
| Category | `POST /api/admin/course-categories/save` | `inherit`, `off`, `immediate` |
| Course | `normalizeCourseInvoiceTimingForSave` via course upsert | Only when `paymentMethod=INVOICE`; stores `immediate` or `null` |

## Public issuer contract

`runPublicCourseInvoiceBilling({ supabase, registrationId })` in `server/utils/public-course-invoice.ts`:

1. Load registration → course → category mode → tenant (all tenant-scoped).
2. Resolve timing; skip on `off` / `unsupported`.
3. Skip `company_collective`, unassigned user, non-`invoice` payment method.
4. Price via `resolvePublicEnrollmentPriceRappen` (full / partial / individual session).
5. Snapshot amounts with `courseInvoiceSnapshotAmounts` (credit/voucher/discount forced to 0 for this path).
6. Call RPC `issue_course_invoice`.
7. Stamp `course_registrations.invoice_id` via `stampInvoiceSourceRow` (tenant + null-only).
8. Ensure one payment with `metadata.public_course_invoice = true`.
9. Mail claim → email → mark invoice `sent`.

In-process dedupe: `inflight` map keyed by `registrationId`.

Enrollment UX copy: `publicCourseEnrollmentMessage` / `toPublicBillingResponse` — registration success is independent of `skipped` / `created` / `sent` / `failed`.

Call site: `server/api/courses/enroll-cash.post.ts` (invoice path after registration succeeds).

## Schema / migrations (presence ≠ applied)

| File | Role |
|---|---|
| `migrations/20261003_courses_invoice_timing_mode.sql` | Optional `courses.invoice_timing_mode` (`NULL` or `immediate`) |
| `migrations/20261003_payments_public_course_invoice_uidx.sql` | Unique index: one public-course-invoice payment per `(tenant_id, course_registration_id)` |
| `migrations/20261003_public_course_invoice_mail_claims.sql` | `public_course_invoice_mail_claims` — service_role only; outcomes `claimed` / `failed` / `sent` / `unconfirmed` |

Headers say **do not apply from app deploy**. Ops must apply before relying on uniqueness / mail claims in production.

## Constraints & pitfalls

1. Do not confuse with appointment auto-invoice, Staff POS, or Wallee course enroll — this path is public `invoice` + immediate timing only.
2. `company_collective` never issues here.
3. Mail outcomes `claimed`, `sent`, and `unconfirmed` must not send again; `failed` may reclaim.
4. Cross-tenant payment, multiple payments, or amount mismatch → conflict / stop; existing invoice may still surface as `created`/`sent`.
5. Phase-1 protect-trigger freeze still applies once an invoice exists — do not invent alternate stamp paths that bypass `stampInvoiceSourceRow`.

## Tests

- `server/utils/__tests__/public-course-invoice.test.ts`
- `server/utils/__tests__/course-invoice-timing-defaults.http.test.ts`
