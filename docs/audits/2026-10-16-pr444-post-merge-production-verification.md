# SIMY PR #444 — Post-merge production verification

**Overall verdict:** PARTIAL — CODE VERIFIED, PRODUCTION OR EDGE CASES UNVERIFIED

**Observation timestamp:** 2026-10-16T05:13:44Z

**Mode:** Strict read-only audit. This Markdown file is the handoff artifact. The audit itself did not change product code, pull requests, deployments, production data, or configuration. `.cursor/rules/agent-handoff.mdc` is not in the repository.

A passing CI run was not used as proof that production is correct.

## 1. Merge state

PR #444 is **MERGED**.

| Ref | Value |
| --- | --- |
| Title | fix(website): Booking-Slots in der Zeitzone der Fahrschule anzeigen |
| `mergedAt` | 2026-10-16T04:56:04Z |
| Merge commit | `a75e065eed1ed7143b0e49718976b9b0209979bd` |
| Current `origin/main` | `a75e065eed1ed7143b0e49718976b9b0209979bd` |
| Pre-merge PR head | `48a3676f527dc21ea71b45f822158a6a1c4e314f` |
| Pre-merge main | `6ad955193e6b0122a08c08749ba98808a27f69c3` |

There are no commits on `main` after the merge. The squash is not a git ancestor of the pre-merge head, which is expected for a squash merge. The working tree at the pre-merge head matched `origin/main` for the timezone files (`git diff` empty).

The merge diff against pre-merge main is limited to the reviewed timezone and slot-label change:

```
 apps/website/server/api/next-slots.get.ts          |  44 ++-
 apps/website/server/utils/registration-sari-membership.ts |  39 +++
 apps/website/server/utils/slot-display-time.ts     | 149 ++++++++++
 pages/booking/availability/[slug].vue              |  98 ++++---
 pages/s/[subdomain]/[slug].vue                     |  16 +-
 pages/s/[subdomain]/index.vue                      |  16 +-
 server/api/admin/tenants-manage.ts                 |   8 +
 server/api/booking/get-booking-init.get.ts         |   2 +-
 server/api/public/website/[subdomain]/next-slots.get.ts |   3 +-
 server/api/tenants/register.post.ts                |   5 +
 server/utils/__tests__/website-public-security.test.ts |   4 +
 server/utils/__tests__/website-slot-timezone.test.ts | 305 +++++++++++++++++++++
 server/utils/website-enrich-landing.ts             |   6 +-
 server/utils/website-next-slots.ts                 |  70 ++---
 server/utils/website-premium.ts                    |   2 +
 server/utils/website-public-tenant-select.ts       |   1 +
 utils/slot-display-time.ts                         | 149 ++++++++++
 17 files changed, 766 insertions(+), 151 deletions(-)
```

The website SARI deletion guard is inside that diff. It is a copy so the website Vercel root can build. It does not change the clock conversion.

## 2. Production deployment

GitHub deployment records for merge SHA `a75e065eed1ed7143b0e49718976b9b0209979bd`:

| App | GitHub environment | Deployment id | Created (UTC) | Recorded state | Deployment host |
| --- | --- | --- | --- | --- | --- |
| simy-app | Production – simy-app | 7111350071 | 2026-10-16T05:01:49Z | success, “Deployment has completed” | `simy-cct3z9rnr-kilchi555s-projects.vercel.app` |
| driving-team-website | Production – driving-team-website | 7111289809 | 2026-10-16T04:57:09Z | success, “Deployment has completed” | `driving-team-website-kn2mk73oz-kilchi555s-projects.vercel.app` |

Both records were created after the merge at 2026-10-16T04:56:04Z. No later production deployment of `main` was present at observation time. A preview deployment of `37f8a36b6e83` at 2026-10-16T05:05:52Z is not `main` and is not production.

`simy-website` on the same SHA is “Canceled by Ignored Build Step” and is not a production app for this change. App Store “App | Default” failed on the merge commit. That context is not a ruleset check and was not treated as a deployment result.

**Alias binding: NOT VERIFIED.** The `*.vercel.app` deployment hosts redirect to Vercel SSO. Live custom-domain responses did not include a deployment id. Production status is therefore not inferred from CI, and the custom domain is not cryptographically bound to those deployment ids from this audit.

What was verified on the public domains is behavior, recorded in the matrix below.

## 3. Verification matrix

| Surface | Result | Evidence |
| --- | --- | --- |
| Website teaser, Europe/Zurich, current CEST | Verified | Live HTML payload on `https://drivingteam.ch/fahrschule-lachen/` |
| Booking-page slot chips | Not rendered | Production bundle and booking-init timezone were inspected. The chip DOM was not driven, because that flow is past the booking steps. |
| Tenant course cards (`when_label`) | Not verified | No published course fixture on the known public routes |
| Europe/Zurich display | Pass | Local fixtures and the live teaser |
| Europe/London | Pass locally | Resolver keeps the zone. 14:00Z in summer labels 15:00. |
| Asia/Tokyo | Pass locally | Resolver keeps the zone. 14:00Z labels 23:00. A 14:00 wall clock becomes 05:00Z and still labels 14:00. |
| Missing timezone | Pass locally | Display and empty write fall back to Europe/Zurich |
| Invalid timezone | Pass locally | Display falls back to Europe/Zurich. A write is rejected with “Zeitzone ist ungültig”. |
| Ordinary winter and summer | Pass | `wallTimeToUtc` and the formatter agree |
| Spring DST, real local times | Pass | 03:00 and 14:00 on 2026-03-29 keep the requested clock |
| Autumn DST, real local times | Pass | 14:00 on 2026-10-25 keeps the requested clock |
| Nonexistent spring local time | Policy observed | No match. UTC fallback. See section 5. |
| Ambiguous autumn local time | Policy observed | One later instant. No duplicate slot. See section 5. |
| Midnight, UTC date differs from local date | Pass for the label | 00:30 Zurich on 16 Jan is 23:30Z on 15 Jan. The label date is 16 Jan. |
| Public tenant JSON privacy | Pass in unit tests | Live public-website route for this slug returned 404, so the live 200 payload was not observed |
| Uncalled client Zurich-offset generator | Defective if called | No caller. Not the live booking or teaser path. |

## 4. Live production behavior

### Website teaser

`GET https://drivingteam.ch/fahrschule-lachen/` returned HTTP 200. The page title is the public Fahrstunden Lachen page. The Nuxt payload embedded in that HTML is the data `UpcomingSlotsSection` prints as `day_label` and `time_label`. The component does not format the clock again.

A `HEAD` of `/api/next-slots` returned 404. `GET https://drivingteam.ch/api/next-slots?page=fahrschule-lachen` returned HTTP 200 with the same clocks. October 2026 is still CEST (UTC+2) until 2026-10-25.

Identifiers, location ids, and book-link query values other than the date are omitted.

| Stored instant | Rendered time | Rendered day | `date=` on the book link |
| --- | --- | --- | --- |
| 2026-10-17T05:00:00Z | 07:00 | Sa., 17. Okt. | 2026-10-17 |
| 2026-10-17T05:15:00Z | 07:15 | Sa., 17. Okt. | 2026-10-17 |
| 2026-10-17T08:30:00Z | 10:30 | Sa., 17. Okt. | 2026-10-17 |
| 2026-10-20T06:30:00Z | 08:30 | Di., 20. Okt. | 2026-10-20 |
| 2026-10-20T10:30:00Z | 12:30 | Di., 20. Okt. | 2026-10-20 |
| 2026-10-20T10:45:00Z | 12:45 | Di., 20. Okt. | 2026-10-20 |

The previous bug would have shown 05:00 for the first slot. These labels match Europe/Zurich. The book-link date remains the UTC date prefix of `start_time`.

Response headers identified Vercel (`server: Vercel`, `x-vercel-cache`) and did not identify the deployment SHA.

### Booking page

`GET https://app.simy.ch/booking/availability/driving-team` returned HTTP 200 (236206 bytes, `x-vercel-id` region `fra1`). The initial HTML does not contain slot clocks. It loads `/_nuxt/BBxg-ntU.js`, which loads the route chunk `/_nuxt/DE4Hzi1I.js` for `booking-availability-slug`.

That production chunk contains:

- default `Europe/Zurich`
- a cache and an Intl probe that returns the given zone when it is valid, and the default when it is missing or invalid
- `de-CH` time labels with `hourCycle: "h23"`
- `time_formatted` taken from `start_time` through that resolver and `tenant.timezone`

`GET https://app.simy.ch/api/booking/get-booking-init?slug=driving-team` returned `success: true` and `tenant.timezone = Europe/Zurich`. Other tenant fields were not recorded.

The rendered slot chips were not inspected. HTTP 200 is not treated as verification of the chips.

### Course cards

In-app course cards on `/s/:subdomain` render `c.when_label` and do not format the instant a second time. The server sets `when_label` with `formatCourseWhenLabel(startsAt, tenant.timezone)`.

`GET https://app.simy.ch/s/driving-team` returned HTTP 200, title “Website”, course CSS, and no `when_label`. `GET https://app.simy.ch/api/public/website/driving-team` returned 404 “Website not found”.

`GET https://drivingteam.ch/api/courses/upcoming-pgs?location=Zürich&category=PGS` returned `courses: []`.

The public Nothelfer list is a different pipeline. It copies the external provider’s own clock strings (`formatTimeRangeFromClock`) and does not use `formatCourseWhenLabel`. It is not evidence for the tenant course-card fix.

No suitable published tenant course card was available. Course-card display is **not verified**.

## 5. Timezone data flow

### Storage and validation

`tenants.timezone` is the tenant IANA zone. There is no database check constraint in this change.

`parseTenantTimeZoneWrite`:

- empty or whitespace → `{ ok: true, timezone: "Europe/Zurich" }`
- valid IANA name, including `Europe/London` and `Asia/Tokyo` → stored as given
- invalid → `{ ok: false, error: "Zeitzone ist ungültig" }`

Registration calls this before insert. Admin create calls it when the key is present. Admin PATCH does not accept `timezone`. Staff working hours and GBP settings are different timezone stores and were not changed.

`resolveSlotTimeZone` is display-only. Missing, blank, and invalid values become `Europe/Zurich`. A valid configured zone is returned unchanged. Invalid zones fail safe for display. They do not fail the request.

### Canonical instant

`availability_slots.start_time` is a canonical UTC instant.

Server generation in `availability-calculator` converts a staff working-hour wall clock once:

`wallTimeToUtc(year, month, day, hour, minute, staffTimezone)`

The staff-hour default is `Europe/Zurich`. The result is stored with `toISOString()`. Persistence was not changed by this audit and was not exercised with a booking.

### Display

Display converts that UTC instant once:

- teaser: `formatSlotTimeLabel` / `formatSlotDayLabel` with `resolveSlotTimeZone(tenant.timezone)`
- booking chips and selected-slot text: the same helpers via `bookingTimeZone`
- course cards: `formatCourseWhenLabel` once on the server

The website formatter at `apps/website/server/utils/slot-display-time.ts` is a byte-identical copy of `utils/slot-display-time.ts` (`cmp` identical). The website import is `../utils/slot-display-time`. Identical copies do not by themselves prove both apps; the live teaser was checked on `drivingteam.ch`, and the booking bundle was checked on `app.simy.ch`.

Public website JSON does not include `timezone`. It stays on `PUBLIC_WEBSITE_TENANT_SERVER_FIELDS`. `projectPublicWebsiteTenant` copies only the response allowlist. Booking init is a different payload and includes `timezone` so the booking page can format.

`?date=` remains `start_time` sliced to 10 characters, the UTC date prefix. The booking page still matches `preferredDateHint` against that prefix.

### Meaning of the conversion

The business meaning is an absolute UTC instant, rendered in the tenant timezone.

The wall clock used to create the instant is the staff working-hour zone, not automatically the tenant zone. When both are Europe/Zurich, the rendered clock equals the wall clock that was stored. A valid non-Zurich tenant zone is used for display and is not forced back to Zurich. If staff hours and the tenant zone ever differ, the label is the tenant-local time of an instant that was built in the staff zone.

### Uncalled client generator

`pages/booking/availability/[slug].vue` still contains `getZurichOffsetMs`, hardcoded to `Europe/Zurich`. `generateFreeDaySlots` subtracts that single midnight offset from a UTC-constructed wall clock. `loadTimeSlotsForAllStaff` is the only caller of that chain, and it has no caller. The live booking page uses `generateTimeSlotsForSpecificCombination`, which reads precomputed API slots and formats `start_time` once.

If that uncalled helper were used, it would be defective on DST days, because one offset from UTC midnight is applied to the whole civil day:

| Requested Zurich wall clock | Stored instant | Label after tenant formatting |
| --- | --- | --- |
| 2026-01-15 14:00 | 2026-01-15T13:00:00Z | 14:00 |
| 2026-07-15 14:00 | 2026-07-15T12:00:00Z | 14:00 |
| 2026-03-29 02:30 (does not exist) | 2026-03-29T01:30:00Z | 03:30 |
| 2026-03-29 03:00 | 2026-03-29T02:00:00Z | 04:00 |
| 2026-03-29 14:00 | 2026-03-29T13:00:00Z | 15:00 |
| 2026-10-25 02:30 (ambiguous) | 2026-10-25T00:30:00Z | 02:30, earlier instant only |
| 2026-10-25 14:00 | 2026-10-25T12:00:00Z | 13:00 |
| 2026-01-16 00:30 | 2026-01-15T23:30:00Z | 00:30 |

This is not the path that produced the live teaser or the booking API slots. It is a residual defect in unreachable code, not a demonstrated production regression.

### Day grouping

`groupedTimeSlots` still groups by `start_time` converted with `toISOString().slice(0, 10)`, which is the UTC date. The visible header uses the tenant date of the first slot in that group. A slot just after local midnight can sit in the previous UTC day’s group. The live teaser slots are morning hours, so their UTC date and Zurich date match. This was not observed as a live mis-label.

## 6. DST and other zones

Executed locally with `node --experimental-strip-types` against the formatter and `wallTimeToUtc` on the tree that matches `a75e065e` for these files. Exit 0 at 2026-10-16T05:10:41Z. No production tenant was modified.

### Display of the same UTC instant

| Instant | Zurich | London | Tokyo | Missing or invalid |
| --- | --- | --- | --- | --- |
| 2026-01-15T14:00:00Z | 15:00 | 14:00 | 23:00 | 15:00 (Zurich fallback) |
| 2026-07-15T14:00:00Z | 16:00 | 15:00 | 23:00 | 16:00 |
| 2026-03-28T14:00:00Z | 15:00 | 14:00 | 23:00 | 15:00 |
| 2026-03-29T14:00:00Z | 16:00 | 15:00 | 23:00 | 16:00 |
| 2026-10-24T14:00:00Z | 16:00 | 15:00 | 23:00 | 16:00 |
| 2026-10-25T14:00:00Z | 15:00 | 14:00 | 23:00 | 15:00 |
| 2026-01-14T23:30:00Z | 00:30 on 15 Jan | 23:30 on 14 Jan | 08:30 on 15 Jan | 00:30 on 15 Jan |

`2026-10-25T00:30:00Z` and `2026-10-25T01:30:00Z` both display as 02:30 in Zurich. They are different instants. Tokyo displays them as 09:30 and 10:30.

Course labels from `formatCourseWhenLabel` use the same zone and the same clock.

### `wallTimeToUtc` (the live generator)

The function starts from a UTC guess and adjusts until the IANA zone shows the requested civil time. Existing local times:

| Wall clock | Zone | UTC instant | Label in that zone |
| --- | --- | --- | --- |
| 2026-01-15 14:00 | Europe/Zurich | 2026-01-15T13:00:00Z | 14:00 |
| 2026-07-15 14:00 | Europe/Zurich | 2026-07-15T12:00:00Z | 14:00 |
| 2026-03-29 03:00 | Europe/Zurich | 2026-03-29T01:00:00Z | 03:00 |
| 2026-03-29 14:00 | Europe/Zurich | 2026-03-29T12:00:00Z | 14:00 |
| 2026-10-25 14:00 | Europe/Zurich | 2026-10-25T13:00:00Z | 14:00 |
| 2026-01-16 00:30 | Europe/Zurich | 2026-01-15T23:30:00Z | 00:30 on 16 Jan |
| 2026-01-15 14:00 | Europe/London | 2026-01-15T14:00:00Z | 14:00 |
| 2026-07-15 14:00 | Europe/London | 2026-07-15T13:00:00Z | 14:00 |
| 2026-07-15 14:00 | Asia/Tokyo | 2026-07-15T05:00:00Z | 14:00 |

Spring nonexistent time: Zurich 2026-03-29 02:30 never matches. The fallback returns `2026-03-29T02:30:00Z`, which displays as 04:30. The slot is not skipped and not duplicated. It is shifted.

Autumn ambiguous time: Zurich 2026-10-25 02:30 converges to the later instant `2026-10-25T01:30:00Z` and displays 02:30. The earlier instant `2026-10-25T00:30:00Z` is not also emitted. There is no duplicate slot. The two real instants would look identical if both were shown.

The policy is implicit: iterate until the civil time matches, otherwise return the UTC guess. It is consistent in code. It is not an explicit “skip the gap” or “emit both ambiguous hours” rule. Ordinary afternoon hours on both transition days stay on the requested clock.

London 2026-03-29 01:30 does not exist (UK spring jump is 01:00 to 02:00). The same fallback returns `2026-03-29T01:30:00Z`, which labels 02:30 in London.

## 7. Checks executed

Local tests ran on the tree at `48a3676f`, which had an empty diff against `a75e065e` for the timezone files. Production HTTP was against the live domains after the deployment timestamps above.

| Check | Command / request | Result |
| --- | --- | --- |
| PR and main | `gh pr view 444`, `git log origin/main` | **PASS.** Merged. Tip is `a75e065e`. No later main commits. |
| Deployment records | GitHub deployment and status APIs | **PASS** as records. Alias binding **NOT VERIFIED**. |
| Live teaser | `GET` Lachen page and `GET` next-slots | **PASS.** Labels in section 4. |
| Booking bundle | `GET` booking page, `/_nuxt/BBxg-ntU.js`, `/_nuxt/DE4Hzi1I.js` | **PASS** for resolver wiring. Chip DOM **NOT RUN**. |
| Booking init | `GET /api/booking/get-booking-init?slug=driving-team` | **PASS.** Timezone `Europe/Zurich`. |
| Public course surfaces | `GET` `/s/driving-team`, public website API, upcoming PGS | **NOT VERIFIED.** No `when_label` fixture. |
| Formatter and generator fixture | `node --experimental-strip-types` inline import of `utils/slot-display-time.ts` and `server/utils/zurich-wall-time.ts` | **PASS.** Exit 0. 2026-10-16T05:10:41Z. |
| Unit tests | `npx vitest run server/utils/__tests__/website-slot-timezone.test.ts server/utils/__tests__/website-public-security.test.ts server/utils/__tests__/effective-working-hours.test.ts` | **PASS.** Vitest 3.2.7. 3 files, 45 tests, exit 0. Started 2026-10-16T05:12:57Z. |
| Formatter copies | `cmp -s utils/slot-display-time.ts apps/website/server/utils/slot-display-time.ts` | **PASS.** Identical. |
| Website production build, app lint, booking-page browser pass | — | **NOT RUN.** |

## 8. Limitations and follow-up

Remaining limits:

1. Custom domains were not bound to the Vercel deployment ids. The deployment hosts are behind SSO.
2. Booking-page chips were not rendered in a browser.
3. No published tenant course card with `when_label` was available on the known public routes.
4. Non-Zurich behavior was executed locally. No live tenant in another zone was read or modified.
5. The uncalled client generator still shifts spring and autumn afternoons if a future caller starts using it.
6. Day groups still key on the UTC date.
7. Nonexistent local times fall through to a UTC guess. Ambiguous local times keep one instant. That policy is implicit.

Smallest follow-up, still read-only until a defect is chosen for a fix:

1. Bind `app.simy.ch` and `drivingteam.ch` to the deployment of `a75e065e`.
2. Render one booking chip and compare it with that slot’s UTC instant.
3. Render one published `when_label`.

A later code change can delete the uncalled Zurich-offset generators, or route them through `wallTimeToUtc`, so a future caller cannot shift transition-day slots. That removal is not required to explain the live teaser labels. This audit does not implement it.

## 9. Confirmation

No product source, pull request, deployment, production row, migration, booking, or configuration was changed by the audit.

Live requests were GET. No booking was created. No tenant timezone was written. Slot identifiers, location identifiers, customer data, and secrets are not included above.

This file was added after the audit, at the request to put the full handoff in Markdown. It is documentation of the read-only result.
