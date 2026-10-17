# Admin F-01 access (service-role endpoints)

**When to use:** Adding or changing `/api/admin/*` routes that use the service-role client; debugging 401/403 on cron-status / billing enrichment; reviewing IDOR on `studentIds` / device deletes.

Verified against source (Sep 2026). Commits `20a5defe` (#129). Detail audit: `audits/2026-09-02-f01-remediation.md`.

---

## Intent

Several admin routes used `getSupabaseAdmin()` (service role, bypasses RLS) **without** session checks. UI middleware alone is not enough — any unauthenticated caller could hit Nitro. F-01 closes that class of hole: authenticate first, then authorize, then scope every id to the caller's tenant (or the session user).

Service-role key rotation was **out of scope** for #129; authz on the route is the fix.

---

## Auth helpers

| Helper | Role | Use when |
|--------|------|----------|
| `requireAdminProfile(event, roles?)` | JWT + `users.role` in allow-list + non-empty `tenant_id` | Tenant staff/admin APIs |
| `requireSuperAdmin(event)` | Role must be exactly `super_admin` | Platform-wide ops (cron status, calculator stats) |
| `getAuthenticatedUser(event)` | Any signed-in user | Self-scoped actions (own devices) |

Default `requireAdminProfile` allow-list: `admin`, `staff`, `super_admin`. Pass `tenant_admin` explicitly when that role should call the route.

---

## Shared ID helpers (`admin-f01-access.ts`)

| Export | Contract |
|--------|----------|
| `normalizeIdList(raw, fieldName)` | Non-empty string array or **400** |
| `assertUsersBelongToTenant(supabase, ids, tenantId)` | Every id must exist in `users` with that `tenant_id`; else **403**. Cap `MAX_USER_IDS` (5000). Chunked `.in()` at `IN_QUERY_CHUNK` (200). |
| `chunkIds` / `fetchAllPages` | Safe PostgREST `.in()` size + page past the 1000-row default |

Never trust client `studentIds` / `userIds` alone when using the service role.

---

## Remediated surfaces (#129)

| Endpoint | Gate | Tenant / ownership rule |
|----------|------|-------------------------|
| `GET /api/admin/cron-status` | `requireSuperAdmin` | Platform-wide by design (super_admin only) |
| `GET /api/admin/calculator-stats` | `requireSuperAdmin` | Platform-wide |
| `POST /api/admin/get-billing-addresses` | `requireAdminProfile` (+ tenant_admin) | `assertUsersBelongToTenant` then filter `company_billing_addresses.tenant_id` |
| `POST /api/admin/get-student-instructors` | same | Same ownership check + tenant-scoped appointment/user queries |
| `POST /api/admin/remove-user-device` | `getAuthenticatedUser` | Delete only rows where `user_devices.user_id` = session `auth.users.id`; foreign body `userId` → **403** |
| `POST /api/admin/pendencies/update-overdue` | **Removed** | No legitimate callers |
| `POST /api/admin/pendencies/handle-recurrence` | **Removed** | No legitimate callers |

---

## Pitfalls

- **UI middleware ≠ API auth.** Always call `requireAdminProfile` / `requireSuperAdmin` inside the handler before `getSupabaseAdmin()`.
- **Super_admin still needs a `tenant_id`** for `requireAdminProfile`. Platform routes that must ignore tenant should use `requireSuperAdmin` instead.
- **`user_devices.user_id` is the Auth user id**, not `public.users.id` (see DeviceManager load path). Self-delete filters on `authUser.id`.
- **PostgREST silently truncates** at 1000 rows — use `fetchAllPages` for enrichment lists.
- Do not resurrect the removed pendencies mutators without auth + a real caller.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/admin-f01-access.ts` | ID normalize / tenant assert / paging |
| `server/utils/auth.ts` | `requireAdminProfile` |
| `server/utils/require-super-admin.ts` | `requireSuperAdmin` |
| `server/api/admin/cron-status.get.ts` | Super-admin cron + payment pipeline overview |
| `server/api/admin/calculator-stats.get.ts` | Super-admin analytics |
| `server/api/admin/get-billing-addresses.post.ts` | Tenant-scoped billing enrichment |
| `server/api/admin/get-student-instructors.post.ts` | Tenant-scoped instructor enrichment |
| `server/api/admin/remove-user-device.post.ts` | Own-device delete |
| `server/utils/__tests__/admin-f01-access.test.ts` | Unit coverage |
| `audits/2026-09-02-f01-remediation.md` | Full remediation report |
