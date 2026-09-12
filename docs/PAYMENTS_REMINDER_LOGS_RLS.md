# Payments + reminder_logs RLS (F-05)

**When to use:** Client cannot update payment status; reminder log INSERT fails from the browser; staff cannot see reminder history; replaying F-05 migration on a restore.

Verified against source (Sep 2026). Commit `45153183` (#130). Migration: `migrations/20260902_f05_payments_reminder_logs_rls.sql`. Detail: `audits/2026-09-02-f05-remediation.md`.

---

## Intent

RLS is the security boundary for the Supabase Data API. Application checks in composables are not enough — any JWT can call PostgREST directly.

| Finding | Before | After |
|---------|--------|-------|
| **F-05a** | `customer_update_own` let clients UPDATE any column on their `payments` rows (including `payment_status`, amounts, Wallee ids) | Customer UPDATE policies **dropped**. Status changes go through service-role routes / webhooks / staff policies only. |
| **F-05b** | `reminder_logs` SELECT/INSERT for any `authenticated` user (cross-tenant PII) | Open policies **dropped**. Staff/admin/tenant_admin **SELECT** own tenant (`tenant_id` required). Writes via **service_role** only. |

---

## Payments (F-05a)

- Clients: **SELECT** own rows still allowed (`customer_read_own`); **no UPDATE**.
- Staff / admin / tenant_admin: UPDATE within tenant unchanged.
- Service role / Wallee webhooks: unchanged (`service_role_all` or bypass).
- Do **not** re-add a broad customer UPDATE policy. If a product need appears, prefer a narrow server API or a column-restricted trigger — never full-row client UPDATE.

### Developer impact

- `usePaymentStatus` (and similar) must not rely on client `.update()` for status transitions.
- Payment completion / refunds / cash mark-paid stay on Nitro endpoints that use the admin client after auth.

---

## Reminder logs (F-05b)

### Policies

| Policy | Cmd | Rule |
|--------|-----|------|
| `reminder_logs_staff_select_tenant` | SELECT | Caller's `users.tenant_id` matches row `tenant_id`; roles `staff` / `admin` / `tenant_admin`; active |
| `reminder_logs_super_admin_select_all` | SELECT | `users.role = 'super_admin'` |
| `reminder_logs_service_role_all` | ALL | Service role (documents intent; bypasses RLS anyway) |

No authenticated INSERT / UPDATE / DELETE policies.

### Writers must stamp `tenant_id`

Historical rows often had `tenant_id = NULL`. Staff SELECT requires a non-null tenant. Server writers (`POST /api/reminders/manage` actions `log-sent` / `log-failed`) stamp:

- `tenant_id` from the caller's profile
- `user_id` from body or actor

Client composable `useReminderService` logs SMS/email via that API — **no** direct `supabase.from('reminder_logs').insert(...)`.

### Reads

- Prefer tenant-scoped staff queries (RLS) or authenticated manage API after session check.
- Manage `get-logs` uses the service-role client after `getAuthenticatedUser`; callers must only request ids they are allowed to see (do not treat it as a public cross-tenant dump).

---

## Pitfalls

- **Client INSERT into `reminder_logs` will fail** after F-05 — route through `/api/reminders/manage`.
- **Null `tenant_id` rows are invisible** to staff SELECT. Fix writers; backfill if ops need history.
- **Restoring an old DB dump** without this migration re-opens F-05. Apply `migrations/20260902_f05_payments_reminder_logs_rls.sql` (or the live equivalent) after restore.
- Customers marking themselves paid via PostgREST is the classic amp — keep customer UPDATE off.

---

## Codepaths

| Path | Role |
|------|------|
| `migrations/20260902_f05_payments_reminder_logs_rls.sql` | Live RLS change |
| `server/api/reminders/manage.post.ts` | Authenticated log-sent / log-failed (stamps tenant) |
| `composables/useReminderService.ts` | Client → manage API instead of direct INSERT |
| `server/utils/__tests__/f05-rls-remediation.test.ts` | Policy / contract tests |
| `audits/2026-09-02-f05-remediation.md` | Remediation + retest notes |
