# Teaching Guide (from evaluations)

**When to use:** Staff need the Unterrichts-Guide while scoring a lesson; guide content is empty on a new driving-school tenant; Kat B handbook images are missing; edit permission for the guide is unclear.

Verified against source (Aug 2026).

---

## Intent

Let instructors open criterion-level teaching content (`staff_content`) **from the evaluation modal** without leaving the lesson flow. Separately, seed **student-facing** `educational_content` (and handbook images) for driving-school tenants from Driving Team templates.

`EvaluationModalNew.vue` was removed; the live surface is `EvaluationModal.vue` only.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Evaluation criteria row | Book icon → `openGuide(criteriaId)` → `StaffGuideModal` |
| Staff settings / admin | Same modal; admin evaluation system can edit `staff_content` |
| Permission (UI) | `can_edit_guide === true` **or** role `admin` / `tenant_admin` |
| Save API | `POST /api/staff/save-guide-content` `{ criterion_id, staff_content }` |

`StaffGuideModal` re-reads `can_edit_guide` from `users` so edit mode does not depend only on props.

---

## Data model

| Column on `evaluation_criteria` | Audience | Shape |
|---------------------------------|----------|--------|
| `staff_content` (JSONB) | Instructors | Pedagogical sections — see `types/staff-content.ts` |
| `educational_content` (JSONB) | Students / templates | Often `{ _default: { title, sections[] } }` |

Handbook Kat B image URLs live under the public Storage prefix  
`evaluation-content/.../templates/handbuch-kat-b/...`.

Seed migrations (idempotent where noted):

- `sql_migrations/20260815_driving_school_educational_text_templates.sql` — copy text from tenant `driving-team` onto global + empty `driving_school` criteria
- `sql_migrations/20260815_handbuch_kat_b_template_images.sql` — append Kat B section images to matching criterion **names** (skips rows that already contain `handbuch-kat-b`)

---

## Pitfalls

1. **Guide vs educational text** — Opening the book icon loads **staff** guide content, not `educational_content`. Empty `staff_content` with filled educational texts is expected until someone edits the guide.
2. **Tenant-only criteria in the modal** — `StaffGuideModal` loads categories/criteria with `tenant_id = current tenant` only (never global templates). Global/template rows are for onboarding copy via migrations / `applyEvaluationDefaults`.
3. **Cross-tenant edits** — Save rejects criteria whose `tenant_id` belongs to another tenant; global criteria (`tenant_id` null) are editable by staff of any tenant that can call the API.
4. **UI vs API permission** — UI edit requires `can_edit_guide` (or admin). `save-guide-content` currently allows any `staff` / `admin` / `tenant_admin` / `super_admin` **without** checking `can_edit_guide`. Toggle the flag in Admin → Users for the intended UX; do not assume the API enforces the same gate.
5. **Paid duration changes** — Unrelated but shipped in the same change set: paid appointments may change duration; increase creates an open remainder on save (`DurationSelector` + appointments save). See [EVENT_DURATION_LOCK.md](./EVENT_DURATION_LOCK.md).

---

## Ops checks

```sql
-- Staff who can edit the guide UI
SELECT id, email, role, can_edit_guide
FROM public.users
WHERE tenant_id = '<tenant-uuid>'
  AND role IN ('staff', 'admin', 'tenant_admin');

-- Criteria missing staff guide content for a tenant
SELECT id, name
FROM public.evaluation_criteria
WHERE tenant_id = '<tenant-uuid>'
  AND (staff_content IS NULL OR staff_content = '{}'::jsonb);
```

---

## Codepaths

- `components/EvaluationModal.vue` — book button → `StaffGuideModal`
- `components/StaffGuideModal.vue` — view/edit guide; resolves `can_edit_guide`
- `server/api/staff/save-guide-content.post.ts` — persist `staff_content`
- `types/staff-content.ts` — JSON shape
- `sql_migrations/20260815_driving_school_educational_text_templates.sql`
- `sql_migrations/20260815_handbuch_kat_b_template_images.sql`
- Admin: `pages/admin/users/index.vue` (`can_edit_guide` toggle), `server/api/admin/evaluation-system.post.ts` (`save-staff-content`)
