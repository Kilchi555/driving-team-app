# Course public enrollment

**When to use:** Public Kursanmeldung 500s on non-SARI cash; “Rechnung” not offered or confirmation says Bar; phone-only enrollments collide; school-device autofill enrolls under a staff phone/email; debugging #186–#189.

Verified against source (Sep 2026). Commits `25b0eaa4` (#186), `484c26e5` (#187), `9c830ee7` (#188), `4d2452ec` (#189).

Root guides such as `COURSES_PUBLIC_PAGES_GUIDE.md` / `DEPLOYMENT_CHECKLIST_COURSE_ENROLLMENT.md` still describe WALLEE/CASH only — prefer this runbook for current payment + matching rules.

---

## Intent

Public course enrollment must:

1. Honor course `payment_method` including **INVOICE**, without letting the client spoof Bar vs Rechnung emails.
2. Allow multiple **no-email** registrations on the same course (empty string must not unique-collide).
3. Work for **non-SARI** cash/invoice courses (session flags always defined).
4. Reject staff/admin **email or phone** autofill so school devices do not attach customer enrollments to Mitarbeiterkonten.

---

## Contract

### Payment methods (#186)

| Concern | Rule |
|---------|------|
| DB check | `courses.payment_method` ∈ `NULL \| WALLEE \| CASH_ON_SITE \| INVOICE` |
| Public non-Wallee API | Always `/api/courses/enroll-cash` |
| Invoice allowed | Course `INVOICE` **and** `tenant_settings.payment.payment_settings.invoice_payments_enabled === true` |
| Stored method | `resolveNonWalleeEnrollmentMethod` — course column wins; client `paymentMethod` does not choose Bar vs Rechnung |
| Cash allowed without INVOICE | Explicit `CASH_ON_SITE`, **or** city Einsiedeln, **or** tenant `wallee_enabled` false — else 400 (“use online payment”) |
| Wallee path | Refuses usable `INVOICE` / `CASH_ON_SITE` courses → 400, use cash/invoice enroll |
| UI | `getCoursePaymentMethod` → WALLEE → `enroll-wallee`, else `enroll-cash` with `invoice` \| `cash_on_site` |
| Admin upsert | Constraint miss → 400 DE (“Online, Bar oder Rechnung”), not 500 |
| Admin enroll | Separate `paymentOption: 'invoice'` path in `admin-course-enroll.ts` |

### Empty email uniqueness (#187)

| Concern | Rule |
|---------|------|
| Normalize | `normalizeEnrollmentEmail` — trim + lower; blank → `NULL` |
| Migration | `fix_course_registrations_empty_email_unique.sql` — blank email/`sari_faberid` → NULL; unique indexes only when status ∈ (`confirmed`,`enrolled`) **and** non-blank |
| No unique `(course_id, user_id)` | Intentionally omitted (Wallee/credit races); admin duplicate checks stay app-level → 409 |
| Public APIs | Skip email-duplicate query when email is null |

### Session flags + staff contact guards (#188 / #189)

| Concern | Rule |
|---------|------|
| `isPartial` / `isIndividualSess` | Declared **above** the `course.sari_managed` block so non-SARI cash inserts never hit `ReferenceError` |
| Staff email | `findStaffOrAdminByEmail` → **400** Mitarbeiterkonto **before** phone match |
| Staff phone | `findStaffOrAdminByPhone` (roles `admin\|staff\|tenant_admin`, E.164 + local `0…`) → **400** |
| Guest unique conflicts | Map `users_phone_tenant_unique` / `users_email_tenant_unique` → **400** |
| Modal | Pass through 400 messages containing `Telefon` / `Mitarbeiter`; dedicated 429 copy |

Matching roles for customers: `findExistingUserByContact(..., roles: ['client','student'])`.

---

## Pitfalls

1. **Client `paymentMethod` is not authoritative** — Confirmation email Bar vs Rechnung follows the course column + tenant invoice toggle.
2. **Invoice without tenant toggle** — Resolver falls back to `cash_on_site`.
3. **Postgres `''` ≠ NULL** — Empty-string emails still collide on unique indexes; always normalize to NULL.
4. **Staff email checked after phone (old bug)** — Would enroll under customer `user_id` while storing staff email. Order is email → phone → customer match.
5. **SARI-only flag scoping** — Do not nest session flags inside `if (course.sari_managed)`; registration insert uses them for all cash enrolls.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/course-enrollment-payment-method.ts` | `resolveNonWalleeEnrollmentMethod` |
| `server/utils/course-write-error.ts` | Constraint → 400 mapping |
| `server/utils/normalize-enrollment-email.ts` | Blank → NULL |
| `server/utils/user-matching.ts` | Staff email/phone + customer match |
| `server/utils/admin-course-enroll.ts` | Admin invoice / duplicate checks |
| `server/api/courses/enroll-cash.post.ts` | Public cash/invoice enroll |
| `server/api/courses/enroll-wallee.post.ts` | Public Wallee enroll + staff guards |
| `components/customer/CourseEnrollmentModal.vue` | Method routing + 400 passthrough |
| `migrations/20260909_courses_payment_method_invoice.sql` | INVOICE check constraint |
| `migrations/fix_course_registrations_empty_email_unique.sql` | Empty-email unique indexes |
| `server/utils/__tests__/course-enrollment-payment-method.test.ts` | Invoice resolver |
| `server/utils/__tests__/enroll-cash-session-flags.test.ts` | Non-SARI flag hoist |
| `server/utils/__tests__/normalize-enrollment-email.test.ts` | NULL normalize |
