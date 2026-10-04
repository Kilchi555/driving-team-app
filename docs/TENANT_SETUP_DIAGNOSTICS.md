# Super-Admin Tenant Setup Diagnostics

**When to use:** A tenant reports empty booking calendars, missing staff, broken external calendars, or onboarding that never produced slots. Use the Setup tab on `/tenant-admin/tenants` instead of ad-hoc SQL first.

---

## Intent

Give super-admins a single diagnostics + actions surface for tenant go-live health:

- Staff ↔ locations ↔ working hours ↔ slot counts
- External calendar sync health
- Why the public booking page may show no availability
- Support actions (invite resend, trial extend, recalc, calendar sync)

---

## UI

| Surface | Path |
|---------|------|
| Tenant admin list / detail | `pages/tenant-admin/tenants.vue` → **Setup** tab |
| Login branding note | Tenant login header logo sizing also adjusted in `pages/[slug].vue` (same release) |

Requires `role = super_admin`.

---

## Read API

```http
GET /api/admin/tenants/:id
```

Implemented in `server/api/admin/tenants/[id].get.ts`.

Returns tenant core fields plus setup payloads (names may vary slightly in the JSON; key groups):

| Group | What it covers |
|-------|----------------|
| Staff setup rows | Active flag, linked locations, bookable locations, working-hours count, slots next 14d, calendar summary |
| Calendars | Provider, sync enabled, consecutive failures, last error, future busy-times |
| Locations | Active, public_bookable, pickup settings, categories, time windows, coords |
| Slot aggregates | Counts for next 7 / 14 / 30 days, recalc queue pending |
| `whyEmpty` hints | Human-readable blockers when slots are missing |

### `whyEmpty` heuristics (verified)

Hints are appended when:

1. No active staff
2. Active staff but none linked to locations
3. No working hours
4. No locations at all
5. Calendars with `consecutive_failures ≥ 3`
6. Pending rows in `availability_recalc_queue`
7. Still no slots in 14d → generic lead-time / time-window / conflict hint

Calendar “OK” means sync enabled and `consecutive_failures < 3`.

---

## Support actions

```http
POST /api/admin/tenants/:id/actions
Content-Type: application/json

{ "action": "<name>", ... }
```

`server/api/admin/tenants/[id]/actions.post.ts` — super-admin only; writes audit logs where applicable.

| `action` | Body | Effect |
|----------|------|--------|
| `resend_staff_invite` | `invitationId` | Renews token (30d), emails invite when a real email exists |
| `copy_invite_link` | `invitationId` | Renews token; returns link without emailing |
| `extend_trial` | `days?` (1–90, default 7) | Extends `trial_ends_at`, sets `is_trial` + `is_active` |
| `set_active` | `is_active: boolean` | Activates / deactivates tenant |
| `toggle_staff_active` | `staff_id`, `is_active` | Activates / deactivates a staff user |
| `recalc_availability` | `staff_id?` | Upserts `availability_recalc_queue`; best-effort triggers `/api/cron/process-recalc-queue` |
| `sync_calendars` | `staff_id?`, `calendar_id?` | Runs external calendar sync for scope |

Invite links look like: `{BASE}/register/staff?token=...`  
`BASE` from `NUXT_PUBLIC_BASE_URL` / `BASE_URL`, else request host, else `https://app.simy.ch`.

---

## Location / pickup edits

```http
PATCH /api/admin/tenants/:id/locations
```

`server/api/admin/tenants/[id]/locations.patch.ts`

- Update a location: pass `location_id` + any of the allow-listed fields (`name`, `is_active`, `pickup_*`, `available_categories`, `time_windows`, `staff_ids`, address/geo, `public_bookable`, `location_type`, …)
- Update tenant pickup defaults: `tenant_pickup: { allow_pickup_mode?, default_pickup_radius_minutes? }` (stored in tenant settings keys)

---

## Typical troubleshooting flow

1. Open Setup tab for the tenant → read `whyEmpty` and staff rows.
2. If no locations / hours → fix in tenant admin or via locations PATCH.
3. If calendar `failing` → check ICS/OAuth; use `sync_calendars`.
4. If queue pending or slots stale → `recalc_availability` (optionally per `staff_id`).
5. If invite stuck → `copy_invite_link` / `resend_staff_invite`.
6. Re-fetch `GET /api/admin/tenants/:id` and confirm slots_next_14d / staff flags.

---

## Common pitfalls

1. **Recalc returns queued but slots stay empty** — cron may have failed silently; check `availability_recalc_queue` and `CRON_SECRET` auth on `/api/cron/process-recalc-queue`.
2. **Calendar “connected” but failing** — `consecutive_failures ≥ 3` still blocks a healthy “ok” flag; fix fetch errors before relying on busy times.
3. **Staff has locations but `bookable_locations_count = 0`** — location linked but not online-bookable / inactive.
4. **Invite resend without email** — placeholder emails return `sentVia: email_failed` with a renewed link for manual send.
5. **Non–super-admin calls** — all these endpoints return `403`.

---

## Related

- Availability architecture: `AVAILABILITY_SLOTS_ARCHITECTURE.md`
- Session / login branding: tenant login page `pages/[slug].vue`
