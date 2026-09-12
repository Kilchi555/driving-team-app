# Auto Category Waitlists

## Intent

When a course category has `waitlist_enabled=true` but **no future public bookable dates** for a city, keep one public `waitlist` course visible so customers (and location deep-links) can still join a signup path. When real dates appear again, demote those auto-managed placeholders back to `draft`.

Only courses with `is_auto_waitlist=true` are demoted by the sync. Manual waitlist courses without that flag are left alone after adoption.

## Contract

| Concept | Rule |
|--------|------|
| Bookable | `is_public` + status in `active`/`scheduled` + at least one `course_sessions.start_time` in the future |
| City key | Normalized trim/lowercase of `courses.city`; empty/`null` = tenant-wide |
| Cities tracked | All non-`cancelled` courses in the category (incl. completed history) so waitlist can reappear after the last date ends |
| Placeholder content | Name: `{category.name} {city}` (or category name alone); description: `Datum folgt — Warteliste offen` |
| Defaults on create | From category: `default_max_participants`, `default_price_rappen`, room/vehicle flags & IDs |

### Sync actions

- `created` — insert new public waitlist course with `is_auto_waitlist=true`
- `activated` — promote draft / unmarked empty waitlist → public waitlist + mark auto
- `demoted` — auto waitlist → `draft` (when bookable dates exist **or** `waitlist_enabled=false`)
- `skipped` — already correct, or per-category error

## Triggers

| Surface | When |
|---------|------|
| Cron `GET /api/cron/sync-auto-waitlists` | Hourly (`vercel.json`: `20 * * * *`); `Authorization: Bearer $CRON_SECRET` |
| `POST /api/admin/course-categories/save` | After category save / waitlist toggle (scoped to that `categoryId`) |
| `POST /api/admin/courses/upsert` | After course upsert (tenant + optional category) |
| `POST /api/courses/update-status` | After manual status change |

## Pitfalls

1. **Do not manually set `is_auto_waitlist` on real dated courses** — sync will demote them to `draft` when bookable siblings exist (or treat them as placeholders).
2. **Turning waitlist off demotes all auto placeholders** for that category; it does not delete them.
3. **Empty category history** still gets one tenant-wide placeholder when waitlist is on (`city = null`).
4. **Cancelled locations are excluded** from city discovery — retired cities will not auto-reappear.
5. **Matching courses** uses `course_category_id = category.id` **or** legacy `category = category.code`.
6. Cron auth is Bearer `CRON_SECRET` only (no Vercel cron header fallback in this handler).

## Ops / debug

```sql
-- Auto placeholders currently live
SELECT id, name, city, status, is_public, is_auto_waitlist, category, course_category_id
FROM courses
WHERE is_auto_waitlist = true
ORDER BY updated_at DESC;

-- Categories with waitlist flag
SELECT id, code, name, waitlist_enabled, is_active
FROM course_categories
WHERE waitlist_enabled = true;
```

Manual cron smoke (staging):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://app.simy.ch/api/cron/sync-auto-waitlists"
```

Response includes `changes` and per-action rows (`activated` / `created` / `demoted` / `skipped`).

## Codepaths

| Path | Role |
|------|------|
| `server/utils/auto-category-waitlist.ts` | Sync engine (`syncAutoCategoryWaitlists`) |
| `server/api/cron/sync-auto-waitlists.get.ts` | Cron entry |
| `server/api/admin/course-categories/save.post.ts` | Toggle / save hook |
| `server/api/admin/courses/upsert.post.ts` | Course upsert hook |
| `server/api/courses/update-status.post.ts` | Status change hook |
| `sql_migrations/20260811_courses_is_auto_waitlist.sql` | Column + partial index |
| `vercel.json` | Cron schedule `20 * * * *` |
