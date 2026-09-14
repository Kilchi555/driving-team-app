# Course sessions public read (RLS + anon GRANT)

**When to use:** Browser/PostgREST clients unexpectedly see every tenant’s `course_sessions`; category pages lose `next_session` embeds; debugging #208 / #209 (P0-01 + P1 after #205).

Verified against source (Sep 2026). Merges `9303f534` (#208), `6aaed632` (#209).

HTTP enrollment authority (#205) and Nitro 410 route mapping (#207) are separate runbooks — do not fold them in here.

---

## Intent

Anonymous PostgREST must not:

1. **List every session row** across tenants (`USING (true)` on `course_sessions_public_read`).
2. **SELECT sensitive columns** on public-course sessions via the `anon` role (instructor emails/phones and other internal fields).

Public catalog/enrollment HTTP APIs use **service_role** (`getSupabaseAdmin`) and are unaffected by these changes.

---

## Contract

### P0-01 — policy containment (#208)

Migration: `migrations/20260913_p0_course_sessions_public_read.sql`

| Piece | Behavior |
|-------|----------|
| Policy | `course_sessions_public_read` |
| Command / roles | `SELECT` **TO `public`** |
| Predicate | Parent `courses` row exists with `courses.is_public = true` |
| Unchanged | Authenticated tenant SELECT/INSERT/UPDATE/DELETE policies |

Previous live policy matched `COURSES_PUBLIC_PAGES_GUIDE.md`: `USING (true)` (every session, every tenant). That definition is **retired**.

### P1 — revoke anon table SELECT (#209)

Migration: `migrations/20260913_p1_course_sessions_revoke_anon_select.sql`

| Piece | Behavior |
|-------|----------|
| Privilege | `REVOKE SELECT ON TABLE public.course_sessions FROM anon` |
| Left alone | `authenticated`, `service_role` grants; RLS policies |

**Why both steps:** P0-01 only filters *which rows* RLS returns. With `GRANT SELECT` still on `anon`, a client could still `select=*` on public-course sessions and pull internal columns. Revoking anon SELECT closes that path; authenticated staff and Nitro service_role paths keep working.

### UI consequence (#209)

`pages/courses/category/[category].vue` no longer embeds `next_session:course_sessions(...)`. Anon clients cannot read session rows; the card shows waitlist status only, not the next session start time.

Public listing that still needs sessions must go through Nitro APIs that use service_role (e.g. `GET /api/courses/public`, `available-sessions`) and allowlisted columns (`PUBLIC_COURSE_SESSION_COLUMNS` in `course-session-embed.ts`).

### Ops / apply notes

- Migrations say **do not apply from the implementation agent**; production apply is a separate ops step.
- CI tests assert SQL shape only (`p0-01-…`, `p1-…` vitest files) — no live JWT/RLS DB in CI.
- Rollback P0: drop the narrowed policy and recreate `USING (true)` only if intentionally reverting the containment.
- Rollback P1: `GRANT SELECT ON TABLE public.course_sessions TO anon;`

---

## Pitfalls

1. **“Sessions missing” ≠ “tighten the policy with `USING (true)`”** — That old guide advice reopens cross-tenant reads. Prefer service_role HTTP APIs or an authenticated staff client.
2. **Policy alone is not enough** — Row filter ≠ column filter. Anon `GRANT SELECT` still exposed public-course session internals until P1.
3. **Embedding `course_sessions` from the browser with the anon key** — Expect empty/error after P1; category page already dropped the embed.
4. **Assuming public Nitro APIs broke** — They use admin client; if they fail, look at app code, not these grants.
5. **Applying SQL twice / from the wrong agent** — Treat migrations as ops-owned; verify live grantees before/after.

---

## Codepaths

| Path | Role |
|------|------|
| `migrations/20260913_p0_course_sessions_public_read.sql` | Narrow `course_sessions_public_read` |
| `migrations/20260913_p1_course_sessions_revoke_anon_select.sql` | Revoke anon SELECT |
| `pages/courses/category/[category].vue` | No client-side session embed |
| `server/api/courses/public.get.ts` | Public catalog via service_role |
| `server/api/courses/available-sessions.get.ts` | Session catalog via service_role |
| `server/utils/course-session-embed.ts` | FK-safe embeds + public column allowlists |
| `server/utils/__tests__/p0-01-course-sessions-public-read.test.ts` | SQL contract |
| `server/utils/__tests__/p1-course-sessions-revoke-anon-select.test.ts` | REVOKE contract |
