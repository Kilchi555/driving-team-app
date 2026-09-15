# Cron secret auth and financial RLS

**When to use:** Cron jobs 401 in production; someone suggests trusting `x-vercel-cron` alone; client JWTs can still UPDATE `cash_balances.current_balance_rappen`; guest course enrollment tries to INSERT via Supabase client instead of enroll APIs; debugging P0-08 / P0-09 after #191.

Verified against source (Sep 2026). Commit `58b98879` (#191). Pair with [TENANT_API_AUTHZ.md](./TENANT_API_AUTHZ.md) for session gates.

---

## Intent

1. **Cron fleet is fail-closed** on a shared bearer secret. Missing or wrong `CRON_SECRET` must reject the request.
2. **Financial / registration writes** that used to ride on broad `FOR ALL` tenant policies move to server (service role) paths. JWT clients keep least privilege.

---

## Contract — cron

`assertCronRequest` (`server/utils/cron-auth.ts`):

1. `process.env.CRON_SECRET` missing/empty → **401**
2. `Authorization` must be `Bearer <secret>` (timing-safe compare)
3. Wrong/missing bearer → **401**
4. **`x-vercel-cron` is never checked and never sufficient**

`verifyCronToken` (`server/utils/cron.ts`) wraps the same helper as a boolean. Cron handlers call `assertCronRequest(event)` first.

Vercel Cron injects `Authorization: Bearer $CRON_SECRET` when the secret is configured in the project.

---

## Contract — RLS

### `cash_balances` (`migrations/20260909_p0_08_cash_balances_rls.sql`)

| Rule | Detail |
|------|--------|
| Dropped | Broad `FOR ALL` / old select/insert/update policies that let tenant JWTs mutate balances |
| Client JWT | **SELECT** only for staff/admin roles (`cash_balances_staff_select`); `INSERT`/`UPDATE`/`DELETE` revoked from `authenticated` |
| Writes | Office / admin cash APIs and RPCs via **service role** |

> Pitfall vs commit message: the migration does **not** grant staff JWT INSERT/UPDATE. UI reads with the user JWT; mutations go through service-role server routes.

### `course_registrations` (`migrations/20260909_p0_09_course_registrations_rls.sql`)

| Rule | Detail |
|------|--------|
| Dropped | `FOR ALL` tenant policy + unscoped authenticated INSERT |
| Customers | `course_registrations_select_own` (own `user_id`) |
| Staff/admin | Tenant-scoped SELECT/INSERT/UPDATE/DELETE |
| Trigger | `trg_course_registrations_protect_payment_fields` — non-`service_role` cannot set/change payment + SARI columns |
| Guest enroll | Remains on `enroll-cash` / `enroll-wallee` / admin enroll APIs (service role) |

Protected columns include `payment_status`, `payment_id`, `amount_paid_rappen`, `payment_method`, discount fields, and SARI sync columns. Roster identity fields stay staff-writable inside the session tenant.

---

## Pitfalls

1. **Unset `CRON_SECRET` disables the fleet** — Fail-closed by design; every cron returns 401 until the env is set.
2. **Do not “fix” cron auth with `x-vercel-cron`** — That header is not identity.
3. **Client cash mutations will fail open after P0-08** — If the office UI still tries JWT UPDATE, fix the caller to use the cash-management API.
4. **Do not enroll guests with the browser Supabase client** — RLS blocks payment fields; use the public enroll APIs.
5. **Migration headers say “do not apply from remediation agent”** — PR #191 notes production already applied; treat SQL as the source of truth for policy names.

---

## Ops checks

```bash
# Cron must reject missing bearer (expect 401)
curl -i "https://app.simy.ch/api/cron/send-appointment-reminders"

# Cron accepts only CRON_SECRET bearer (run from a secret store, never commit)
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  "https://app.simy.ch/api/cron/send-appointment-reminders"
```

```sql
-- Policies present after P0-08 / P0-09
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid IN ('public.cash_balances'::regclass, 'public.course_registrations'::regclass)
ORDER BY polrelid::text, polname;
```

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/cron-auth.ts` | `assertCronRequest` |
| `server/utils/cron.ts` | `verifyCronToken` wrapper |
| `server/api/cron/*.ts` | Fleet entrypoints (call assert first) |
| `server/utils/__tests__/p1-01-cron-auth.test.ts` | Fail-closed regressions |
| `migrations/20260909_p0_08_cash_balances_rls.sql` | Cash balance RLS |
| `migrations/20260909_p0_09_course_registrations_rls.sql` | Course registration RLS + payment trigger |
| `server/api/admin/cash-management.post.ts` | Service-role cash writes (inventory) |
| `server/api/courses/enroll-cash.post.ts` / `enroll-wallee.post.ts` | Guest enroll (service role) |
