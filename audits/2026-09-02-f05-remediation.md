# F-05 Remediation — Payments UPDATE + Reminder Logs SELECT (RLS)

**Date:** 2026-09-02  
**Scope:** F-05a + F-05b only  
**Live project:** `unyjaetebnaexaflpyoc`  
**Migration:** `migrations/20260902_f05_payments_reminder_logs_rls.sql` (applied live)

---

## 1. Original finding

From `audits/2026-09-02-security-audit.md` / remediation plan:

| ID | Issue | Severity |
|----|--------|----------|
| **F-05a** | Live policy `customer_update_own` lets clients UPDATE own `payments` rows including `payment_status` | CRITICAL |
| **F-05b** | Live policies `Enable select/insert for authenticated users` on `reminder_logs` with `auth.role() = 'authenticated'` — cross-tenant PII read/write | CRITICAL |

Client JS in `usePaymentStatus.ts` blocked some “paid” statuses in application code only; PostgREST Data API bypassed that.

---

## 2. Root cause

1. **F-05a:** Overly broad customer UPDATE RLS (USING/WITH CHECK only required `user_id` = caller’s `users.id`). No column restriction → any column mutable, including `payment_status`, `tenant_id`, amounts, Wallee IDs.
2. **F-05b:** Open SELECT/INSERT policies with no `tenant_id` predicate. Any JWT could `select * from reminder_logs`. Historical rows often had `tenant_id = NULL` (writers never stamped tenant).

RLS is the security boundary for the Supabase Data API; API-route auth alone cannot close these holes.

---

## 3. Affected tables / relations

| Table | Key columns | Relations |
|-------|-------------|-----------|
| `payments` | `id`, `user_id` → `users.id`, `tenant_id`, `payment_status`, amounts, Wallee fields | users, tenants, appointments |
| `reminder_logs` | `tenant_id`, `user_id`, `payment_id`, `appointment_id`, `recipient`, `body` | tenants, users, payments |
| `users` | `id`, `auth_user_id`, `tenant_id`, `role` (`client`/`staff`/`admin`/`super_admin`) | auth.users |

There is no separate `students` table for ownership; customers are `users.role = 'client'`.

---

## 4. Policies before

### payments (excerpt)

| Policy | Cmd | Notes |
|--------|-----|-------|
| `customer_read_own` | SELECT | Keep |
| `staff_read_tenant` | SELECT | Keep |
| `super_admin_read_all` | SELECT | Keep (live checks `superadmin` typo — separate finding) |
| `customer_insert_own` | INSERT | Keep (out of F-05 scope; `user_id = auth.uid()` mismatch noted below) |
| `staff_insert_tenant` | INSERT | Keep |
| **`customer_update_own`** | **UPDATE** | **Removed (F-05a)** |
| `staff_update_tenant` | UPDATE | Keep |
| `super_admin_update_all` | UPDATE | Keep |
| `service_role_all` | ALL | Keep |

### reminder_logs

| Policy | Cmd | Notes |
|--------|-----|-------|
| **`Enable select for authenticated users`** | SELECT | **Removed** — was world-readable to authenticated |
| **`Enable insert for authenticated users`** | INSERT | **Removed** — was world-writable to authenticated |

---

## 5. Policies after

### payments

- **Dropped** `customer_update_own` (and legacy aliases if present).
- No new customer UPDATE policy. Clients cannot UPDATE via Data API.
- Staff/admin/tenant_admin UPDATE within tenant unchanged.
- Service role / webhooks unchanged (bypass or `service_role_all`).

### reminder_logs

| Policy | Cmd | Rule |
|--------|-----|------|
| `reminder_logs_staff_select_tenant` | SELECT | `tenant_id` in caller’s staff/admin/tenant_admin tenant |
| `reminder_logs_super_admin_select_all` | SELECT | `users.role = 'super_admin'` |
| `reminder_logs_service_role_all` | ALL | service_role |

No authenticated INSERT/UPDATE/DELETE policies.

---

## 6. Allowed roles (derived from product behavior)

### payments

| Operation | Client (`client`) | Staff / Admin / Tenant Admin | Super Admin | Service role |
|-----------|-------------------|------------------------------|-------------|--------------|
| SELECT | Own rows (`customer_read_own`) | Tenant | All* | All |
| INSERT | Own* (`customer_insert_own`) | Tenant | All* | All |
| UPDATE | **DENY (F-05a)** | Tenant | All* | All |
| DELETE | DENY (no policy) | DENY (no policy) | All* | All |

\*Live super_admin payment policies still match role `'superadmin'` (typo) — documented residual, not changed in F-05.

### reminder_logs

| Operation | Client | Staff / Admin / Tenant Admin | Super Admin | Service role |
|-----------|--------|------------------------------|-------------|--------------|
| SELECT | **DENY** | Own tenant | All | All |
| INSERT | **DENY** | **DENY** (use API) | DENY (use API) | All |
| UPDATE | DENY | DENY | DENY | All |
| DELETE | DENY | DENY | DENY | All |

App change: `useReminderService` SMS/push logging now calls `/api/reminders/manage` (service role). `manage.post.ts` stamps `tenant_id` / `user_id` on insert.

---

## 7. Tenant isolation

- Payments: customers only see own `user_id`; staff see `tenant_id` match; customers cannot reassign `tenant_id`/`user_id` (no UPDATE).
- Reminder logs: staff SELECT requires non-null `tenant_id` equal to caller tenant; cross-tenant DENY verified live.
- Historical `reminder_logs` with `tenant_id IS NULL` are invisible to staff Data API SELECT by design (also invisible to `admin/reminder-logs.get` which filters `.eq('tenant_id', …)`). New writes stamp tenant.

---

## 8. Security tests (live DB, authenticated role)

Simulated JWT via `request.jwt.claim.sub` + `SET LOCAL ROLE authenticated` (not service_role).

| Test | Result |
|------|--------|
| Client SELECT own payment | ALLOW |
| Client SELECT foreign-tenant payment | DENY |
| Client UPDATE `payment_status='completed'` | DENY (`row_count=0`) |
| Client UPDATE `tenant_id` → foreign | DENY |
| Client UPDATE `user_id` → foreign | DENY |
| Client SELECT seeded reminder_log | DENY |
| Client INSERT reminder_logs | DENY (RLS violation) |
| Staff A SELECT own-tenant reminder | ALLOW |
| Staff A SELECT foreign-tenant reminder | DENY |
| Staff B SELECT own / foreign | ALLOW / DENY |

Unit: `server/utils/__tests__/f05-rls-remediation.test.ts` (migration contract).

---

## 9. Regression notes

- Legitimate payment status changes remain on **service_role** paths (Wallee webhooks, server utils, staff UPDATE).
- `composables/usePaymentStatus.ts` client UPDATE will fail under RLS for clients — intended. Staff may still UPDATE via `staff_update_tenant`.
- Public booking flows do not rely on customer UPDATE of `payments` or client SELECT of `reminder_logs`.
- SMS/push reminder logging moved to authenticated API → service_role insert with tenant stamp.

---

## 10. Migration

File: `migrations/20260902_f05_payments_reminder_logs_rls.sql`  
Applied to live via Supabase MCP `apply_migration` name `f05_payments_reminder_logs_rls`.

No data deleted. Probe rows used for tests were removed after verification.

---

## 11. Remaining risks (documented, not fixed)

| ID | Risk | Severity |
|----|------|----------|
| F-05-R1 | Live payments `super_admin_*` policies check `role = 'superadmin'` but users use `super_admin` | Medium |
| F-05-R2 | `customer_insert_own` uses `user_id = auth.uid()` (auth id vs `users.id`) | Low/Medium |
| F-05-R3 | Staff can still set `payment_status` without provider proof (`staff_update_tenant`) — audit MEDIUM, not F-05 | Medium |
| F-05-R4 | `/api/reminders/manage` `get-logs` uses service_role without strong tenant filter (related R-04) | High (separate) |
| F-05-R5 | Historical null-`tenant_id` reminder_logs not backfilled | Low (already invisible to tenant UI) |
| F-01…F-04, F-06…F-08 | Unchanged | — |

---

## Final verdict

| Field | Value |
|-------|-------|
| **F-05 STATUS** | **FIXED** |
| Payment status manipulation | **BLOCKED** |
| Cross-tenant payment access | **BLOCKED** (SELECT foreign DENY; UPDATE denied for clients) |
| Cross-tenant reminder log access | **BLOCKED** |
| Tenant ID manipulation (client) | **BLOCKED** |
| RLS verified at database layer | **YES** |
| Regression | **NO** (known client status helper now correctly denied) |
| Production blocker (for F-05) | **NO** |

F-05 alone does **not** make the whole product production-ready; F-01…F-04 / F-06…F-08 and related IDORs remain.
