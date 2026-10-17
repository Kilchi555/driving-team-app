# Course sessions: revoke anonymous DML grants

Verified from `main` after `#288` / `43f96d7e`.

## Intent

Remove **latent** table privileges that would let the `anon` role INSERT/UPDATE/DELETE/TRUNCATE `public.course_sessions` if a future RLS policy ever targeted `anon` or `PUBLIC`. Today RLS already blocks anonymous writes (no anon/public write policies); the grants were still present.

## Contract

Migration `migrations/20260924_revoke_anon_course_sessions_dml.sql`:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_sessions FROM anon;
```

- Does **not** revoke SELECT (SELECT already handled elsewhere).
- Does **not** touch `authenticated` or `service_role`.
- Does **not** create/drop/alter policies or enable/disable RLS.
- Idempotent: revoking an absent privilege is a no-op.

Rollback (re-opens the latent grant) is documented in the migration header:

```sql
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.course_sessions TO anon;
```

## Ops

Header: **do not apply this to production from the implementation agent.** Presence in the repo ≠ applied. CI cannot see the live privilege catalog; tests assert migration SQL shape only (`server/utils/__tests__/revoke-anon-course-sessions-dml.test.ts`).

## Pitfalls

1. Do not “fix” missing anon DML by re-granting to anon — keep writes on authenticated/service_role + policies.
2. Not a substitute for reviewing new `CREATE POLICY … TO anon` on course tables.
3. Distinct from public course **read** / enroll HTTP hardening runbooks on older draft doc PRs.
