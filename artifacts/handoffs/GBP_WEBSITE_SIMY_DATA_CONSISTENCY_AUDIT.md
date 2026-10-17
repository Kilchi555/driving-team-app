# SIMY — GBP, website, and tenant data consistency audit

Observed: 2026-10-17. Repository `Kilchi555/driving-team-app`. Branch audited: `main` at `ecf9694f` (`fix(website): keep public legal pages available when HTML sanitizing fails (#457)`), matching `origin/main` at the start of this audit.

`.cursor/rules/agent-handoff.mdc` is not on `main`. Draft PR #432 proposes that protocol and is not merged. This file follows the handoff shape already used under `artifacts/handoffs/`.

No application code was changed. No Google Business Profile write was made. No sync job was triggered. No production or staging row was updated. Production SQL below is `SELECT` only, on the project named Driving Team App (`unyjaetebnaexaflpyoc`). Counts only. No names, emails, tokens, or addresses are copied here.

## 1. Executive verdict

**FAIL**

SIMY does not keep one business profile consistent across the tenant record, the public website, and Google. The existing GBP product is a one-way marketing automation: OAuth, location linking, posts, photos, review replies, insights, and a manual editor that reads and writes a subset of fields straight to Google. Those writes do not update `tenants`, and `tenants` does not publish to Google.

There is no bidirectional sync. There is no field-level conflict state. A save in the GBP screen overwrites the Google fields included in that request. Google-side edits are not imported into SIMY.

Live equality of any tenant's name, address, phone, hours, or website against Google was **not** verified. Local Google credentials were unset (`GOOGLE_PLACES_API_KEY`, `GOOGLE_GBP_CLIENT_ID`).

## 2. What is automated today

Confirmed in code and in `vercel.json` cron entries:

| Job | Route | Schedule | What it does |
|---|---|---|---|
| Posts | `server/api/cron/publish-gbp-posts.get.ts` | every 15 minutes | Publishes due calendar posts and scheduled posts |
| Reviews | `server/api/cron/poll-gbp-reviews.get.ts` | minute 7 and 37, 05:00–17:00 UTC, and only 07:00–19:00 Europe/Zurich | Suggests or auto-publishes review replies |
| Photos | `server/api/cron/publish-gbp-photos.get.ts` | 08:15 UTC daily | Publishes approved pool photos |

Cron auth is `assertCronRequest` in `server/utils/cron-auth.ts`: Bearer `CRON_SECRET`, fail closed. `x-vercel-cron` is not accepted.

OAuth scope requested by `server/api/gbp/auth/start.get.ts` and `server/api/gbp/admin/start.get.ts`:

`https://www.googleapis.com/auth/business.manage` plus `openid` and `email`.

That scope is broad account management. The code does not use it to sync the full location.

APIs used:

- Business Information `mybusinessbusinessinformation.googleapis.com/v1` for profile, categories, services, location list.
- Reviews and media `mybusiness.googleapis.com/v4`.
- Performance `businessprofileperformance.googleapis.com/v1`.

There is no cron and no webhook that copies business information in either direction.

### Sync direction, as implemented

| Flow | Direction | Status |
|---|---|---|
| Tenant record → Google | none | MISSING |
| Google → tenant record | none | MISSING |
| GBP admin screen → Google | one-way PATCH of the fields in that request | IMPLEMENTED for a subset |
| Google → GBP admin screen | live read when the tab loads; nothing stored as canonical | PARTIAL |
| Tenant record → public SIMY website | render from `tenants` plus saved page blocks | PARTIAL |
| Google → public SIMY website | none | MISSING |
| Driving Team static site `apps/website` | hardcoded `business.config.ts` | separate from tenant GBP |

Calling this bidirectional would be wrong.

### Production posture (counts, 2026-10-17, read-only)

| Fact | Count |
|---|---|
| Tenants | 28 |
| Google connections | 1 |
| Active `gbp_locations` | 5, all on that one tenant |
| Published SIMY websites | 4 |
| Custom-domain rows | 1 |
| Custom domains with `custom_domain_verified = true` | 0 |
| Published sites whose `working_days_template` is null | 1 |

These counts do not prove the five Google locations match the website.

### Open PRs checked before this conclusion

No open PR implements NAP sync or a canonical business profile.

- #37 is an open docs PR about next-slots, GBP photos/reviews, and E2E. It is not runtime behavior.
- #432 is the unmerged handoff-protocol draft.
- #458 is a draft that would fail closed on unverified custom-domain routing. `main` still rewrites an attached custom domain in `server/middleware/02.custom-domain.ts` even when `custom_domain_verified` is false.

## 3. Architecture and sources of truth

There is no business-profile table. The same facts live in independent places.

| Store | What it holds | Who writes it |
|---|---|---|
| `tenants` | `name`, `legal_company_name`, `address`, invoice street/zip/city, `contact_phone`, `contact_email`, `whatsapp_phone`, `website_url`, `logo_url`, `timezone`, `working_days_template`, UID, legal form, Handelsregister | Registration and `POST /api/tenants/branding` for contact, address, logo, website URL, description. `working_days_template` is written in `server/api/tenants/register.post.ts` only. No later editor was found. |
| `locations` | Booking and meeting points: name, address, city, postal code, lat/lng, place id, time windows | Staff location UI. Not linked to `gbp_locations`. |
| `staff_working_hours` | Per-staff availability | Staff settings. Not public opening hours. |
| `website_tenants` / `website_pages.blocks` | Published site, SEO, custom domain, baked contact blocks | Website editor. Enrichment prefers a phone, email, or address already stored on the block over the tenant row. |
| `gbp_locations` | `title`, Google account name, Google location resource id, `is_active` | Location picker. No NAP columns. |
| `tenant_google_connections` | OAuth tokens and a legacy location id | OAuth callback. |
| `gbp_automation_settings` | Reply mode, post/photo cadence, keywords, CTA URL, timezone | GBP settings screen. CTA URL is not filled from `tenants.website_url`. |
| Google | The live profile | GBP screen PATCH, Google itself, and the post/photo/review jobs |
| `apps/website/business.config.ts` | Driving Team static NAP, hours, categories | Hand-edited. Comment in that file says GBP must be updated manually afterwards. |

`tenants.address` is one free-text field. Invoice street, number, zip, and city are separate. The public site uses `address` plus `invoice_zip` / `invoice_city` (`server/utils/website-public-tenant-select.ts`). GBP address is not read.

Public opening hours on a SIMY site come from `resolveWorkingTemplate` (`server/utils/website-premium.ts`), which uses `tenants.working_days_template` or, if that value is missing or invalid, a hardcoded industry template in `utils/workingDaysTemplate.ts` (for a driving school, Mon–Fri 07:00–19:00 and Sat 08:00–16:00). The live enrich path always applies that result. One published site currently has a null template, so its public hours can be that fallback.

## 4. Field matrix

Statuses: `IMPLEMENTED`, `PARTIAL`, `MISSING`, `NOT APPLICABLE`, `UNVERIFIED`.

“GBP read/write” means the SIMY Business Information integration, not the Driving Team Places script.

| Field | SIMY source | Website | GBP read | GBP write | Direction | Conflict behavior | Last-updated evidence | Tests |
|---|---|---|---|---|---|---|---|---|
| Official business name | `tenants.name` and `tenants.legal_company_name`. GBP title is only on `gbp_locations.title` at link time. | Visible brand from tenant name. JSON-LD `name` / `legalName` in `website-landing-builder.ts` and enrich. | `title` is in `PROFILE_READ_MASK` and returned by `getGbpLocationProfile`. UI profile form does not edit it. | MISSING. `updateGbpLocationProfile` has no title. | none | Independent. Link-time title can go stale. | `gbp_locations.updated_at` changes on link or deactivate, not on a Google rename. | MISSING |
| Address and visibility | `tenants.address` plus invoice street/zip/city. `locations` is a second address list. | Contact block prefers baked `c.address`, else tenant address (`website-enrich-landing.ts` around 388–405). Schema uses tenant address. No address-hidden flag. | MISSING. Mask has no `storefrontAddress`. | MISSING | none | Independent. | No shared timestamp. | MISSING |
| Primary phone | `tenants.contact_phone`. Branding allowlist includes it. | `tel:` from block phone or tenant phone. Impressum uses tenant phone (`buildImpressumHtml`). | `phoneNumbers.primaryPhone` | PATCH `phoneNumbers` with `primaryPhone` only. Empty string is sent as `''`. | one-way, manual, GBP screen → Google | Last SIMY save wins on Google. Tenant phone is untouched. | No SIMY copy of the Google value. | MISSING |
| Additional phones | MISSING on tenants (WhatsApp is separate) | WhatsApp link only | MISSING (`additionalPhones` not read) | MISSING | none | n/a | n/a | WhatsApp tests only |
| Website URL and canonical | `tenants.website_url` | Canonical is the verified custom domain, else `https://{host}/s/{subdomain}` (`website-seo-context.ts` 76–79). | `websiteUri` | PATCH `websiteUri` | one-way, manual | Not copied from `tenants.website_url` or the booking URL. | none | MISSING |
| Regular hours | `tenants.working_days_template`: one start/end per weekday. No editor after registration. | Visible hours and `OpeningHoursSpecification` from that template or the industry fallback. | `regularHours` as one or more periods. UI keeps one period per weekday; a later period overwrites an earlier one (`google-business-profile.vue` 2031–2082). | PATCH `regularHours`. `closeDay` is always the same day. | one-way, manual, and disconnected from the website | Saving hours replaces Google’s regular hours with the collapsed week. Special hours are outside this mask. | none | MISSING for GBP. Website hours fallback is untested. |
| Split shifts | MISSING. Template has one interval per day. | One `opens`/`closes` per day (`openingHoursToSchema`). | Read can return several periods. UI drops all but the last per day. | Write cannot send two intervals for one day. | destructive if the hours form is saved | Silent collapse | none | MISSING |
| Special / holiday hours | MISSING | MISSING | MISSING (`specialHours` not in the mask) | MISSING | none | A regular-hours PATCH does not include `specialHours`. Live preservation was not verified. | none | MISSING |
| Primary and secondary categories | MISSING on tenants. Website schema type is inferred from `business_type` (`schemaBusinessType`), which is not a GBP category. | Not GBP categories | Read `categories` | PATCH replaces primary and the whole additional list. Omitted additional ids become `[]`. | one-way, manual | Last save replaces Google categories. | none | MISSING |
| Services | Course/category catalog and website service blocks. Prices are SIMY prices. | Offer catalog from those services | Free-form `serviceItems` only | PUT replaces the entire `serviceItems` array with the free-form list. Structured Google services are not read back. | one-way, manual, destructive | Saving services can drop structured services Google still had. | none | MISSING |
| Description | `tenants.description` via branding. GBP description is not stored. | SEO description and hero copy, including generated local SEO text | `profile.description` | PATCH `profile` | one-way, manual | Independent from the website description | none | MISSING |
| Service areas | `locations` and meeting points. No GBP service-area model. | `areaServed` is city plus Switzerland, or extra `Place` nodes for meeting points. | MISSING (`serviceArea` not read) | MISSING | none | Independent | none | MISSING |
| Multiple physical locations | `locations` rows, tenant-scoped | One `LocalBusiness` per site, plus meeting-point places. Not one profile per branch. | Several `gbp_locations` per tenant are supported. | Each linked location can be patched on its own. | none between `locations` and `gbp_locations` | No foreign key between them | `gbp_locations.updated_at` | MISSING |
| Email | `tenants.contact_email` | Visible and in JSON-LD. Block email wins over tenant email. | NOT APPLICABLE on the Location resource this code uses | MISSING | none | Independent | none | Legal-page tests cover impressum isolation, not GBP |
| Logo and images | `tenants.logo_url` and `website_tenants.logo_url` | Rendered from those URLs | Media upload can use category `LOGO` or `COVER` | Photo publish is a media post, not a profile-logo sync | one-way media only | Tenant logo is not pushed as the GBP logo | `gbp_media_assets.last_published_at` | MISSING for mapping |
| Appointment / booking URL | Booking routes and `default_cta_url` on automation settings, default null | `ReserveAction` uses the SIMY booking URL | MISSING as a location appointment attribute | Posts may send `callToAction.url` from `default_cta_url` | posts only, if a person typed the URL | Not taken from the canonical booking URL | settings `updated_at` | MISSING |
| Business status (closed) | MISSING | MISSING | MISSING (`openInfo` not read) | MISSING | none | n/a | n/a | MISSING |
| Legal details | `legal_company_name`, `legal_form`, `uid_number`, `handelsregister_nr`, MWST flag | Impressum from the live tenant row (`legal.get.ts`, `buildImpressumHtml`). Stored privacy HTML can replace the generated privacy page. | NOT APPLICABLE | NOT APPLICABLE | website only | Impressum tracks the tenant row. GBP does not. | none shared | `website-legal-pages.http.test.ts` |

### Driving Team static site (not the multi-tenant renderer)

`apps/website/business.config.ts` is a second source, with a comment that Google must be updated by hand. It disagrees with other files in the same app:

- Zürich config hours are Mon–Fri 07:00–19:00 and Sat 07:00–16:00. `docs/google-business-profile-standorte.md` (March 2026) says Mon–Fri 07:00–20:00 and Sat 08:00–17:00, and a shorter business name.
- `officeHoursDisplay` says 09:00–12:00 and 13:00–17:00. `officeHours.weekdays` is one span, 09:00–17:00. Schema `hoursAvailable` uses that single span (`buildHomepageSchema`).
- `ALL_LOCATIONS` omits Uster. The consistency script checks Uster; `apps/website/server/api/check-gbp.get.ts` uses `ALL_LOCATIONS` and skips Pfäffikon because `placeId` is empty.
- Several location pages embed their own JSON-LD, including `openingHours: "Mo-Fr 08:00-19:00"` on St. Gallen, Aargau, and Dietikon pages. That string is not `business.config.ts`.

`check-gbp.get.ts` calls the Places API (public read of a place, not the Business Information API) and is unauthenticated. It was not called. It cannot prove the managed profile matches SIMY.

## 5. GBP lifecycle

| Step | Result | Evidence |
|---|---|---|
| 1. Connect | Code: OAuth starts for a logged-in user with `gbp_enabled`. Callback is not checked against the session. | `auth/start.get.ts`, `auth/callback.get.ts`. Tests: none. Runtime: 1 connection exists. The connect flow was not executed. |
| 2. Select location | Code: picker lists Google accounts/locations. `linkGbpLocation` checks the resource-name shape and rejects Place IDs (`ChIJ…`). It does not ask Google whether this token can manage that location. | `link-location.post.ts`, `gbp.ts` `linkGbpLocation`. Tests: none. |
| 3. Read current GBP | Code: live GET. Not stored. | `profile.get.ts`, `services.get.ts`. Not executed against Google. |
| 4. Edit in SIMY | The profile tab edits Google, not `tenants`. Name, address, special hours, service area, and open status are not on the form. | `pages/admin/google-business-profile.vue` |
| 5. Write to Google | One-way PATCH for description, primary phone, website, collapsed regular hours, categories, and free-form services. | `profile.put.ts`, `services.put.ts` |
| 6. Detect Google-side edits | MISSING. Next page load shows Google. Nothing diffs against tenants or the website. | no import job |
| 7. Errors | Token refresh failure throws. Profile/services map Google errors to HTTP 502. Expired refresh with no token returns a reconnect error. Quota `429` has no special handler. | `refreshAccessToken`, profile routes |
| 8. Retries and concurrency | Posts and photos mark a row failed or published. No idempotency key, no row lock, no Google etag. Two cron ticks can both see `planned` / `scheduled`. Profile saves are last-write-wins. | `publish-gbp-posts.get.ts` |
| 9. Status in the UI | “Saved” is a 2.5s flag after HTTP success. No per-field sync state. Connection status returns email, titles, and resource ids, not tokens. | `status.get.ts`, profile tab |
| 10. Disconnect and reconnect | Delete removes `tenant_google_connections`. Locations cascade in the migration. Google is not told to revoke the refresh token. Reconnect upsert clears the legacy location columns and leaves existing `gbp_locations` active, so the new token is used against the old location ids. | `disconnect.delete.ts`, callback upsert |

Review auto-reply and post publish can report a job-level `ok: true` while individual rows failed. Failed rows are stored as `failed` with `error_message`. That is not a silent per-item success. An empty profile mask returns `{ success: true, unchanged: true }` without calling Google (`updateGbpLocationProfile`).

## 6. Source of truth recommendation

Do not add a second profile table yet. Do not turn on automatic publish.

Recommended model:

1. Keep `tenants` as the canonical NAP, legal identity, public phone, public email, logo, and website/booking URL.
2. Treat Google as an external replica. First connection may show a read-only diff. Nothing is written until a person approves the field list.
3. Keep `locations` as booking places. Map a GBP location to one `locations` row only when a person confirms the pair. Do not guess from title text.
4. Per-field ownership:

| Field | Owner | When values disagree |
|---|---|---|
| Legal name, UID, register, legal form | `tenants` | Show on the website. Do not send to Google. |
| Public name | `tenants.name`, with an explicit GBP title override if Google’s naming rules differ | Preview. Do not overwrite Google until approved. |
| Address and pin | The confirmed `locations` row, falling back to `tenants` only for a single-location school | Never PATCH `storefrontAddress` in the first implementation. Google’s pin is easy to damage and this code cannot read it back today. |
| Primary phone, website, description | `tenants` after a confirmed mapping | Show both values. Write only the approved field. |
| Regular hours | A new explicit public-hours document on the tenant, not staff shifts and not the industry fallback | If Google has two intervals on one day, or any `specialHours`, block the write and show the raw periods. |
| Special hours | Same public-hours document | Do not derive them from regular hours. |
| Categories and structured services | Google, until SIMY can round-trip them | Read-only. The current service PUT is unsafe. |
| Photos | GBP media pool | Do not replace the Google logo from `logo_url` automatically. |
| Booking URL | SIMY booking URL | Use it as the post CTA only after the tenant confirms that URL. |
| Open/closed status | Google | Read-only. |

Timezone: store public hours as wall-clock times plus `tenants.timezone` (default Europe/Zurich). Do not convert those times through UTC. Google regular hours are also wall-clock in the location timezone. DST does not require shifting a 09:00–17:00 local interval. Holiday dates do. The current template has no date exceptions, and the GBP writer has no `specialHours`.

The industry fallback in `getWorkingDaysTemplateDefaults` must not be published as if the tenant had set it. `website-landing-builder.ts` already has `verified_hours_only` for prospect shells. `enrichLandingPremium` does not use that guard.

## 7. Website and local SEO

SIMY tenant sites:

- Contact hours are overwritten from the template on each public read (`c.hours = formatOpeningHours(...)`).
- Phone, email, and address on a saved block win over the tenant row, so a stale block can disagree with the impressum, which is generated from the tenant row.
- JSON-LD hours are refreshed from the same template. Telephone and street in the baked schema are not refreshed in the enrich block that updates hours (`website-enrich-landing.ts` around 623–680). Visible hours can therefore follow the template while an old schema node keeps an old phone.
- `schemaBusinessType` picks `DrivingSchool`, `MusicSchool`, and similar types from `business_type`. That is not a check against the GBP category.
- Sitemap and robots for a tenant use the verified custom domain as `baseUrl`. If the domain is not verified, they use the platform `/s/{subdomain}` URL.
- Custom-domain routing on `main` still serves a site when a `website_tenants.custom_domain` matches the host, even if it is unverified. Production has one such row and zero verified domains. Data consistency and TLS/domain activation are different. This audit does not claim that custom domain is live.
- Booking links are SIMY booking URLs. They are not the GBP website URI.

Driving Team pages can show three different hour strings for one city (config, office display, inline JSON-LD). Syncing GBP would not fix those hardcoded pages.

No claim is made that matching fields would improve rankings or rich results.

## 8. Security and tenant isolation

### S1 — Critical — unsigned OAuth state binds a Google refresh token to any tenant id

`server/api/gbp/auth/callback.get.ts` (about lines 23–27 and 96–113) and `server/api/gbp/admin/callback.get.ts` (about lines 21–27 and 75–88) accept `state` as base64 JSON `{ tenant_id }` with no signature, no nonce, and no session check.

The admin callback does not require `is_simy_admin` and does not pin the tenant to `SIMY_GBP_TENANT_ID`. `admin/start.get.ts` is super-admin only. The callback is public.

A person who can complete Google’s consent screen can store their refresh token on a chosen tenant, or send a consent link whose state points at their own tenant and receive the victim account’s token there. `business.manage` then lets SIMY act on that Google account.

`auth/start.get.ts` `?debug=true` returns the client id and the full authorize URL to a logged-in user. The client id is not a secret. The unsigned state is the defect.

### S2 — High — GBP routes do not check role

Tenant GBP handlers call `getAuthenticatedUser` and `requireFeature(..., 'gbp_enabled')`. They do not call `requireAdminProfile` or `requireAdminOnly` (`server/utils/auth.ts`).

`pages/admin/google-business-profile.vue` sets `layout: 'admin'` and does not set `middleware: 'admin'`. Other admin pages do. Any logged-in user of a tenant that bought the add-on can call profile, services, posts, replies, link, and disconnect if they can reach the API.

Writes are still scoped by `authUser.tenant_id`. This is privilege inside the tenant, not a cross-tenant query bug in those handlers.

### S3 — High — refresh token is readable by one admin session

Production, read-only:

- RLS is enabled and not forced on `tenant_google_connections` and the GBP tables.
- Policy `tenant_google_connections_tenant_isolation` is `FOR ALL` to `public` with `tenant_id = (SELECT users.tenant_id FROM users WHERE users.id = auth.uid())`.
- The app identity is `users.auth_user_id`. Of 1057 users, 1 has `id = auth_user_id`, 408 have a null `auth_user_id`.
- That one user is an admin of the tenant that owns the only Google connection.
- `anon` and `authenticated` have `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` on `tenant_google_connections` and `gbp_locations`. There is no column grant that hides `access_token` and `refresh_token`.

For the other users the predicate matches nothing, so the client sees no row. For that one admin, PostgREST can return the token columns. Service-role routes bypass RLS and are the path the API uses. `TRUNCATE` ignores RLS in Postgres. PostgREST does not expose `TRUNCATE`; a direct exploit was not demonstrated.

The same `users.id = auth.uid()` predicate is in `migrations/20260724_gbp_multi_location_p0.sql` and the later GBP migrations.

### S4 — High — service save can erase structured Google services

`getGbpServices` keeps only `freeFormServiceItem`. `updateGbpServices` PATCHES `updateMask=serviceItems` with that list. Structured services are not round-tripped. One save replaces the whole list. This was not executed.

### S5 — High — hours save collapses split shifts

The profile UI stores one open/close per weekday. Loading keeps the last period. Saving writes that single period. A tenant who opens the hours form and saves can delete a lunch break that existed only on Google.

### S6 — Medium — reconnect does not retire old locations

The callback sets `gbp_location_id` to null on the connection row and does not set `gbp_locations.is_active = false`. Cron keeps publishing to the previously linked resources with the new token.

Disconnect deletes the connection row and relies on `ON DELETE CASCADE`. It does not revoke the token at Google. A copied token would keep working until Google expires it. Disconnect was not executed.

### S7 — Medium — location id is not proved against the token

`linkGbpLocation` rejects a bad shape and a Place ID. It does not list the account’s locations before insert. Google will reject a later call if the token cannot manage that resource. The row can still point at the wrong place until a call fails.

### S8 — Medium — unauthenticated Places compare on the static site

`apps/website/server/api/check-gbp.get.ts` uses the server Places key and returns Google values next to config values. It was not called. It is not the tenant GBP API.

### S9 — Low — logs

The tenant callback logs the tenant id and token-exchange errors, not the access token. That is still an identifier in logs.

### What held up

- Profile, services, and location mutations that go through the API take `tenant_id` from the session, then filter `gbp_locations` by that tenant.
- `status.get.ts` does not select token columns.
- Cron routes reject a missing or wrong `CRON_SECRET`.
- Admin GBP screens other than the callback use `requireSuperAdmin`.
- Public website JSON uses `projectPublicWebsiteTenant` and does not return the tenant id in the public tenant object. Server code still has the id.

No cross-tenant read of another tenant’s locations was found in the API filters. The OAuth callback is the cross-tenant write.

## 9. Tests

Command:

```
./node_modules/.bin/vitest run \
  server/utils/__tests__/gbp-automation.test.ts \
  server/utils/__tests__/website-premium-whatsapp.test.ts \
  server/utils/__tests__/website-public-security.test.ts \
  server/utils/__tests__/website-legal-pages.http.test.ts
```

Result: 4 files, 28 tests, exit 0. Vitest 3.2.7. `nuxt prepare` was required first so `.nuxt/tsconfig.json` existed. `.nuxt` is gitignored.

| File | Tests | What they actually cover |
|---|---|---|
| `gbp-automation.test.ts` | 3 | `shouldAutoPublishReview` only |
| `website-premium-whatsapp.test.ts` | 3 | Mobile vs landline WhatsApp |
| `website-public-security.test.ts` | 6 | Public tenant field allowlist and preview tokens |
| `website-legal-pages.http.test.ts` | 16 | Impressum/privacy isolation and HTML escaping |

Not covered, and no other GBP test file exists:

- Profile payload mapping, split hours, special hours, DST
- Malformed Google payloads, 429, expired tokens
- Retries, idempotency, concurrent cron
- OAuth state, role checks, tenant isolation of GBP routes
- Visible hours versus JSON-LD
- Custom domain versus platform canonical URL
- Service-list replacement

`npm run test` for the whole repo was not run.

## 10. Verified versus not verified

| Claim | Basis |
|---|---|
| Which fields the code reads and writes | Code on `main` |
| Table columns, RLS, grants, connection counts | Read-only production SQL on 2026-10-17 |
| A tenant’s live Google profile matches SIMY or the website | UNVERIFIED. No Google API call. |
| Places consistency script output | UNVERIFIED. Not run. |
| OAuth exploit executed | UNVERIFIED. Finding is from code plus the token-table policy. |
| Custom domain TLS | UNVERIFIED. Zero verified rows. Routing behavior is from code. |
| Cron success in production logs | UNVERIFIED. Schedules are in `vercel.json`. |

## 11. Implementation plan

Do not implement all of this in one change. Do not auto-publish existing tenants.

### P0 — first PR, security only

No NAP sync in this PR.

1. Sign OAuth `state` (HMAC with a server secret, random nonce, expiry, tenant id, user id). Store the nonce server-side. Both callbacks reject a missing, expired, or unsigned state. The tenant callback requires the same logged-in admin who started the flow. The admin callback accepts only the configured SIMY tenant id.
2. Put `requireAdminOnly` (or admin plus staff, if staff are supposed to manage GBP) on every tenant route under `server/api/gbp/`. Add `middleware: 'admin'` on `pages/admin/google-business-profile.vue`.
3. Stop client reads of tokens: fix the RLS predicate to `users.auth_user_id = auth.uid()`, revoke `anon` and `authenticated` privileges on `tenant_google_connections`, and keep tokens on the service role only. Revoke `TRUNCATE` from `anon` and `authenticated` on the GBP tables.
4. Tests for forged state, a client role, and a foreign `locationId`. No live Google call.

This PR does not change a tenant’s public details and does not call Google except through the existing consent redirect once a person uses it.

### P1 — canonical hours and a read-only diff

1. Stop publishing industry-fallback hours. If `working_days_template` is null, omit hours in HTML and JSON-LD.
2. Add an explicit public-hours value on the tenant (still one source), with timezone, one or more intervals per weekday, and special dates. Do not reuse `staff_working_hours`.
3. On the GBP screen, load Google and show a diff against that canonical value. Save nothing to Google from this PR.
4. Prefer tenant phone, email, and address over a stale block when rendering, and refresh those JSON-LD fields the same way hours are refreshed.
5. Make contact-block versus JSON-LD a test.

### P2 — approved publish

1. Publish only description, primary phone, and website URI, and only after a per-field confirmation.
2. Refuse a hours write when Google has multiple periods on one day or any special hours, until the canonical model can round-trip them.
3. Stop replacing `serviceItems` and categories until the read path preserves structured services and additional categories.
4. Do not PATCH title, address, service area, or open status in this phase.
5. Idempotent job row, bounded retries, and states `in sync`, `pending`, `conflict`, `failed`, `not supported`.
6. On reconnect, deactivate old `gbp_locations` until they are picked again. On disconnect, revoke the Google token when the API allows it.

### P3 — website consistency

1. One renderer for visible NAP and JSON-LD.
2. Booking URL and phone links from the canonical fields.
3. Regular versus special hours both rendered.
4. Custom-domain canonical only when `custom_domain_verified` is true. Do not treat routing as proof of TLS. #458 stays a separate decision.
5. Driving Team `apps/website` hardcoded pages are a separate cleanup. Do not pretend the tenant sync fixes them.

### P4 — operations

Last success time, per-field error, reconnect steps, and counters that do not include tokens or reviewer text. Suitable for many schools because the work is per location and queued, not a single global overwrite.

## 12. Safety confirmation

- Application code: not edited.
- Live GBP write: not performed.
- Sync, cron, notification: not triggered.
- Production and staging writes, migrations, secrets, OAuth settings: not changed.
- Production reads: column list, RLS, grants, and the counts in this file.
- Merge, approve, undraft, deploy: not done.
- `node_modules` and `.nuxt` from the local test setup are untracked and must not be committed with this handoff.

## 13. Next action

A person reviews this audit. The first implementation PR is the P0 security PR above, and only that. Human approval is required before any Google write or any change to tenant business data.
