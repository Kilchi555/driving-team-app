# Course confirmation email «Wichtig!» hints

Verified from `main` after merge of `90a3ba65` (#410) and `da9a50f0` (#413).

**When to use:** Admins configure per-Kursart bullet hints for the yellow status box on enrollment confirmation emails; the mailer must resolve the correct category row.

Independent of enrollment field modes ([`CATEGORY_ENROLLMENT_FIELDS.md`](./CATEGORY_ENROLLMENT_FIELDS.md)) and of invoice payment / issuance runbooks.

---

## Intent

`course_categories.email_important_notice` stores admin-authored hints shown as `<li>` items in the confirmation email. Modern admin-created courses often set `courses.course_category_id` while leaving the legacy string `courses.category` **NULL**. Looking up only by code missed configured hints (#413).

---

## Contract

### Storage

- Column: `course_categories.email_important_notice` (plain text, newline-separated items from admin UI).
- Legacy rows may already contain raw `<li>…</li>` HTML — preserve as stored.
- Whitelisted on `POST /api/admin/course-categories/save` (#410).

Helpers in `server/utils/course-important-notice.ts`:

| Helper | Role |
|--------|------|
| `serializeCourseImportantNoticeItems` | Join UI lines for DB (drop empties) |
| `parseCourseImportantNoticeItems` | Split stored notice for admin UI / tests |
| `buildCourseImportantNoticeListItems` | Build escaped `<li>` markup (or pass through legacy HTML) |
| `resolveCourseCategoryNoticeLookup` | Prefer FK, else legacy code |

### Lookup order (confirmation email)

`resolveCourseCategoryNoticeLookup(course)`:

1. Non-empty `courses.course_category_id` → `{ by: 'id', value }`
2. Else non-empty `courses.category` (legacy/SARI code) → `{ by: 'code', value }`
3. Else `null` → skip category fetch

`POST /api/emails/send-course-enrollment-confirmation`:

1. Load registration with course (`category`, `course_category_id`).
2. If lookup + tenant → `course_categories` filtered by `tenant_id` and `id` or `code`.
3. `buildCourseImportantNoticeListItems(email_important_notice)`.
4. If empty → existing hard-coded category-code fallbacks (e.g. VKU) in the handler.

Auth: `requireStaffOrInternal` (unchanged).

### Plain text → HTML

Newlines → trimmed non-empty lines → `escapeHtml` inside `<li>`. If the stored string already contains `<li>`, return as-is (legacy path).

---

## Pitfalls

- Do not look up hints by `courses.category` alone — FK-first is required for modern courses.
- Always scope category fetch with `tenant_id`.
- Empty notice is valid; caller may still apply hard-coded fallbacks.
- Do not conflate with `enrollment_fields` (form inputs) or payment-method defaults.
- Saving the category without `email_important_notice` in the body does not clear the column (partial update whitelist).

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/course-important-notice.ts` | Lookup + serialize/parse/build |
| `server/api/admin/course-categories/save.post.ts` | Persist notice |
| `server/api/emails/send-course-enrollment-confirmation.post.ts` | Resolve + render |
| Tests | `course-important-notice*.test.ts`, `course-enrollment-confirmation-hints.http.test.ts` |
