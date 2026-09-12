# GBP photo drip & review-reply automation

## Intent

Automate Google Business Profile **photo publishing** (weekly cadence + queue priority) and **review reply suggestions** (human publish). Feature flag: `tenant_settings` `features` / `gbp_enabled`. Requires a row in `tenant_google_connections`.

Admin UI: `/admin/google-business-profile` (and related Simy GBP pages).

## Photo drip

### Settings (`gbp_automation_settings` per location)

| Field | Default | Meaning |
|-------|---------|---------|
| `photo_mode` | `off` | `off` skips cron; `approved_only` / `pool_auto` both publish **approved** pool assets (UI labels differ; cron only gates on `off`) |
| `photos_per_week` | `2` | Clamped **1–7** per location per calendar week |
| `timezone` | `Europe/Zurich` | Week boundary (Monday 00:00 local → UTC) |

Shared schedule logic: `server/utils/gbp-photo-schedule.ts`.

### Cadence rules

1. **Weekly quota**: count assets for that `location_id` with `last_published_at >= weekStart`; skip if `>= photos_per_week`.
2. **Min gap**: ≈ `7d / photos_per_week` since last publish for that location.
3. **Candidates**: `approved` and not yet published this week; **location-specific first**, then shared (`location_id IS NULL`) if that URL isn’t already on the location.
4. **Order**: `queue_priority DESC`, then least-recently published, then oldest `created_at`.
5. After publish: `queue_priority` reset to `0`; shared assets get a **location clone** row with publish metadata (cron) so per-location history stays accurate.

### Cron

- Path: `GET /api/cron/publish-gbp-photos`
- Schedule (`vercel.json`): `15 8 * * *` (**08:15 UTC** daily) — matches `GBP_PHOTO_CRON_*` constants used by the schedule predictor.
- Auth: `Authorization: Bearer $CRON_SECRET` (`assertCronAuth`).

### Preview / ops API

`GET /api/gbp/media/schedule?locationId=` (auth + `gbp_enabled`) runs `predictNextPhotoSlots` with the same rules and returns upcoming estimated publish times (`cronUtc: "08:15"`).

### Queue priority

- Column: `gbp_media_assets.queue_priority` (default 0; higher = sooner).
- `PATCH /api/gbp/media/:id` with `queue_priority` or `bumpToFront: true` (sets max+1 within location/shared group).
- Manual publish: `POST /api/gbp/media/:id/publish`.

## Review replies

### Modes (`review_reply_mode`)

| Mode | Behavior today |
|------|----------------|
| `off` | Cron skips location |
| `suggest` (default) | Poll creates AI draft; human publishes |
| `auto_ge_4` / `auto_all` | Stored on the action row, but **P1 cron never auto-publishes** — always inserts `status=suggested` |

### Poll cron

- Path: `GET /api/cron/poll-gbp-reviews`
- Schedule: `7,37 * * * *` (~every 30 min)
- Auth: Bearer `CRON_SECRET`
- Per location: fetch unreplied Google reviews; skip if `gbp_review_actions` already exists for `(tenant, location, google_review_id)`; cap **5 new suggestions** per location per run.
- AI: `generateGbpReviewSuggestion` / `generateGbpAiText` (`context: review_reply`) via Anthropic (`ANTHROPIC_API_KEY`); copy must be **Hochdeutsch** (no dialect).

### Publish surfaces

| API | Role |
|-----|------|
| `POST /api/gbp/reviews/:id/reply` | Publish comment to Google immediately; upsert `gbp_review_actions` as `published` + `published_at` |
| `POST /api/gbp/review-actions/:id/publish` | Publish from a suggested/failed action; refuses `published` / `skipped`; on Google error → `failed` + `error_message` |

`published_at` (migration `20260812_gbp_review_published_at.sql`) powers activity vs impact insights.

## Pitfalls

1. **`gbp_enabled` false or no Google connection** → crons no-op for that tenant.
2. **`photo_mode=off`** (default) → photos never drip even if assets are approved.
3. **Quota / gap skips** look like “cron broken”; check `GET …/media/schedule` status (`quota_full` / `gap` / `no_assets`).
4. **Shared vs location assets** — publishing a shared photo clones to the location; don’t expect the shared row alone to drive location week counts.
5. **Review auto modes are not live** — enabling `auto_*` in settings does not publish without a human (or a future code change).
6. **Missing `ANTHROPIC_API_KEY`** → suggestion generation 503s; poll logs location errors.
7. **Token refresh** — reconnect GBP if refresh token missing (`getValidAccessToken`).

## Smoke test

1. Enable `gbp_enabled`, connect Google, set `photo_mode=approved_only`, `photos_per_week=2`, approve ≥1 asset, optionally `bumpToFront`.
2. `GET /api/gbp/media/schedule?locationId=…` → `status`, `remainingThisWeek`, `upcoming`.
3. Manual: `POST /api/gbp/media/:id/publish` or wait for 08:15 UTC cron with Bearer secret.
4. Reviews: leave `review_reply_mode=suggest`, wait for poll, publish via UI / `review-actions/:id/publish`; confirm `published_at` set.

## Codepaths

| Path | Role |
|------|------|
| `server/utils/gbp-photo-schedule.ts` | Week/gap/ranking/prediction |
| `server/utils/gbp-automation.ts` | Cron auth, AI text, review suggestion helper |
| `server/utils/gbp.ts` | OAuth, upload photo, reply, settings defaults |
| `server/api/cron/publish-gbp-photos.get.ts` | Daily drip |
| `server/api/cron/poll-gbp-reviews.get.ts` | Suggestion poll |
| `server/api/gbp/media/schedule.get.ts` | Upcoming drip preview |
| `server/api/gbp/media/[id].patch.ts` | Approve / priority / bump |
| `server/api/gbp/media/[id]/publish.post.ts` | Manual publish |
| `server/api/gbp/reviews/[id]/reply.post.ts` | Direct reply + action upsert |
| `server/api/gbp/review-actions/[id]/publish.post.ts` | Publish suggested reply |
| `sql_migrations/20260812_gbp_photos_per_week.sql` | Cadence column |
| `sql_migrations/20260812_gbp_media_queue_priority.sql` | Priority column |
| `sql_migrations/20260812_gbp_review_published_at.sql` | `published_at` |
| `vercel.json` | Cron schedules |
