# Superadmin sales workspace

**When to use:** Working on the manual sales pipeline UI, prospect scoring, contact logging, or the historical Fahrlehrer-Weiterbildung briefing signal.

Verified against current `main` (Oct 2026). Landed: **#341** (`0d99fe3c`), **#353** (`9fe6f007`).

**Not this:** Website prospect claim / Places discovery cron (`docs` draft #332 / #303). Proposal follow-up claim (`edb9e385`). Open draft #350 (sales detail UX only). Staff POS product sale (#336).

---

## Intent

Give superadmins a **manual** CRM over existing `fahrlehrer_leads` rows: classify, log contacts a human already made, and schedule follow-ups. Nothing in this schema or these routes sends email, SMS, or WhatsApp (`sends: 0` on every response). Historical August outreach and Weiterbildung registrations are **read-only signals** for briefing, not proof of consent to contact.

---

## Contract (current `main`)

### Auth and UI

| Surface | Detail |
|---------|--------|
| Gate | Every `/api/tenant-admin/sales/**` handler calls `requireSuperAdmin` (role must be exactly `super_admin`) |
| Cache | `Cache-Control: private, no-store` |
| Nav | `layouts/tenant-admin.vue` → Sales → `/tenant-admin/sales` |
| Pages | `pages/tenant-admin/sales/index.vue`, `follow-ups.vue`, `[id].vue` |

### Schema (ops apply manually)

`sql_migrations/20261002_sales_pipeline_manual.sql` — file comment: **not applied by the app change**.

| Table | Purpose |
|-------|---------|
| `sales_pipeline_profiles` | One row per `fahrlehrer_leads.id` (`prospect_id` UNIQUE) |
| `sales_contact_logs` | Append-only log of contacts a person already made |

RLS enabled; **REVOKE ALL** from `PUBLIC` / `anon` / `authenticated`; **GRANT ALL** to `service_role` only. Missing tables → list/dashboard return `profile_store: 'unavailable'`; contact/profile writes → **503** `Sales-Profilspeicher ist noch nicht migriert`.

### Prospect assembly (read path)

`loadSalesProspects()` pages (1000 rows) from:

1. `fahrlehrer_leads` — base people/orgs  
2. `tenants` + staff `users` — existing-tenant / possible-match exclusion  
3. `leads` — consent / opt-out status  
4. `email_campaigns` named like `%Fahrlehrer Mail%` with outreach + `Mail 1–4`, plus `email_campaign_leads` — **historical** August open/click signals (`august.historical: true`)

`buildSalesProspects` sets `eligible` only when the group is not an existing/possible tenant, not opt-out, and has a reachable contact. Sprint default filter: `eligible` and priority `P1`/`P2`, first **50** (`initialSprint`).

### HTTP API

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/tenant-admin/sales` | Filtered list; `sprint=1` (default) caps to 50 P1/P2 eligible |
| GET | `/api/tenant-admin/sales/dashboard` | Counts/rates from **manual** profile statuses only (`basis` string says so) |
| GET | `/api/tenant-admin/sales/follow-ups` | Profiles with `next_follow_up_at`; buckets `overdue` / `today` / `upcoming` |
| GET | `/api/tenant-admin/sales/:id` | Prospect + profile + last 100 logs + `weiterbildung` signal |
| POST | `/api/tenant-admin/sales/:id/contact` | Upsert profile, insert contact log, audit `sales_contact_logged` |
| PATCH | `/api/tenant-admin/sales/:id/profile` | Patch profile fields without a contact log; audit `sales_profile_updated` |

Contact/profile writes require `prospect.eligible`; else **409** with `contactability_label`. Invalid UUID id → **400**.

Allowed enums live in `server/utils/sales-intelligence.ts`: `SALES_STATUSES`, `CONTACT_CHANNELS`, `CONTACT_RESULTS`, `NEXT_ACTIONS`.

### Weiterbildung signal (#353)

`loadSalesWeiterbildungSignal(prospect)`:

- Matches prospect emails (preferred) or phone-fallback only when all phone hits share **one** email identity  
- Sources: `course_categories.code = 'Fahrlehrer'` → `courses` → `course_registrations` with `status = 'confirmed'` and `deleted_at` null  
- Detail copy is always: `Registrierung vorhanden · Teilnahme nicht bestätigt`  
- Errors / empty data → `{ hasRegistration: false }` (no throw)

---

## Pitfalls

1. **Migration may be undeployed** — UI can list scored prospects with `profile_store: 'unavailable'`; writes fail with 503 until SQL is applied.  
2. **Logging contact ≠ sending** — inserting `sales_contact_logs` does not trigger outreach. Do not wire senders to these tables without a new design.  
3. **Ineligible prospects** — existing tenant / opt-out / possible match cannot be contacted via API even if a profile row exists.  
4. **August mail data is historical** — engagement HOT/WARM from past campaigns is not live consent and is labeled `historical: true`.  
5. **Weiterbildung ≠ attendance** — confirmed registration only; copy explicitly says participation is unconfirmed. Phone match without a single email anchor is dropped.  
6. **Do not conflate with Places / website prospects** — this workspace keys off `fahrlehrer_leads`, not website-factory claim flows.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/sales-workspace.ts` | Load leads/tenants/profiles/logs; missing-store detection |
| `server/utils/sales-intelligence.ts` | Scoring, eligibility, filters, sprint |
| `server/utils/sales-profile-update.ts` | PATCH field merge + follow-up date rules |
| `server/utils/sales-weiterbildung-signal.ts` | Historical Weiterbildung briefing (#353) |
| `server/api/tenant-admin/sales/**` | Superadmin HTTP surface |
| `server/utils/require-super-admin.ts` | Role gate |
| `sql_migrations/20261002_sales_pipeline_manual.sql` | Tables + service_role-only grants |
| `pages/tenant-admin/sales/**` | UI |
| `server/utils/__tests__/sales-*.test.ts` | Intelligence, profile, Weiterbildung coverage |
