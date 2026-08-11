# External Calendar Busy-Time Sync

**When to use:** Staff busy blocks missing/outdated, past ICS hours not shown, empty-calendar warnings, broken ICS URL emails, or availability looks blocked for weeks after a bad Apple Calendar drag.

---

## Intent

Import ICS feeds into `external_busy_times` so booking/availability treat external events as busy. Sync runs on cron (all calendars) and on demand when staff connect/refresh a calendar.

Busy rows feed availability recalculation via `availability_recalc_queue` (`trigger: 'external_event'`).

---

## Sync window (verified)

| Constant | Value | Used by |
|----------|-------|---------|
| `SYNC_LOOKBACK_DAYS` | **90** (last 3 months) | Cron job, `POST /api/external-calendars/sync-ics`, `GET /api/staff/get-external-busy-times` |
| `SYNC_HORIZON_DAYS` | **180** | **Cron job only** (`syncOneExternalCalendar`) |
| Manual / UI read horizon | **+1 year** | `sync-ics` and `get-external-busy-times` |
| `MAX_BUSY_EVENT_MS` | **14 days** | Events longer than this are dropped (mis-dragged end dates) |
| `SYNC_TIME_BUDGET_MS` | **50s** | Cron stops early; remainder deferred to next tick |
| `UPSERT_BATCH_SIZE` | **100** | Insert batches |

**Pitfall:** After a cron sync, busy times outside the cron window (lookback 90d … +180d) are gone — the job **deletes all** rows for that `external_calendar_id` then reinserts only the window. Manual `sync-ics` uses a longer forward horizon (+1y) but the next cron pass truncates back to 180d.

---

## Surfaces

| Surface | Path | Auth |
|---------|------|------|
| Cron | `GET`/`POST /api/cron/sync-external-calendars` | `x-vercel-cron: 1`, `Bearer CRON_SECRET`, or `x-api-key: CRON_API_KEY` |
| Manual ICS sync | `POST /api/external-calendars/sync-ics` | Authenticated staff; must own `calendar.staff_id` |
| Busy-times UI feed | `GET /api/staff/get-external-busy-times` | Authenticated staff (own rows); window = lookback…+1y |
| Connect / list UI | `components/ExternalCalendarSettings.vue` (+ staff register calendar step) | — |
| Shared job | `server/utils/sync-external-calendars-job.ts` | — |
| SA re-sync action | `POST /api/admin/tenants/[id]/actions` → uses `syncOneExternalCalendar` | super-admin |

Vercel schedule (`vercel.json`): `4,19,34,49 * * * *` (~every 15 minutes, offset :04).

---

## Failure / empty-feed behavior

| Condition | Behavior |
|-----------|----------|
| Fetch/probe fails | `consecutive_failures++`, `last_fetch_error`, `last_failure_at` |
| ≥ `FAILURE_NOTIFY_THRESHOLD` (3) | Email up to 3 tenant `admin` users (max once / 24h via `failure_notified_at`) |
| ≥ `FAILURE_BACKOFF_THRESHOLD` (5) | Skip until `last_failure_at` is older than **6h** (`failure_backoff`) |
| Reachable feed with **0** events | Soft warning: `EMPTY_CALENDAR:…` in `last_fetch_error`; **does not** bump failures; `last_sync_at` updated |
| Successful sync | Clears failure fields; queues availability recalc for that staff |

Probe may rewrite `ics_url` when the resolved URL differs (redirect / normalized link).

---

## Privacy (titles)

Tenant setting `tenant_settings` `category=calendar`, `setting_key=anonymize_external_event_titles`:

- Missing / false → store real ICS `SUMMARY` (sanitized, max 255; empty → `"Privat"`)
- true → store `"Privat"`

Logic: `server/utils/external-calendar-privacy.ts`.

---

## Common pitfalls

1. **Shared empty calendar** — staff often share a secondary empty calendar; UI shows `EMPTY_CALENDAR` tip; fix by re-sharing the calendar that actually has events.
2. **Horizon mismatch** — UI/manual can show ~1y ahead; cron only keeps 180d ahead.
3. **Implausibly long events** (>14d) are silently skipped; look for warn logs if a staffer appears free when ICS shows a multi-week block.
4. **Partial cron runs** — calendars ordered by stalest `last_sync_at` first; large fleets need multiple ticks.
5. Past busy times are intentional (lookback 90d) for history / completed external hours in the staff calendar UI.

---

## Codepaths

- `server/utils/sync-external-calendars-job.ts`
- `server/utils/parse-ics-busy-events.ts`
- `server/utils/probe-ics-url.ts`
- `server/utils/external-calendar-privacy.ts`
- `server/api/cron/sync-external-calendars.get.ts` / `.post.ts`
- `server/api/external-calendars/sync-ics.post.ts`
- `server/api/staff/get-external-busy-times.get.ts`
- `composables/useExternalCalendarSync.ts`
- `components/ExternalCalendarSettings.vue`
- `vercel.json` (`sync-external-calendars` cron)
