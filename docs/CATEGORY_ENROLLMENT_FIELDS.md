# Category-specific enrollment field modes

Verified from `main` after merge of `b2e3981e` (#412).

**When to use:** Admins configure which address/identity fields a **non-SARI** public course enrollment shows (required / optional / hidden) per Kursart; enroll APIs must enforce the same policy.

Independent of tenant `booking_policy`, SARI identity flows, and confirmation-email «Wichtig!» hints ([`COURSE_CONFIRMATION_IMPORTANT_NOTICE.md`](./COURSE_CONFIRMATION_IMPORTANT_NOTICE.md)).

---

## Intent

Before #412, non-SARI `CourseEnrollmentModal` treated street, house number, ZIP, city, license number, and birthdate as always required. Tenants that do not need every field for a Kursart can now set modes on `course_categories.enrollment_fields`.

SARI enrollments keep their existing identity path — **do not** apply these modes there.

---

## Contract

### Modes (`utils/category-enrollment-fields.ts`)

| Mode | UI | Server |
|------|----|--------|
| `required` | Visible, mandatory | Must meet format rules |
| `optional` | Visible, not mandatory | Empty → `null`; non-empty must meet format |
| `hidden` | Not shown | Empty/null/undefined OK; **non-empty → 400** |

Keys (DB / config): `street`, `street_nr`, `zip`, `city`, `license_number`, `birthdate`.  
Client payload camelCase: `street`, `streetNr`, `zip`, `city`, `licenseNumber`, `birthdate`.

Defaults (`DEFAULT_CATEGORY_ENROLLMENT_FIELDS`): all six **required** (preserves pre-#412 behavior).

`resolveCategoryEnrollmentFields(raw)`: null/invalid object → defaults; unknown keys ignored; invalid modes → default for that key.

`parseCategoryEnrollmentFields(value)` (admin save): null/undefined → defaults; partial objects fill missing keys from defaults; unknown keys or bad modes → throw (HTTP 400).

### Format floors (when value present / required)

| Field | Min length |
|-------|------------|
| street | 2 |
| street_nr | 1 |
| zip | 4 |
| city | 2 |
| license_number | 6 |
| birthdate | 8 |

### Admin save

`POST /api/admin/course-categories/save` whitelists `enrollment_fields` and parses with `parseCategoryEnrollmentFields`. Rate limit / admin auth unchanged.

### Public read + enroll

- `GET /api/courses/public` includes category `enrollment_fields` for the modal.
- `POST /api/courses/enroll-cash` and `enroll-wallee`: non-SARI branch calls `resolveCategoryEnrollmentFields` + `applyCategoryEnrollmentFieldPolicy`; failures → **400** with German messages (`CategoryEnrollmentFieldsError`).

Core name / email / phone / AGB stay separate from these six fields.

---

## Migration

`migrations/20261011_course_categories_enrollment_fields.sql`:

- Adds `enrollment_fields jsonb` with default all-required JSON.
- Backfills NULL rows to that default.
- CHECK: object with all six keys and modes in `required|optional|hidden`.

Does **not** backfill historical registrations. Confirm apply in the target env before relying on the column (app resolver still treats NULL as defaults).

---

## Pitfalls

- Sending a value for a **hidden** field is rejected — clients must omit or send empty, not spoof.
- Empty `enrollment_fields: {}` on save becomes all-required defaults (not “leave unchanged”). Omit the key on partial updates if you must preserve stored JSON without rewriting.
- Do not reuse tenant booking_policy for these modes.
- Do not apply to SARI identity enrollment.
- Independent of category `default_payment_method` and confirmation email notices.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/category-enrollment-fields.ts` | Modes, parse, resolve, server policy, client validity |
| `server/api/admin/course-categories/save.post.ts` | Persist |
| `server/api/courses/public.get.ts` | Expose to modal |
| `server/api/courses/enroll-cash.post.ts` / `enroll-wallee.post.ts` | Enforce |
| `components/customer/CourseEnrollmentModal.vue` | Render by mode |
| `pages/admin/courses.vue` | Admin Kursart UI |
| `composables/useCourseCategories.ts` | Category payload |
| Tests | `utils/__tests__/category-enrollment-fields.test.ts`, `category-enrollment-fields-*.test.ts` |
