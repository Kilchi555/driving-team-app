# PR #421 Path A — Schema Drift Register

**Status:** Template filled at Gate A from repository source inspection.  
**Live disposable apply measurements:** fill / refresh during **Gate B** preflight only.  
**Forbidden:** Production or shared-staging introspection.

> **Not production-equivalent. Proofs apply only to this disposable schema.**

## 1. F1 objects (applied verbatim after checksum gate)

Source: `migrations/20261012_enroll_public_cash_course_with_pending_payment.sql`  
Expected SHA-256: `d8d10cd20a4fad2ea744bca5dfc36b1b1333e999f8f867cefeed9ea240291cab`

| Object | Kind |
|--------|------|
| `public.public_cash_course_enroll_idempotency` | Table + PK `(tenant_id, idempotency_key)` + RLS + service_role policy |
| `public.public_cash_course_enroll_outbox` | Table + UNIQUE `(tenant_id, dedupe_key)` + CHECKs + claim index + RLS |
| `payments_public_cash_course_enroll_registration_uidx` | Partial unique index on `payments` |
| `enroll_public_cash_course_with_pending_payment(...)` | SECURITY DEFINER RPC |
| `claim_public_cash_enroll_outbox_batch(...)` | SECURITY DEFINER RPC (`SKIP LOCKED`) |
| `complete_public_cash_enroll_outbox_job(...)` | SECURITY DEFINER RPC |
| `fail_public_cash_enroll_outbox_job(...)` | SECURITY DEFINER RPC |

Gate B must confirm these exist after apply (checkboxes below left for preflight):

- [ ] Idempotency table + PK
- [ ] Outbox table + UNIQUE dedupe + CHECKs
- [ ] Payments partial unique index
- [ ] All four RPCs executable by `postgres` / `service_role`

## 2. Minimal-schema stubs (`f1-minimal-schema.sql`)

| Stub | Purpose | Drift vs production |
|------|---------|---------------------|
| Roles `anon`, `authenticated`, `service_role` | Satisfy F1 REVOKE/GRANT | Not full Supabase role graph (`authenticator`, `supabase_admin`, …) |
| Schema `auth` + `auth.role()` | RLS policy expressions; reads `request.jwt.claim.role` | Not full Auth schema / JWT pipeline |
| `pgcrypto` | `gen_random_uuid()` for outbox PK | May already exist on hosted; created explicitly here |
| Truncated `tenants` / `users` / `courses` / `course_registrations` / `payments` | Columns F1 touches | Many production columns omitted |
| Capacity function + trigger | Same logic as `20260916_course_atomic_capacity.sql` | Included for realism |

## 3. Replicated from repository (not omitted)

| Source | Handling |
|--------|----------|
| `migrations/20260916_course_atomic_capacity.sql` | **Replicated** into minimal schema (capacity trigger) |
| `migrations/fix_course_registrations_constraints.sql` partial unique email/faberid | **Replicated** as unique indexes (Test 8 must use distinct emails) |
| `database_migration_courses_system.sql` status / payment_status CHECKs | **Replicated** (subset of allowed values; F1 uses `confirmed` / `pending`) |
| F1 migration file | **Applied verbatim** after SHA-256 verify (Gate B+) |

## 4. Deliberate omissions

| Item | Source / context | Rationale |
|------|------------------|-----------|
| `course_instructor_check` | `database_migration_courses_system.sql` | Not required by F1 INSERT path; fixtures omit instructors |
| Early `UNIQUE(course_id, email)` table constraint | Same file (later replaced by partial indexes) | Partial unique indexes replicated instead |
| Full course_registrations / payments RLS policy sets | e.g. `20260909_p0_09_course_registrations_rls.sql`, payments RLS migrations | F1 uses SECURITY DEFINER + sets role GUC; owner/`postgres` harness path |
| `FORCE ROW LEVEL SECURITY` | Production may vary | Not enabled; document if Gate B observes differences |
| Payment-field protect / recount triggers | Various product migrations | Not required for 7–10/26A |
| `payment_provider CHECK (wallee\|stripe)` | `add_payment_provider_support.sql` | F1 inserts `payment_provider = NULL`; CHECK omitted to avoid ambiguity |
| Vehicles / rooms / course_sessions / waitlist | Product schema | Out of Path A core matrix |
| Full `auth.users` FKs | Historical payments DDL | Minimal `users` is `public.users` only |
| Vitest / app isolation stubs | Test suite | **Unchanged** — not weakened |

## 5. Privilege / behavior differences

| Topic | Disposable Path A | Production / hosted (expected) |
|-------|-------------------|--------------------------------|
| DB user | `postgres` superuser on service container | Restricted roles via Supabase |
| RLS | Enabled on F1 tables; stub `auth.role()` | Real JWT + `auth.role()` |
| SECURITY DEFINER owner | `postgres` (F1 `ALTER … OWNER TO postgres`) | Same intent on hosted after apply |
| Extensions | Explicit `pgcrypto` | Platform-managed |

## 6. Capacity validation

- Trigger **included** in minimal schema.
- Non-capacity tests (7, 8, 9, 10, 26A): seed `courses.max_participants` high (e.g. 100).
- Capacity exhaustion is **not** a required Path A concurrency cell in this harness.

## 7. Gate B refresh checklist

After first disposable apply, update this file with:

1. `\d` / catalog queries confirming F1 objects
2. Any unexpected apply errors and resolutions
3. Confirmation line retained: **Not production-equivalent. Proofs apply only to this disposable schema.**
