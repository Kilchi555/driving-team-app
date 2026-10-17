# Flexible Kursart session templates

Verified from `main` after merge of `ad4eb9e6` (#384) and `f3d4f4c4` (#404).

**When to use:** Admins define unequal per-session durations on a Kursart (`course_categories`); courses seed session times from that template; room/vehicle windows must follow concrete session start/end; ops need the DB cutover order for the category migration.

Open draft [#386](https://github.com/Kilchi555/driving-team-app/pull/386) `COURSE_SESSION_RECONCILE` covers identity-preserving course save (#383). This runbook is the **category template** layer only — do not fold into #386.

Production UI smoke lives in [`E2E_FLEXIBLE_SESSION_PRODUCTION.md`](./E2E_FLEXIBLE_SESSION_PRODUCTION.md) (#405).

---

## Intent

Kursarten may describe **N sessions with different durations** (e.g. `2h + 3.5h + 1h`), not only uniform `N × hours`.

Source of truth:

| Field | Role |
|-------|------|
| `session_structure.sessions[]` | **SoT** — ordered `{ duration_hours }` entries |
| `session_count` | Derived compatibility (`sessions.length`) |
| `total_duration_hours` | Derived sum of session durations |
| `hours_per_session` | **Initializer / seed only** — not per-session SoT when unequal |

Category save **must not** rewrite existing `courses`, `course_sessions`, bookings, payments, invoices, or SARI data. Templates affect new course session generation and resource window math that reads concrete session times.

---

## Contract

### Limits (`utils/course-category-session-template.ts`)

| Constant | Value |
|----------|-------|
| Sessions per category | 1…10 |
| Duration per session | 0.5…12 h, steps of 0.5 |
| Max total duration | 120 h (`10 × 12`) |
| Structure version | `1`, `flexible: true` |

Invalid input throws `CategorySessionTemplateError` (German messages). Admin save maps those to HTTP **400**.

### Normalize (`normalizeCategorySessionTemplate`)

1. If `session_structure.sessions` is a **non-empty** array → validate every `duration_hours`; rebuild `description` as `Xh + Yh + …`.
2. Else (legacy / empty `sessions`) → synthesize uniform template from `session_count` × `hours_per_session` (count clamped to 1…10; seed default 8 h).
3. Always recompute `session_count` and `total_duration_hours` from the sessions array.
4. Still validate the seed `hours_per_session` even when `sessions[]` is present (bad seed → error).

### Admin save (`POST /api/admin/course-categories/save`)

Auth: authenticated **admin**, tenant-scoped. Rate limit: `admin_course_category_save` (20 / min).

Template fields are normalized **only when**:

- creating a category, **or**
- the body includes `session_structure` and/or `session_count` and/or `hours_per_session`

Partial updates (name, `is_active`, `invoice_timing_mode`, …) **omit** template columns from the UPDATE so an existing unequal `sessions[]` is not overwritten with synthesized defaults.

Sending `session_structure: { sessions: [] }` is **not** “leave unchanged” — empty array falls through to legacy uniform synthesis from count × hours.

### UI / course create (`pages/admin/courses.vue`)

- Kursart form edits a local `categoryTemplateSessions` list; summary via `formatCategorySessionSummary`.
- “Auf N × hours setzen” uses `buildUniformCategorySessionTemplate` after `isCustomizedRelativeToInitializer` confirm when the list differs from uniform.
- `generateSessionsFromCategory` builds draft course sessions day-by-day from **each** template duration (not `hours_per_session`), starting 09:00.

### Resource windows

Room booking sync (`syncRoomBookingsForSessions`) and vehicle availability checks use each `course_sessions.start_time` / `end_time`. Unequal templates require those concrete times — never invent windows from category `hours_per_session` alone. Covered by `server/utils/__tests__/course-category-flexible-template-regressions.test.ts`.

---

## Migration cutover (`sql_migrations/20261007_course_category_flexible_session_templates.sql`)

**PR-only / ops-owned.** The file header says do **not** auto-apply from the app merge. Treat as **undeployed** until ops confirms apply.

Required order:

1. Merge + deploy app that understands `session_structure.sessions[]` (#384).
2. Production smoke with **uniform** templates (old CHECK still allows equal durations).
3. Apply this migration (widen `total_duration_hours` to `DECIMAL(5,2)`, drop `course_categories_duration_consistency`, backfill missing `sessions[]`).
4. Unequal-template E2E / Production flex workflow.

Do **not** save unequal templates in production while the old duration CHECK is still active. Do **not** apply the migration before the new app is live.

### What the SQL does

| Step | Effect |
|------|--------|
| Widen column | `total_duration_hours` → `DECIMAL(5,2)` so 120.00 fits (was `DECIMAL(4,2)` / 99.99) |
| Drop CHECK | Removes uniform-only `course_categories_duration_consistency` |
| Backfill | Rows missing non-empty `sessions[]` get `session_count` (clamped 1…10) × `hours_per_session` (default 8) |
| Realign scalars | `session_count` / `total_duration_hours` derived from `sessions[]` after backfill |

Scope: **`course_categories` only**.

### #404 PG-valid repair

PostgreSQL rejects aggregates in `UPDATE … SET` (`ERROR 42803`). Step-3 `string_agg` / `jsonb_agg` must live in an `UPDATE … FROM (subquery)` — that is the #404 fix. Semantics (description + sessions) are unchanged; re-apply only the repaired file from `main`.

---

## Architecture

```
Admin Kursarten UI (courses.vue)
  → normalizeCategorySessionTemplate (client preview)
  → POST /api/admin/course-categories/save
       → normalizeCategorySessionTemplate (server SoT write)
       → UPDATE/INSERT course_categories only
       → syncAutoCategoryWaitlists (non-blocking)

Course create “Termine generieren”
  → normalizeCategorySessionTemplate(category)
  → courseSessions[] with per-index duration_hours

Course upsert / room sync (existing #383 path)
  → concrete course_sessions start/end
  → syncRoomBookingsForSessions / vehicle checks
```

---

## Pitfalls

1. **`hours_per_session` is not SoT** when `sessions[]` exists — using it for booking windows or totals breaks unequal templates.
2. **Partial category save** must not send template keys unless the admin edited the template — otherwise save synthesizes and may overwrite.
3. **Empty `sessions: []`** triggers legacy uniform synthesis — not a no-op.
4. **Migration undeployed** → product max 120 h / unequal CHECK drop may still fail at the DB even if the app validates.
5. **Apply before app deploy** → old app + dropped CHECK / new shapes can diverge; follow cutover order.
6. **Category save ≠ course mutate** — changing a Kursart template does not rewrite existing courses’ sessions.
7. **SARI-managed courses** still follow SARI sync for session edits; template generation is the admin/non-SARI draft helper path.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/course-category-session-template.ts` | Normalize / validate / format / uniform builder |
| `server/utils/course-category-session-template.ts` | Re-export for server imports |
| `server/api/admin/course-categories/save.post.ts` | Persist normalized template |
| `composables/useCourseCategories.ts` | List/create/update via admin API; summary helpers |
| `pages/admin/courses.vue` | Kursart editor + `generateSessionsFromCategory` |
| `sql_migrations/20261007_course_category_flexible_session_templates.sql` | Ops migration (#384 + #404) |
| `server/utils/__tests__/course-category-session-template.test.ts` | Unit contract |
| `server/utils/__tests__/course-category-flexible-template-regressions.test.ts` | Save isolation + unequal room/vehicle windows |

---

## Verify

```bash
npx vitest run server/utils/__tests__/course-category-session-template.test.ts \
  server/utils/__tests__/course-category-flexible-template-regressions.test.ts
```

These tests do not apply the SQL migration and do not hit Production.
