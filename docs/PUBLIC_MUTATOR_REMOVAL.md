# Unauthenticated privileged API mutators (#304)

**When to use:** Investigating anonymous write exposure on Nitro routes; restoring SARI enroll / catalog seed / reminder seed / recalc trigger / PLZ geocode HTTP endpoints; reviewing `resolveLocationPostalCode` tenant scoping; auditing stale endpoint catalogs.

Verified against current `main` (Sep 2026). Landed fix: **#304** (`70b13a8c`).

---

## Intent

Five production handlers performed **privileged writes** with the service-role client and **no authenticated session**. An anonymous `POST` could:

| Removed route | Privileged action |
|---------------|-------------------|
| `POST /api/sari/validate-enrollment` | Call `sari.enrollStudent` and return personal data (no in-repo caller) |
| `POST /api/tenants/seed-defaults` | Write catalog rows for body `tenant_id` / `overwrite_existing` (no in-repo caller) |
| `POST /api/reminder/seed-templates` | Upsert global reminder templates (`tenant_id` null) (no in-repo caller) |
| `POST /api/debug/trigger-recalc-queue` | Start the availability recalc worker; comment claimed an admin check, handler only tested that `CRON_SECRET` was **set**, then called the cron with it |
| `POST /api/geocoding/resolve-plz` | Geocode + optionally update `locations`; only in-repo caller was `utils/postalCodeUtils.ts` via `$fetch` |

Those route files are **deleted**. Recreate them only behind real authz (or keep work server-internal). Do not reintroduce anonymous service-role mutators.

## Contract (current `main`)

| Rule | Detail |
|------|--------|
| No HTTP registration for the five paths | Files under `server/api/**` for those routes must not exist |
| No executable callers of the removed paths | App code must not `$fetch` / hardcode those URL strings (regression suite scans `server`, `utils`, `pages`, `components`, `composables`, `plugins`, `middleware`, `stores`, `apps`) |
| SARI enroll stays authenticated | Use `POST /api/sari/enroll-student` (`getAuthenticatedUser` + admin/staff tenant checks) or course enroll / Wallee webhook paths |
| Recalc stays cron-gated | `GET /api/cron/process-recalc-queue` uses `assertCronRequest` (`CRON_SECRET` Bearer). Authenticated enqueue: `POST /api/availability/queue-recalc` |
| PLZ resolution is server-only | `resolveLocationPostalCode` in `server/utils/resolve-plz.ts` — **no** `defineEventHandler`, no `readBody` / `getHeader` / `x-tenant-id` / `x-user-id` |
| Tenant id for location writes | Callers pass `tenantId` from trusted server context. Blank / non-string → fill `plz_distance_cache` only; **do not** touch `locations` |
| Location updates are double-scoped | Select and update both filter `.eq('tenant_id', tenantId)` (and update also by location `id`) |

### Geocoding architecture after #304

```ts
// utils/postalCodeUtils.ts — resolvePLZForExternalBusyTime
const { resolveLocationPostalCode } = await import('~/server/utils/resolve-plz')
const response = await resolveLocationPostalCode({
  locationName: eventLocation,
  tenantId, // already held by the server caller
  supabase,
})
```

There is no public geocoding route. A client cannot supply `tenant_id` / headers to drive location writes through this helper.

`server/api/external-calendars/sync-ics.post.ts` still imports `resolvePLZForExternalBusyTime` but resolves PLZ **inline** (extract → locations lookup → Google) and does not call that helper in the handler body. The unused import remains only because the export still exists.

## Pitfalls

1. **Restoring a “debug” trigger that only checks env presence** — `CRON_SECRET` being set is not auth. Use `assertCronRequest` or a real admin session.
2. **Re-exposing geocode as HTTP “for convenience”** — any handler that accepts client `tenant_id` reopens cross-tenant location writes.
3. **Confusing `validate-enrollment` with `validate-student` / `enroll-student`** — `validate-student` and authenticated enroll remain; only the unauthenticated enroll-via-validate route was removed.
4. **Stale catalogs** — root `API_ENDPOINTS.md` and older secrets guides may still list `validate-enrollment` / `resolve-plz`. Prefer this runbook + `docs/API_ENDPOINTS.csv` status; do not treat root markdown inventories as live.
5. **Assuming sync-ICS uses the shared helper** — it does not today; changes to `resolve-plz.ts` do not automatically change ICS sync geocoding.

## Verify

```bash
# Route files must be gone; cron + helper must remain
npx vitest run server/utils/__tests__/public-mutator-routes.test.ts

# Tenant isolation + no HTTP/header reads in the helper
npx vitest run server/utils/__tests__/resolve-plz.test.ts

# Spot-check: no live callers of removed paths
rg -n '/api/sari/validate-enrollment|/api/tenants/seed-defaults|/api/reminder/seed-templates|/api/debug/trigger-recalc-queue|/api/geocoding/resolve-plz' \
  server utils pages components composables plugins middleware stores apps || true
```

Expect: vitest green; `rg` hits only inside the regression test’s string lists (or none outside `__tests__`).

## Codepaths / surfaces

| Path | Role |
|------|------|
| `server/api/sari/validate-enrollment.post.ts` | **Removed** (#304) |
| `server/api/tenants/seed-defaults.post.ts` | **Removed** (#304) |
| `server/api/reminder/seed-templates.post.ts` | **Removed** (#304) |
| `server/api/debug/trigger-recalc-queue.post.ts` | **Removed** (#304) |
| `server/api/geocoding/resolve-plz.post.ts` | **Removed** (#304); `server/api/geocoding/` gone |
| `server/utils/resolve-plz.ts` | Server-only `resolveLocationPostalCode` |
| `utils/postalCodeUtils.ts` | `resolvePLZForExternalBusyTime` → internal helper (no `$fetch`) |
| `server/api/sari/enroll-student.post.ts` | Authenticated SARI enroll replacement path |
| `server/api/sari/lookup-customer.post.ts` | Still present (regression keeps it) |
| `server/api/cron/process-recalc-queue.get.ts` | Cron-gated recalc worker |
| `server/utils/cron-auth.ts` | `assertCronRequest` / `CRON_SECRET` |
| `server/api/availability/queue-recalc.post.ts` | Authenticated enqueue → cron |
| `server/utils/__tests__/public-mutator-routes.test.ts` | Files gone + no path callers |
| `server/utils/__tests__/resolve-plz.test.ts` | Tenant isolation + no request I/O |
| `docs/API_ENDPOINTS.csv` | Mark removed debug trigger Inactive |
| `vercel.json` | Docs branches `cursor/engineering-documentation-updates-*` skip Vercel deploys |
