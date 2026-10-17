# F-3 anon Data-API containment

**When to use:** Public voucher lookup fails after a migration; booking reserve/release returns RLS errors; course waitlist signup fails for anonymous visitors; investigating whether clients still write `vouchers` / `availability_slots` / `course_waitlist` via the Supabase anon key; debugging #231.

Verified against source (Sep 2026). Merge `c78d6559` (#231). Migration is **create-only** and must be applied manually (`Do not apply automatically to production`).

Related but separate:

- Broader F-3 / Phase-14 containment on open PR #169 — **not** cherry-picked; this runbook documents the **shipped** `#231` slice only.
- Course sessions anon SELECT (#208/#209) — docs PR #210; out of scope for this migration.
- Payments / tenants / locations / discounts / storage — intentionally untouched.
- Staff waitlist UI still uses the authenticated session client (`composables/useCourseParticipants.ts` + tenant policies).

---

## Intent

Close three live Data-API holes where `anon` could read or mutate sensitive rows **without** going through Nitro. Public product flows already use `getSupabaseAdmin()` (service_role, bypasses RLS); the migration removes the parallel anon policies/grants so those holes cannot reopen silently.

| Table | Pre-#231 hole (live catalog 2026-09-17) | After #231 |
|-------|------------------------------------------|------------|
| `vouchers` / `voucher_codes` | `GRANT ALL` to anon + public SELECT policies on active unredeemed rows (no tenant filter on some) | `REVOKE ALL` from anon/PUBLIC; anon lookup policies dropped |
| `availability_slots` | anon `UPDATE` via `update_available_slots` / `release_own_reservation` (+ broader DML grants) | anon UPDATE policies dropped; `INSERT/UPDATE/DELETE/TRUNCATE` revoked from anon; **SELECT listing policy kept** |
| `course_waitlist` | `course_waitlist_public_insert` for anon/authenticated with `WITH CHECK (true)` | public insert policy dropped; anon DML revoked; **tenant staff policies kept** |

---

## Contract

### Public paths stay on service_role

| Surface | Role |
|---------|------|
| `POST /api/vouchers/lookup` | Tenant-scoped promo/gift lookup; metadata only (`amount_chf`, validity); rate-limited |
| `GET /api/booking/get-available-slots` | Slot listing |
| `POST /api/booking/reserve-slot` | Hold a free slot |
| `POST /api/booking/guest-book` | Guest booking (claims reserved slot) |
| `POST /api/booking/release-reservation` | Release hold |
| `POST /api/courses/waitlist-signup` | Course-instance waitlist |
| `POST /api/courses/category-waitlist-signup` | Category waitlist |
| `apps/website` category waitlist | `createWebsiteSupabaseClient` + `SUPABASE_SERVICE_ROLE_KEY` |

Do **not** reintroduce browser/Data-API writes to these tables from `pages/` or `components/`. Contract tests in `server/utils/__tests__/f3-anon-data-api-containment.test.ts` fail if those client trees query the contained tables.

### What stays allowed

- Authenticated / admin voucher policies (own vouchers, tenant admin manage) — **not** dropped.
- Anon **SELECT** listing on `availability_slots` (`select_available_slots_for_listing` and similar) — intentionally left; mutations must use Nitro.
- `course_waitlist_tenant_access` / tenant read/update for staff — unchanged.
- `REVOKE SELECT` is **not** applied to `availability_slots` or `course_waitlist` in this migration.

### Out of scope (do not “fix forward” into this SQL)

`tenants`, `course_sessions`, `payments`, `locations`, `discounts`, users privilege-freeze triggers, `storage.objects` / tenant-logos.

---

## Migration & apply

File: `migrations/20260917_f3_anon_data_api_containment.sql`

- Idempotent: `DROP POLICY IF EXISTS` + `REVOKE`
- Does **not** `ALTER DEFAULT PRIVILEGES`
- Ends with `NOTIFY pgrst, 'reload schema'`
- Header includes emergency rollback `GRANT`s — **re-opens the holes**; use only for incident recovery

Apply manually in the target Supabase project after review. Until applied, production may still match the pre-#231 catalog even though `main` contains the SQL.

---

## Pitfalls

1. **Client anon lookup “worked in PostgREST”** — that was the vulnerability. After apply, anon `select` on vouchers/codes fails; use `POST /api/vouchers/lookup` with `tenant_id`.
2. **Re-adding `update_available_slots` for “faster booking”** — undoes containment. Reserve/release must stay on service_role Nitro routes.
3. **Waitlist “public insert” policy with `WITH CHECK (true)`** — allows cross-tenant spam. Public signup must validate on the API and insert via admin client.
4. **Confusing #231 with open #169** — different change set; do not assume #169 policies are live.
5. **Staff waitlist broken** — check session auth and `course_waitlist_tenant_*` policies, not anon grants.
6. **CSV / old audits still say “anon update for reservations”** — historical; this runbook + CSV patches after #231 are authoritative for the contained tables.

---

## Codepaths

| Path | Notes |
|------|-------|
| `migrations/20260917_f3_anon_data_api_containment.sql` | Policy drops + revokes |
| `server/utils/__tests__/f3-anon-data-api-containment.test.ts` | SQL + public-flow source contract |
| `server/api/vouchers/lookup.post.ts` | Public voucher metadata |
| `server/api/booking/{get-available-slots,reserve-slot,guest-book,release-reservation}.*` | Slot flows |
| `server/api/courses/{waitlist-signup,category-waitlist-signup}.post.ts` | App waitlist |
| `apps/website/server/api/courses/category-waitlist-signup.post.ts` | Marketing-site waitlist |
| `apps/website/server/utils/supabase-service-env.ts` | Website service-role client |
| `composables/useCourseParticipants.ts` | Authenticated staff waitlist |

---

## Quick verify

```bash
# Contract tests (no DB required)
npx vitest run server/utils/__tests__/f3-anon-data-api-containment.test.ts
```

After SQL apply, confirm anon cannot `UPDATE availability_slots` / `INSERT course_waitlist` / `SELECT` vouchers via the Data API, while the Nitro routes above still succeed.
